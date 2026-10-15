import ScreenChrome from '../../components/ScreenChrome'
import ScreenTitle from '../../components/ScreenTitle'
import Footer from '../../components/Footer'
import { useFetch } from '../../api/useFetch'
import { getPropertySettings } from '../../api/endpoints'
import icClock from '../../assets/home/ic-clock.svg'
import './Facilities.css'

// Facilities list (Figma 655:3566) — live from property settings `facilities`
// (name, timing, days, photo), edited in the dashboard's Property Settings.
export default function Facilities() {
  const { data, loading } = useFetch(() => getPropertySettings(), [])
  const facilities = (data?.facilities ?? []).filter((f) => f.name)

  return (
    <ScreenChrome>
      <main className="fac">
        <ScreenTitle title="Facilities" />

        {loading && !data && <p className="fac-status">Loading facilities…</p>}
        {data && facilities.length === 0 && (
          <p className="fac-status">No facilities to show right now.</p>
        )}

        <div className="fac-grid">
          {facilities.map((f, i) => {
            const when = [f.timing, f.days].filter(Boolean).join(' • ')
            return (
              <article className="fac-card" key={`${f.name}-${i}`}>
                <div className="fac-card__media">
                  {f.photo && <img src={f.photo} alt={f.name} loading="lazy" />}
                </div>
                <div className="fac-card__body">
                  <h2 className="font-display fac-card__name">{f.name}</h2>
                  {when && (
                    <p className="fac-card__when">
                      <img src={icClock} alt="" />
                      <span>{when}</span>
                    </p>
                  )}
                </div>
              </article>
            )
          })}
        </div>

      </main>
      <Footer />
    </ScreenChrome>
  )
}
