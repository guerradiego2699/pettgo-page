interface PawPrintProps {
  className?: string
}

function PawPrint({ className }: PawPrintProps) {
  return (
    <svg viewBox="0 0 64 64" fill="currentColor" className={className} aria-hidden="true">
      <ellipse cx="32" cy="42" rx="16" ry="13" />
      <ellipse cx="12" cy="24" rx="7" ry="9" transform="rotate(-20 12 24)" />
      <ellipse cx="30" cy="14" rx="7.5" ry="9.5" />
      <ellipse cx="49" cy="18" rx="7" ry="9" transform="rotate(15 49 18)" />
      <ellipse cx="54" cy="34" rx="6" ry="7.5" transform="rotate(35 54 34)" />
    </svg>
  )
}

export default PawPrint
