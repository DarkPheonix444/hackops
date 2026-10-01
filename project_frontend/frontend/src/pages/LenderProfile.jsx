import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'

// Only these lender-specific fields are handled on this page.
const LENDER_FIELDS = [
  'amount_willing_to_lend',
  'minimum_lending_amount',
  'maximum_lending_amount',
  'lender_total_asset_value',
  'lender_bank_name',
  'lender_account_number',
  'lender_ifsc_code',
  'preferred_loan_type',
  'risk_preference',
]

const PREFERRED_LOAN_TYPE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'personal', label: 'Personal Loan' },
  { value: 'home', label: 'Home Loan' },
  { value: 'auto', label: 'Auto Loan' },
  { value: 'education', label: 'Education Loan' },
  { value: 'business', label: 'Business Loan' },
]

const RISK_PREFERENCE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const LENDING_FIELDS = [
  { name: 'amount_willing_to_lend', label: 'Amount Willing to Lend', type: 'number', step: '0.01', min: 0 },
  { name: 'minimum_lending_amount', label: 'Minimum Lending Amount', type: 'number', step: '0.01', min: 0 },
  { name: 'maximum_lending_amount', label: 'Maximum Lending Amount', type: 'number', step: '0.01', min: 0 },
  { name: 'lender_total_asset_value', label: 'Total Asset Value', type: 'number', step: '0.01', min: 0 },
]

const LENDER_BANK_FIELDS = [
  { name: 'lender_bank_name', label: 'Bank Name', type: 'text', maxLength: 255 },
  { name: 'lender_account_number', label: 'Account Number', type: 'text', maxLength: 20 },
  { name: 'lender_ifsc_code', label: 'IFSC Code', type: 'text', maxLength: 11 },
]

const PREFERENCE_FIELDS = [
  { name: 'preferred_loan_type', label: 'Preferred Loan Type', type: 'select', options: PREFERRED_LOAN_TYPE_OPTIONS },
  { name: 'risk_preference', label: 'Risk Preference', type: 'select', options: RISK_PREFERENCE_OPTIONS },
]

const EMPTY_FORM = {
  amount_willing_to_lend: '',
  minimum_lending_amount: '',
  maximum_lending_amount: '',
  lender_total_asset_value: '',
  lender_bank_name: '',
  lender_account_number: '',
  lender_ifsc_code: '',
  preferred_loan_type: '',
  risk_preference: '',
}

const toBlank = (value) => (value === null || value === undefined ? '' : String(value))

// Map the lender fields returned by the API onto form values.
const toFormValues = (data) => ({
  amount_willing_to_lend: toBlank(data.amount_willing_to_lend),
  minimum_lending_amount: toBlank(data.minimum_lending_amount),
  maximum_lending_amount: toBlank(data.maximum_lending_amount),
  lender_total_asset_value: toBlank(data.lender_total_asset_value),
  lender_bank_name: toBlank(data.lender_bank_name),
  lender_account_number: toBlank(data.lender_account_number),
  lender_ifsc_code: toBlank(data.lender_ifsc_code),
  preferred_loan_type: toBlank(data.preferred_loan_type),
  risk_preference: toBlank(data.risk_preference),
})

// An untouched common profile reports '' / null for every lender
// field, so the first real save is a POST, later ones PATCH.
const hasLenderData = (data) =>
  LENDER_FIELDS.some((name) => {
    const value = data[name]
    return value !== null && value !== undefined && value !== ''
  })

function LenderProfile() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [profileFilled, setProfileFilled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')
  const [success, setSuccess] = useState('')
  const [commonProfileMissing, setCommonProfileMissing] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        // Role guard: only lenders may use this page.
        const meResponse = await api.get('/me/')
        if (cancelled) return
        if (meResponse.data.role !== 'lender') {
          navigate('/common-profile', { replace: true })
          return
        }

        try {
          const profileResponse = await api.get('/lender-profile/')
          if (!cancelled) {
            setForm(toFormValues(profileResponse.data))
            setProfileFilled(hasLenderData(profileResponse.data))
          }
        } catch (err) {
          if (!cancelled) {
            if (err.response?.status === 404) {
              // The common profile itself does not exist yet.
              setCommonProfileMissing(true)
            } else if (err.response?.status === 403) {
              setGeneralError(
                err.response?.data?.detail || 'Only lenders can access this endpoint.',
              )
            } else {
              setGeneralError('Failed to load your lender profile. Please try again.')
            }
          }
        }
      } catch {
        if (!cancelled) {
          navigate('/login', { replace: true })
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [navigate])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')
    setSuccess('')

    setSubmitting(true)
    try {
      // Send only filled-in fields so empty optional fields keep
      // their backend defaults.
      const payload = {}
      for (const name of LENDER_FIELDS) {
        if (form[name] !== '') {
          payload[name] = form[name]
        }
      }

      const response = profileFilled
        ? await api.patch('/lender-profile/', payload)
        : await api.post('/lender-profile/', payload)

      setForm(toFormValues(response.data))
      setProfileFilled(true)
      // No dashboard route exists yet, so stay here and confirm the save.
      setSuccess('Lender profile saved successfully.')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // DRF returns field-keyed errors: { field_name: ['message'] }.
        const fieldErrors = {}
        const generalMessages = []
        for (const [key, value] of Object.entries(data)) {
          const message = Array.isArray(value) ? value.join(' ') : String(value)
          if (LENDER_FIELDS.includes(key)) {
            fieldErrors[key] = message
          } else {
            generalMessages.push(message)
          }
        }
        setErrors(fieldErrors)
        if (generalMessages.length > 0) {
          setGeneralError(generalMessages.join(' '))
        }
      } else {
        setGeneralError(err.message || 'Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const renderField = (field) => (
    <div key={field.name}>
      <label htmlFor={field.name} style={{ display: 'block', marginBottom: '4px' }}>
        {field.label}
      </label>
      {field.type === 'select' ? (
        <select
          id={field.name}
          name={field.name}
          value={form[field.name]}
          onChange={handleChange}
          style={{ width: '100%' }}
        >
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={field.name}
          name={field.name}
          type={field.type}
          value={form[field.name]}
          onChange={handleChange}
          maxLength={field.maxLength}
          min={field.min}
          step={field.step}
          style={{ width: '100%' }}
        />
      )}
      {errors[field.name] && (
        <p style={{ color: 'red', margin: '4px 0 0' }}>{errors[field.name]}</p>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <h1>Lender Profile</h1>

      {loading ? (
        <p>Loading profile...</p>
      ) : commonProfileMissing ? (
        <div>
          <p>Please complete your Common Profile first before adding lender details.</p>
          <Link to="/common-profile">Go to Common Profile</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {success && <p style={{ color: 'green' }}>{success}</p>}
          {generalError && <p style={{ color: 'red' }}>{generalError}</p>}

          <section style={{ marginBottom: '24px' }}>
            <h2>Financial / Lending</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {LENDING_FIELDS.map(renderField)}
            </div>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>Bank Details</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {LENDER_BANK_FIELDS.map(renderField)}
            </div>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>Preferences</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {PREFERENCE_FIELDS.map(renderField)}
            </div>
          </section>

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : profileFilled ? 'Update Profile' : 'Save & Continue'}
          </button>
        </form>
      )}
    </div>
  )
}

export default LenderProfile
