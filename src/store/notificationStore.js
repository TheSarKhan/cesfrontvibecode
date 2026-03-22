import { create } from 'zustand'

export const useNotificationStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (n) =>
    set((s) => ({
      notifications: [{ ...n, id: Date.now(), read: false }, ...s.notifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    })),

  markAllRead: () =>
    set((s) => ({
      notifications: s.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    })),

  clear: () => set({ notifications: [], unreadCount: 0 }),
}))
