import { useMemo } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import { notifications as staticNotifications, type Notification } from './notificationsData'
import { useGuest } from '../../guest/GuestContext'
import { useFetch } from '../../api/useFetch'
import {
  getGuestNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../api/endpoints'
import type { ApiNotification } from '../../api/types'
import { formatTimestamp } from '../../api/format'
import icDot from '../../assets/home/ic-dot.svg'
import icEmpty from '../../assets/notifications/ic-empty.svg'
import './Notifications.css'

type NotifView = Notification & { id?: string; read: boolean }

function toView(n: ApiNotification): NotifView {
  return {
    id: n._id,
    read: !!n.read,
    title: n.title,
    description: n.message,
    timestamp: formatTimestamp(n.createdAt),
  }
}

// Notifications feed: a list of booking + in-room service updates. Tapping a card
// marks it read; an empty feed falls back to the reassuring zero state.
export default function Notifications() {
  const { guestId } = useGuest()

  const { data, refetch } = useFetch(
    () => getGuestNotifications(guestId as string),
    [guestId],
    !!guestId,
  )

  const notifications: NotifView[] = useMemo(() => {
    if (!guestId) return staticNotifications.map((n) => ({ ...n, read: true }))
    return (data ?? []).map(toView)
  }, [guestId, data])

  const hasUnread = notifications.some((n) => !n.read)

  const onRead = async (id?: string, alreadyRead?: boolean) => {
    if (!id || alreadyRead) return
    try {
      await markNotificationRead(id)
      refetch()
    } catch (err) {
      console.error('Failed to mark notification read:', err)
    }
  }

  const onReadAll = async () => {
    if (!guestId) return
    try {
      await markAllNotificationsRead(guestId)
      refetch()
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  if (notifications.length === 0) {
    return (
      <ScreenChrome>
        <main className="notifications-screen notifications-screen--empty">
          <div className="notifications-empty">
            <img className="notifications-empty__icon" src={icEmpty} alt="" />
            <div className="notifications-empty__text">
              <h1 className="font-display notifications-empty__title">Notifications</h1>
              <p className="notifications-empty__subtitle">
                Don’t worry, we will notify you when something changes
              </p>
            </div>
          </div>
        </main>
      </ScreenChrome>
    )
  }

  return (
    <ScreenChrome>
      <main className="notifications-screen">
        <div className="notifications-head">
          <h1 className="font-display notifications-title">Notifications</h1>
          {hasUnread && (
            <button className="notifications-readall" onClick={onReadAll}>
              Mark all read
            </button>
          )}
        </div>
        <div className="notifications-list">
          {notifications.map((n, i) => (
            <article
              className={`notif-card ${n.read ? '' : 'notif-card--unread'}`}
              key={n.id ?? `${n.title}-${i}`}
              onClick={() => onRead(n.id, n.read)}
            >
              {n.image ? (
                <div className="notif-card__media">
                  <img src={n.image} alt="" />
                </div>
              ) : (
                <div className="notif-card__media notif-card__media--empty" aria-hidden />
              )}
              <div className="notif-card__body">
                <h2 className="notif-card__title">{n.title}</h2>
                {n.meta && (
                  <p className="notif-card__meta">
                    {n.meta.map((m, j) => (
                      <span className="notif-card__meta-item" key={j}>
                        {j > 0 && <img className="dot" src={icDot} alt="" />}
                        <span>{m}</span>
                      </span>
                    ))}
                  </p>
                )}
                {n.description && (
                  <p className="notif-card__desc">{n.description}</p>
                )}
                <p className="notif-card__time">{n.timestamp}</p>
              </div>
              {!n.read && <span className="notif-card__unread-dot" aria-hidden />}
            </article>
          ))}
        </div>
      </main>
    </ScreenChrome>
  )
}
