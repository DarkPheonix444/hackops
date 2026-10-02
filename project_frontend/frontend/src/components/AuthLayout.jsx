import Brand from './Brand.jsx'

// Shared shell for the auth pages (Login, Signup): centered HackOps
// branding, a single clean card with a heading and supporting text,
// the page content (usually a form), and a footer link to the
// alternate auth page.
function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="ui-auth">
      <div className="ui-auth-brand">
        <Brand />
      </div>
      <div className="ui-auth-card">
        <div className="ui-auth-header">
          <h1 className="ui-auth-title">{title}</h1>
          {subtitle && <p className="ui-auth-subtitle">{subtitle}</p>}
        </div>
        {children}
      </div>
      {footer && <p className="ui-auth-footer">{footer}</p>}
    </div>
  )
}

export default AuthLayout
