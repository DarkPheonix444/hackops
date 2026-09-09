import React from 'react';
import { Link } from 'react-router-dom';
import { useUserState } from '../../context/UserContext';
import './Homepage.css';

export default function Homepage() {
  const { isAuthenticated, currentUser } = useUserState();
  const isAuth = isAuthenticated();

  return (
    <div className='trustlens-home'>
      {/* NAVBAR */}
      <header className='tl-navbar'>
        <Link to='/' className='tl-logo'>
          <div className='tl-logo-icon'>T</div>
          <span>TrustLens</span>
        </Link>

        <nav className='tl-nav-links'>
          <a href='#product'>Product</a>
          <a href='#how-it-works'>How It Works</a>
          <a href='#intelligence'>Intelligence</a>
          <a href='#features'>Features</a>
        </nav>

        <div className='tl-nav-buttons'>
          {isAuth ? (
            <>
              <Link to='/login' className='tl-login-btn' style={{ marginRight: 12 }}>
                Sign In
              </Link>
              <Link to='/app/dashboard' className='tl-primary-btn'>
                Go to Dashboard →
              </Link>
            </>
          ) : (
            <Link to='/login' className='tl-login-btn'>
              Sign In
            </Link>
          )}
        </div>
      </header>

      {/* HERO SECTION */}
      <main>
        <section className='tl-hero' id='product'>
          <div className='tl-hero-content'>
            <div className='tl-badge'>
              <span className='tl-pulse'></span>
              AI-Powered Lending Intelligence Platform
            </div>

            <h1>
              Know who to <span>trust</span> before you lend.
            </h1>

            <p>
              TrustLens combines identity verification, financial intelligence, behavioral
              signals, and explainable AI fraud detection to help you make safer informal
              and institutional lending decisions.
            </p>

            <div className='tl-hero-buttons'>
              {isAuth ? (
                <Link to='/app/dashboard' className='tl-primary-btn'>
                  Enter Dashboard <span>→</span>
                </Link>
              ) : (
                <Link to='/login' className='tl-primary-btn'>
                  Get Started <span>→</span>
                </Link>
              )}
            </div>

            <div className='tl-hero-stats'>
              <div>
                <strong>10K+</strong>
                <span>Profiles Analyzed</span>
              </div>
              <div>
                <strong>94%</strong>
                <span>AI Confidence</span>
              </div>
              <div>
                <strong>24/7</strong>
                <span>Risk Monitoring</span>
              </div>
            </div>
          </div>

          {/* AI DEMO SCORECARD */}
          <div className='tl-hero-dashboard'>
            <div className='tl-dashboard-header'>
              <div>
                <small>Borrower Intelligence Preview</small>
                <h3>Verified Borrower Sample</h3>
              </div>
              <div className='tl-verified'>✓ Verified KYC</div>
            </div>

            <div className='tl-score-section'>
              <div className='tl-score-circle'>
                <div>
                  <strong>82</strong>
                  <span>Trust Score</span>
                </div>
              </div>

              <div className='tl-score-info'>
                <div className='tl-risk-label'>
                  <span>Risk Level</span>
                  <strong>LOW RISK</strong>
                </div>
                <div className='tl-progress'>
                  <div className='tl-progress-bar'></div>
                </div>
                <p>
                  Strong financial stability, verified PAN & Aadhaar documents, and consistent
                  cash flow profile.
                </p>
              </div>
            </div>

            <div className='tl-mini-cards'>
              <div className='tl-mini-card'>
                <span>Risk Score</span>
                <strong>28</strong>
                <small>Low</small>
              </div>
              <div className='tl-mini-card'>
                <span>Fraud Anomaly</span>
                <strong>6%</strong>
                <small>Clean</small>
              </div>
              <div className='tl-mini-card'>
                <span>AI Confidence</span>
                <strong>92%</strong>
                <small>High</small>
              </div>
            </div>

            <div className='tl-recommendation'>
              <div>
                <small>Recommended Term</small>
                <h3>₹50,000</h3>
              </div>
              <div className='tl-recommendation-right'>
                <span>12 Months</span>
                <strong>Recommended</strong>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST STRIP */}
        <section className='tl-trust-strip'>
          <div>
            <span className='tl-check'>✓</span> Instant Aadhaar & PAN Identity Verification
          </div>
          <div>
            <span className='tl-check'>✓</span> Financial & Bank Statement OCR Analysis
          </div>
          <div>
            <span className='tl-check'>✓</span> Behavioral Fraud & Anomaly Detection
          </div>
          <div>
            <span className='tl-check'>✓</span> Explainable AI Risk Assessment
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className='tl-section' id='how-it-works'>
          <div className='tl-section-heading'>
            <div className='tl-section-tag'>WORKFLOW</div>
            <h2>
              From raw borrower files to <span>confident lending.</span>
            </h2>
            <p>
              TrustLens turns scattered KYC papers and bank statements into verified,
              actionable credit recommendations in seconds.
            </p>
          </div>

          <div className='tl-steps'>
            <div className='tl-step-card'>
              <div className='tl-step-number'>01</div>
              <div className='tl-step-icon'>✓</div>
              <h3>1. Upload & Verify</h3>
              <p>
                Borrower uploads Aadhaar, PAN, ITR, and Bank Statements with instant OCR
                information extraction.
              </p>
            </div>

            <div className='tl-step-card'>
              <div className='tl-step-number'>02</div>
              <div className='tl-step-icon'>◈</div>
              <h3>2. Analyze Data</h3>
              <p>
                Analyzes verified income, employer stability, debt obligations, and repayment
                capacity.
              </p>
            </div>

            <div className='tl-step-card'>
              <div className='tl-step-number'>03</div>
              <div className='tl-step-icon'>⌁</div>
              <h3>3. AI Trust Score</h3>
              <p>
                Calculates a multi-dimensional AI Trust Score (0-100) and risk level with
                transparent breakdown.
              </p>
            </div>

            <div className='tl-step-card'>
              <div className='tl-step-number'>04</div>
              <div className='tl-step-icon'>↗</div>
              <h3>4. Lender Decision</h3>
              <p>
                Lenders review the live marketplace feed, inspect evidence, and approve or reject
                with one click.
              </p>
            </div>
          </div>
        </section>

        {/* CTA BANNER */}
        <section className='tl-cta-section' id='features'>
          <div className='tl-cta-content'>
            <div className='tl-section-tag'>GET STARTED TODAY</div>
            <h2>
              Trust the data. <span>Understand the risk.</span>
            </h2>
            <p>
              Connect to the live marketplace now as a Lender to review loans, or as a
              Borrower to submit your application and upload required KYC documents.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {isAuth ? (
                <Link to='/app/dashboard' className='tl-primary-btn'>
                  Enter Dashboard →
                </Link>
              ) : (
                <Link to='/login' className='tl-primary-btn'>
                  Explore Platform →
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className='tl-footer'>
        <div className='tl-logo'>
          <div className='tl-logo-icon'>T</div>
          <span>TrustLens</span>
        </div>
        <p>AI-powered trust & risk intelligence for decentralized and informal lending.</p>
        <span>© 2026 TrustLens. Built with Django & React.</span>
      </footer>
    </div>
  );
}
