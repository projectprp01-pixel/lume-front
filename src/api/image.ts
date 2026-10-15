// Client-side image downscaling so large phone photos don't hit the upload cap.
// No dependencies: decode → draw to a size-capped canvas → re-encode as JPEG,
// dropping quality until it fits. PDFs are returned untouched so the per-type size
// cap applies. HEIC/HEIF (iPhone photos) are converted to JPEG when the browser can
// decode them — the dashboard can't preview HEIC, and the backend only accepts the
// exact type image/heic. If they can't be decoded they're re-labelled image/heic so
// the backend takes them. Never throws — on any failure it returns the file as-is.

const COMPRESSIBLE = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_DIMENSION = 2400 // longest side, px — plenty for ID legibility

function loadImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) return createImageBitmap(file)
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = (e) => {
      URL.revokeObjectURL(url)
      reject(e)
    }
    img.src = url
  })
}

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

// Browsers report HEIC inconsistently (image/heic, image/heif, or '' on desktop), so
// go by extension too.
function isHeic(file: File): boolean {
  return /\.(heic|heif)$/i.test(file.name) || file.type === 'image/heic' || file.type === 'image/heif'
}

// Undecodable HEIC: keep the bytes, fix the label so the backend's type filter accepts it.
function asHeic(file: File): File {
  return file.type === 'image/heic' ? file : new File([file], file.name, { type: 'image/heic' })
}

export async function maybeCompressImage(file: File, maxBytes: number): Promise<File> {
  const heic = isHeic(file)
  if (!heic && !COMPRESSIBLE.includes(file.type)) return file
  if (!heic && file.size <= maxBytes) return file

  try {
    const bitmap = await loadImage(file)
    const srcW = (bitmap as ImageBitmap).width
    const srcH = (bitmap as ImageBitmap).height
    const scale = Math.min(1, MAX_DIMENSION / Math.max(srcW, srcH))
    const width = Math.round(srcW * scale)
    const height = Math.round(srcH * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return heic ? asHeic(file) : file
    // White matte so transparent PNGs don't turn black when flattened to JPEG.
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, width, height)

    let quality = 0.85
    let blob = await toJpegBlob(canvas, quality)
    while (blob && blob.size > maxBytes && quality > 0.4) {
      quality -= 0.15
      blob = await toJpegBlob(canvas, quality)
    }

    // Only use the result if it actually helped (a decoded HEIC is always replaced).
    if (!blob || (!heic && blob.size >= file.size)) return heic ? asHeic(file) : file
    const name = file.name.replace(/\.(png|webp|jpe?g|heic|heif)$/i, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg' })
  } catch {
    if (!heic) return file
    // The browser can't decode HEIC natively (Chrome/Edge) — convert with a library
    // that's only downloaded when a guest actually picks a HEIC photo.
    try {
      const { default: heic2any } = await import('heic2any')
      const out = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 })
      const blob = Array.isArray(out) ? out[0] : out
      const name = file.name.replace(/\.(heic|heif)$/i, '') + '.jpg'
      // Run the JPEG through the normal path so it still respects the size cap.
      return maybeCompressImage(new File([blob], name, { type: 'image/jpeg' }), maxBytes)
    } catch {
      return asHeic(file)
    }
  }
}
