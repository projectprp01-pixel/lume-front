import { useNav } from '../navigation/NavContext'
import './NotAvailable.css'

// Shown when staff have switched a section off ("Hidden" in the dashboard) but a guest still lands on it
// (an old link, an open tab, the Home banner before it refreshed).
export default function NotAvailable({ title, text }: { title: string; text?: string }) {
  const { navigate } = useNav()
  return (
    <div className="na">
      <h1 className="font-display na__title">{title}</h1>
      <p className="na__text">{text ?? 'Please check back later, or ask the front desk and they will be happy to help.'}</p>
      <button className="na__btn" onClick={() => navigate('home')}>Back to Home</button>
    </div>
  )
}
