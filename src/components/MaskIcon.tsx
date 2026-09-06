type MaskIconProps = {
  /** URL of an SVG exported from Figma. */
  src: string
  size?: number
  /** Any CSS color; defaults to the inherited text color. */
  color?: string
}

/**
 * Renders a monochrome SVG asset through a CSS mask so the exact vector data
 * from Figma is preserved while the colour still follows design tokens.
 *
 * The url() is quoted because Vite inlines small SVGs as data: URIs that contain
 * parentheses, which are invalid in an unquoted url() token.
 */
function MaskIcon({ src, size = 12, color = 'currentColor' }: MaskIconProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        flexShrink: 0,
        backgroundColor: color,
        maskImage: `url("${src}")`,
        WebkitMaskImage: `url("${src}")`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}

export default MaskIcon
