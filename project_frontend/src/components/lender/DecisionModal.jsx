import React, { useState } from 'react';

export default function DecisionModal({
  isOpen,
  actionType, // 'APPROVE' | 'REJECT'
  application,
  onClose,
  onSubmit,
  isProcessing,
}) {
  const [notes, setNotes] = useState('');

  if (!isOpen || !application) return null;

  const isApprove = actionType === 'APPROVE';

  const handleConfirm = () => {
    onSubmit({ action: actionType, notes });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-[#0e1c2f] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        {/* Header */}
        <div
          className={`p-6 border-b border-white/10 flex items-center justify-between ${
            isApprove ? 'bg-emerald-500/10' : 'bg-rose-500/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isApprove
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              {isApprove ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {isApprove ? 'Approve Loan Application' : 'Reject Loan Application'}
              </h3>
              <p className="text-xs text-slate-400">
                Application #{application.id} • {application.borrower?.name || application.borrower?.email}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div className="bg-[#07111f] p-4 rounded-xl border border-white/5 flex justify-between items-center text-sm">
            <div>
              <span className="text-slate-400 block text-xs">Requested Amount</span>
              <span className="font-bold text-white text-base">
                ₹{Number(application.amount_requested).toLocaleString('en-IN')}
              </span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-xs">AI Trust Score</span>
              <span className="font-bold text-[#36d6c2] text-base">{application.ai_trust_score}/100</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Decision Notes (Optional)
            </label>
            <textarea
              rows="3"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={
                isApprove
                  ? 'Add terms or approval notes for the borrower...'
                  : 'Specify reason for rejection (e.g., debt ratio, risk tolerance)...'
              }
              className="w-full px-4 py-3 bg-[#07111f] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#36d6c2] transition text-sm"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-[#07111f] border-t border-white/5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-300 hover:bg-white/5 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`px-5 py-2 rounded-xl text-sm font-bold text-[#07111f] transition flex items-center gap-2 ${
              isApprove
                ? 'bg-[#36d6c2] hover:bg-[#20bbaa]'
                : 'bg-rose-500 hover:bg-rose-600 text-white'
            }`}
          >
            {isProcessing ? 'Submitting...' : isApprove ? 'Confirm Approval' : 'Confirm Rejection'}
          </button>
        </div>
      </div>
    </div>
  );
}
