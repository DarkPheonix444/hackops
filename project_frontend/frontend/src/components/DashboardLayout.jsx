import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Brand from './Brand.jsx'
import Button from './Button.jsx'

// Reusable authenticated application shell for dashboard and profile
// pages: a sticky navbar with HackOps branding, the page navigation,
// a logout action, a responsive mobile menu, and a simple footer.
// Dashboard functionality itself is intentionally left for later.
function DashboardLayout({ nav = [], children }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    setMenuOpen(false)
    navigate('/login')
  }

  return (
    <div className="ui-dash">
      <header className="ui-dash-navbar">
        <div className="ui-container ui-dash-navbar-inner">
          <Brand />

          <ul
            className={`ui-dash-nav${menuOpen ? ' open' : ''}`}
            aria-label="Primary"
          >
            {nav.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className={item.current ? 'active' : undefined}
                  aria-current={item.current ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>

          <div className="ui-dash-actions">
            <Button variant="secondary" size="sm" onClick={handleLogout}>
              Log out
            </Button>
            <button
              type="button"
              className="ui-dash-toggle"
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span className="ui-dash-toggle-bar" />
              <span className="ui-dash-toggle-bar" />
              <span className="ui-dash-toggle-bar" />
            </button>
          </div>
        </div>
      </header>

      <main className="ui-dash-main">
        <div className="ui-container">{children}</div>
      </main>

      <footer className="ui-dash-footer">
        <div className="ui-container">
          <p>© 2026 HackOps. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}

export default DashboardLayout
