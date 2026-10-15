import ScreenChrome from '../../components/ScreenChrome'
import ScreenTitle from '../../components/ScreenTitle'
import { useNav } from '../../navigation/NavContext'
import { useAppConfig } from '../../guest/AppConfig'
import loyalty from '../../assets/home/loyalty.png'
import './About.css'

// Event details page — opened from a Home event banner that has no custom link.
// Content comes from the dashboard's Guest App builder (guestApp.eventItems).
export default function EventDetail() {
  const { param: eventId } = useNav()
  const cfg = useAppConfig()
  const ev = (cfg.guestApp.eventItems ?? []).find((e) => e.id === eventId)

  return (
    <ScreenChrome>
      <main className="evd">
        <ScreenTitle title={ev?.title || 'Event'} />
        {!ev && <p className="evd-status">This event is no longer available.</p>}
        {ev && (
          <>
            <div className="evd-hero">
              <img src={ev.image || loyalty} alt="" />
            </div>
            <div className="evd-body">
              <h2 className="font-display evd-name">{ev.title}</h2>
              {ev.subtext && <p className="evd-story">{ev.subtext}</p>}
              {ev.details && <p className="evd-story">{ev.details}</p>}
            </div>
          </>
        )}
      </main>
    </ScreenChrome>
  )
}
