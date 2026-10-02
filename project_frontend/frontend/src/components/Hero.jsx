import { Link } from 'react-router-dom'

function Hero() {
  return (
    <section className="hero" id="home">
      <div className="container">
        <h1 className="hero-title">
          Smarter Lending.
          <br />
          Better Borrowing.
        </h1>
        <p className="hero-subtitle">
          Connect borrowers and lenders through a transparent, structured
          lending platform.
        </p>
        <div className="hero-actions">
          <Link to="/signup" className="btn btn-primary">Get Started</Link>
          <a href="#how-it-works" className="btn btn-secondary">How It Works</a>
        </div>
      </div>
    </section>
  )
}

export default Hero
