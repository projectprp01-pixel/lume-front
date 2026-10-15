import { useEffect, useMemo, useRef, useState } from 'react'
import { useNav } from '../../navigation/NavContext'
import { useGuest } from '../../guest/GuestContext'
import { partySize, summarizeCheckIn } from '../../guest/checkInStatus'
import { useAppConfig } from '../../guest/AppConfig'
import WarnIcon from '../../components/WarnIcon'
import { useFetch } from '../../api/useFetch'
import {
  getCheckInByGuest,
  initializeCheckIn,
  uploadCheckInId,
  completeCheckIn,
  updateGuestContact,
} from '../../api/endpoints'
import { maybeCompressImage } from '../../api/image'
import { primaryGuest, checkInSlots } from './preStayData'
import ebLogo from '../../assets/home/eb-logo.png' // wordmark trimmed to its bbox (the prearrival one has big padding)
import icShare from '../../assets/prearrival/ic-share.svg'
import icEdit from '../../assets/prearrival/ic-edit.svg'
import icClose from '../../assets/prearrival/ic-close.svg'
import icAdd from '../../assets/prearrival/ic-add.svg'
import CountryCode, { normalizeDial } from '../../components/CountryCode'
import './CheckIn.css'

type Modal = { guestNumber: number; name: string; mode: 'edit' | 'add' } | null

const MAX_IMAGE_BYTES = 10 * 1024 * 1024
const MAX_PDF_BYTES = 15 * 1024 * 1024
const ACCEPT = '.jpg,.jpeg,.png,.heic,.webp,.pdf,image/*,application/pdf'

function isPdf(file: File): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

function validateFile(file: File): string | null {
  const max = isPdf(file) ? MAX_PDF_BYTES : MAX_IMAGE_BYTES
  if (file.size > max) {
    return isPdf(file) ? 'PDF is larger than 15 MB.' : 'Image is larger than 10 MB.'
  }
  return null
}

// Online check-in — the pre-stay landing. The primary guest (resolved from the
// booking token) is pre-filled; each person's ID is uploaded to Cloudflare R2 via
// the backend, and the whole check-in is submitted for review. Faithful to Figma
// nodes 2946:14008 (hub), 1703:3598 (primary guest details), 2552:8134 / 2683:11655 (modal).
// The primary guest's card opens a modal with their details pre-filled (plus their ID upload);
// every other guest opens the general modal (name + ID upload). The hub's button continues to the app.
// Thumbnail of a chosen ID file: the image itself, or a "PDF" / "HEIC" tile for files a browser can't draw.
function FileThumb({ file }: { file: File }) {
  const heic = /hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)
  const drawable = file.type.startsWith('image/') && !heic
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!drawable) return setUrl(null)
    const u = URL.createObjectURL(file)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file, drawable])
  if (drawable && url) return <img className="ci-upload__thumb" src={url} alt="ID preview" />
  const kind = file.type === 'application/pdf' ? 'PDF' : heic ? 'HEIC' : 'FILE'
  return <div className="ci-upload__thumb ci-upload__thumb--file" aria-hidden>{kind}</div>
}

export default function CheckIn() {
  const { navigate } = useNav()
  const { guest, booking, guestId, token, refresh } = useGuest()
  const cfg = useAppConfig()
  const [shareNote, setShareNote] = useState<string | null>(null)

  // Shares this booking's link, opening straight on the check-in form. Check-in progress lives on the
  // server, so whoever opens it sees the same people and can add their own ID from their own phone.
  const shareLink = async () => {
    if (!token) return
    const url = `${window.location.origin}/g/${encodeURIComponent(token)}#/checkin`
    const title = 'Online check-in'
    const text = 'Please add your ID for our check-in'
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
        return
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return // guest closed the share sheet
    }
    try {
      await navigator.clipboard.writeText(url)
      setShareNote('Link copied. Paste it to your guests.')
    } catch {
      window.prompt('Copy this link and send it to your guests:', url)
    }
  }
  const [modal, setModal] = useState<Modal>(null)

  // Existing check-in for this guest (progress is saved server-side).
  const { data: checkIn, refetch } = useFetch(
    () => getCheckInByGuest(guestId as string),
    [guestId],
    !!guestId,
    { live: false }, // an in-progress upload form must not be refreshed underneath the guest
  )

  // The session id: from an existing check-in, or set once we create one.
  const [sessionId, setSessionId] = useState<string | null>(null)
  const checkInId = sessionId ?? checkIn?._id ?? null

  // Per-person upload UI state.
  const [personName, setPersonName] = useState('')
  const [primaryFirst, setPrimaryFirst] = useState('')
  const [primaryLast, setPrimaryLast] = useState('')
  const [primaryEmail, setPrimaryEmail] = useState('')
  const [primaryPhone, setPrimaryPhone] = useState('')
  const [primaryCode, setPrimaryCode] = useState('+91')
  const [front, setFront] = useState<File | null>(null)
  const [back, setBack] = useState<File | null>(null)
  const [showBack, setShowBack] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const frontInput = useRef<HTMLInputElement>(null)
  const backInput = useRef<HTMLInputElement>(null)

  // Live identity, with the static sample as a fallback before data resolves.
  const { fullName, firstName, lastName, email, phone } = useMemo(() => {
    const name = guest?.fullName || booking?.primaryGuestName || `${primaryGuest.firstName} ${primaryGuest.lastName}`
    const parts = name.trim().split(/\s+/)
    return {
      fullName: name,
      firstName: parts[0] ?? '',
      lastName: parts.slice(1).join(' '),
      email: guest?.email ?? primaryGuest.email,
      phone: guest?.mobileNumber ?? primaryGuest.phone,
    }
  }, [guest, booking])

  // Everyone on the booking checks in, children included (Guest Management keeps them in numberOfChildren).
  const totalGuests = partySize(booking) || checkInSlots
  const docs = checkIn?.guestDocuments ?? []
  // Per-person review state, so a rejected ID is flagged on its own card.
  const personStates = summarizeCheckIn(checkIn, totalGuests).states
  const idLabel = (n: number) =>
    ({ missing: 'Not Submitted', review: 'Submitted', approved: 'Verified', rejected: 'Rejected' })[
      personStates[n - 1] ?? 'missing'
    ]
  const isRejected = (n: number) => personStates[n - 1] === 'rejected'
  // A card is locked from the moment its ID is submitted until the front desk decides: approved stays locked,
  // rejected unlocks for re-upload. A locked card can't be opened and nothing can be re-submitted.
  const isLocked = (n: number) => ['review', 'approved'].includes(personStates[n - 1])
  // The front desk's reason for sending an ID back (entered in the property dashboard).
  const rejectionReasonOf = (n: number) =>
    docs.find((d) => d.guestNumber === n)?.rejectionReason?.trim() || 'Please re-upload the correct documents.'
  // The property's own check-in instructions (dashboard → Check-in Hub); the built-in wording until saved.
  const instructions = cfg.settings?.checkInInstructions?.trim()
  const completed = checkIn?.documentsCompleted ?? docs.length
  const uploaded = useMemo(
    () => new Set((checkIn?.guestDocuments ?? []).map((d) => d.guestNumber)),
    [checkIn],
  )
  const coGuestDocs = docs.filter((d) => d.guestNumber >= 2).sort((a, b) => a.guestNumber - b.guestNumber)
  const emptySlots = Math.max(0, totalGuests - 1 - coGuestDocs.length)

  // Next free co-guest slot (2..N) for "Add person".
  const nextCoGuest = useMemo(() => {
    for (let n = 2; n <= totalGuests; n++) if (!uploaded.has(n)) return n
    return null
  }, [uploaded, totalGuests])

  const openModal = (guestNumber: number, name: string) => {
    if (isLocked(guestNumber)) return
    setModal({ guestNumber, name, mode: uploaded.has(guestNumber) || guestNumber === 1 ? 'edit' : 'add' })
    setPersonName(name)
    setPrimaryFirst(firstName)
    setPrimaryLast(lastName)
    setPrimaryEmail(email)
    setPrimaryPhone(phone)
    setPrimaryCode(normalizeDial(guest?.countryCode) || '+91')
    setFront(null)
    setBack(null)
    setShowBack(false)
    setUploadError(null)
  }

  // Downscale big images before validating, so large phone photos rarely hit the
  // 10MB cap. PDFs/HEIC pass through untouched (compression is a no-op for them).
  const choose = async (file: File | null, set: (f: File | null) => void) => {
    setUploadError(null)
    if (!file) return set(null)
    setOptimizing(true)
    try {
      const processed = await maybeCompressImage(file, MAX_IMAGE_BYTES)
      const err = validateFile(processed)
      if (err) {
        setUploadError(err)
        return
      }
      set(processed)
    } finally {
      setOptimizing(false)
    }
  }
  const pickFront = (file: File | null) => choose(file, setFront)
  const pickBack = (file: File | null) => choose(file, setBack)

  // The primary guest can correct their name / email / phone / country code here; only changed fields are sent.
  const primaryName = `${primaryFirst} ${primaryLast}`.trim()
  const contactChanges = () => ({
    ...(primaryName && primaryName !== fullName ? { fullName: primaryName } : {}),
    ...(primaryEmail.trim() && primaryEmail.trim() !== email ? { email: primaryEmail.trim() } : {}),
    ...(primaryPhone.trim() !== phone ? { mobileNumber: primaryPhone.trim() } : {}),
    ...(primaryCode !== (normalizeDial(guest?.countryCode) || '+91') ? { countryCode: primaryCode } : {}),
  })
  const contactDirty = modal?.guestNumber === 1 && Object.keys(contactChanges()).length > 0

  const submitPerson = async () => {
    if (!modal || !guestId || !booking) return
    if (!front && !contactDirty) {
      setUploadError('Please choose an ID image (front).')
      return
    }
    if (modal.guestNumber === 1) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(primaryEmail.trim())) return setUploadError('Please enter a valid email.')
      if (primaryPhone.replace(/\D/g, '').length < 6) return setUploadError('Please enter a valid phone number.')
    }
    setBusy(true)
    setUploadError(null)
    try {
      if (contactDirty) {
        await updateGuestContact(guestId, contactChanges())
        await refresh()
        if (!front) {
          setModal(null) // details only — the ID can be added any time
          return
        }
      }
      if (!front) return
      let id = checkInId
      if (!id) {
        const session = await initializeCheckIn({
          bookingId: booking.bookingId,
          guestId,
          totalGuests,
        })
        id = session._id
        setSessionId(id)
      }
      await uploadCheckInId(id, {
        guestNumber: modal.guestNumber,
        guestName:
          (modal.guestNumber === 1 ? `${primaryFirst} ${primaryLast}`.trim() : personName.trim()) ||
          `Guest ${modal.guestNumber}`,
        idFront: front,
        idBack: back,
      })
      refetch()
      setModal(null)
    } catch (err) {
      setUploadError((err as Error).message || 'Upload failed. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  const continueToApp = async () => {
    // Submit for review if anything was uploaded; never block the guest if not.
    if (checkInId && completed > 0) {
      setBusy(true)
      try {
        await completeCheckIn(checkInId)
      } catch (err) {
        console.error('Complete check-in failed:', err)
      } finally {
        setBusy(false)
      }
      // Pick up the new 'submitted' status so Home doesn't show the check-in banner.
      await refresh()
    }
    navigate('home')
  }

  return (
    <div className="checkin prestay-page">
      <header className="prestay-topbar">
        <img className="prestay-topbar__logo" src={ebLogo} alt="Evolve Back" />
      </header>

      <main className="checkin__hub">
          <h1 className="font-display checkin__title">Online Check-in</h1>

          <div className="checkin__share">
            <button className="btn-pill" type="button" onClick={shareLink} disabled={!token}>
              Share Link to Form
              <img className="btn-pill__icon" src={icShare} alt="" />
            </button>
            <p className="checkin__share-note" role="status">
              {shareNote ?? 'Share the link above with other guests'}
            </p>
          </div>

          <hr className="checkin__rule" />

          <section className="checkin__progress">
            <p className="checkin__progress-label">{completed}/{totalGuests} persons completed</p>
            <div className="checkin__segments">
              {Array.from({ length: totalGuests }).map((_, i) => (
                <span
                  key={i}
                  className={`checkin__segment ${i < completed ? '' : 'checkin__segment--dim'}`}
                />
              ))}
            </div>
          </section>

          <button
            className="checkin__add"
            onClick={() => nextCoGuest && openModal(nextCoGuest, '')}
            disabled={!nextCoGuest}
          >
            + Add person
          </button>

          {/* Primary guest, then co-guests already uploaded */}
          {[{ n: 1, name: fullName }, ...coGuestDocs.map((d) => ({ n: d.guestNumber, name: d.guestName || `Guest ${d.guestNumber}` }))].map(
            ({ n, name }) => {
              const body = (
                <>
                  <span className="guest-row__main">
                    <span className="guest-row__num">{n}</span>
                    <span className="guest-row__field">
                      <span className="guest-row__label">Guest Name</span>
                      <span className="guest-row__value">{name}</span>
                    </span>
                    <span className="guest-row__field">
                      <span className="guest-row__label">ID Proof</span>
                      <span className="guest-row__value">{idLabel(n)}</span>
                    </span>
                    {isLocked(n) ? (
                      <span className="guest-row__lock" aria-label="Locked">
                        <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
                          <rect x="5" y="10.5" width="14" height="9.5" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          <path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
                        </svg>
                      </span>
                    ) : (
                      <img className="guest-row__edit" src={icEdit} alt="Edit" />
                    )}
                  </span>
                  {isRejected(n) && (
                    <span className="guest-row__reject">
                      <WarnIcon />
                      <span>Please click here to re-upload the correct documents →</span>
                    </span>
                  )}
                </>
              )
              // A locked (submitted / approved) card isn't a button, so it can't be reopened.
              return isLocked(n) ? (
                <div key={n} className="guest-row guest-row--locked">
                  {body}
                </div>
              ) : (
                <button key={n} className={`guest-row ${isRejected(n) ? 'guest-row--rejected' : ''}`} onClick={() => openModal(n, name)}>
                  {body}
                </button>
              )
            },
          )}

          {/* Remaining empty slots */}
          {Array.from({ length: emptySlots }).map((_, i) => (
            <div className="guest-row guest-row--empty" key={i} aria-hidden />
          ))}

          <div className="checkin__footer">
            <button className="btn-primary" onClick={continueToApp} disabled={busy}>
              {busy ? 'Submitting…' : 'Continue to WebApp'}
            </button>
          </div>
      </main>
      {modal && (
        <div className="ci-modal" role="dialog" aria-modal="true">
          <div className="ci-modal__backdrop" onClick={() => !busy && setModal(null)} />
          <div className="ci-modal__sheet">
            <div className="ci-modal__head">
              <h2 className="font-display ci-modal__title">
                {modal.mode === 'edit' ? 'Edit Details' : 'Add Person'}
              </h2>
              <button className="ci-modal__close" onClick={() => !busy && setModal(null)} aria-label="Close">
                <img src={icClose} alt="" />
              </button>
            </div>

            {instructions ? (
              <p className="ci-modal__intro ci-modal__intro--pre">{instructions}</p>
            ) : (
              <>
                <p className="ci-modal__intro">
                  Please submit the documents of all the guests. Progress will be saved.
                </p>
                <p className="ci-modal__intro">
                  <strong>Foreign nationals</strong>- Passport
                  <br />
                  <strong>Indian citizens</strong>- PAN
                </p>
              </>
            )}

            {modal.guestNumber === 1 ? (
              <>
                <p className="ci-modal__intro">Please confirm the primary guest's details.</p>
                <label className="ci-field">
                  <span className="ci-field__label">First Name</span>
                  <input className="ci-field__input" value={primaryFirst} onChange={(e) => setPrimaryFirst(e.target.value)} />
                </label>
                <label className="ci-field">
                  <span className="ci-field__label">Last Name</span>
                  <input className="ci-field__input" value={primaryLast} onChange={(e) => setPrimaryLast(e.target.value)} />
                </label>
                <label className="ci-field">
                  <span className="ci-field__label">Email</span>
                  <input
                    className="ci-field__input"
                    type="email"
                    value={primaryEmail}
                    onChange={(e) => setPrimaryEmail(e.target.value)}
                  />
                </label>
                <div className="ci-field">
                  <span className="ci-field__label">Phone Number</span>
                  <div className="ci-field__input ci-field__input--phone">
                    <CountryCode className="ci-phone-prefix" value={primaryCode} onChange={setPrimaryCode} />
                    <input
                      className="ci-phone-number"
                      type="tel"
                      value={primaryPhone}
                      onChange={(e) => setPrimaryPhone(e.target.value)}
                      aria-label="Phone number"
                    />
                  </div>
                </div>
              </>
            ) : (
              <label className="ci-field">
                <span className="ci-field__label">Full Name</span>
                <input
                  className="ci-field__input"
                  value={personName}
                  onChange={(e) => setPersonName(e.target.value)}
                  placeholder="Full name as on ID"
                />
              </label>
            )}

            <div className="ci-upload-group">
              <span className="ci-field__label">Upload ID {showBack ? '(Front)' : ''}</span>
              <input
                ref={frontInput}
                type="file"
                accept={ACCEPT}
                hidden
                onChange={(e) => pickFront(e.target.files?.[0] ?? null)}
              />
              {front ? (
                <div className="ci-upload ci-upload--filled">
                  <img className="ci-upload__edit" src={icEdit} alt="Replace" onClick={() => frontInput.current?.click()} />
                  <FileThumb file={front} />
                  <span className="ci-upload__name">{front.name}</span>
                  <img className="ci-upload__remove" src={icClose} alt="Remove" onClick={() => pickFront(null)} />
                </div>
              ) : (
                <button type="button" className="ci-upload" onClick={() => frontInput.current?.click()}>
                  <img className="ci-upload__add" src={icAdd} alt="" />
                  <p className="ci-upload__text">click to choose files</p>
                  <p className="ci-upload__hint">Images ≤10 MB · PDF ≤15 MB</p>
                </button>
              )}
            </div>

            {showBack && (
              <div className="ci-upload-group">
                <span className="ci-field__label">Upload ID (Back)</span>
                <input
                  ref={backInput}
                  type="file"
                  accept={ACCEPT}
                  hidden
                  onChange={(e) => pickBack(e.target.files?.[0] ?? null)}
                />
                {back ? (
                  <div className="ci-upload ci-upload--filled">
                    <img className="ci-upload__edit" src={icEdit} alt="Replace" onClick={() => backInput.current?.click()} />
                    <FileThumb file={back} />
                    <span className="ci-upload__name">{back.name}</span>
                    <img className="ci-upload__remove" src={icClose} alt="Remove" onClick={() => pickBack(null)} />
                  </div>
                ) : (
                  <button type="button" className="ci-upload" onClick={() => backInput.current?.click()}>
                    <img className="ci-upload__add" src={icAdd} alt="" />
                    <p className="ci-upload__text">click to choose files</p>
                    <p className="ci-upload__hint">Images ≤10 MB · PDF ≤15 MB</p>
                  </button>
                )}
              </div>
            )}

            {!showBack && (
              <button className="ci-add-id" onClick={() => setShowBack(true)}>+ Add ID (back)</button>
            )}

            {isRejected(modal.guestNumber) && (
              <div className="ci-reject" role="alert">
                <WarnIcon />
                <span>{rejectionReasonOf(modal.guestNumber)}</span>
              </div>
            )}

            {uploadError && <p className="ci-modal__error">{uploadError}</p>}

            <button
              className="btn-primary ci-modal__submit"
              onClick={submitPerson}
              disabled={busy || optimizing || (!front && !contactDirty)}
            >
              {optimizing ? 'Optimizing…' : busy ? 'Uploading…' : !front && contactDirty ? 'Save details' : 'Submit'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
