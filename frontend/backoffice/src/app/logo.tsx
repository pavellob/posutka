export function Logo({ className, ...props }: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 24" {...props} className={className}>
      <text
        x="0"
        y="18"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="600"
        fill="currentColor"
        letterSpacing="-0.02em"
      >
        КАКДОМА
      </text>
    </svg>
  )
}
