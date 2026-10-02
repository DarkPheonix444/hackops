import { Link } from 'react-router-dom'

function BorrowerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  )
}

function LenderIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21V9" />
      <path d="m7 14 5-5 5 5" />
      <path d="M5 3h14" />
    </svg>
  )
}

const ROLES = [
  {
    id: 'for-borrowers',
    name: 'Borrowers',
    text: 'Find lending opportunities that fit your profile.',
    cta: "I'm a Borrower",
    Icon: BorrowerIcon,
  },
  {
    id: 'for-lenders',
    name: 'Lenders',
    text: 'Discover structured lending opportunities.',
    cta: "I'm a Lender",
    Icon: LenderIcon,
  },
]

function RoleCards() {
  return (
    <section className="section" id="roles">
      <div className="container">
        <div className="header center">
          <span className="eyebrow">Who It Is For</span>
          <h2 className="title">Built for both sides of lending</h2>
          <p className="subtitle">
            Whether you are looking to borrow or to lend, a structured profile
            makes the journey clearer.
          </p>
        </div>
        <div className="roles-grid">
          {ROLES.map((role) => (
            <article className="role-card" id={role.id} key={role.id}>
              <span className="role-icon">
                <role.Icon />
              </span>
              <h3 className="role-title">{role.name}</h3>
              <p className="role-text">{role.text}</p>
              <Link to="/signup" className="btn btn-primary">{role.cta}</Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default RoleCards
