function Card({ className = '', children }) {
  return (
    <div className={`ui-card${className ? ` ${className}` : ''}`}>
      {children}
    </div>
  )
}

export default Card
