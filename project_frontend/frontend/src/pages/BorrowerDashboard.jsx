import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import DashboardLayout from '../components/DashboardLayout.jsx'
import Alert from '../components/Alert.jsx'
import Card from '../components/Card.jsx'

function BorrowerDashboard() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const meResponse = await api.get('/me/')
        if (cancelled) return
        if (meResponse.data.role !== 'borrower') {
          navigate('/common-profile', { replace: true })
          return
        }
        setUser(meResponse.data)

        try {
          const commonResponse = await api.get('/common-profile/')
          if (cancelled) return
        } catch (err) {
          if (!cancelled && err.response?.status !== 404) {
            setError('Failed to load common profile.')
          }
        }

        try {
          const borrowerResponse = await api.get('/borrower-profile/')
          if (cancelled) return
        } catch (err) {
          if (!cancelled && err.response?.status === 404) {
            navigate('/common-profile', { replace: true })
          } else if (!cancelled) {
            setError('Failed to load borrower profile.')
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError('Authentication required.')
          navigate('/login', { replace: true })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [navigate])

  if (loading) {
    return (
      <DashboardLayout nav={[{ label: 'Borrower Dashboard' }]}> 
        <div className="ui-dash-main"> 
          <div className="ui-progress ui-progress-sm"> 
            <span className="ui-progress-pill current"><span className="ui-progress-count">1</span> Dashboard</span> 
          </div> 
          <p className="ui-loading">Loading dashboard...</p> 
        </div> 
      </DashboardLayout>
    )
  }

  if (!user) return null

  return (
    <DashboardLayout
      nav={[
        { label: 'Common Profile', to: '/common-profile' },
        { label: 'Borrower Dashboard', current: true },
      ]}
    >
      <div className="ui-dash-main">
        <h1>Welcome, {user.name}</h1>
        <p>Borrower · {user.email}</p>
        
        <Card>
          <h2>Profile Completion</h2>
          <p>Your profile is partially complete.</p>
        </Card>
        
        <Card>
          <h2>Personal Information</h2>
          <p>Full Name: {user.full_name || 'Not provided'}</p>
          <p>Phone: {user.phone_number || 'Not provided'}</p>
          <p>City: {user.city || 'Not provided'}</p>
          <p>State: {user.state || 'Not provided'}</p>
          <p>Employment: {user.employment_type || 'Not provided'}</p>
          <p>Occupation: {user.occupation || 'Not provided'}</p>
        </Card>
        
        <Card>
          <h2>Financial Overview</h2>
          <p>Total Assets: {user.borrowerProfile?.total_asset_value !== undefined ? '₹' + Number(user.borrowerProfile.total_asset_value).toLocaleString() : 'Not provided'}</p>
          <p>Credit Score: {user.borrowerProfile?.credit_score !== undefined ? user.borrowerProfile.credit_score : 'Not provided'}</p>
          <p>Existing Loan: {user.borrowerProfile?.has_existing_loan ? 'Yes' : 'No'}</p>
          <p>Monthly EMI: {user.borrowerProfile?.has_existing_loan && user.borrowerProfile?.existing_monthly_emi !== undefined ? '₹' + Number(user.borrowerProfile.existing_monthly_emi).toLocaleString() : 'Not applicable'}</p>
        </Card>
        
        <Card>
          <h2>Quick Actions</h2>
          <a href="/common-profile" className="action-link">Edit Common Profile</a>
          <a href="/borrower-profile" className="action-link">Edit Borrower Profile</a>
        </Card>
        
        <p className="footer-note">Data reflects information on file. Update your profile to keep it current.</p>
      </div>
    </DashboardLayout>
  )
}

export default BorrowerDashboard