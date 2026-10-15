import PageShell from '../../components/PageShell'
import ScreenTitle from '../../components/ScreenTitle'
import Footer from '../../components/Footer'
import { useNav } from '../../navigation/NavContext'
import { useFetch } from '../../api/useFetch'
import { getInRoomMenu } from '../../api/endpoints'
import { formatClock } from '../../api/format'
import icClock from '../../assets/dining/ic-clock.svg'
import './InRoomDining.css'

// "Menus" (Figma "Home- Menus" 2209:22583): the in-room dining menus by meal, each
// with its serving hours. Tapping one opens the in-room menu on that meal.
export default function DiningMenus() {
  const { navigate } = useNav()
  const { data: menu, loading, error } = useFetch(() => getInRoomMenu(), [])
  const categories = menu?.categories ?? []

  return (
    <PageShell>
      <main className="ird ird--menus">
        <div className="ird-head">
          <ScreenTitle title="Menus" back="inroom-dining" />
        </div>

        {loading && !menu && <p className="ird-status">Loading the menus…</p>}
        {error && !menu && <p className="ird-status">Menus aren’t available right now.</p>}

        {categories.length > 0 && (
          <ul className="ird-menugrid">
            {categories.map((c) => (
              <li key={c._id}>
                <button className="ird-menutile" onClick={() => navigate('inroom-dining', c._id)}>
                  <span className="ird-menutile__img">{c.imageUrl && <img src={c.imageUrl} alt="" />}</span>
                  <span className="ird-menutile__name">{c.name}</span>
                  {c.openTime && c.closeTime && (
                    <span className="ird-menutile__hours">
                      <img src={icClock} alt="" />
                      {formatClock(c.openTime)} - {formatClock(c.closeTime)}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
      <Footer />
    </PageShell>
  )
}
