import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import AuthLayout from '../components/AuthLayout.jsx'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import FormField from '../components/FormField.jsx'

function getError(err) {
  const data = err.response?.data
  if (!data) return err.message || 'Login failed. Please try again.'
  if (typeof data === 'string') return data
  if (data.detail) return data.detail
  const firstField = Object.values(data)[0]
  if (Array.isArray(firstField)) return firstField[0]
  return JSON.stringify(data)
}

function Login() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      // The token endpoint lives at /api/token/, one level above the
      // /api/users/ base URL of the shared Axios instance.
      const response = await api.post('../token/', form)
      localStorage.setItem('access_token', response.data.access)
      localStorage.setItem('refresh_token', response.data.refresh)
      navigate('/common-profile')
    } catch (err) {
      setError(getError(err))
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Log in to your HackOps account to continue."
      footer={
        <>
          Don't have an account? <Link to="/signup">Sign up</Link>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && <Alert variant="error">{error}</Alert>}
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
          autoComplete="current-password"
          value={form.password}
          onChange={handleChange}
        />
        <Button type="submit" variant="primary" block>
          Log in
        </Button>
      </form>
    </AuthLayout>
  )
}

export default Login
