import { Link } from 'react-router-dom'

function CTA() {
  return (
    <section className="section">
      <div className="container">
        <div className="cta-box">
          <h2 className="title">Ready to get started?</h2>
          <p className="subtitle">
            Create your HackOps profile and begin your journey.
          </p>
          <Link to="/signup" className="btn btn-primary">Create Your Profile</Link>
        </div>
      </div>
    </section>
  )
}

export default CTA
