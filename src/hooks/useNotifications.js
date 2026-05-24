import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import toast from 'react-hot-toast'
import { useNotificationStore } from '../store/notificationStore'

function getWsUrl() {
  const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
  return `${proto}://${window.location.host}/api/ws/websocket`
}

function showToast(payload) {
  const body = `${payload.title}\n${payload.message}`
  const opts = { duration: 5000 }
  if (payload.type === 'SUCCESS') return toast.success(body, opts)
  if (payload.type === 'WARNING') return toast(body, { ...opts, icon: 'warning' })
  return toast(body, opts)
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
              showToast(payload)
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
