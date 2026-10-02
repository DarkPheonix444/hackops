import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'
import DashboardLayout from '../components/DashboardLayout.jsx'
import Alert from '../components/Alert.jsx'
import Button from '../components/Button.jsx'
import FormField from '../components/FormField.jsx'
import FormSection from '../components/FormSection.jsx'
import OnboardingProgress from '../components/OnboardingProgress.jsx'

const GENDER_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

const MARITAL_STATUS_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
]

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'salaried', label: 'Salaried' },
  { value: 'self_employed', label: 'Self Employed' },
  { value: 'business', label: 'Business' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'student', label: 'Student' },
]

const RESIDENCE_TYPE_OPTIONS = [
  { value: '', label: 'Select' },
  { value: 'owned', label: 'Owned' },
  { value: 'rented', label: 'Rented' },
  { value: 'family', label: 'Family' },
  { value: 'company_provided', label: 'Company Provided' },
]

const SECTIONS = [
  {
    title: 'Personal Information',
    description: 'The basic details that identify you on the platform.',
    fields: [
      { name: 'full_name', label: 'Full Name', type: 'text', maxLength: 255, required: true },
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
      { name: 'gender', label: 'Gender', type: 'select', options: GENDER_OPTIONS, required: true },
      { name: 'phone_number', label: 'Phone Number', type: 'tel', maxLength: 15, required: true },
      { name: 'alternate_phone_number', label: 'Alternate Phone Number', type: 'tel', maxLength: 15 },
      { name: 'marital_status', label: 'Marital Status', type: 'select', options: MARITAL_STATUS_OPTIONS, required: true },
      { name: 'nationality', label: 'Nationality', type: 'text', maxLength: 100, required: true },
    ],
  },
  {
    title: 'Family Information',
    description: 'Your household and dependants, used to assess your profile.',
    fields: [
      { name: 'father_name', label: "Father's Name", type: 'text', maxLength: 255, required: true },
      { name: 'mother_name', label: "Mother's Name", type: 'text', maxLength: 255, required: true },
      { name: 'spouse_name', label: "Spouse's Name", type: 'text', maxLength: 255 },
      { name: 'number_of_dependents', label: 'Number of Dependents', type: 'number', min: 0, required: true },
    ],
  },
  {
    title: 'Employment & Income',
    description: 'What you do and what you earn today.',
    fields: [
      { name: 'employment_type', label: 'Employment Type', type: 'select', options: EMPLOYMENT_TYPE_OPTIONS, required: true },
      { name: 'occupation', label: 'Occupation', type: 'text', maxLength: 255, required: true },
      { name: 'employer_or_business_name', label: 'Employer / Business Name', type: 'text', maxLength: 255, required: true },
      { name: 'monthly_income', label: 'Monthly Income', type: 'number', step: '0.01', min: 0, required: true },
      { name: 'annual_income', label: 'Annual Income', type: 'number', step: '0.01', min: 0, required: true },
      { name: 'years_of_experience', label: 'Years of Experience', type: 'number', step: '0.1', min: 0, required: true },
    ],
  },
  {
    title: 'Residential Information',
    description: 'Where you live and how long you have been there.',
    fields: [
      { name: 'address_line', label: 'Address', type: 'text', maxLength: 255, required: true },
      { name: 'city', label: 'City', type: 'text', maxLength: 100, required: true },
      { name: 'state', label: 'State', type: 'text', maxLength: 100, required: true },
      { name: 'pincode', label: 'Pincode', type: 'text', maxLength: 6, required: true },
      { name: 'residence_type', label: 'Residence Type', type: 'select', options: RESIDENCE_TYPE_OPTIONS, required: true },
      { name: 'years_at_current_address', label: 'Years at Current Address', type: 'number', step: '0.1', min: 0, required: true },
    ],
  },
  {
    title: 'KYC Information',
    description: 'Identity documents required for verification.',
    fields: [
      { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', maxLength: 12, required: true },
      { name: 'pan_number', label: 'PAN Number', type: 'text', maxLength: 10, required: true },
    ],
  },
]

const ALL_FIELDS = SECTIONS.flatMap((section) => section.fields)
const EMPTY_FORM = Object.fromEntries(ALL_FIELDS.map((field) => [field.name, '']))

// spouse_name is the only conditionally required field: it becomes
// mandatory when marital_status is 'married'. Every other required
// field is flagged with `required` in the SECTIONS config above.
const isFieldRequired = (field, values) =>
  field.required || (field.name === 'spouse_name' && values.marital_status === 'married')

const validateForm = (values) => {
  const newErrors = {}
  for (const field of ALL_FIELDS) {
    if (field.required) {
      const value = values[field.name]
      if (typeof value !== 'string' || value.trim() === '') {
        newErrors[field.name] = `${field.label} is required.`
      }
    }
  }
  if (values.marital_status === 'married' && (values.spouse_name || '').trim() === '') {
    newErrors.spouse_name = "Spouse's Name is required when marital status is married."
  }
  return newErrors
}

// Map API data onto form values (null -> empty string, everything as text).
const toFormValues = (data) => {
  const values = {}
  for (const field of ALL_FIELDS) {
    const value = data[field.name]
    values[field.name] = value === null || value === undefined ? '' : String(value)
  }
  return values
}

function CommonProfile() {
  const navigate = useNavigate()
  const [form, setForm] = useState(EMPTY_FORM)
  const [profileExists, setProfileExists] = useState(false)
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [generalError, setGeneralError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        // The account's role is needed for the POST payload and for
        // post-save navigation. The user is never asked to pick a role.
        const meResponse = await api.get('/me/')
        if (cancelled) return
        setRole(meResponse.data.role)

        try {
          const profileResponse = await api.get('/common-profile/')
          if (!cancelled) {
            setForm({ ...EMPTY_FORM, ...toFormValues(profileResponse.data) })
            setProfileExists(true)
          }
        } catch (err) {
          // 404 means no profile yet -> stay on the empty create form.
          if (!cancelled && err.response?.status !== 404) {
            setGeneralError('Failed to load your profile. Please try again.')
          }
        }
      } catch {
        if (!cancelled) {
          setGeneralError('Please log in to continue.')
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
  }, [])

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')

    // Frontend validation: block submission until every required field
    // is filled in (and spouse_name is provided for married users).
    const validationErrors = validateForm(form)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSubmitting(true)
    try {
      let currentRole = role
      if (!currentRole) {
        currentRole = (await api.get('/me/')).data.role
      }

      // Send only filled-in fields so empty optional fields keep their
      // backend defaults. Role comes from the account, not from the user.
      const payload = { role: currentRole }
      for (const field of ALL_FIELDS) {
        const value = form[field.name]
        if (value !== '') {
          payload[field.name] = value
        }
      }

      if (profileExists) {
        await api.patch('/common-profile/', payload)
      } else {
        await api.post('/common-profile/', payload)
      }

      // Decide the next onboarding step from the account's role.
      const meResponse = await api.get('/me/')
      navigate(meResponse.data.role === 'lender' ? '/lender-profile' : '/borrower-profile')
    } catch (err) {
      const data = err.response?.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // DRF returns field-keyed errors: { field_name: ['message'] }.
        const fieldErrors = {}
        const generalMessages = []
        for (const [key, value] of Object.entries(data)) {
          const message = Array.isArray(value) ? value.join(' ') : String(value)
          if (ALL_FIELDS.some((field) => field.name === key)) {
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

  // The second onboarding step depends on the account's role.
  const nextStepLabel =
    role === 'lender'
      ? 'Lender Profile'
      : role === 'borrower'
        ? 'Borrower Profile'
        : 'Role Profile'

  const nav = [
    { label: 'Common Profile', to: '/common-profile', current: true },
  ]
  if (role === 'lender') {
    nav.push({ label: 'Lender Profile', to: '/lender-profile' })
  } else if (role === 'borrower') {
    nav.push({ label: 'Borrower Profile', to: '/borrower-profile' })
  }

  return (
    <DashboardLayout nav={nav}>
      <div className="ui-page-header">
        <span className="ui-eyebrow">Onboarding</span>
        <h1 className="ui-page-title">Common Profile</h1>
        <p className="ui-page-subtitle">
          Start by telling us who you are. These details are shared by
          your borrower and lender profiles.
        </p>
        {!loading && (
          <OnboardingProgress
            current={0}
            steps={[
              { label: 'Common Profile' },
              { label: nextStepLabel },
            ]}
          />
        )}
      </div>

      {loading ? (
        <p className="ui-loading">Loading profile...</p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          {generalError && <Alert variant="error">{generalError}</Alert>}

          {SECTIONS.map((section) => (
            <FormSection
              key={section.title}
              title={section.title}
              description={section.description}
            >
              {section.fields.map((field) => (
                <FormField
                  key={field.name}
                  label={field.label}
                  name={field.name}
                  type={field.type}
                  options={field.options}
                  required={isFieldRequired(field, form)}
                  error={errors[field.name]}
                  value={form[field.name]}
                  onChange={handleChange}
                  maxLength={field.maxLength}
                  min={field.min}
                  step={field.step}
                />
              ))}
            </FormSection>
          ))}

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Saving...' : profileExists ? 'Update Profile' : 'Save & Continue'}
          </Button>
        </form>
      )}
    </DashboardLayout>
  )
}

export default CommonProfile
