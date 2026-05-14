import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import toast from 'react-hot-toast'
import { useNotificationStore } from '../store/notificationStore'

const TOAST_ICONS = {
  SUCCESS: '✅',
  INFO: 'ℹ️',
  WARNING: '⚠️',
}

function getWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/api/ws/websocket`
}

export function useNotifications(enabled = true) {
  const addNotification = useNotificationStore((s) => s.addNotification)
  const bumpApprovalQueue = useNotificationStore((s) => s.bumpApprovalQueue)

  useEffect(() => {
    if (!enabled) return

    const client = new Client({
      brokerURL: getWsUrl(),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/notifications', (message) => {
          try {
            const payload = JSON.parse(message.body)
            addNotification(payload)
            if (payload.type === 'APPROVAL_QUEUE_UPDATED') {
              bumpApprovalQueue()
            } else {
              const icon = TOAST_ICONS[payload.type] || 'ℹ️'
              toast(`${icon} ${payload.title}\n${payload.message}`, {
                duration: 5000,
                style: { fontSize: '12px', maxWidth: '320px' },
              })
            }
          } catch {
            // ignore parse errors
          }
        })
      },
      onStompError: () => {},
    })

    client.activate()

    return () => { client.deactivate() }
  }, [enabled])
}
