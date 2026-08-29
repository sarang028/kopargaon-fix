import React, { createContext, useContext, useReducer, useEffect, useState, useCallback } from 'react';
import { landUseZones } from '../data/landuse.js';
import { wards as initialWards } from '../data/wards.js';
import { transformations } from '../data/transformations.js';
import {
  supabase,
  isSupabaseConfigured,
  signUpUser,
  loginUser,
  logoutUser,
  getCurrentProfile,
  fetchReportsWithDecisions,
  fetchResourcePools,
  fetchLiveProjects,
  fetchLiveInfrastructure,
  fetchAuditLogs,
  fetchNotifications,
  markNotificationsAsRead,
  saveDecisionScenario,
  fetchDecisionScenarios,
  createReportInSupabase,
  updateReportStatusInSupabase,
  allocateResourcesInSupabase,
  seedDatabaseDemoScenario,
} from '../lib/supabase.js';

// ── Initial State ─────────────────────────────────────────────────────────────
const initialState = {
  role: 'citizen',
  darkMode: true,
  infrastructure: [],
  projects: [],
  issues: [], // contains reports + decision + factors
  resourcePools: [],
  wardMetrics: [],
  auditLogs: [],
  notifications: [],
  scenarios: [],
  landUseZones,
  wards: initialWards,
  transformations,
  selectedAsset: null,
  selectedWard: null,
  dbError: null,
  dbLoading: true,
};

// ── Reducer ───────────────────────────────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {
    case 'SET_ROLE':
      return { ...state, role: action.payload };

    case 'TOGGLE_DARK_MODE':
      return { ...state, darkMode: !state.darkMode };

    case 'OPEN_ASSET_MODAL':
      return { ...state, selectedAsset: action.payload };

    case 'CLOSE_ASSET_MODAL':
      return { ...state, selectedAsset: null };

    case 'SELECT_WARD':
      return { ...state, selectedWard: action.payload };

    case 'SET_DB_ERROR':
      return { ...state, dbError: action.payload, dbLoading: false };

    case 'SET_DB_LOADING':
      return { ...state, dbLoading: action.payload };

    case 'SET_LIVE_DATA':
      return {
        ...state,
        ...action.payload,
        dbError: null,
        dbLoading: false,
      };

    default:
      return state;
  }
}

// ── Context ───────────────────────────────────────────────────────────────────
const AppContext = createContext(null);

// Priority weighting model
export const PRIORITY_WEIGHTS = {
  urgency: 0.25,
  safety_risk: 0.20,
  population_affected: 0.15,
  traffic_impact: 0.10,
  critical_location: 0.10,
  citizen_reports: 0.05,
  infrastructure_condition: 0.05,
  delay_risk: 0.05,
  cost_efficiency: 0.05,
};

// Helper to calculate score and completeness
export function calculatePriorityMetrics(factors) {
  let score = 0;
  let populatedCount = 0;
  let lowQualityCount = 0;
  const missingFactors = [];

  const factorKeys = Object.keys(PRIORITY_WEIGHTS);
  
  factorKeys.forEach(key => {
    const factor = factors?.find(f => f.factor_name === key || f.name === key);
    if (factor && factor.raw_value !== undefined && factor.raw_value !== null) {
      populatedCount++;
      const val = Number(factor.raw_value);
      score += val * PRIORITY_WEIGHTS[key];
      
      if (factor.data_quality === 'Poor' || factor.data_quality === 'unverified') {
        lowQualityCount++;
      }
    } else {
      missingFactors.push(key);
    }
  });

  const completeness = Math.round((populatedCount / factorKeys.length) * 100);
  // Base confidence starts at 100, drops for missing factors and low quality data
  let confidence = 100 - (missingFactors.length * 12) - (lowQualityCount * 8);
  if (confidence < 0) confidence = 0;
  
  return {
    score: Number(score.toFixed(1)),
    completeness,
    confidence: Math.round(confidence),
    missingFactors,
  };
}

// Helper to check priority level string
export function getPriorityLevel(score) {
  if (score >= 90) return 'CRITICAL';
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // What-If Simulation State
  const [simulationActive, setSimulationActive] = useState(false);
  const [simSettings, setSimSettings] = useState({
    budget: 1000000,
    workers: 8,
    days: 7,
  });

  // Dark mode class sync
  useEffect(() => {
    const html = document.documentElement;
    if (state.darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  }, [state.darkMode]);

  // Load active session and subscribe to Supabase Auth changes
  useEffect(() => {
    async function initAuth() {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
          setUser(data.session.user);
          const userProfile = await getCurrentProfile(data.session.user.id);
          if (userProfile) {
            setProfile(userProfile);
            dispatch({ type: 'SET_ROLE', payload: userProfile.role });
          }
        }
      } catch (err) {
        console.warn('Initial session check skipped:', err.message);
      } finally {
        setAuthLoading(false);
      }
    }

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user || null);
      if (newSession?.user) {
        const p = await getCurrentProfile(newSession.user.id);
        setProfile(p);
        if (p?.role) {
          dispatch({ type: 'SET_ROLE', payload: p.role });
        }
      } else {
        setProfile(null);
      }
      setAuthLoading(false);
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  // Fetch all operational data from Supabase
  const refreshLiveData = useCallback(async () => {
    dispatch({ type: 'SET_DB_LOADING', payload: true });
    try {
      const [reports, resources, infra, projects, logs, scenarios] = await Promise.all([
        fetchReportsWithDecisions(),
        fetchResourcePools(),
        fetchLiveInfrastructure(),
        fetchLiveProjects(),
        fetchAuditLogs(),
        fetchDecisionScenarios(),
      ]);

      dispatch({
        type: 'SET_LIVE_DATA',
        payload: {
          issues: reports,
          resourcePools: resources,
          infrastructure: infra,
          projects: projects,
          auditLogs: logs,
          scenarios: scenarios,
        },
      });
    } catch (err) {
      console.error('Database connection failed:', err);
      dispatch({ type: 'SET_DB_ERROR', payload: err.message });
    }
  }, []);

  useEffect(() => {
    refreshLiveData();
  }, [refreshLiveData]);

  // Load live user notifications
  const [userNotifications, setUserNotifications] = useState([]);
  const loadNotifications = useCallback(async () => {
    if (user?.id) {
      const data = await fetchNotifications(user.id);
      setUserNotifications(data);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Helper to submit a citizen report
  const submitCitizenReport = async (reportData) => {
    try {
      const reportId = crypto.randomUUID();
      const reportNumber = `CF-KPG-${Math.floor(1000 + Math.random() * 9000)}`;

      // Calculate initial priority metrics (cost efficiency starts empty/defaulted)
      const mockFactors = [
        { factor_name: 'urgency', raw_value: reportData.urgency || 50, data_quality: 'Good' },
        { factor_name: 'safety_risk', raw_value: reportData.safetyRisk || 40, data_quality: 'Good' },
        { factor_name: 'population_affected', raw_value: reportData.populationAffected || 50, data_quality: 'Good' },
        { factor_name: 'traffic_impact', raw_value: reportData.trafficImpact || 30, data_quality: 'Good' },
        { factor_name: 'critical_location', raw_value: reportData.criticalLocation || 30, data_quality: 'Good' },
        { factor_name: 'citizen_reports', raw_value: 20, data_quality: 'Good' }, // default 1 report
        { factor_name: 'infrastructure_condition', raw_value: reportData.conditionScore || 50, data_quality: 'unverified' }, // unverified reduces confidence
        { factor_name: 'delay_risk', raw_value: 30, data_quality: 'Good' },
        { factor_name: 'cost_efficiency', raw_value: 50, data_quality: 'Good' },
      ];

      const metrics = calculatePriorityMetrics(mockFactors);

      const reportRow = {
        id: reportId,
        report_number: reportNumber,
        user_id: user?.id || '00000000-0000-0000-0000-000000000002', // default fallback citizen
        title: reportData.title,
        description: reportData.description,
        category: reportData.category,
        priority: getPriorityLevel(metrics.score),
        status: 'Received',
        latitude: reportData.lat || 19.8917,
        longitude: reportData.lng || 74.4789,
        address: reportData.address || 'Kopargaon, Maharashtra',
        ward: reportData.wardId || 'W1',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const decisionId = crypto.randomUUID();
      const decisionRow = {
        id: decisionId,
        issue_id: reportId,
        priority_score: metrics.score,
        priority_level: getPriorityLevel(metrics.score),
        confidence_score: metrics.confidence,
        data_completeness: metrics.completeness,
        recommended_action: metrics.score >= 70 ? 'FUND NOW' : 'DEFER',
        recommended_budget: reportData.estimatedCost || 100000,
        recommended_workers: reportData.requiredWorkers || 2,
        estimated_duration: reportData.estimatedDuration || 2,
        recommended_team: 'Unassigned Squad',
        expected_impact: 'Pending Review',
        reasoning: `Issue reported with initial priority score ${metrics.score}. Safety: ${reportData.safetyRisk || 40}, Urgency: ${reportData.urgency || 50}.`,
        status: 'PENDING',
        created_at: new Date().toISOString(),
      };

      const factorsRows = mockFactors.map(f => ({
        decision_id: decisionId,
        factor_name: f.factor_name,
        raw_value: f.raw_value,
        normalized_score: f.raw_value,
        weight: PRIORITY_WEIGHTS[f.factor_name],
        weighted_score: f.raw_value * PRIORITY_WEIGHTS[f.factor_name],
        data_source: 'Citizen Submit',
        data_quality: f.data_quality,
        confidence: f.data_quality === 'Good' ? 90 : 60,
      }));

      await createReportInSupabase({
        report: reportRow,
        decision: decisionRow,
        factors: factorsRows,
      });

      await refreshLiveData();
      return { success: true, reportNumber };
    } catch (err) {
      console.error('Error submitting report:', err);
      throw err;
    }
  };

  // Helper to approve/defer/reject decision status
  const updateDecisionStatus = async (decisionId, reportId, decisionStatus, reason) => {
    try {
      // Maps decision_status enum to report_status enum mixed case
      const reportStatusMap = {
        'APPROVED': 'Scheduled',
        'DEFERRED': 'Deferred',
        'PENDING': 'Under Assessment',
        'ESCALATED': 'Under Assessment',
        'COMPLETED': 'Resolved',
      };
      
      const reportStatus = reportStatusMap[decisionStatus] || 'Deferred';

      await updateReportStatusInSupabase(
        decisionId,
        reportId,
        decisionStatus,
        reportStatus,
        reason,
        user?.id
      );

      await refreshLiveData();
    } catch (err) {
      console.error('Error updating status:', err);
      throw err;
    }
  };

  // Helper to allocate resources for a decision
  const allocateResources = async (decisionId, reportId, budget, workers, duration, team) => {
    try {
      await allocateResourcesInSupabase(
        decisionId,
        reportId,
        budget,
        workers,
        duration,
        team,
        user?.id
      );
      await refreshLiveData();
    } catch (err) {
      console.error('Resource allocation failed:', err);
      throw err;
    }
  };

  // Trigger Database Seed
  const triggerDatabaseSeed = async () => {
    try {
      await seedDatabaseDemoScenario();
      await refreshLiveData();
    } catch (err) {
      console.error('Failed to trigger database seed:', err);
    }
  };

  // Auth functions
  const login = async (email, password) => {
    const res = await loginUser({ email, password });
    if (res.data?.session) {
      setSession(res.data.session);
      setUser(res.data.user);
      const p = await getCurrentProfile(res.data.user.id);
      if (p) {
        setProfile(p);
        dispatch({ type: 'SET_ROLE', payload: p.role });
      }
    }
    return res;
  };

  const signup = async (email, password, fullName, role, phone) => {
    return await signUpUser({ email, password, fullName, role, phone });
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setSession(null);
    setProfile(null);
    dispatch({ type: 'SET_ROLE', payload: 'citizen' });
  };

  const openAuthModal = () => setIsAuthModalOpen(true);
  const closeAuthModal = () => setIsAuthModalOpen(false);

  // ── Resource Constraint Optimizer ──
  // Recommends which combination of issues fits the resource limits best
  const getResourceOptimizedAllocations = useCallback((customLimits = null) => {
    const limits = customLimits || {
      budget: Number(state.resourcePools.find(p => p.resource_type === 'budget')?.total_available) || 1000000,
      workers: Number(state.resourcePools.find(p => p.resource_type === 'workers')?.total_available) || 8,
      days: Number(state.resourcePools.find(p => p.resource_type === 'working_days')?.total_available) || 7,
    };

    // Sort issues by priority score descending
    const pendingIssues = state.issues
      .filter(issue => issue.decision && issue.decision.status === 'PENDING')
      .sort((a, b) => (b.decision.priority_score || 0) - (a.decision.priority_score || 0));

    let remainingBudget = limits.budget;
    let remainingWorkers = limits.workers;
    let remainingDays = limits.days;

    const allocations = pendingIssues.map(issue => {
      const reqBudget = Number(issue.decision.recommended_budget) || 100000;
      const reqWorkers = Number(issue.decision.recommended_workers) || 2;
      const reqDays = Number(issue.decision.estimated_duration) || 1;

      let status = 'DEFERRED';
      let reason = 'Lower urgency relative to competing safety-critical requests under current resource constraints.';

      if (remainingBudget >= reqBudget && remainingWorkers >= reqWorkers && remainingDays >= reqDays) {
        status = 'FUNDED';
        reason = 'Fully approved and prioritized based on safety and critical location importance.';
        remainingBudget -= reqBudget;
        remainingWorkers -= reqWorkers;
        remainingDays -= reqDays;
      } else if (remainingBudget > 0 && remainingBudget < reqBudget && remainingWorkers >= reqWorkers && remainingDays >= reqDays) {
        // Partial funding scenario
        status = 'PARTIALLY FUNDED';
        reason = 'Allocated partial funding for initial logistics and site prep due to budget constraints.';
        remainingBudget = 0;
      }

      return {
        issueId: issue.id,
        title: issue.title,
        priorityScore: issue.decision.priority_score,
        cost: reqBudget,
        workers: reqWorkers,
        duration: reqDays,
        status,
        reason,
      };
    });

    return {
      allocations,
      summary: {
        budget: { total: limits.budget, allocated: limits.budget - remainingBudget, remaining: remainingBudget },
        workers: { total: limits.workers, allocated: limits.workers - remainingWorkers, remaining: remainingWorkers },
        days: { total: limits.days, allocated: limits.days - remainingDays, remaining: remainingDays },
      }
    };
  }, [state.issues, state.resourcePools]);

  // Save scenario (For What-If view)
  const saveWhatIfScenario = async (name) => {
    if (!user) return;
    const scenario = {
      name,
      budget: simSettings.budget,
      workers: simSettings.workers,
      available_days: simSettings.days,
      created_by: user.id,
    };
    await saveDecisionScenario(scenario);
    await refreshLiveData();
  };

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        user,
        session,
        profile,
        authLoading,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        login,
        signup,
        logout,
        submitCitizenReport,
        updateDecisionStatus,
        allocateResources,
        refreshLiveData,
        triggerDatabaseSeed,
        // Notifications
        notifications: userNotifications,
        markAllRead: async () => {
          if (user?.id) {
            await markNotificationsAsRead(user.id);
            await loadNotifications();
          }
        },
        // Resource optimization
        getResourceOptimizedAllocations,
        // Simulation settings
        simulationActive,
        setSimulationActive,
        simSettings,
        setSimSettings,
        saveWhatIfScenario,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export function useAnalytics() {
  const { state } = useApp();
  const { infrastructure, projects, issues, wards } = state;

  // Infrastructure stats
  const infraByType = {};
  const infraByWard = {};
  infrastructure.forEach(i => {
    const type = i.category || i.type;
    infraByType[type] = (infraByType[type] || 0) + 1;
    const w = i.ward || i.wardId;
    infraByWard[w] = (infraByWard[w] || 0) + 1;
  });

  const conditionDist = { 'Excellent (8-10)': 0, 'Good (6-7)': 0, 'Fair (5)': 0, 'Poor (3-4)': 0, 'Critical (1-2)': 0 };
  infrastructure.forEach(i => {
    const cond = Number(i.condition_score || i.condition) || 8;
    if (cond >= 8) conditionDist['Excellent (8-10)']++;
    else if (cond >= 6) conditionDist['Good (6-7)']++;
    else if (cond === 5) conditionDist['Fair (5)']++;
    else if (cond >= 3) conditionDist['Poor (3-4)']++;
    else conditionDist['Critical (1-2)']++;
  });

  // Project stats
  const projectsByStatus = {};
  const projectsByCategory = {};
  let totalBudget = 0, totalSpent = 0;
  projects.forEach(p => {
    projectsByStatus[p.status] = (projectsByStatus[p.status] || 0) + 1;
    projectsByCategory[p.category || 'Infrastructure'] = (projectsByCategory[p.category || 'Infrastructure'] || 0) + 1;
    totalBudget += Number(p.budget) || 0;
    totalSpent += Number(p.spent) || 0;
  });

  // Issue stats
  const issuesByCategory = {};
  const issuesByStatus = {};
  const issuesByWard = {};
  issues.forEach(i => {
    issuesByCategory[i.category] = (issuesByCategory[i.category] || 0) + 1;
    const stat = i.decision?.status || i.status;
    issuesByStatus[stat] = (issuesByStatus[stat] || 0) + 1;
    const w = i.ward || i.wardId;
    issuesByWard[w] = (issuesByWard[w] || 0) + 1;
  });
  const resolvedCount = (issuesByStatus['Resolved'] || 0) + (issuesByStatus['Verified'] || 0) + (issuesByStatus['COMPLETED'] || 0);
  const unresolvedCount = issues.length - resolvedCount;

  return {
    infrastructure: {
      total: infrastructure.length,
      byType: infraByType,
      byWard: infraByWard,
      conditionDist,
      criticalCount: infrastructure.filter(i => (Number(i.condition_score || i.condition) || 8) <= 4).length,
      avgCondition: (infrastructure.reduce((s, i) => s + (Number(i.condition_score || i.condition) || 8), 0) / (infrastructure.length || 1)).toFixed(1),
    },
    projects: {
      total: projects.length,
      byStatus: projectsByStatus,
      byCategory: projectsByCategory,
      totalBudget,
      totalSpent,
      activeCount: (projectsByStatus['In Progress'] || 0) + (projectsByStatus['Approved'] || 0),
      completedCount: projectsByStatus['Completed'] || 0,
      delayedCount: projectsByStatus['Delayed'] || 0,
    },
    issues: {
      total: issues.length,
      byCategory: issuesByCategory,
      byStatus: issuesByStatus,
      byWard: issuesByWard,
      resolvedCount,
      unresolvedCount,
      resolutionRate: issues.length > 0 ? Math.round((resolvedCount / issues.length) * 100) : 0,
    },
    wards: wards.map(w => ({
      ...w,
      infraCount: infraByWard[w.id] || 0,
      issueCount: issuesByWard[w.id] || 0,
      projectCount: projects.filter(p => (p.wardId || p.ward) === w.id).length,
    }))
  };
}
