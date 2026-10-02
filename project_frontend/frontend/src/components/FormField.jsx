// A single labelled form field: label (with a required `*` marker),
// an <input> or <select> styled like the Home page controls, and an
// optional error message. `name` doubles as the element id unless an
// explicit `id` is passed.
function FormField({
  label,
  name,
  type = 'text',
  options,
  error,
  required = false,
  id,
  ...inputProps
}) {
  const fieldId = id || name

  return (
    <div className="ui-field">
      <label className="ui-label" htmlFor={fieldId}>
        {label}
        {required && <span className="ui-required" aria-hidden="true"> *</span>}
      </label>
      {type === 'select' ? (
        <select
          id={fieldId}
          name={name}
          className={`ui-select${error ? ' is-invalid' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          {...inputProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={fieldId}
          name={name}
          type={type}
          className={`ui-input${error ? ' is-invalid' : ''}`}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          {...inputProps}
        />
      )}
      {error && <p className="ui-field-error">{error}</p>}
    </div>
  )
}

export default FormField
