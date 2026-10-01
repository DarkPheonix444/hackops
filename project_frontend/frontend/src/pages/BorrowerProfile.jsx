import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../services/api.js'

// Only these borrower-specific fields are handled on this page.
const BORROWER_FIELDS = [
  'bank_name',
  'account_number',
  'ifsc_code',
  'existing_monthly_emi',
  'total_asset_value',
  'credit_score',
]

const BANK_FIELDS = [
  { name: 'bank_name', label: 'Bank Name', type: 'text', maxLength: 255 },
  { name: 'account_number', label: 'Account Number', type: 'text', maxLength: 20 },
  { name: 'ifsc_code', label: 'IFSC Code', type: 'text', maxLength: 11 },
]

const ASSET_FIELDS = [
  { name: 'total_asset_value', label: 'Total Asset Value', type: 'number', step: '0.01', min: 0 },
  { name: 'credit_score', label: 'Credit Score', type: 'number', min: 0 },
]

const EMPTY_FORM = {
  bank_name: '',
  account_number: '',
  ifsc_code: '',
  has_existing_loan: false,
  existing_monthly_emi: '',
  total_asset_value: '',
  credit_score: '',
}

const toBlank = (value) => (value === null || value === undefined ? '' : String(value))

// Map the borrower fields returned by the API onto form values.
const toFormValues = (data) => ({
  bank_name: toBlank(data.bank_name),
  account_number: toBlank(data.account_number),
  ifsc_code: toBlank(data.ifsc_code),
  has_existing_loan: Boolean(data.has_existing_loan),
  existing_monthly_emi: toBlank(data.existing_monthly_emi),
  total_asset_value: toBlank(data.total_asset_value),
  credit_score: toBlank(data.credit_score),
})

// An untouched common profile reports '' / false / null for every
// borrower field, so the first real save is a POST, later ones PATCH.
const hasBorrowerData = (data) =>
  BORROWER_FIELDS.some((name) => {
    const value = data[name]
    return value !== null && value !== undefined && value !== '' && value !== false
  })

function BorrowerProfile() {
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
        // Role guard: only borrowers may use this page.
        const meResponse = await api.get('/me/')
        if (cancelled) return
        if (meResponse.data.role !== 'borrower') {
          navigate('/common-profile', { replace: true })
          return
        }

        try {
          const profileResponse = await api.get('/borrower-profile/')
          if (!cancelled) {
            setForm(toFormValues(profileResponse.data))
            setProfileFilled(hasBorrowerData(profileResponse.data))
          }
        } catch (err) {
          if (!cancelled) {
            if (err.response?.status === 404) {
              // The common profile itself does not exist yet.
              setCommonProfileMissing(true)
            } else if (err.response?.status === 403) {
              setGeneralError(
                err.response?.data?.detail || 'Only borrowers can access this endpoint.',
              )
            } else {
              setGeneralError('Failed to load your borrower profile. Please try again.')
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

  const handleLoanChange = (e) => {
    setForm({ ...form, has_existing_loan: e.target.checked })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')
    setSuccess('')

    setSubmitting(true)
    try {
      // Send only filled-in fields; the loan checkbox state is always sent.
      const payload = {}
      for (const name of BORROWER_FIELDS) {
        if (form[name] !== '') {
          payload[name] = form[name]
        }
      }
      payload.has_existing_loan = form.has_existing_loan
      if (!form.has_existing_loan) {
        // Clear any stale EMI when there is no existing loan.
        payload.existing_monthly_emi = null
      }

      const response = profileFilled
        ? await api.patch('/borrower-profile/', payload)
        : await api.post('/borrower-profile/', payload)

      setForm(toFormValues(response.data))
      setProfileFilled(true)
      // No dashboard route exists yet, so stay here and confirm the save.
      setSuccess('Borrower profile saved successfully.')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // DRF returns field-keyed errors: { field_name: ['message'] }.
        const fieldErrors = {}
        const generalMessages = []
        for (const [key, value] of Object.entries(data)) {
          const message = Array.isArray(value) ? value.join(' ') : String(value)
          if (BORROWER_FIELDS.includes(key) || key === 'has_existing_loan') {
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
      {errors[field.name] && (
        <p style={{ color: 'red', margin: '4px 0 0' }}>{errors[field.name]}</p>
      )}
    </div>
  )

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <h1>Borrower Profile</h1>

      {loading ? (
        <p>Loading profile...</p>
      ) : commonProfileMissing ? (
        <div>
          <p>Please complete your Common Profile first before adding borrower details.</p>
          <Link to="/common-profile">Go to Common Profile</Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {success && <p style={{ color: 'green' }}>{success}</p>}
          {generalError && <p style={{ color: 'red' }}>{generalError}</p>}

          <section style={{ marginBottom: '24px' }}>
            <h2>Bank Details</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {BANK_FIELDS.map(renderField)}
            </div>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>Existing Loan</h2>
            <label style={{ display: 'block', marginBottom: '12px' }}>
              <input
                type="checkbox"
                name="has_existing_loan"
                checked={form.has_existing_loan}
                onChange={handleLoanChange}
              />{' '}
              I have an existing loan
            </label>
            <div style={{ maxWidth: '240px' }}>
              <label htmlFor="existing_monthly_emi" style={{ display: 'block', marginBottom: '4px' }}>
                Existing Monthly EMI
              </label>
              <input
                id="existing_monthly_emi"
                name="existing_monthly_emi"
                type="number"
                step="0.01"
                min="0"
                value={form.existing_monthly_emi}
                onChange={handleChange}
                disabled={!form.has_existing_loan}
                style={{ width: '100%' }}
              />
              {errors.existing_monthly_emi && (
                <p style={{ color: 'red', margin: '4px 0 0' }}>{errors.existing_monthly_emi}</p>
              )}
            </div>
          </section>

          <section style={{ marginBottom: '24px' }}>
            <h2>Assets &amp; Credit</h2>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                gap: '12px',
              }}
            >
              {ASSET_FIELDS.map(renderField)}
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

export default BorrowerProfile
