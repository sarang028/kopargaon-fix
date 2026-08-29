import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Header from '../../components/ui/Header.jsx';
import { getWardShortName } from '../../data/wards.js';
import {
  Eye,
  IndianRupee,
  Calendar,
  MapPin,
  CheckCircle,
  ShieldCheck,
  FileCheck,
  Search,
  AlertTriangle,
  Award,
  Clock
} from 'lucide-react';

export default function CitizenTransparency() {
  const { state } = useApp();
  const [searchQuery, setSearchQuery] = useState('');

  const issues = state.issues || [];
  const publicProjects = state.projects || [];
  
  const completedCount = publicProjects.filter(p => p.status === 'Completed').length;
  const totalBudget = publicProjects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = publicProjects.reduce((s, p) => s + p.spent, 0);

  // Filter issues based on search
  const filteredIssues = issues.filter(i => {
    return !searchQuery ||
      i.report_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.ward.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      <Header
        title="Kopargaon Planning & Infrastructure Transparency"
        subtitle="Open public register — Know the prioritized decisions and resource status behind your city's infrastructure"
      />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* Accountability Banner */}
        <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900 via-slate-900 to-teal-950 text-white border border-slate-800 shadow-md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center flex-shrink-0">
              <ShieldCheck size={26} className="text-teal-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Defensible Civic Decision Governance
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 leading-relaxed max-w-3xl">
                CivicFix ensures full municipal accountability in Kopargaon. Every citizen can inspect who submitted a request, how the prioritization engine scored it, the scarcity limitations of the resource pool, and the explicit reasoning behind approvals, partial funding, or deferrals.
              </p>
            </div>
          </div>
        </div>

        {/* 4 Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Published Public Works', value: publicProjects.length, icon: '📋' },
            { label: 'Verified Completed', value: completedCount, icon: '✅' },
            { label: 'Total Approved Budget', value: `₹${(totalBudget / 100000).toFixed(1)}L`, icon: '💰' },
            { label: 'Expenditure Utilised', value: `₹${(totalSpent / 100000).toFixed(1)}L`, icon: '📊' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 rounded-2xl border border-slate-800 p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xl font-extrabold text-white">{s.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Citizen Decision Transparency Search */}
        <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
          <div className="px-6 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileCheck size={16} className="text-yellow-500" />
              <h3 className="font-bold text-white text-sm">
                Citizen Prioritization & Transparency Register
              </h3>
            </div>
            <div className="relative w-full max-w-xs">
              <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Complaint ID or Ward..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500"
              />
            </div>
          </div>

          <div className="p-6 space-y-4">
            {filteredIssues.length === 0 ? (
              <p className="text-center text-sm text-slate-500 py-6">No civic decisions available.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredIssues
                  .filter(i => i.decision)
                  .map(issue => {
                    const dec = issue.decision;
                    const isFunded = dec.status === 'APPROVED';
                    const isDeferred = dec.status === 'DEFERRED';

                    return (
                      <div key={issue.id} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-[10px] font-mono text-yellow-500 font-bold block">
                                {issue.report_number} • {getWardShortName(issue.ward)}
                              </span>
                              <h4 className="text-sm font-bold text-slate-200 mt-0.5">{issue.title}</h4>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                              dec.priority_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              dec.priority_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                              'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                            }`}>
                              Score: {dec.priority_score}
                            </span>
                          </div>

                          <p className="text-xs text-slate-400 mt-2 line-clamp-2">{issue.description}</p>
                          
                          <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg text-[11px] leading-relaxed text-slate-300 mt-3">
                            <span className="font-bold text-slate-400 block mb-0.5">Decision Reason:</span>
                            {dec.reasoning}
                          </div>
                        </div>

                        <div className="flex justify-between items-center pt-3 border-t border-slate-900 mt-3 text-[11px]">
                          <span className="text-slate-500">
                            Status: <span className="font-bold text-slate-300 uppercase">{dec.status}</span>
                          </span>
                          <span className={`font-semibold px-2 py-0.5 rounded ${
                            isFunded ? 'bg-emerald-950 text-emerald-400' :
                            isDeferred ? 'bg-slate-900 text-slate-400' :
                            'bg-yellow-950 text-yellow-400'
                          }`}>
                            {isFunded ? 'Scheduled within 2 working days' : isDeferred ? 'Deferred: Resource constraints' : 'Under Assessment'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
