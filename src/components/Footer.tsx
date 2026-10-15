import footerLeaf from '../assets/home/footer-leaf-accent.svg'
import footerSwash from '../assets/home/footer-swash.svg'
import { useAppConfig } from '../guest/AppConfig'
import './Footer.css'

// Shared "Evolve Back" sign-off footer (Figma 3417:9950) — a torn beige panel
// with a leaf accent top-left, a contour swash bottom-right, and left-aligned
// brand + tagline. Appears at the bottom of every in-stay screen.
export default function Footer() {
  // The property's own sign-off (Property Settings > Footer). An empty subtext stays empty (nothing is
  // shown); the Evolve Back copy only appears while the settings can't be read at all.
  const { settings } = useAppConfig()
  const heading = settings?.footerHeading?.trim() || 'Evolve Back'
  const tagline = settings
    ? (settings.footerSubtext ?? '').trim()
    : 'exquisite holiday experiences in the purity of nature and culture of the land'
  return (
    <footer className="footer">
      <img className="footer__leaf" src={footerLeaf} alt="" />
      <img className="footer__swash" src={footerSwash} alt="" />
      <div className="footer__text">
        <p className="font-display footer__brand">{heading}</p>
        {tagline && <p className="footer__tag">{tagline}</p>}
      </div>
    </footer>
  )
}
