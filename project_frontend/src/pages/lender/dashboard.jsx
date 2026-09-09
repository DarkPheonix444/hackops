import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { lenderApi } from '@/lib/api';
import BorrowerFeedCard from '@/components/lender/BorrowerFeedCard';
import DecisionModal from '@/components/lender/DecisionModal';

export default function LenderDashboard() {
  const [applications, setApplications] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState('APPROVE');
  const [selectedApp, setSelectedApp] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [feedRes, profileRes] = await Promise.all([
        lenderApi.getFeed(),
        lenderApi.getProfile().catch(() => ({ data: null })),
      ]);
      setApplications(feedRes.data || []);
      setProfile(profileRes?.data || null);
    } catch (err) {
      setError('Unable to load borrower feed. Please verify your backend server or session.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleOpenDecisionModal = (action, application) => {
    setModalAction(action);
    setSelectedApp(application);
    setModalOpen(true);
  };

  const handleDecisionSubmit = async ({ action, notes }) => {
    if (!selectedApp) return;
    setIsProcessing(true);
    try {
      await lenderApi.makeDecision(selectedApp.id, { action, notes });
      // Remove decided card from live feed
      setApplications((prev) => prev.filter((app) => app.id !== selectedApp.id));
      setModalOpen(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to submit decision.');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPool = profile?.available_funds || 500000;
  const pendingCount = applications.length;
  const activeCapital = 185000;

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="h-[78px] px-6 lg:px-12 border-b border-white/10 bg-[#07111f]/90 backdrop-blur-xl sticky top-0 z-40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#36d6c2] text-[#07111f] font-black text-lg flex items-center justify-center shadow-lg shadow-[#36d6c2]/20">
            TL
          </div>
          <span className="text-xl font-bold text-white tracking-tight">
            Trust<span className="text-[#36d6c2]">Lens</span>
          </span>
          <span className="hidden sm:inline-block ml-3 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#36d6c2]/10 text-[#36d6c2] border border-[#36d6c2]/20">
            Lender Hub
          </span>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/lender/onboard"
            className="text-xs font-semibold text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition flex items-center gap-1.5"
          >
            <span>⚙</span>
            <span>Preferences</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#36d6c2] to-blue-500 text-[#07111f] font-bold text-xs flex items-center justify-center">
              {profile?.company_name ? profile.company_name[0].toUpperCase() : 'L'}
            </div>
            <span className="text-xs font-medium text-slate-300 hidden md:block">
              {profile?.company_name || 'Lender Portfolio'}
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Overview Stats Cards */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-[#0e1c2f] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Capital Pool
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
              ₹{Number(totalPool).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
              <span className="text-[#36d6c2]">●</span> Risk Profile: {profile?.risk_tolerance || 'Medium'}
            </p>
          </div>

          <div className="bg-[#0e1c2f] border border-white/10 rounded-2xl p-6 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Deployed Capital
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-[#36d6c2] mt-2">
              ₹{Number(activeCapital).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Active interest-generating loans
            </p>
          </div>

          <div className="bg-[#0e1c2f] border border-white/10 rounded-2xl p-6 shadow-xl">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pending Applications
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2">
              {pendingCount}
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Ready for immediate underwriting
            </p>
          </div>
        </section>

        {/* Applications Feed */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Verified Borrower Applications
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Pre-screened & AI trust evaluated borrowers awaiting decision.
              </p>
            </div>
            <button
              onClick={fetchDashboardData}
              className="self-start sm:self-auto text-xs font-semibold px-3.5 py-2 rounded-xl border border-white/10 hover:border-white/30 text-slate-300 transition flex items-center gap-1.5 cursor-pointer bg-white/5 hover:bg-white/10"
            >
              🔄 Refresh Feed
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-[#0e1c2f] border border-white/5 rounded-2xl p-6 h-80 animate-pulse flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="h-4 bg-white/10 rounded w-1/2"></div>
                    <div className="h-3 bg-white/5 rounded w-1/3"></div>
                  </div>
                  <div className="h-20 bg-white/5 rounded-xl"></div>
                  <div className="h-10 bg-white/10 rounded-xl"></div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-[#0e1c2f] border border-white/10 rounded-2xl space-y-3">
              <p className="text-rose-400 text-sm">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="text-xs font-bold text-[#36d6c2] underline hover:text-[#20bbaa] cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : applications.length === 0 ? (
            <div className="p-12 text-center bg-[#0e1c2f] border border-white/10 rounded-2xl space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#36d6c2]/10 text-[#36d6c2] flex items-center justify-center text-xl font-bold mb-3">
                ✓
              </div>
              <h3 className="text-base font-bold text-white">All caught up!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                There are no borrower applications waiting for review right now. New verified applications will automatically show up here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {applications.map((app) => (
                <BorrowerFeedCard
                  key={app.id}
                  application={app}
                  onActionClick={handleOpenDecisionModal}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Decision Modal */}
      <DecisionModal
        isOpen={modalOpen}
        actionType={modalAction}
        application={selectedApp}
        onClose={() => setModalOpen(false)}
        onSubmit={handleDecisionSubmit}
        isProcessing={isProcessing}
      />
    </div>
  );
}
