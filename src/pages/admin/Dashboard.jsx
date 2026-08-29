import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  Database,
  RefreshCw,
  TrendingUp,
  MapPin,
  TrendingDown,
  Layers,
  Settings,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext.jsx';
import Header from '../../components/ui/Header.jsx';
import { getWardShortName } from '../../data/wards.js';

export default function AdminDashboard() {
  const {
    state,
    refreshLiveData,
    triggerDatabaseSeed,
    getResourceOptimizedAllocations,
    dbLoading
  } = useApp();

  const [seeding, setSeeding] = useState(false);

  // Database error handling
  if (state.dbError) {
    return (
      <div className="flex flex-col h-full bg-slate-900 text-slate-100 p-8 justify-center items-center">
        <div className="bg-red-950 border border-red-500 rounded-xl p-6 max-w-lg text-center space-y-4 shadow-2xl">
          <AlertTriangle className="text-red-500 w-16 h-16 mx-auto animate-bounce" />
          <h2 className="text-xl font-bold">Supabase Database Error</h2>
          <p className="text-sm text-red-300">
            Could not connect to the live Supabase project `gxrxtnbbrfwpfbzoydur` or fetch operational tables.
          </p>
          <pre className="bg-black/40 text-red-400 p-3 rounded text-xs font-mono text-left overflow-x-auto">
            {state.dbError}
          </pre>
          <div className="flex justify-center gap-4">
            <button
              onClick={refreshLiveData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 rounded font-semibold text-sm transition"
            >
              <RefreshCw size={14} className={dbLoading ? 'animate-spin' : ''} />
              Retry Connection
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Seeding trigger handler
  const handleSeed = async () => {
    setSeeding(true);
    await triggerDatabaseSeed();
    setSeeding(false);
  };

  const issues = state.issues || [];
  const resourcePools = state.resourcePools || [];

  // Top KPIs calculations
  const criticalCount = issues.filter(i => i.decision?.priority_level === 'CRITICAL').length;
  const pendingCount = issues.filter(i => i.decision?.status === 'PENDING').length;

  const budgetPool = resourcePools.find(p => p.resource_type === 'budget');
  const workersPool = resourcePools.find(p => p.resource_type === 'workers');
  const daysPool = resourcePools.find(p => p.resource_type === 'working_days');

  const totalBudget = Number(budgetPool?.total_available) || 0;
  const remainingBudget = Number(budgetPool?.remaining) || 0;
  const allocatedBudget = Number(budgetPool?.currently_allocated) || 0;

  const totalWorkers = Number(workersPool?.total_available) || 0;
  const remainingWorkers = Number(workersPool?.remaining) || 0;
  const allocatedWorkers = Number(workersPool?.currently_allocated) || 0;

  // Resource Utilization percentage
  const budgetUtilization = totalBudget > 0 ? (allocatedBudget / totalBudget) * 100 : 0;
  const staffUtilization = totalWorkers > 0 ? (allocatedWorkers / totalWorkers) * 100 : 0;
  const avgUtilization = Math.round((budgetUtilization + staffUtilization) / 2);

  // Average confidence score
  const withDecisions = issues.filter(i => i.decision);
  const avgConfidence = withDecisions.length > 0
    ? Math.round(withDecisions.reduce((sum, i) => sum + Number(i.decision.confidence_score || 0), 0) / withDecisions.length)
    : 0;

  // Competing demand calculation vs availability
  const totalCostDemand = issues.reduce((sum, i) => sum + (Number(i.decision?.recommended_budget) || 0), 0);
  const totalWorkersDemand = issues.reduce((sum, i) => sum + (Number(i.decision?.recommended_workers) || 0), 0);

  // Optimized allocations
  const optimization = getResourceOptimizedAllocations();

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      <Header
        title="CivicFix Municipal Decision Dashboard"
        subtitle="Kopargaon Municipal Council · Prioritization & Scarcity Control Center"
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        
        {/* Empty State / Seed Action Banner */}
        {issues.length === 0 ? (
          <div className="bg-slate-900 border border-yellow-500/30 rounded-xl p-8 text-center space-y-4">
            <Database size={48} className="text-yellow-500 mx-auto animate-pulse" />
            <h3 className="text-lg font-bold text-yellow-500">Live Database is Empty</h3>
            <p className="text-sm text-slate-400 max-w-md mx-auto">
              No civic issues or decision records exist in project `gxrxtnbbrfwpfbzoydur`. Click below to seed the standard 5-issue competing resource scenario.
            </p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold rounded-lg transition duration-200 disabled:opacity-50"
            >
              {seeding ? 'Seeding Database...' : 'Seed Demo Scenario'}
            </button>
          </div>
        ) : (
          <div className="flex justify-between items-center bg-slate-900 border border-slate-800 rounded-xl px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-sm text-slate-300 font-medium">Live Connected to Supabase</span>
            </div>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition"
            >
              <RefreshCw size={12} className={seeding ? 'animate-spin' : ''} />
              Reset/Re-seed Demo
            </button>
          </div>
        )}

        {/* Top KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Critical Issues</span>
            <span className="text-3xl font-extrabold text-red-500 mt-2">{issues.length > 0 ? criticalCount : '--'}</span>
            <span className="text-[10px] text-slate-500 mt-1">Requiring instant action</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Pending Decisions</span>
            <span className="text-3xl font-extrabold text-yellow-500 mt-2">{issues.length > 0 ? pendingCount : '--'}</span>
            <span className="text-[10px] text-slate-500 mt-1">Awaiting Council approval</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Available Budget</span>
            <span className="text-xl font-bold mt-2 text-emerald-400">
              {issues.length > 0 ? `₹${(remainingBudget / 100000).toFixed(1)}L` : '--'}
            </span>
            <span className="text-[10px] text-slate-500 mt-1">Total: ₹{(totalBudget / 100000).toFixed(1)}L</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Available Staff</span>
            <span className="text-3xl font-extrabold text-blue-400 mt-2">{issues.length > 0 ? remainingWorkers : '--'}</span>
            <span className="text-[10px] text-slate-500 mt-1">Total: {totalWorkers} workers</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Resource Utilization</span>
            <span className="text-3xl font-extrabold text-indigo-400 mt-2">{issues.length > 0 ? `${avgUtilization}%` : '--'}</span>
            <span className="text-[10px] text-slate-500 mt-1">Allocated vs. Limits</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Data Confidence</span>
            <span className="text-3xl font-extrabold text-teal-400 mt-2">{issues.length > 0 ? `${avgConfidence}%` : '--'}</span>
            <span className="text-[10px] text-slate-500 mt-1">Average quality metrics</span>
          </div>
        </div>

        {/* Main Content Layout */}
        {issues.length > 0 && (
          <div className="grid lg:grid-cols-3 gap-6">
            
            {/* Top Priority Decisions (Left column 2/3 width) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                  <h3 className="font-bold text-slate-200">Top Priority Decisions Queue</h3>
                  <Link to="/admin/issues" className="text-xs text-yellow-500 hover:underline">
                    View Queue →
                  </Link>
                </div>
                <div className="divide-y divide-slate-800">
                  {issues
                    .filter(i => i.decision)
                    .sort((a, b) => b.decision.priority_score - a.decision.priority_score)
                    .slice(0, 4)
                    .map((issue, index) => (
                      <div key={issue.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-slate-500 w-6">#{index + 1}</span>
                          <div>
                            <span className="text-xs font-mono text-slate-500">{issue.report_number}</span>
                            <h4 className="text-sm font-semibold text-slate-200">{issue.title}</h4>
                            <div className="flex gap-2 mt-0.5 text-[11px] text-slate-400">
                              <span>{getWardShortName(issue.ward)}</span>
                              <span>•</span>
                              <span>₹{(Number(issue.decision.recommended_budget) / 100000).toFixed(1)}L</span>
                              <span>•</span>
                              <span>{issue.decision.recommended_workers} staff</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`inline-block px-2.5 py-1 rounded text-xs font-bold ${
                            issue.decision.priority_level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            issue.decision.priority_level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                          }`}>
                            {issue.decision.priority_score} {issue.decision.priority_level}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* GIS Command Center Link */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="space-y-1 text-center md:text-left">
                    <h3 className="font-bold text-lg text-slate-200">GIS Command Center</h3>
                    <p className="text-sm text-slate-400 max-w-md">
                      Interactive geo-spatial display of active projects, priority ratings, and resource distributions across Kopargaon.
                    </p>
                  </div>
                  <Link
                    to="/admin/gis-map"
                    className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-yellow-500 font-bold border border-slate-700 rounded-lg transition"
                  >
                    <Layers size={16} />
                    Open GIS Viewer
                  </Link>
                </div>
              </div>
            </div>

            {/* Resource Scarcity Constraints (Right column 1/3 width) */}
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h3 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-2">
                  <AlertCircle size={16} className="text-yellow-500" />
                  Resource Constraint Snapshot
                </h3>

                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Budget Pool Demand</span>
                      <span className="font-bold text-slate-200">
                        ₹{(totalCostDemand / 100000).toFixed(1)}L / ₹{(totalBudget / 100000).toFixed(1)}L
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (totalCostDemand / (totalBudget || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Staff Pool Demand</span>
                      <span className="font-bold text-slate-200">
                        {totalWorkersDemand} / {totalWorkers} workers
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (totalWorkersDemand / (totalWorkers || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/50 p-4 rounded-lg border border-red-500/20 text-xs text-red-400 space-y-2">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle size={12} />
                    Scarcity Limit Reached
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Total demand (₹{(totalCostDemand / 100000).toFixed(1)}L) exceeds the Council's available budget. The prioritization engine has deferred lower-priority requests to protect emergency services.
                  </p>
                </div>

                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Optimized Allocation:</h4>
                  <div className="space-y-2">
                    {optimization.allocations.slice(0, 5).map(alloc => (
                      <div key={alloc.issueId} className="flex justify-between text-xs">
                        <span className="text-slate-300 truncate w-32">{alloc.title}</span>
                        <span className={`font-bold ${
                          alloc.status === 'FUNDED' ? 'text-emerald-400' :
                          alloc.status === 'PARTIALLY FUNDED' ? 'text-blue-400' :
                          'text-slate-500'
                        }`}>
                          {alloc.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
