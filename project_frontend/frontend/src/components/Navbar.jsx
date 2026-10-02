import { useState } from 'react'
import { Link } from 'react-router-dom'

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

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
          <a href="#for-borrowers" onClick={() => setMenuOpen(false)}>For Borrowers</a>
          <a href="#for-lenders" onClick={() => setMenuOpen(false)}>For Lenders</a>
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="nav-login">Login</Link>
          <Link to="/signup" className="btn btn-primary">Get Started</Link>
        </div>
      </div>
    </header>
  )
}

export default Navbar
