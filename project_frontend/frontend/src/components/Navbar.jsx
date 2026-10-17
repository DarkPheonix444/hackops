import { useState, useEffect, useNavigate } from 'react'
import { Link, NavLink } from 'react-router-dom'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    setIsAuthenticated(!!token)
  }, [])

  function navigate(path) {
    // Use window.location for navigation to avoid need for useNavigate at top level
    window.location.href = path
  }

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="brand" aria-label="HackOps — home">
          <span className="brand-mark" aria-hidden="true">H</span>
          HackOps
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-label="Toggle navigation menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="toggle-bar" />
          <span className="toggle-bar" />
          <span className="toggle-bar" />
        </button>

        <nav className={`nav-links${menuOpen ? ' open' : ''}`} aria-label="Primary">
          <Link to="/" onClick={() => setMenuOpen(false)}>Home</Link>
          <a href="#how-it-works" onClick={() => setMenuOpen(false)}>How It Works</a>
          {isAuthenticated ? (
            <>
              <a href="#for-borrowers" onClick={() => setMenuOpen(false)}>For Borrowers</a>
              <a href="#for-lenders" onClick={() => setMenuOpen(false)}>For Lenders</a>
            </>
          ) : (
            <>
              <a href="#for-borrowers" onClick={() => setMenuOpen(false)}>For Borrowers</a>
              <a href="#for-lenders" onClick={() => setMenuOpen(false)}>For Lenders</a>
            </>
          )}

          <div className="nav-actions">
            {isAuthenticated ? (
              <>
                <Link to="/common-profile" className="nav-login">My Profile</Link>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    localStorage.removeItem('access_token')
                    localStorage.removeItem('refresh_token')
                    navigate('/login')
                  }}
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav-login">Login</Link>
                <Link to="/signup" className="btn btn-primary">Get Started</Link>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  )
}

export default Navbar