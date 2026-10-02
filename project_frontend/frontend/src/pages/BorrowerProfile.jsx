import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import DashboardLayout from '../components/DashboardLayout.jsx'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import FormField from '../components/FormField.jsx'
import FormSection from '../components/FormSection.jsx'
import OnboardingProgress from '../components/OnboardingProgress.jsx'

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
  { name: 'bank_name', label: 'Bank Name', type: 'text', maxLength: 255, required: true },
  { name: 'account_number', label: 'Account Number', type: 'text', maxLength: 20, required: true },
  { name: 'ifsc_code', label: 'IFSC Code', type: 'text', maxLength: 11, required: true },
]

const ASSET_FIELDS = [
  { name: 'total_asset_value', label: 'Total Asset Value', type: 'number', step: '0.01', min: 0, required: true },
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

// Validate the required borrower fields. existing_monthly_emi is
// conditionally required: only when has_existing_loan is true.
const validateForm = (values) => {
  const newErrors = {}
  for (const field of [...BANK_FIELDS, ...ASSET_FIELDS]) {
    if (field.required) {
      const value = values[field.name]
      if (typeof value !== 'string' || value.trim() === '') {
        newErrors[field.name] = `${field.label} is required.`
      }
    }
  }
  if (values.has_existing_loan && (values.existing_monthly_emi || '').trim() === '') {
    newErrors.existing_monthly_emi =
      'Existing Monthly EMI is required when you have an existing loan.'
  }
  return newErrors
}

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

    // Frontend validation: block submission until every required
    // field is filled in (and the EMI is provided for existing loans).
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

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
    <FormField
      key={field.name}
      label={field.label}
      name={field.name}
      type={field.type}
      required={field.required}
      error={errors[field.name]}
      value={form[field.name]}
      onChange={handleChange}
      maxLength={field.maxLength}
      min={field.min}
      step={field.step}
    />
  )

  return (
    <DashboardLayout
      nav={[
        { label: 'Common Profile', to: '/common-profile' },
        { label: 'Borrower Profile', to: '/borrower-profile', current: true },
      ]}
    >
      <div className="ui-page-header">
        <span className="ui-eyebrow">Onboarding</span>
        <h1 className="ui-page-title">Borrower Profile</h1>
        <p className="ui-page-subtitle">
          Add your banking details and tell us about any existing loans
          and assets so lenders can evaluate your application.
        </p>
        {!loading && !commonProfileMissing && (
          <OnboardingProgress
            current={1}
            steps={[
              { label: 'Common Profile', to: '/common-profile' },
              { label: 'Borrower Profile' },
            ]}
          />
        )}
      </div>

      {loading ? (
        <p className="ui-loading">Loading profile...</p>
      ) : commonProfileMissing ? (
        <Card>
          <h2 className="ui-form-section-title">Common Profile required</h2>
          <p className="ui-form-section-description" style={{ marginBottom: '20px' }}>
            Please complete your Common Profile first before adding
            borrower details.
          </p>
          <Button to="/common-profile" variant="primary">
            Go to Common Profile
          </Button>
        </Card>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {success && <Alert variant="success">{success}</Alert>}
          {generalError && <Alert variant="error">{generalError}</Alert>}

          <FormSection
            title="Bank Details"
            description="The account loan disbursements and repayments happen through."
          >
            {BANK_FIELDS.map(renderField)}
          </FormSection>

          <FormSection
            title="Existing Loan"
            description="Tell us if you are already repaying a loan."
          >
            <label className="ui-checkbox-row">
              <input
                type="checkbox"
                className="ui-checkbox"
                name="has_existing_loan"
                checked={form.has_existing_loan}
                onChange={handleLoanChange}
              />
              I have an existing loan
            </label>
            <div className="ui-narrow">
              <FormField
                label="Existing Monthly EMI"
                name="existing_monthly_emi"
                type="number"
                step="0.01"
                min="0"
                required={form.has_existing_loan}
                disabled={!form.has_existing_loan}
                error={errors.existing_monthly_emi}
                value={form.existing_monthly_emi}
                onChange={handleChange}
              />
            </div>
          </FormSection>

          <FormSection
            title="Assets &amp; Credit"
            description="Your total assets and, if known, your credit score."
          >
            {ASSET_FIELDS.map(renderField)}
          </FormSection>

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : profileFilled ? 'Update Profile' : 'Save & Continue'}
          </Button>
        </form>
      )}
    </DashboardLayout>
  )
}

export default BorrowerProfile
