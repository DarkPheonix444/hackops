import { Link } from 'react-router-dom'

// Unified button for every page. Renders a React Router link when `to`
// is provided, a plain anchor when `href` is provided, and a <button>
// otherwise, all sharing the Home page's button styles.
function Button({
  variant = 'primary',
  size,
  block = false,
  to,
  href,
  type,
  disabled = false,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'ui-btn',
    `ui-btn-${variant}`,
    size && `ui-btn-${size}`,
    block && 'ui-btn-block',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  if (to) {
    return (
      <Link to={to} className={classes} aria-disabled={disabled || undefined}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} aria-disabled={disabled || undefined}>
        {children}
      </a>
    )
  }

  return (
    <button type={type || 'button'} className={classes} disabled={disabled} {...rest}>
      {children}
    </button>
  )
}

export default Button
