import { useEffect } from 'react'
import Navbar from '../components/Navbar.jsx'
import Hero from '../components/Hero.jsx'
import HowItWorks from '../components/HowItWorks.jsx'
import RoleCards from '../components/RoleCards.jsx'
import Features from '../components/Features.jsx'
import CTA from '../components/CTA.jsx'
import Footer from '../components/Footer.jsx'
import '../components/Home.css'

function Home() {
  // Handle direct visits that include a section hash, e.g. /#how-it-works.
  useEffect(() => {
    const id = window.location.hash.replace('#', '')
    if (id) {
      const target = document.getElementById(id)
      if (target) target.scrollIntoView()
    }
  }, [])

  return (
    <div className="landing">
      <Navbar />
      <main>
        <Hero />
        <HowItWorks />
        <RoleCards />
        <Features />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}

export default Home
