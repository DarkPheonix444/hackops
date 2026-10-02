import { Link } from 'react-router-dom'

const FOOTER_LINKS = [
  { label: 'Home', to: '/' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Borrowers', href: '#for-borrowers' },
  { label: 'For Lenders', href: '#for-lenders' },
  { label: 'Login', to: '/login' },
]

function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <span className="brand">
              <span className="brand-mark" aria-hidden="true">H</span>
              HackOps
            </span>
            <p>Smarter Lending. Better Borrowing.</p>
          </div>
          <nav className="footer-nav" aria-label="Footer">
            <ul className="footer-links">
              {FOOTER_LINKS.map((link) =>
                link.to ? (
                  <li key={link.label}>
                    <Link to={link.to}>{link.label}</Link>
                  </li>
                ) : (
                  <li key={link.label}>
                    <a href={link.href}>{link.label}</a>
                  </li>
                ),
              )}
            </ul>
          </nav>
        </div>
        <div className="footer-bottom">
          <p>© 2026 HackOps. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
