import { useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api.js'

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

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    try {
      await api.post('/signup/', form)
      setSuccess('Account created successfully. You can now log in.')
    } catch (err) {
      setError(getError(err))
    }
  }

  return (
    <div>
      <h1>Signup</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {success && <p style={{ color: 'green' }}>{success}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Name</label>
          <input
            id="name"
            name="name"
            type="text"
            value={form.name}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={8}
          />
        </div>
        <div>
          <label htmlFor="role">Role</label>
          <select
            id="role"
            name="role"
            value={form.role}
            onChange={handleChange}
          >
            <option value="borrower">Borrower</option>
            <option value="lender">Lender</option>
          </select>
        </div>
        <button type="submit">Signup</button>
      </form>
      <p>
        Already have an account? <Link to="/login">Login</Link>
      </p>
    </div>
  )
}

export default Signup
