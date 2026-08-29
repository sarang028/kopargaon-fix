import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.jsx';
import Header from '../../components/ui/Header.jsx';
import { Modal } from '../../components/ui/Modal.jsx';
import { getWardShortName } from '../../data/wards.js';
import {
  Search,
  MapPin,
  Clock,
  AlertTriangle,
  Award,
  Users,
  Calendar,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Eye,
  TrendingUp,
  FileText
} from 'lucide-react';

export default function AdminCitizenIssues() {
  const {
    state,
    updateDecisionStatus,
    allocateResources,
    refreshLiveData,
    dbLoading
  } = useApp();

  const [search, setSearch] = useState('');
  const [filterWard, setFilterWard] = useState('All');
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [reviewReason, setReviewReason] = useState('');
  const [comparingIssueId, setComparingIssueId] = useState('');
  
  // Resource allocation form state
  const [allocBudget, setAllocBudget] = useState(0);
  const [allocWorkers, setAllocWorkers] = useState(0);
  const [allocDuration, setAllocDuration] = useState(0);
  const [allocTeam, setAllocTeam] = useState('');

  const issues = state.issues || [];

  // Filter issues
  const filteredIssues = issues.filter(i => {
    const matchSearch = !search ||
      i.title.toLowerCase().includes(search.toLowerCase()) ||
      i.description.toLowerCase().includes(search.toLowerCase()) ||
      i.report_number.toLowerCase().includes(search.toLowerCase());
    const matchWard = filterWard === 'All' || i.ward === filterWard;
    return matchSearch && matchWard;
  });

  // Sort by priority score descending to establish Rank
  const rankedIssues = [...filteredIssues].sort((a, b) => {
    const scoreA = a.decision?.priority_score || 0;
    const scoreB = b.decision?.priority_score || 0;
    return scoreB - scoreA;
  });

  // Handler for administrative actions (Approve, Defer, Reject)
  const handleActionSubmit = async (decisionStatus) => {
    if (!selectedIssue || !selectedIssue.decision) return;
    if (!reviewReason.trim()) {
      alert('Please provide a reason for this decision action.');
      return;
    }

    try {
      await updateDecisionStatus(
        selectedIssue.decision.id,
        selectedIssue.id,
        decisionStatus,
        reviewReason
      );
      setSelectedIssue(null);
      setReviewReason('');
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  // Handler for resource allocation approval
  const handleAllocateResources = async (e) => {
    e.preventDefault();
    if (!selectedIssue || !selectedIssue.decision) return;

    try {
      await allocateResources(
        selectedIssue.decision.id,
        selectedIssue.id,
        Number(allocBudget),
        Number(allocWorkers),
        Number(allocDuration),
        allocTeam
      );
      setSelectedIssue(null);
      alert('Resources allocated and work scheduled successfully!');
    } catch (err) {
      alert(`Allocation failed: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 overflow-hidden">
      <Header
        title="Civic Decision Queue & Prioritization Engine"
        subtitle={`${rankedIssues.length} issues in triage · Prioritized via multi-factor civic algorithm`}
      />

      {/* Filters row */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-900 flex flex-wrap gap-4 flex-shrink-0">
        <div className="relative flex-1 min-w-44 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, title, keyword..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500 font-medium"
          />
        </div>
        <select
          value={filterWard}
          onChange={e => setFilterWard(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-yellow-500 font-medium"
        >
          <option value="All">All Wards</option>
          {state.wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <button
          onClick={refreshLiveData}
          className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700"
        >
          <RefreshCw size={12} className={dbLoading ? 'animate-spin' : ''} />
          Reload
        </button>
      </div>

      {/* Main Table View */}
      <div className="flex-1 overflow-auto p-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Issue ID</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Ward</th>
                <th className="px-4 py-3 text-center">Priority</th>
                <th className="px-4 py-3 text-center">Confidence</th>
                <th className="px-4 py-3">Cost Required</th>
                <th className="px-4 py-3">Staff / Days</th>
                <th className="px-4 py-3">Decision Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {rankedIssues.map((issue, idx) => {
                const score = issue.decision?.priority_score || 0;
                const level = issue.decision?.priority_level || 'LOW';
                const confidence = issue.decision?.confidence_score || 100;
                const completeness = issue.decision?.data_completeness || 100;
                
                return (
                  <tr key={issue.id} className="hover:bg-slate-850 transition-colors">
                    <td className="px-4 py-4 font-bold text-slate-500">#{idx + 1}</td>
                    <td className="px-4 py-4 font-mono font-bold text-yellow-500">{issue.report_number}</td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-slate-200 block">{issue.title}</span>
                      <span className="text-[10px] text-slate-400 block truncate max-w-xs">{issue.description}</span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{getWardShortName(issue.ward)}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        level === 'CRITICAL' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        level === 'HIGH' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                        level === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                        'bg-slate-850 text-slate-400 border border-slate-700'
                      }`}>
                        {score} {level}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`font-bold ${confidence < 80 ? 'text-yellow-500' : 'text-emerald-400'}`}>
                        {confidence}%
                      </span>
                      <span className="text-[9px] text-slate-500 block">Comp: {completeness}%</span>
                    </td>
                    <td className="px-4 py-4 text-slate-200 font-bold">
                      ₹{Number(issue.decision?.recommended_budget || 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-4 text-slate-400">
                      {issue.decision?.recommended_workers} workers / {issue.decision?.estimated_duration} days
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        issue.decision?.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        issue.decision?.status === 'DEFERRED' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        issue.decision?.status === 'ESCALATED' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                        'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                      }`}>
                        {issue.decision?.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedIssue(issue);
                          setAllocBudget(issue.decision?.recommended_budget || 0);
                          setAllocWorkers(issue.decision?.recommended_workers || 0);
                          setAllocDuration(issue.decision?.estimated_duration || 0);
                          setAllocTeam(issue.decision?.recommended_team || '');
                        }}
                        className="text-xs font-semibold px-3 py-1 bg-yellow-500 hover:bg-yellow-400 text-slate-950 rounded transition"
                      >
                        Triage Decision
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Triaging Detail Modal */}
      <Modal
        isOpen={!!selectedIssue}
        onClose={() => { setSelectedIssue(null); setComparingIssueId(''); }}
        title={`Triaging Decision: ${selectedIssue?.title}`}
        size="xl"
      >
        {selectedIssue && selectedIssue.decision && (
          <div className="space-y-6 text-xs text-slate-300">
            {/* KPI Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Priority Score</span>
                <span className="text-2xl font-extrabold text-yellow-500 mt-1 block">
                  {selectedIssue.decision.priority_score} / 100
                </span>
                <span className="text-[9px] text-slate-500 block uppercase font-bold mt-1">
                  {selectedIssue.decision.priority_level}
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Confidence Score</span>
                <span className={`text-2xl font-extrabold mt-1 block ${selectedIssue.decision.confidence_score < 80 ? 'text-yellow-500' : 'text-emerald-400'}`}>
                  {selectedIssue.decision.confidence_score}%
                </span>
                <span className="text-[9px] text-slate-500 block uppercase font-bold mt-1">
                  Completeness: {selectedIssue.decision.data_completeness}%
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Cost Requirement</span>
                <span className="text-2xl font-extrabold text-blue-400 mt-1 block">
                  ₹{Number(selectedIssue.decision.recommended_budget).toLocaleString('en-IN')}
                </span>
                <span className="text-[9px] text-slate-500 block mt-1">
                  {selectedIssue.decision.recommended_workers} staff · {selectedIssue.decision.estimated_duration} days
                </span>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-center">
                <span className="text-[10px] text-slate-400 font-semibold block uppercase">Status</span>
                <span className="text-2xl font-extrabold text-indigo-400 mt-1 block uppercase">
                  {selectedIssue.decision.status}
                </span>
                <span className="text-[9px] text-slate-500 block mt-1">
                  Ward: {getWardShortName(selectedIssue.ward)}
                </span>
              </div>
            </div>

            {/* Incomplete Data Handling Alert */}
            {selectedIssue.decision.confidence_score < 85 && (
              <div className="bg-yellow-950/30 border border-yellow-500/20 p-4 rounded-xl space-y-2 flex gap-3">
                <AlertTriangle className="text-yellow-500 w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-500 text-xs">Decision Confidence Alert</h4>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Decision confidence is reduced because infrastructure inspection data or cost calculations are incomplete or unverified. Manual engineer review is recommended before full budget approval.
                  </p>
                </div>
              </div>
            )}

            {/* Two Column Section */}
            <div className="grid lg:grid-cols-2 gap-6">
              {/* Prioritization Factors breakdown (Why This Issue?) */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                  <Award size={14} className="text-yellow-500" />
                  "Why This Issue?" factor breakdown
                </h4>
                <div className="space-y-3">
                  {selectedIssue.factors?.map(factor => (
                    <div key={factor.id || factor.factor_name} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-300 font-medium capitalize">
                          {factor.factor_name.replace('_', ' ')}
                        </span>
                        <span className="text-slate-400">
                          {factor.raw_value}/100 (Weight: {Math.round(factor.weight * 100)}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-1.5">
                        <div
                          className="bg-yellow-500 h-1.5 rounded-full"
                          style={{ width: `${factor.raw_value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-2 leading-relaxed">
                  <p className="font-bold text-slate-200 flex items-center gap-1.5">
                    <FileText size={12} className="text-yellow-500" />
                    Explanation Narrative:
                  </p>
                  <p className="text-slate-400">
                    {selectedIssue.decision.reasoning}
                  </p>
                </div>
              </div>

              {/* Resource Allocation Form and Status */}
              <div className="space-y-6">
                <form onSubmit={handleAllocateResources} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <Users size={14} className="text-blue-400" />
                    Resource Allocation Settings
                  </h4>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Allocate Budget (₹)
                      </label>
                      <input
                        type="number"
                        value={allocBudget}
                        onChange={e => setAllocBudget(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Required Workers
                      </label>
                      <input
                        type="number"
                        value={allocWorkers}
                        onChange={e => setAllocWorkers(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500 font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Duration (Working Days)
                      </label>
                      <input
                        type="number"
                        value={allocDuration}
                        onChange={e => setAllocDuration(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500 font-semibold"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Assigned Squad/Team
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Squad A"
                        value={allocTeam}
                        onChange={e => setAllocTeam(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-yellow-500 font-semibold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition"
                  >
                    Allocate & Approve Project
                  </button>
                </form>

                {/* Why Not #2? Comparison Panel */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                  <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-yellow-500" />
                    "Why Not #2?" Comparison tool
                  </h4>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                      Compare with another issue in queue
                    </label>
                    <select
                      value={comparingIssueId}
                      onChange={e => setComparingIssueId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-yellow-500 font-semibold"
                    >
                      <option value="">-- Choose an issue --</option>
                      {issues
                        .filter(i => i.id !== selectedIssue.id)
                        .map(i => (
                          <option key={i.id} value={i.id}>
                            ({i.report_number}) {i.title} [{i.decision?.priority_score}]
                          </option>
                        ))}
                    </select>
                  </div>

                  {comparingIssueId && (() => {
                    const compIssue = issues.find(i => i.id === comparingIssueId);
                    if (!compIssue || !compIssue.decision) return null;

                    const scoreDiff = (selectedIssue.decision.priority_score - compIssue.decision.priority_score).toFixed(1);

                    return (
                      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-xs space-y-3">
                        <div className="flex justify-between items-center border-b border-slate-800 pb-2">
                          <span className="font-bold text-slate-200">Priority Score Difference:</span>
                          <span className="text-yellow-500 font-extrabold font-mono">
                            +{scoreDiff} points
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                          <div className="bg-slate-900 border border-slate-800 p-2 rounded">
                            <span className="text-slate-500 block uppercase">Factor</span>
                            <span className="text-slate-300 font-bold block mt-1">Safety</span>
                            <span className="text-slate-300 font-bold block mt-1">Urgency</span>
                            <span className="text-slate-300 font-bold block mt-1 font-sans">Cost</span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-2 rounded">
                            <span className="text-slate-500 block uppercase truncate">This issue</span>
                            <span className="text-red-400 font-extrabold block mt-1">
                              {selectedIssue.factors?.find(f => f.factor_name === 'safety_risk')?.raw_value || 0}
                            </span>
                            <span className="text-yellow-400 font-extrabold block mt-1">
                              {selectedIssue.factors?.find(f => f.factor_name === 'urgency')?.raw_value || 0}
                            </span>
                            <span className="text-slate-300 font-extrabold block mt-1">
                              ₹{(Number(selectedIssue.decision.recommended_budget) / 100000).toFixed(1)}L
                            </span>
                          </div>
                          <div className="bg-slate-900 border border-slate-850 p-2 rounded">
                            <span className="text-slate-500 block uppercase truncate">Comp Issue</span>
                            <span className="text-red-400 font-extrabold block mt-1">
                              {compIssue.factors?.find(f => f.factor_name === 'safety_risk')?.raw_value || 0}
                            </span>
                            <span className="text-yellow-400 font-extrabold block mt-1">
                              {compIssue.factors?.find(f => f.factor_name === 'urgency')?.raw_value || 0}
                            </span>
                            <span className="text-slate-300 font-extrabold block mt-1">
                              ₹{(Number(compIssue.decision.recommended_budget) / 100000).toFixed(1)}L
                            </span>
                          </div>
                        </div>

                        <p className="text-slate-400 leading-relaxed text-[11px] border-t border-slate-800 pt-2">
                          <strong>Comparison Narrative:</strong> "{selectedIssue.title}" is prioritized over "{compIssue.title}" because its safety risk and critical location score outweigh "{compIssue.title}"'s relative scores.
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Admin Action Control Row (Approve / Defer / Reject) */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
              <h4 className="font-bold text-slate-200 border-b border-slate-800 pb-2">
                Administrative Council Action
              </h4>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                    Mandatory review/action reasoning
                  </label>
                  <textarea
                    rows={2}
                    value={reviewReason}
                    onChange={e => setReviewReason(e.target.value)}
                    placeholder="Provide reasoning details here..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 focus:outline-none focus:border-yellow-500"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleActionSubmit('APPROVED')}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleActionSubmit('DEFERRED')}
                    className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold border border-slate-700 rounded-lg transition"
                  >
                    Defer
                  </button>
                  <button
                    onClick={() => handleActionSubmit('ESCALATED')}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition"
                  >
                    Escalate
                  </button>
                </div>
              </div>
            </div>

          </div>
        )}
      </Modal>
    </div>
  );
}
