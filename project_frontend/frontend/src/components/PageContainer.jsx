// Standard page wrapper: the `.ui-page` vertical rhythm plus the
// shared `.ui-container` max-width shell used across the app.
function PageContainer({ narrow = false, children }) {
  return (
    <div className="ui-page">
      <div className={`ui-container${narrow ? ' narrow' : ''}`}>{children}</div>
    </div>
  )
}

export default PageContainer
