import { useEffect, useRef } from 'react'
import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

export function useGarageWebSocket(onMessage) {
  const clientRef = useRef(null)
  const callbackRef = useRef(onMessage)
  callbackRef.current = onMessage

  useEffect(() => {
    let client
    try {
      client = new Client({
        webSocketFactory: () => new SockJS('/api/ws'),
        reconnectDelay: 10000,
        onConnect: () => {
          client.subscribe('/topic/garage', (message) => {
            try {
              const data = JSON.parse(message.body)
              callbackRef.current?.(data)
            } catch { /* ignore parse errors */ }
          })
        },
        onStompError: () => { /* silent — backend may not be ready */ },
        onWebSocketError: () => { /* silent */ },
      })

      client.activate()
      clientRef.current = client
    } catch {
      /* WebSocket not available — graceful degradation */
    }

    return () => {
      try { client?.deactivate() } catch { /* ignore */ }
    }
  }, [])

  return clientRef
}
