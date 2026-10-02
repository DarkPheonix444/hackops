const STEPS = [
  {
    number: '01',
    title: 'Create Your Profile',
    text: 'Users create an account and select whether they are a borrower or lender.',
  },
  {
    number: '02',
    title: 'Complete Your Profile',
    text: 'Users provide the information required for their role.',
  },
  {
    number: '03',
    title: 'Find the Right Opportunities',
    text: 'The platform can eventually connect borrowers and lenders based on structured information.',
  },
]

function HowItWorks() {
  return (
    <section className="section" id="how-it-works">
      <div className="container">
        <div className="header center">
          <span className="eyebrow">How It Works</span>
          <h2 className="title">A simple path to lending</h2>
          <p className="subtitle">
            Three steps stand between you and a structured lending experience.
          </p>
        </div>
        <div className="steps-grid">
          {STEPS.map((step) => (
            <article className="step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3 className="step-title">{step.title}</h3>
              <p className="step-text">{step.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

export default HowItWorks
