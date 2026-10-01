import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../services/api.js'

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
    fields: [
      { name: 'full_name', label: 'Full Name', type: 'text', maxLength: 255, required: true },
      { name: 'date_of_birth', label: 'Date of Birth', type: 'date' },
      { name: 'gender', label: 'Gender', type: 'select', options: GENDER_OPTIONS },
      { name: 'phone_number', label: 'Phone Number', type: 'tel', maxLength: 15 },
      { name: 'alternate_phone_number', label: 'Alternate Phone Number', type: 'tel', maxLength: 15 },
      { name: 'marital_status', label: 'Marital Status', type: 'select', options: MARITAL_STATUS_OPTIONS },
      { name: 'nationality', label: 'Nationality', type: 'text', maxLength: 100 },
    ],
  },
  {
    title: 'Family Information',
    fields: [
      { name: 'father_name', label: "Father's Name", type: 'text', maxLength: 255 },
      { name: 'mother_name', label: "Mother's Name", type: 'text', maxLength: 255 },
      { name: 'spouse_name', label: "Spouse's Name", type: 'text', maxLength: 255 },
      { name: 'number_of_dependents', label: 'Number of Dependents', type: 'number', min: 0 },
    ],
  },
  {
    title: 'Employment & Income',
    fields: [
      { name: 'employment_type', label: 'Employment Type', type: 'select', options: EMPLOYMENT_TYPE_OPTIONS },
      { name: 'occupation', label: 'Occupation', type: 'text', maxLength: 255 },
      { name: 'employer_or_business_name', label: 'Employer / Business Name', type: 'text', maxLength: 255 },
      { name: 'monthly_income', label: 'Monthly Income', type: 'number', step: '0.01', min: 0 },
      { name: 'annual_income', label: 'Annual Income', type: 'number', step: '0.01', min: 0 },
      { name: 'years_of_experience', label: 'Years of Experience', type: 'number', step: '0.1', min: 0 },
    ],
  },
  {
    title: 'Residential Information',
    fields: [
      { name: 'address_line', label: 'Address', type: 'text', maxLength: 255 },
      { name: 'city', label: 'City', type: 'text', maxLength: 100 },
      { name: 'state', label: 'State', type: 'text', maxLength: 100 },
      { name: 'pincode', label: 'Pincode', type: 'text', maxLength: 6 },
      { name: 'residence_type', label: 'Residence Type', type: 'select', options: RESIDENCE_TYPE_OPTIONS },
      { name: 'years_at_current_address', label: 'Years at Current Address', type: 'number', step: '0.1', min: 0 },
    ],
  },
  {
    title: 'KYC Information',
    fields: [
      { name: 'aadhaar_number', label: 'Aadhaar Number', type: 'text', maxLength: 12 },
      { name: 'pan_number', label: 'PAN Number', type: 'text', maxLength: 10 },
    ],
  },
]

const ALL_FIELDS = SECTIONS.flatMap((section) => section.fields)
const EMPTY_FORM = Object.fromEntries(ALL_FIELDS.map((field) => [field.name, '']))

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

    // Minimum guard: the backend requires full_name.
    if (!form.full_name.trim()) {
      setErrors({ full_name: 'Full name is required.' })
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

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '16px' }}>
      <h1>Common Profile</h1>

      {loading ? (
        <p>Loading profile...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          {generalError && <p style={{ color: 'red' }}>{generalError}</p>}

          {SECTIONS.map((section) => (
            <section key={section.title} style={{ marginBottom: '24px' }}>
              <h2>{section.title}</h2>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                  gap: '12px',
                }}
              >
                {section.fields.map((field) => (
                  <div key={field.name}>
                    <label htmlFor={field.name} style={{ display: 'block', marginBottom: '4px' }}>
                      {field.label}
                      {field.required ? ' *' : ''}
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
                        required={field.required}
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
                ))}
              </div>
            </section>
          ))}

          <button type="submit" disabled={submitting}>
            {submitting ? 'Saving...' : profileExists ? 'Update Profile' : 'Save & Continue'}
          </button>
        </form>
      )}
    </div>
  )
}

export default CommonProfile
