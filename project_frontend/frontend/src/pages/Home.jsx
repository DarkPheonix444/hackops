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
  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      // User is already logged in; redirect to onboarding
      // The Login page already redirects to /common-profile after login,
      // but handle the case of a direct visit when logged in.
      window.location.replace('/common-profile')
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
