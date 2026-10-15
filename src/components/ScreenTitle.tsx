import { useNav, type Screen } from '../navigation/NavContext'
import icBack from '../assets/nav/ic-back.svg'
import './ScreenTitle.css'

// Back arrow + screen heading row (Figma: 24px Jazmin Medium). Back returns to
// `back` (default Home).
export default function ScreenTitle({ title, back = 'home' }: { title: string; back?: Screen }) {
  const { navigate } = useNav()
  return (
    <div className="screen-title">
      <button className="screen-title__back" onClick={() => navigate(back)} aria-label="Back">
        <img src={icBack} alt="" />
      </button>
      <h1 className="font-display screen-title__text">{title}</h1>
    </div>
  )
}
