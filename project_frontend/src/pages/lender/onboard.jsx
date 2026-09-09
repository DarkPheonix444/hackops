import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/router';
import { lenderApi } from '@/lib/api';

export default function LenderOnboarding() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);
  const [fileName, setFileName] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      company_name: '',
      available_funds: '',
      risk_tolerance: 'MEDIUM',
      min_interest_rate: '8.5',
      max_interest_rate: '14.0',
    },
  });

  const onSubmit = async (data) => {
    setSubmitting(true);
    setServerError(null);

    try {
      const formData = new FormData();
      formData.append('company_name', data.company_name);
      formData.append('available_funds', data.available_funds);
      formData.append('risk_tolerance', data.risk_tolerance);
      formData.append('min_interest_rate', data.min_interest_rate);
      formData.append('max_interest_rate', data.max_interest_rate);

      if (data.id_document && data.id_document[0]) {
        formData.append('id_document', data.id_document[0]);
      }

      await lenderApi.updateProfile(formData);
      router.push('/lender/dashboard');
    } catch (err) {
      const errorMsg =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Failed to save lender preferences. Please check your credentials and try again.';
      setServerError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="flex justify-center items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#36d6c2] text-[#07111f] font-black text-xl flex items-center justify-center shadow-lg shadow-[#36d6c2]/20">
            TL
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">TrustLens</h1>
        </div>
        <h2 className="text-center text-3xl font-extrabold text-white">
          Lender Profile & Deployment Preferences
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Configure your capital pool, risk profile, and verification documents to start reviewing borrower requests.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
        <div className="bg-[#0e1c2f] border border-white/10 py-8 px-6 sm:px-10 shadow-2xl rounded-2xl backdrop-blur-xl">
          {serverError && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Full Name / Entity */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Lender / Entity Full Name
              </label>
              <input
                type="text"
                {...register('company_name', { required: 'Lender / Entity name is required' })}
                placeholder="e.g. Apex Capital Growth Fund or John Doe"
                className="w-full px-4 py-3 bg-[#07111f] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#36d6c2] focus:ring-1 focus:ring-[#36d6c2] transition"
              />
              {errors.company_name && (
                <p className="mt-1.5 text-xs text-red-400">{errors.company_name.message}</p>
              )}
            </div>

            {/* Lending Pool Capital */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Available Lending Pool Capital (₹ / $)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 font-bold">
                  ₹
                </div>
                <input
                  type="number"
                  step="1000"
                  {...register('available_funds', {
                    required: 'Capital amount is required',
                    min: { value: 10000, message: 'Minimum lending pool is ₹10,000' },
                  })}
                  placeholder="500000"
                  className="w-full pl-9 pr-4 py-3 bg-[#07111f] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#36d6c2] focus:ring-1 focus:ring-[#36d6c2] transition"
                />
              </div>
              {errors.available_funds && (
                <p className="mt-1.5 text-xs text-red-400">{errors.available_funds.message}</p>
              )}
            </div>

            {/* Risk Tolerance */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Max Risk Tolerance
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['LOW', 'MEDIUM', 'HIGH'].map((level) => (
                  <label
                    key={level}
                    className="relative flex flex-col items-center justify-center p-3 border border-white/10 rounded-xl cursor-pointer hover:border-white/30 transition has-[:checked]:border-[#36d6c2] has-[:checked]:bg-[#36d6c2]/10"
                  >
                    <input
                      type="radio"
                      value={level}
                      {...register('risk_tolerance')}
                      className="sr-only"
                    />
                    <span className="text-xs font-bold tracking-wide">{level}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">
                      {level === 'LOW' ? 'Prime only' : level === 'MEDIUM' ? 'Balanced' : 'High Yield'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Interest Rate Range */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Preferred Interest Rate Range (%)
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      {...register('min_interest_rate', { required: 'Min rate required' })}
                      placeholder="Min %"
                      className="w-full px-4 py-3 bg-[#07111f] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#36d6c2] focus:ring-1 focus:ring-[#36d6c2] transition"
                    />
                    <span className="absolute right-3 top-3 text-slate-400 text-sm">% Min</span>
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      {...register('max_interest_rate', { required: 'Max rate required' })}
                      placeholder="Max %"
                      className="w-full px-4 py-3 bg-[#07111f] border border-white/10 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-[#36d6c2] focus:ring-1 focus:ring-[#36d6c2] transition"
                    />
                    <span className="absolute right-3 top-3 text-slate-400 text-sm">% Max</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Official ID Upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Identity & Verification Document (Aadhaar / PAN / Entity Reg)
              </label>
              <div className="border-2 border-dashed border-white/15 rounded-xl p-6 text-center hover:border-[#36d6c2]/50 transition bg-[#07111f]/50">
                <input
                  type="file"
                  id="id_document"
                  {...register('id_document')}
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                  className="sr-only"
                />
                <label htmlFor="id_document" className="cursor-pointer flex flex-col items-center">
                  <svg className="w-8 h-8 text-[#36d6c2] mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-sm font-medium text-slate-200">
                    {fileName ? (
                      <span className="text-[#36d6c2] font-semibold">{fileName}</span>
                    ) : (
                      'Click to upload or drag and drop official ID'
                    )}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">PDF, PNG, JPG up to 10MB</span>
                </label>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-[#36d6c2] hover:bg-[#20bbaa] text-[#07111f] font-bold rounded-xl transition duration-200 shadow-lg shadow-[#36d6c2]/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-[#07111f]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Saving Preferences...</span>
                </>
              ) : (
                'Save Preferences & Open Feed →'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
