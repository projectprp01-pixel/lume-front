import icClock from '../../assets/home/ic-clock.svg'
import icDot from '../../assets/home/ic-dot.svg'
import icTimelineDot from '../../assets/home/ic-timeline-dot.svg'
import planLeaf from '../../assets/home/plan-leaf.svg'
import heroWelcome from '../../assets/home/hero-welcome.png'
import experiencesBg from '../../assets/home/experiences-paper.png'
import EventCarousel from './EventCarousel'
import ayurveda from '../../assets/home/ayurveda.png'
import loyalty from '../../assets/home/loyalty.png'
import carouselDots from '../../assets/home/carousel-dots.svg'
import expElectricTrails from '../../assets/home/exp-electric-trails.png'
import expBylakuppe from '../../assets/home/exp-bylakuppe.png'

import { Fragment, useMemo, useRef, useState, type ReactNode } from 'react'
import { useDragScroll } from '../../components/useDragScroll'
import DesktopNav from '../../components/DesktopNav'
import InfoSheet, { type SheetKind } from '../../components/InfoSheets'
import MobileTopBar from '../../components/MobileTopBar'
import BottomNav from '../../components/BottomNav'
import Footer from '../../components/Footer'
import {
  stay as staticStay,
  quickActions,
  type PlanStatus,
} from './homeData'
import { useNav } from '../../navigation/NavContext'
import { useCheckInSummary } from '../../guest/checkInStatus'
import WarnIcon from '../../components/WarnIcon'
import icCheckin from '../../assets/home/ic-checkin.svg'
import { useGuest } from '../../guest/GuestContext'
import ScrollRow from '../../components/ScrollRow'
import { useAppConfig, useDiscounted } from '../../guest/AppConfig'
import PriceText from '../../components/PriceText'
import type { Screen } from '../../navigation/NavContext'
import { useFetch } from '../../api/useFetch'
import {
  getSpotlightExperiences,
  getExperiences,
  getGuestExperienceBookings,
  getGuestSpaBookings,
  getGuestDiningReservations,
  getSpaFacilities,
} from '../../api/endpoints'
import { expUnit, formatDayMonth, formatPriceWithUnit, priceUnit, isToday, minutesOfDay } from '../../api/format'
import type { ApiExperience, ApiGuestApp } from '../../api/types'
import { resolveHomeOrder, type HomeSectionKey } from './homeOrder'
import './Home.css'

const HOME_EXP_FALLBACKS = [expElectricTrails, expBylakuppe]

function SectionHeading({
  title,
  action,
  onAction,
}: {
  title: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="section-heading">
      <h2 className="font-display">{title}</h2>
      {action && (
        <button className="section-heading__action" type="button" onClick={onAction}>
          {action}
        </button>
      )}
    </div>
  )
}

// Home's "Spotlight" CTA picks one of these in the dashboard.
const SPOTLIGHT_TARGET: Record<string, Screen> = {
  Experiences: 'experiences',
  'F&B': 'dining',
  Spa: 'spa',
  Transport: 'transport',
}

// YYYY-MM-DD in the guest's local time, for comparing against the dashboard's date-only fields.
function localDay() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// Quick-action label → the dashboard's quick-action key.
const QA_KEY = {
  Transport: 'transport',
  Directions: 'directions',
  'WiFi Details': 'wifi',
  Directory: 'directory',
  Facilities: 'facilities',
  'In-room Dining': 'inRoomDining',
} as const

type Callout = {
  id?: string
  spa?: boolean
  image: string
  badge: string | null
  title: string
  subtitle: string
  time: string
  price: ReactNode
}

type PlanItem = {
  title: string
  detail: string
  meta: string
  time: string
  status: PlanStatus
  sort: number
}

export default function Home() {
  const { navigate } = useNav()
  const { booking, guest, guestId } = useGuest()
  const [sheet, setSheet] = useState<SheetKind | null>(null)
  // Check-in banner: shown until the guest has submitted (skipped, partial or rejected).
  // Per-person: hidden once every guest has submitted (even while the hotel is still verifying), and
  // comes back if the hotel rejects anyone's ID or any guest hasn't submitted.
  const checkIn = useCheckInSummary()
  const needsCheckIn = !!booking && !checkIn.loading && !checkIn.allSubmitted
  const submittedCount = checkIn.states.filter((x) => x !== 'missing').length
  const rejectedCount = checkIn.states.filter((x) => x === 'rejected').length
  const checkInHint = checkIn.anyRejected
    ? 'An ID needs attention. Please re-upload'
    : checkIn.allSubmitted
      ? 'Your documents are being verified'
      : submittedCount > 0
        ? 'Finish uploading the ID’s of all guests'
        : 'Skip the desk and walk straight to your room'
  const quickRef = useRef<HTMLElement>(null)
  useDragScroll(quickRef)

  // Stay summary from the resolved booking; fall back to the sample stay.
  const stay = useMemo(() => {
    if (!booking) return staticStay
    const fullName = booking.primaryGuestName || guest?.fullName || staticStay.guestName
    return {
      guestName: fullName.split(' ')[0],
      checkIn: formatDayMonth(booking.arrivalDate) || staticStay.checkIn,
      checkOut: formatDayMonth(booking.checkoutDate) || staticStay.checkOut,
      // Adults + children on the booking (infants aren't counted).
      guests: String((booking.numberOfGuests ?? 0) + (booking.numberOfChildren ?? 0) || staticStay.guests),
    }
  }, [booking, guest])

  const cfg = useAppConfig()
  const discounted = useDiscounted()

  // Experience callout carousel. Once the property has saved the Guest App builder it shows exactly
  // the experiences / spa treatments curated there (filtered to the guest's stage); before that it
  // falls back to spotlight experiences, then the general catalog (never the built-in samples).
  const { data: spotlight } = useFetch(() => getSpotlightExperiences(), [])
  const { data: allExp } = useFetch(() => getExperiences(), [])
  const { data: spa } = useFetch(() => getSpaFacilities(), [])
  // Staff set the Spa hub to Hidden: the guest list comes back empty, so every spa banner / link goes away.
  const spaHidden = spa != null && spa.length === 0
  // The built-in Ayurveda banner waits for the spa list, so it never flashes up for a hidden spa.
  const showSpaBanner = spa != null && !spaHidden
  const experiences = useMemo<Callout[]>(() => {
    const expCard = (e: ApiExperience, i: number, badge: string | null): Callout => {
      const base = e.pricing?.basePrice ?? 0
      const priced = discounted('experience', e._id, base)
      return {
        id: e._id,
        image: e.imageUrl || HOME_EXP_FALLBACKS[i % HOME_EXP_FALLBACKS.length],
        badge,
        title: e.title,
        subtitle: e.shortDescription || '',
        time: '',
        price:
          priced.original != null ? (
            <PriceText priced={priced} unit={priceUnit(expUnit(e))} currency={e.pricing?.currency} />
          ) : (
            formatPriceWithUnit(base, expUnit(e), e.pricing?.currency)
          ),
      }
    }

    if (cfg.configured) {
      const out: Callout[] = []
      for (const it of (cfg.guestApp.expCalloutItems ?? []).filter((x) => cfg.showsInStage(x.stage))) {
        if (it.sourceType === 'experience') {
          const e = allExp?.find((x) => x._id === it.sourceId)
          if (e) out.push(expCard(e, out.length, it.badge || null))
          continue
        }
        for (const facility of spa ?? []) {
          for (const cat of facility.categories ?? []) {
            const t = cat.treatments?.find((x) => x._id === it.sourceId)
            if (!t) continue
            const priced = discounted('spa', t._id, t.price ?? 0)
            out.push({
              id: facility._id,
              spa: true,
              image: t.imageUrl || t.image || facility.listingImage || ayurveda,
              badge: it.badge || null,
              title: t.name,
              subtitle: t.description || '',
              time: '',
              price: t.price ? <PriceText priced={priced} unit={priceUnit(t.pricingLabel)} /> : 'On request',
            })
          }
        }
      }
      return out
    }

    const source = spotlight && spotlight.length > 0 ? spotlight : (allExp ?? [])
    if (source.length === 0) return []
    return source.slice(0, 5).map((e, i) => expCard(e, i, null))
  }, [spotlight, allExp, spa, cfg, discounted])

  // Gallery collage — only the photos the property starred in Settings → Gallery (the Gallery page
  // itself lists them all).
  const property = cfg.settings
  const gallery = useMemo(() => {
    const photos = (property?.gallery ?? []).filter((g) => g.featured).map((g) => g.photo).filter(Boolean)
    return photos.slice(0, 7)
  }, [property])

  // Spotlight banners + event cards from the dashboard builder (stage- and date-filtered); the
  // built-in Ayurveda / Loyalty banners only show until the property has configured its own.
  const spotlightItems = useMemo(() => {
    const g: ApiGuestApp = cfg.guestApp
    return (g.spotlightItems ?? []).filter((x) => cfg.showsInStage(x.stage))
  }, [cfg])
  const eventItems = useMemo(() => {
    const today = localDay()
    return (cfg.guestApp.eventItems ?? []).filter(
      (e) => (!e.activeFrom || today >= e.activeFrom) && (!e.activeUntil || today <= e.activeUntil),
    )
  }, [cfg])

  // targetLink: '' = details page, 'app:<Page>' = guest app page, else a URL.
  const openEvent = (ev: (typeof eventItems)[number]) => {
    const link = ev.targetLink?.trim()
    if (!link) navigate('event-detail', ev.id)
    else if (link.startsWith('app:')) {
      const dest = SPOTLIGHT_TARGET[link.slice(4)]
      navigate(dest ?? 'event-detail', dest ? undefined : ev.id)
    } else window.open(/^https?:\/\//i.test(link) ? link : `https://${link}`, '_blank', 'noopener')
  }

  // Today's Plan — aggregate the guest's own bookings that fall on today.
  const { data: expBookings } = useFetch(() => getGuestExperienceBookings(guestId as string), [guestId], !!guestId)
  const { data: spaBookings } = useFetch(() => getGuestSpaBookings(guestId as string), [guestId], !!guestId)
  const { data: diningBookings } = useFetch(() => getGuestDiningReservations(guestId as string), [guestId], !!guestId)

  const todaysPlan = useMemo<PlanItem[]>(() => {
    const nowMin = new Date().getHours() * 60 + new Date().getMinutes()
    const statusFor = (slot: number | null): PlanStatus => {
      if (slot == null) return 'upcoming'
      if (slot + 90 < nowMin) return 'done'
      if (slot <= nowMin) return 'now'
      return 'upcoming'
    }
    const items: PlanItem[] = []

    for (const b of expBookings ?? []) {
      if (b.bookingStatus === 'cancelled' || !isToday(b.date)) continue
      const slot = minutesOfDay(b.timeSlot)
      items.push({
        title: b.experienceName, detail: 'Experience',
        meta: b.bookingStatus === 'confirmed' ? 'Booked' : '',
        time: b.timeSlot || '', status: statusFor(slot), sort: slot ?? 9999,
      })
    }
    for (const b of spaBookings ?? []) {
      if (b.status === 'Cancelled' || !isToday(b.date)) continue
      const slot = minutesOfDay(b.timeSlot)
      items.push({
        title: b.treatmentName, detail: 'Spa',
        meta: b.status === 'In Progress' ? 'In progress' : 'Booked',
        time: b.timeSlot || '', status: statusFor(slot), sort: slot ?? 9999,
      })
    }
    for (const b of diningBookings ?? []) {
      if (b.status === 'cancelled' || !isToday(b.date)) continue
      items.push({
        title: b.facilityName, detail: 'Dining',
        meta: b.status === 'confirmed' ? 'Confirmed' : '',
        time: '', status: 'upcoming', sort: 10000,
      })
    }

    return items
      .sort((a, b) => a.sort - b.sort)
      .map((it) => ({ ...it, time: it.status === 'now' ? 'Now' : it.time.toLowerCase() }))
  }, [expBookings, spaBookings, diningBookings])

  const homeBlocks: Record<HomeSectionKey, ReactNode> = {
      quickActions: cfg.home.quickActions && (
        <nav className="quick-actions" aria-label="Quick actions" ref={quickRef}>
          {quickActions
            .filter((a) => {
              const key = QA_KEY[a.label as keyof typeof QA_KEY]
              if (key === 'inRoomDining' && !cfg.inRoomOrderingEnabled) return false
              return !cfg.configured || cfg.quickActionOn(key)
            })
            .map((a) => {
            // Map the quick action to a screen or popup where one exists (others are inert for now).
            const target =
              a.label === 'Transport'
                ? 'transport'
                : a.label === 'Facilities'
                  ? 'facilities'
                  : a.label === 'In-room Dining'
                    ? 'dining-menus'
                    : null
            const sheet: SheetKind | null =
              a.label === 'WiFi Details'
                ? 'wifi'
                : a.label === 'Directory'
                  ? 'directory'
                  : a.label === 'Directions'
                    ? 'directions'
                    : null
            return (
              <button
                className="quick-action"
                key={a.label}
                onClick={
                  target ? () => navigate(target) : sheet ? () => setSheet(sheet) : undefined
                }
              >
                <img className="quick-action__icon" src={a.icon} alt="" />
                <span className="quick-action__label">{a.label}</span>
              </button>
            )
          })}
        </nav>
        ),
      expCallout: cfg.home.expCallout && experiences.length > 0 && (
        <section
          className="experiences"
          style={{ backgroundImage: `url(${experiencesBg})` }}
        >
          <div className="section">
            <SectionHeading
              title={cfg.guestApp.expCalloutTitle?.trim() || 'Experiences'}
              action={cfg.pageEnabled.experiences ? 'View all →' : undefined}
              onAction={() => navigate('experiences-all')}
            />
            <ScrollRow className="experiences__list">
              {experiences.map((exp) => (
                <article
                  className="exp-card"
                  key={exp.id ?? exp.title}
                  onClick={() => exp.id && (exp.spa ? navigate('spa') : navigate('experience-detail', exp.id))}
                  style={exp.id ? { cursor: 'pointer' } : undefined}
                >
                  <div className="exp-card__media">
                    <img src={exp.image} alt={exp.title} />
                    {exp.badge && (
                      <span className="exp-card__badge">{exp.badge}</span>
                    )}
                  </div>
                  <div className="exp-card__body">
                    <h3 className="font-display">{exp.title}</h3>
                    <div className="exp-card__meta">
                      {exp.time && (
                        <>
                          <span className="exp-card__meta-item">
                            <img src={icClock} alt="" />
                            {exp.time}
                          </span>
                          <img className="dot" src={icDot} alt="" />
                        </>
                      )}
                      <span>{exp.price}</span>
                    </div>
                  </div>
                </article>
              ))}
            </ScrollRow>
          </div>
        </section>
        ),
      todaysPlan: cfg.home.todaysPlan && todaysPlan.length > 0 && (
        <section className="section plan-section">
          <img className="plan__leaf" src={planLeaf} alt="" />
          <SectionHeading title="Today’s Plan" />
          <div className="plan">
            {todaysPlan.map((p, i) => (
              <div className="plan__item" key={`${p.title}-${i}`}>
                <div
                  className={`plan__card ${
                    p.status === 'upcoming' ? 'plan__card--muted' : ''
                  }`}
                >
                  <div className="plan__card-head">
                    <h4>{p.title}</h4>
                    <p>{p.detail}</p>
                  </div>
                  {p.meta && <span className="plan__meta">{p.meta}</span>}
                </div>
                <div className="plan__marker">
                  <img src={icTimelineDot} alt="" />
                  <span
                    className={p.status === 'now' ? 'plan__time--now' : ''}
                  >
                    {p.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
        ),
      spotlight:
        !cfg.configured ? (
        <div className="spa-loyalty">
          {showSpaBanner && (
          <section className="ayurveda" style={{ backgroundImage: `url(${ayurveda})` }}>
            <div className="ayurveda__overlay" />
            <div className="ayurveda__content">
              <h2 className="font-display ayurveda__title">Ayurveda Centre</h2>
              <p className="ayurveda__desc">
                Our expert masseurs and masseuses harness the ancient secrets of
                the world's oldest healing system to rejuvenate, regenerate and
                revitalize you
              </p>
              <button className="btn btn--primary" onClick={() => navigate('spa')}>View Details →</button>
            </div>
          </section>
          )}

          <div className="section loyalty-wrap">
            <div className="loyalty">
              <div className="loyalty__text">
                <h3 className="font-display">Loyalty Programme</h3>
                <p>Get 20% off on all experiences</p>
              </div>
              <div className="loyalty__media" style={{ backgroundImage: `url(${loyalty})` }} />
            </div>
            <img className="carousel-dots" src={carouselDots} alt="" />
          </div>
        </div>
      ) : (
            cfg.home.spotlight &&
              spotlightItems.filter((sp) => !(spaHidden && SPOTLIGHT_TARGET[sp.ctaTarget] === 'spa')).map((sp) => (
                <div className="spa-loyalty" key={sp.id}>
                  <section className="ayurveda" style={{ backgroundImage: `url(${sp.image || ayurveda})` }}>
                    <div className="ayurveda__overlay" />
                    <div className="ayurveda__content">
                      <h2 className="font-display ayurveda__title">{sp.title}</h2>
                      <p className="ayurveda__desc">{sp.body}</p>
                      {SPOTLIGHT_TARGET[sp.ctaTarget] && (
                        <button className="btn btn--primary" onClick={() => navigate(SPOTLIGHT_TARGET[sp.ctaTarget])}>
                          View Details →
                        </button>
                      )}
                    </div>
                  </section>
                </div>
              ))
      ),
      events: cfg.configured && cfg.home.events && eventItems.length > 0 && (
              <EventCarousel
                items={eventItems.map((ev) => ({ id: ev.id, title: ev.title, subtext: ev.subtext, image: ev.image || loyalty }))}
                onOpen={(id) => {
                  const ev = eventItems.find((e) => e.id === id)
                  if (ev) openEvent(ev)
                }}
              />
            ),
      gallery: cfg.home.gallery && gallery.length > 0 && (
        <section className="section">
          <SectionHeading title="Gallery" action="View all →" onAction={() => navigate('gallery')} />
          <div className="gallery">
            {gallery.map((src, i) => (
              <div className={`gallery__item gallery__item--${i + 1}`} key={i}>
                <img src={src} alt="" />
              </div>
            ))}
          </div>
        </section>
        ),
  }
  const homeOrder = resolveHomeOrder(cfg.guestApp.homeSectionOrder)

  return (
    <div className="home">
      <MobileTopBar />
      <DesktopNav />

      <main className="home__content">
        {/* Hero + stay summary */}
        <section className={`hero ${needsCheckIn ? 'hero--checkin' : ''}`}>
          <div
            className="hero__media"
            style={{ backgroundImage: `url(${cfg.guestApp.heroImage || heroWelcome})` }}
          >
            <div className="hero__overlay" />
            <div className="hero__text">
              <h1 className="font-display">Welcome {stay.guestName}!</h1>
              <button className="hero__link" type="button" onClick={() => navigate('about')}>
                Click here to learn more about the property →
              </button>
            </div>
          </div>
          <div className="hero__stats">
            <div className="hero__stat">
              <span className="hero__stat-label">Check-in</span>
              <span className="hero__stat-value">{stay.checkIn}</span>
            </div>
            <div className="hero__stat">
              <span className="hero__stat-label">Check-out</span>
              <span className="hero__stat-value">{stay.checkOut}</span>
            </div>
            <div className="hero__stat">
              <span className="hero__stat-label">Guests</span>
              <span className="hero__stat-value">{stay.guests}</span>
            </div>
            <div className="hero__filler" aria-hidden />
          </div>
          {needsCheckIn && checkIn.anyRejected && (
            <button className="hero__checkin hero__checkin--rejected" type="button" onClick={() => navigate('checkin')}>
              <span className="hero__checkin-icon"><WarnIcon size={28} /></span>
              <span className="hero__checkin-text">
                <span className="hero__checkin-title">
                  {rejectedCount} {rejectedCount === 1 ? 'guest' : 'guests'} check-in rejected
                </span>
                <span className="hero__checkin-hint">Please click here to re-upload the correct documents →</span>
              </span>
            </button>
          )}
          {needsCheckIn && !checkIn.anyRejected && (
            <button className="hero__checkin" type="button" onClick={() => navigate('checkin')}>
              <img className="hero__checkin-icon" src={icCheckin} alt="" />
              <span className="hero__checkin-text">
                <span className="hero__checkin-title">Complete check-in →</span>
                <span className="hero__checkin-hint">{checkInHint}</span>
              </span>
            </button>
          )}
        </section>

        {homeOrder.map((k) => (
          <Fragment key={k}>{homeBlocks[k]}</Fragment>
        ))}

      </main>

      <Footer />

      <BottomNav />

      {sheet && <InfoSheet kind={sheet} onClose={() => setSheet(null)} />}
    </div>
  )
}
