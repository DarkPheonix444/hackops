import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Home from './pages/Home.jsx'
import Signup from './pages/Signup.jsx'
import Login from './pages/Login.jsx'
import CommonProfile from './pages/CommonProfile.jsx'
import BorrowerProfile from './pages/BorrowerProfile.jsx'
import LenderProfile from './pages/LenderProfile.jsx'
import BorrowerDashboard from './pages/BorrowerDashboard.jsx'
import LenderDashboard from './pages/LenderDashboard.jsx'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/common-profile" element={<CommonProfile />} />
        <Route path="/borrower-profile" element={<BorrowerProfile />} />
        <Route path="/lender-profile" element={<LenderProfile />} />
        <Route path="/borrower-dashboard" element={<BorrowerDashboard />} />
        <Route path="/lender-dashboard" element={<LenderDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
