// Warning triangle used by the check-in "rejected" notices (hub card, detail modal, Home banner).
export default function WarnIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="warn-icon" viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
      <path
        d="M12 3.5 2.8 19.5h18.4L12 3.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M12 10v4.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="12" cy="16.9" r="0.95" fill="currentColor" />
    </svg>
  )
}
