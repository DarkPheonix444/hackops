import { Fragment } from 'react'
import { Link } from 'react-router-dom'

// Step indicator for the onboarding flow. Completed steps that carry
// a `to` link back to their page render as links; the current and
// upcoming steps render as plain pills.
function OnboardingProgress({ steps, current }) {
  return (
    <div className="ui-progress" aria-label="Onboarding progress">
      {steps.map((step, index) => (
        <Fragment key={step.label}>
          {index > 0 && <span className="ui-progress-line" aria-hidden="true" />}
          {step.to && index < current ? (
            <Link
              to={step.to}
              className="ui-progress-pill done"
            >
              <span className="ui-progress-count" aria-hidden="true">
                {index + 1}
              </span>
              {step.label}
            </Link>
          ) : (
            <span
              className={`ui-progress-pill${index === current ? ' current' : ''}${index < current ? ' done' : ''}`}
              aria-current={index === current ? 'step' : undefined}
            >
              <span className="ui-progress-count" aria-hidden="true">
                {index + 1}
              </span>
              {step.label}
            </span>
          )}
        </Fragment>
      ))}
    </div>
  )
}

export default OnboardingProgress
