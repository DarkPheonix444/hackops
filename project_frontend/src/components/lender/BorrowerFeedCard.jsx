import React from 'react';

export default function BorrowerFeedCard({ application, onActionClick }) {
  const {
    id,
    borrower,
    amount_requested,
    purpose,
    ai_trust_score = 75,
    ai_risk_level = 'LOW',
    ai_recommended_terms = {},
    ai_risk_breakdown = {},
  } = application;

  // Color config according to risk tier
  const riskConfig = {
    LOW: { badge: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', label: 'Low Risk' },
    MEDIUM: { badge: 'bg-amber-500/15 text-amber-400 border-amber-500/30', label: 'Medium Risk' },
    HIGH: { badge: 'bg-rose-500/15 text-rose-400 border-rose-500/30', label: 'High Risk' },
  };

  const risk = riskConfig[ai_risk_level?.toUpperCase()] || riskConfig.LOW;

  return (
    <div className="bg-[#0e1c2f] border border-white/10 rounded-2xl p-6 shadow-xl hover:border-white/20 transition-all flex flex-col justify-between group">
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg text-white group-hover:text-[#36d6c2] transition">
                {borrower?.name || borrower?.email || 'Verified Borrower'}
              </h3>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${risk.badge}`}>
                {risk.label}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{borrower?.email || `App ID #${id}`}</p>
          </div>

          {/* AI Trust Score Gauge / Badge */}
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1.5 bg-[#07111f] border border-[#36d6c2]/30 px-3 py-1.5 rounded-xl">
              <svg className="w-4 h-4 text-[#36d6c2]" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="font-extrabold text-sm text-[#36d6c2]">{ai_trust_score}</span>
              <span className="text-[10px] text-slate-400">/100</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
              AI Trust Index
            </span>
          </div>
        </div>

        {/* Loan Details Highlight */}
        <div className="grid grid-cols-2 gap-3 p-3.5 bg-[#07111f]/70 rounded-xl border border-white/5 mb-4">
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Requested</span>
            <span className="text-lg font-bold text-white">
              ₹{Number(amount_requested).toLocaleString('en-IN')}
            </span>
          </div>
          <div>
            <span className="text-[11px] text-slate-400 uppercase tracking-wider block">Purpose</span>
            <span className="text-sm font-medium text-slate-200 truncate block">
              {purpose || 'Working Capital'}
            </span>
          </div>
        </div>

        {/* Recommended Terms */}
        <div className="mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
            AI Recommended Terms
          </span>
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-300">
              ⚡ Rate: <strong className="text-white">{ai_recommended_terms?.suggested_interest_rate || '11.5%'}</strong>
            </span>
            <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-lg text-slate-300">
              ⏳ Tenure: <strong className="text-white">{ai_recommended_terms?.tenure_months || '12'} Months</strong>
            </span>
          </div>
        </div>

        {/* Explainable Risk Factors */}
        <div className="mb-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Explainable Risk Factors
          </span>
          <ul className="space-y-1.5 text-xs">
            {ai_risk_breakdown?.factors && Array.isArray(ai_risk_breakdown.factors) && ai_risk_breakdown.factors.length > 0 ? (
              ai_risk_breakdown.factors.map((factor, index) => (
                <li
                  key={index}
                  className={`flex items-center gap-2 ${
                    String(factor).startsWith('+') ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  <span>{factor}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex items-center gap-2 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>+15 pts: Verified GST & documented cashflow consistency</span>
                </li>
                <li className="flex items-center gap-2 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>+10 pts: Clean repayment history on prior institutional credit</span>
                </li>
                <li className="flex items-center gap-2 text-amber-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                  <span>-5 pts: High working capital debt-to-revenue ratio</span>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
        <button
          onClick={() => onActionClick('REJECT', application)}
          className="py-2.5 px-4 rounded-xl border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition"
        >
          Reject
        </button>
        <button
          onClick={() => onActionClick('APPROVE', application)}
          className="py-2.5 px-4 rounded-xl bg-[#36d6c2] hover:bg-[#20bbaa] text-[#07111f] text-xs font-bold transition shadow-lg shadow-[#36d6c2]/10"
        >
          Approve Loan
        </button>
      </div>
    </div>
  );
}
