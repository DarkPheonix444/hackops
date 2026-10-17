import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import AuthLayout from '../components/AuthLayout.jsx'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import FormField from '../components/FormField.jsx'

const ROLE_OPTIONS = [
  { value: 'borrower', label: 'Borrower' },
  { value: 'lender', label: 'Lender' },
]

function getError(err) {
  const data = err.response?.data
  if (!data) return err.message || 'Signup failed. Please try again.'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const firstField = Object.values(data)[0]
  if (Array.isArray(firstField)) return firstField[0]
  return JSON.stringify(data)
}

function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'borrower' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await api.post('/signup/', form)
      setSuccess('Account created successfully. Please log in.')
      navigate('/login')
    } catch (err) {
      setError(getError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join HackOps and start your structured lending journey."
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        <FormField
          label="Full Name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={form.name}
          onChange={handleChange}
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={handleChange}
        />
        <FormField
          label="Password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={form.password}
          onChange={handleChange}
        />
        <FormField
          label="Account Type"
          name="role"
          type="select"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={handleChange}
        />
        <Button type="submit" variant="primary" block disabled={submitting}>
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Signup