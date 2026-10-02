// A grouped block of form fields with a heading, an optional
// description, and the shared responsive field grid.
function FormSection({ title, description, children }) {
  return (
    <section className="ui-form-section">
      <h2 className="ui-form-section-title">{title}</h2>
      {description && (
        <p className="ui-form-section-description">{description}</p>
      )}
      <div className="ui-form-grid">{children}</div>
    </section>
  )
}

export default FormSection
