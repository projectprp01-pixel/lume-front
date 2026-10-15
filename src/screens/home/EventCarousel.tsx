import { useRef, useState } from 'react'

// Home events: a swipeable row (one banner per page, scroll-snapped) with page dots underneath,
// as in Figma. Tapping a dot scrolls to that banner; swiping updates the active dot.
export type EventSlide = { id: string; title: string; subtext: string; image: string }

export default function EventCarousel({ items, onOpen }: { items: EventSlide[]; onOpen: (id: string) => void }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  const onScroll = () => {
    const el = track.current
    if (!el) return
    setActive(Math.round(el.scrollLeft / el.clientWidth))
  }
  const goTo = (i: number) => track.current?.scrollTo({ left: i * track.current.clientWidth, behavior: 'smooth' })

  return (
    <div className="section events">
      <div className="events__track" ref={track} onScroll={onScroll}>
        {items.map((ev) => (
          <div className="events__slide" key={ev.id} onClick={() => onOpen(ev.id)}>
            <div className="loyalty">
              <div className="loyalty__text">
                <h3 className="font-display">{ev.title}</h3>
                <p>{ev.subtext}</p>
              </div>
              <div className="loyalty__media" style={{ backgroundImage: `url(${ev.image})` }} />
            </div>
          </div>
        ))}
      </div>
      {items.length > 1 && (
        <div className="events__dots" role="tablist" aria-label="Events">
          {items.map((ev, i) => (
            <button
              key={ev.id}
              role="tab"
              aria-selected={i === active}
              aria-label={`Event ${i + 1}`}
              className={`events__dot ${i === active ? 'events__dot--on' : ''}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
