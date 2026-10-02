function Alert({ variant = 'error', children }) {
  return (
    <div
      className={`ui-alert ui-alert-${variant}`}
      role={variant === 'error' ? 'alert' : 'status'}
    >
      {children}
    </div>
  )
}

export default Alert
