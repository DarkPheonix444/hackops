import { Link } from 'react-router-dom'

function Brand() {
  return (
    <Link to="/" className="ui-brand" aria-label="HackOps — home">
      <span className="ui-brand-mark" aria-hidden="true">H</span>
      HackOps
    </Link>
  )
}

export default Brand
