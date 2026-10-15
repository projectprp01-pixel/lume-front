import { useEffect, useRef, useState } from 'react'
import './PdfThumb.css'

// First-page preview of a PDF (menus). pdf.js is loaded only when a PDF is actually shown. Reading the
// file needs the storage bucket to allow cross-origin reads (CORS); when it doesn't, or the file can't be
// rendered, a plain "PDF" document tile is shown instead so the card never looks empty.
export default function PdfThumb({ url }: { url: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    let task: { destroy: () => Promise<void> } | null = null
    setReady(false)
    ;(async () => {
      try {
        const pdfjs = await import('pdfjs-dist')
        const worker = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
        pdfjs.GlobalWorkerOptions.workerSrc = worker
        const loading = pdfjs.getDocument({ url })
        task = loading
        const doc = await loading.promise
        const page = await doc.getPage(1)
        const el = canvas.current
        if (cancelled || !el) return
        const base = page.getViewport({ scale: 1 })
        // Draw at ~2x the card width (156px) so the thumbnail stays sharp on phones.
        const viewport = page.getViewport({ scale: (156 / base.width) * Math.min(window.devicePixelRatio || 1, 2) })
        el.width = viewport.width
        el.height = viewport.height
        await page.render({ canvas: el, viewport }).promise
        if (!cancelled) setReady(true)
      } catch {
        /* CORS / unreadable file: keep the document tile */
      }
    })()
    return () => {
      cancelled = true
      task?.destroy().catch(() => {})
    }
  }, [url])

  return (
    <span className="pdfthumb">
      <canvas ref={canvas} className="pdfthumb__canvas" style={{ opacity: ready ? 1 : 0 }} />
      {!ready && (
        <span className="pdfthumb__doc" aria-hidden>
          <svg viewBox="0 0 24 24" width="36" height="36">
            <path
              d="M6 2.5h8.5L19 7v13.5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-17a1 1 0 0 1 1-1Z M14 2.5V7h5 M8.5 13h7 M8.5 16.5h7 M8.5 9.5h3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>PDF</span>
        </span>
      )}
    </span>
  )
}
