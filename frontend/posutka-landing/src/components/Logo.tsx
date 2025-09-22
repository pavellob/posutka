export function Logo(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg aria-hidden="true" viewBox="0 0 100 24" {...props}>
      <text
        x="0"
        y="18"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize="20"
        fontWeight="600"
        fill="#0F172A"
        letterSpacing="-0.02em"
      >
        KAKDOMA
      </text>
    </svg>
  )
}
