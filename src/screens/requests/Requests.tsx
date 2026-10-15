import { useEffect, useMemo, useState } from 'react'
import ScreenChrome from '../../components/ScreenChrome'
import ScreenTitle from '../../components/ScreenTitle'
import { useDesktop } from '../../components/useDesktop'
import {
  requests as staticRequests,
  priceSheet as staticPriceSheet,
  type PriceCategory,
  type Request,
  type RequestStage,
} from './requestsData'
import { useGuest } from '../../guest/GuestContext'
import { useFetch } from '../../api/useFetch'
import { getGuestRequests, createGuestRequest } from '../../api/endpoints'
import { useAppConfig } from '../../guest/AppConfig'
import type { ApiRequestCategory, ApiServiceRequest } from '../../api/types'
import icSend from '../../assets/requests/ic-send.svg'
import icClose from '../../assets/requests/ic-close.svg'
import catHousekeeping from '../../assets/requests/cat-housekeeping.svg'
import catRefreshments from '../../assets/requests/cat-refreshments.svg'
import catTransport from '../../assets/requests/cat-transport.svg'
import catLaundry from '../../assets/requests/cat-laundry.svg'
import catBaby from '../../assets/requests/cat-baby.svg'
import catOccasions from '../../assets/requests/cat-occasions.svg'
import './Requests.css'

const stages: { key: RequestStage; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'in-progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

// How far to fill the progress bar for each stage (matches the Figma tracker:
// the "In progress" node sits at the mid-point).
const stageFill: Record<RequestStage, string> = {
  received: '0%',
  'in-progress': '50%',
  done: '100%',
}

const categoryIcons: Record<NonNullable<PriceCategory['icon']>, string> = {
  housekeeping: catHousekeeping,
  refreshments: catRefreshments,
  transport: catTransport,
  laundry: catLaundry,
  baby: catBaby,
  occasions: catOccasions,
}

// Pick one of the bundled Figma icons for a backend category by its name.
function iconFor(name: string): PriceCategory['icon'] {
  const n = name.toLowerCase()
  if (/house|clean|room/.test(n)) return 'housekeeping'
  if (/refresh|drink|water|food/.test(n)) return 'refreshments'
  if (/transport|cab|car|travel/.test(n)) return 'transport'
  if (/laundry|cloth|wash/.test(n)) return 'laundry'
  if (/baby|kid|child/.test(n)) return 'baby'
  if (/occasion|celebrat|special/.test(n)) return 'occasions'
  return null
}

function toCategory(c: ApiRequestCategory): PriceCategory {
  const icon = iconFor(c.name)
  return {
    name: c.name,
    subtext: c.subtext ?? '',
    icon,
    iconUrl: icon ? undefined : c.icon,
    services: c.services ?? [],
  }
}

function timeLabel(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return `Requested at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

type RequestView = Request & {
  id?: string
  createdAt: string
  replies: { body: string; sentBy: string; sentAt?: string }[]
}

// "3:42 pm"
function clock(iso?: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }).toLowerCase()
}

function toView(r: ApiServiceRequest): RequestView {
  const completed = r.status === 'Completed'
  const progress: RequestStage | undefined = completed
    ? undefined
    : r.status === 'Pending'
      ? 'received'
      : 'in-progress'
  return {
    id: r._id,
    message: r.item,
    time: timeLabel(r.createdAt),
    room: r.roomNumber ? `Room no. ${r.roomNumber}` : undefined,
    price: '',
    status: completed ? 'Completed' : 'Confirmed',
    progress,
    createdAt: r.createdAt,
    replies: (r.replies ?? []).map((x) => ({ body: x.body, sentBy: x.sentBy || 'Front Desk', sentAt: x.sentAt })),
  }
}

// One request as a card (message, time, room, price + status, and the progress tracker while it's open),
// followed by the Front Desk's replies. Used by the laptop layout (Figma 3132:24281).
function RequestCardView({ req }: { req: RequestView }) {
  return (
    <div className="request-group">
      <article className="request-card">
        <div className="request-card__body">
          {req.title && <h3 className="request-card__title">{req.title}</h3>}
          <p className="request-card__message">{req.message}</p>
          <p className="request-card__meta">
            <span>{req.time}</span>
            {req.room && (
              <>
                <span className="request-card__dot" aria-hidden="true">•</span>
                <span>{req.room}</span>
              </>
            )}
          </p>
        </div>

        <hr className="request-card__divider" />

        <div className="request-card__status">
          <span className="request-card__price">{req.price}</span>
          <span className="request-tag">{req.status}</span>
        </div>

        {req.progress && (
          <div className="request-progress">
            <div className="request-progress__track">
              <div className="request-progress__fill" style={{ width: stageFill[req.progress] }} />
              <span className="request-progress__node request-progress__node--start" />
              <span className="request-progress__node request-progress__node--mid" />
              <span className="request-progress__node request-progress__node--end" />
            </div>
            <div className="request-progress__labels">
              {stages.map((st) => (
                <span key={st.key} className="request-progress__label">
                  {st.label}
                </span>
              ))}
            </div>
          </div>
        )}
      </article>
      {req.replies.map((rep, j) => (
        <div className="request-reply" key={j}>
          <p className="request-reply__body">{rep.body}</p>
          <p className="request-reply__by">
            {rep.sentBy}
            {rep.sentAt ? ` · ${clock(rep.sentAt)}` : ''}
          </p>
        </div>
      ))}
    </div>
  )
}

export default function Requests() {
  const desktop = useDesktop()
  const { guestId, status: guestStatus } = useGuest()
  const [draft, setDraft] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sheetTab, setSheetTab] = useState<number | null>(null) // null = closed

  const { data, error, refetch } = useFetch(
    () => getGuestRequests(guestId as string),
    [guestId],
    !!guestId,
  )
  const cfg = useAppConfig()
  const settings = cfg.settings

  const categories: PriceCategory[] = useMemo(() => {
    // Categories the property has switched off for the guest's current stage (pre-stay / in-stay) are hidden.
    const live = (settings?.reqCategories ?? [])
      .filter((c) => c.name && c.enabled?.[cfg.stage] !== false)
      .map(toCategory)
    // Only fall back to the sample sheet when the property hasn't configured categories at all.
    return live.length || (settings?.reqCategories ?? []).length ? live : staticPriceSheet
  }, [settings, cfg.stage])

  const requests: RequestView[] = useMemo(() => {
    if (!guestId) return staticRequests.map((r) => ({ ...r, createdAt: '', replies: [] }))
    return (data ?? []).map(toView)
  }, [guestId, data])

  // Empty state (Figma 452:7397): nothing sent yet → offer the categories instead.

  const sheetOpen = sheetTab != null
  useEffect(() => {
    if (!sheetOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setSheetTab(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [sheetOpen])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const content = draft.trim()
    if (!content || !guestId || submitting) return
    setSubmitting(true)
    try {
      await createGuestRequest(guestId, content)
      setDraft('')
      refetch()
      setView('requests')
    } catch (err) {
      console.error('Failed to submit request:', err)
    } finally {
      setSubmitting(false)
    }
  }

  // Two views of the same data: "Place request" is the request home (price categories + composer),
  // "Requests" tracks what is still being handled, then what is done.
  const [view, setView] = useState<'chat' | 'requests'>('chat')
  const chronological = useMemo(
    () => [...requests].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || '')),
    [requests],
  )
  const ongoing = useMemo(() => [...chronological].filter((r) => r.progress).reverse(), [chronological])
  const finished = useMemo(() => [...chronological].filter((r) => !r.progress).reverse(), [chronological])

  const activeCategory = sheetTab != null ? (categories[sheetTab] ?? null) : null

  return (
    <ScreenChrome>
      <main className="requests-screen">
        {desktop ? (
          // Laptop (Figma 3132:24281): "Your Requests" header + price sheet, the same Chat / Requests tabs as the phone, with the
          // composer pinned under them. Request cards use the Figma card (progress bar, status, desk replies).
          <>
            <div className="requests-head">
              <h2 className="font-display requests-head__title">Your Requests</h2>
              {categories.length > 0 && (
                <button className="requests-pricesheet" onClick={() => setSheetTab(0)}>
                  See Price Sheet
                </button>
              )}
            </div>
            {cfg.guestApp.reqIntro && <p className="requests-intro">{cfg.guestApp.reqIntro}</p>}
            {!guestId && guestStatus !== 'loading' && (
              <p className="requests-status">Open this app from your booking link to send and track requests.</p>
            )}
            {error && guestId && <p className="requests-status">Couldn’t load your requests right now.</p>}

            {/* Same two views as on the phone: the conversation, and what is still being handled / done */}
            <div className="requests-toggle requests-toggle--laptop" role="tablist" aria-label="Place request or requests">
              <button
                role="tab"
                aria-selected={view === 'chat'}
                className={`requests-toggle__btn ${view === 'chat' ? 'requests-toggle__btn--on' : ''}`}
                onClick={() => setView('chat')}
              >
                Place request
              </button>
              <button
                role="tab"
                aria-selected={view === 'requests'}
                className={`requests-toggle__btn ${view === 'requests' ? 'requests-toggle__btn--on' : ''}`}
                onClick={() => setView('requests')}
              >
                Requests
                {ongoing.length > 0 && <span className="requests-toggle__count">{ongoing.length}</span>}
              </button>
            </div>

            {view === 'chat' ? (
              <>
                {(
                  <section className="requests-cats">
                    <h2 className="font-display requests-cats__title">Click to see prices</h2>
                    <div className="requests-cats__grid">
                      {categories.map((c, i) => (
                        <button className="requests-cat" key={c.name} onClick={() => setSheetTab(i)}>
                          {c.icon ? (
                            <img className="requests-cat__icon" src={categoryIcons[c.icon]} alt="" />
                          ) : c.iconUrl ? (
                            <img className="requests-cat__icon requests-cat__icon--photo" src={c.iconUrl} alt="" />
                          ) : (
                            <span className="requests-cat__icon" />
                          )}
                          <span className="requests-cat__text">
                            <span className="requests-cat__name">{c.name}</span>
                            <span className="requests-cat__sub">{c.subtext}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                )}
              </>
            ) : (
              <>
                {ongoing.length === 0 && finished.length === 0 ? (
                  <p className="requests-status">Nothing here yet. Send a request from the Place request tab and it will show up here.</p>
                ) : (
                  <>
                    <h2 className="font-display requests-head__title">Ongoing Requests</h2>
                    {ongoing.length === 0 ? (
                      <p className="requests-status">Nothing in progress right now.</p>
                    ) : (
                      <div className="requests-list">
                        {ongoing.map((req, i) => (
                          <RequestCardView req={req} key={req.id ?? `${req.message}-${i}`} />
                        ))}
                      </div>
                    )}
                    {finished.length > 0 && (
                      <>
                        <h2 className="font-display requests-head__title requests-head__title--sub">Completed</h2>
                        <div className="requests-list">
                          {finished.map((req, i) => (
                            <RequestCardView req={req} key={req.id ?? `${req.message}-${i}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </>
                )}
              </>
            )}

            <form className="request-composer" onSubmit={onSubmit}>
              <input
                className="request-composer__input"
                type="text"
                placeholder="Type your request here"
                aria-label="Type your request here"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!guestId || submitting}
              />
              <button
                className="request-composer__send"
                type="submit"
                aria-label="Send request"
                disabled={!guestId || submitting || !draft.trim()}
              >
                <img src={icSend} alt="" />
              </button>
            </form>
          </>
        ) : (
        <>
        <ScreenTitle title="Requests" />

        {cfg.guestApp.reqIntro && <p className="requests-intro">{cfg.guestApp.reqIntro}</p>}

        {/* Chat / Requests toggle */}
        <div className="requests-toggle" role="tablist" aria-label="Place request or requests">
          <button
            role="tab"
            aria-selected={view === 'chat'}
            className={`requests-toggle__btn ${view === 'chat' ? 'requests-toggle__btn--on' : ''}`}
            onClick={() => setView('chat')}
          >
            Place request
          </button>
          <button
            role="tab"
            aria-selected={view === 'requests'}
            className={`requests-toggle__btn ${view === 'requests' ? 'requests-toggle__btn--on' : ''}`}
            onClick={() => setView('requests')}
          >
            Requests
            {ongoing.length > 0 && <span className="requests-toggle__count">{ongoing.length}</span>}
          </button>
        </div>

        {!guestId && guestStatus !== 'loading' && (
          <p className="requests-status">Open this app from your booking link to send and track requests.</p>
        )}
        {error && guestId && <p className="requests-status">Couldn’t load your requests right now.</p>}

        {view === 'chat' ? (
          <>
            <div className="requests-head">
              <h2 className="font-display requests-head__title">Messages</h2>
              {/* Hidden when every category is switched off — there's nothing to price. */}
              {categories.length > 0 && (
                <button className="requests-pricesheet" onClick={() => setSheetTab(0)}>
                  See Price Sheet
                </button>
              )}
            </div>

            {(
              <section className="requests-cats">
                <h2 className="font-display requests-cats__title">Click to see prices</h2>
                <div className="requests-cats__grid">
                  {categories.map((c, i) => (
                    <button className="requests-cat" key={c.name} onClick={() => setSheetTab(i)}>
                      {c.icon ? (
                        <img className="requests-cat__icon" src={categoryIcons[c.icon]} alt="" />
                      ) : c.iconUrl ? (
                        <img className="requests-cat__icon requests-cat__icon--photo" src={c.iconUrl} alt="" />
                      ) : (
                        <span className="requests-cat__icon" />
                      )}
                      <span className="requests-cat__text">
                        <span className="requests-cat__name">{c.name}</span>
                        <span className="requests-cat__sub">{c.subtext}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            )}


            <form className="request-composer" onSubmit={onSubmit}>
              <input
                className="request-composer__input"
                type="text"
                placeholder="Type your request here"
                aria-label="Type your request here"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!guestId || submitting}
              />
              <button
                className="request-composer__send"
                type="submit"
                aria-label="Send request"
                disabled={!guestId || submitting || !draft.trim()}
              >
                <img src={icSend} alt="" />
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="requests-head">
              <h2 className="font-display requests-head__title">Ongoing Requests</h2>
              {/* Hidden when every category is switched off — there's nothing to price. */}
              {categories.length > 0 && (
                <button className="requests-pricesheet" onClick={() => setSheetTab(0)}>
                  See Price Sheet
                </button>
              )}
            </div>

            {ongoing.length === 0 ? (
              <p className="requests-status">
                Nothing in progress right now. Send a request from the Place request tab and it will show up here.
              </p>
            ) : (
              <div className="requests-list">
                {ongoing.map((req, i) => (
                <div className="request-group" key={req.id ?? `${req.message}-${i}`}>
                  <article className="request-card">
                    <div className="request-card__body">
                      {req.title && <h3 className="request-card__title">{req.title}</h3>}
                      <p className="request-card__message">{req.message}</p>
                      <p className="request-card__meta">
                        <span>{req.time}</span>
                        {req.room && (
                          <>
                            <span className="request-card__dot" aria-hidden="true">•</span>
                            <span>{req.room}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <hr className="request-card__divider" />

                    <div className="request-card__status">
                      <span className="request-card__price">{req.price}</span>
                      <span className="request-tag">{req.status}</span>
                    </div>

                    {req.progress && (
                      <div className="request-progress">
                        <div className="request-progress__track">
                          <div
                            className="request-progress__fill"
                            style={{ width: stageFill[req.progress] }}
                          />
                          <span className="request-progress__node request-progress__node--start" />
                          <span className="request-progress__node request-progress__node--mid" />
                          <span className="request-progress__node request-progress__node--end" />
                        </div>
                        <div className="request-progress__labels">
                          {stages.map((st) => (
                            <span key={st.key} className="request-progress__label">
                              {st.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                </div>
                ))}
              </div>
            )}

            {finished.length > 0 && (
              <>
                <h2 className="font-display requests-head__title requests-head__title--sub">Completed</h2>
                <div className="requests-list">
                  {finished.map((req, i) => (
                <div className="request-group" key={req.id ?? `${req.message}-${i}`}>
                  <article className="request-card">
                    <div className="request-card__body">
                      {req.title && <h3 className="request-card__title">{req.title}</h3>}
                      <p className="request-card__message">{req.message}</p>
                      <p className="request-card__meta">
                        <span>{req.time}</span>
                        {req.room && (
                          <>
                            <span className="request-card__dot" aria-hidden="true">•</span>
                            <span>{req.room}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <hr className="request-card__divider" />

                    <div className="request-card__status">
                      <span className="request-card__price">{req.price}</span>
                      <span className="request-tag">{req.status}</span>
                    </div>

                    {req.progress && (
                      <div className="request-progress">
                        <div className="request-progress__track">
                          <div
                            className="request-progress__fill"
                            style={{ width: stageFill[req.progress] }}
                          />
                          <span className="request-progress__node request-progress__node--start" />
                          <span className="request-progress__node request-progress__node--mid" />
                          <span className="request-progress__node request-progress__node--end" />
                        </div>
                        <div className="request-progress__labels">
                          {stages.map((st) => (
                            <span key={st.key} className="request-progress__label">
                              {st.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </article>
                </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
        </>
        )}
      </main>

      {/* Price sheet modal (Figma 460:8015) */}
      {activeCategory && (
        <div className="pricesheet" role="presentation" onClick={() => setSheetTab(null)}>
          <div
            className="pricesheet__card"
            role="dialog"
            aria-modal="true"
            aria-label="Requests price sheet"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pricesheet__head">
              <h2 className="font-display pricesheet__title">Requests</h2>
              <button className="pricesheet__close" onClick={() => setSheetTab(null)} aria-label="Close">
                <img src={icClose} alt="" />
              </button>
            </div>

            <div className="pricesheet__tabs" role="tablist">
              {categories.map((c, i) => (
                <button
                  key={c.name}
                  role="tab"
                  aria-selected={sheetTab === i}
                  className={`pricesheet__tab ${sheetTab === i ? 'pricesheet__tab--on' : ''}`}
                  onClick={() => setSheetTab(i)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="pricesheet__table">
              <div className="pricesheet__row pricesheet__row--head">
                <span>Service</span>
                <span>Cost</span>
              </div>
              {activeCategory.services.map((s) => (
                <div className="pricesheet__row" key={s.service}>
                  <span>{s.service}</span>
                  <span>{s.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </ScreenChrome>
  )
}
