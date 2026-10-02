function ListIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

const FEATURES = [
  {
    title: 'Structured Profiles',
    text: 'Complete, role-specific profiles make every application clear and consistent.',
    Icon: ListIcon,
  },
  {
    title: 'Role-Based Experience',
    text: 'Borrowers and lenders each get a tailored onboarding and profile flow.',
    Icon: UserIcon,
  },
  {
    title: 'Secure Information',
    text: 'Your details are handled carefully and stay within the platform.',
    Icon: LockIcon,
  },
  {
    title: 'Transparent Process',
    text: 'Know exactly what is required at every step of the lending journey.',
    Icon: EyeIcon,
  },
]

function Features() {
  return (
    <section className="section tinted" id="features">
      <div className="container">
        <div className="header center">
          <span className="eyebrow">Features</span>
          <h2 className="title">Why HackOps</h2>
          <p className="subtitle">
            A lending platform built around clarity, structure, and trust.
          </p>
        </div>
        <div className="features-grid">
          {FEATURES.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <span className="feature-icon">
                <feature.Icon />
              </span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-text">{feature.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features
