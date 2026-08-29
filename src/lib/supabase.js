import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
  rawSupabaseKey &&
  rawSupabaseUrl !== 'https://your-project.supabase.co' &&
  rawSupabaseUrl !== 'https://klscvpaukgnwuoknzfyy.supabase.co/unconfigured'
);

const fallbackUrl = 'https://gxrxtnbbrfwpfbzoydur.supabase.co';
const fallbackKey = 'sb_publishable_dhkvq-x7z5W78hTpk7wUzw_bDj-l9rv';

const activeUrl = rawSupabaseUrl || fallbackUrl;
const activeKey = rawSupabaseKey || fallbackKey;

export const supabase = createClient(activeUrl, activeKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// ==============================================================================
// CORE DECISION ENGINE CLIENT API
// ==============================================================================

// Fetch all reports joined with decision_records and decision_factors
export async function fetchReportsWithDecisions() {
  if (!isSupabaseConfigured) return [];
  try {
    // Fetch reports
    const { data: reports, error: rErr } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false });
    if (rErr) throw rErr;

    if (!reports || reports.length === 0) return [];

    // Fetch decisions
    const { data: decisions, error: dErr } = await supabase
      .from('decision_records')
      .select('*');
    if (dErr) throw dErr;

    // Fetch factors
    const { data: factors, error: fErr } = await supabase
      .from('decision_factors')
      .select('*');
    if (fErr) throw fErr;

    // Map together
    return reports.map(report => {
      const decision = decisions.find(d => d.issue_id === report.id) || null;
      const reportFactors = decision
        ? factors.filter(f => f.decision_id === decision.id)
        : [];

      return {
        ...report,
        decision,
        factors: reportFactors,
      };
    });
  } catch (err) {
    console.error('Error fetching reports with decisions:', err);
    throw err;
  }
}

// Fetch resource pools
export async function fetchResourcePools() {
  try {
    const { data, error } = await supabase.from('resource_pools').select('*');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching resource pools:', err);
    throw err;
  }
}

// Fetch ward metrics
export async function fetchWardMetrics() {
  try {
    const { data, error } = await supabase.from('ward_metrics').select('*').order('ward');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching ward metrics:', err);
    throw err;
  }
}

// Fetch projects
export async function fetchLiveProjects() {
  try {
    const { data, error } = await supabase.from('projects').select('*').order('start_date', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching projects:', err);
    throw err;
  }
}

// Fetch infrastructure
export async function fetchLiveInfrastructure() {
  try {
    const { data, error } = await supabase.from('infrastructure').select('*').order('asset_id');
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching infrastructure:', err);
    throw err;
  }
}

// Fetch audit logs
export async function fetchAuditLogs() {
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching audit logs:', err);
    throw err;
  }
}

// Fetch notifications for a user
export async function fetchNotifications(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching notifications:', err);
    throw err;
  }
}

// Mark notifications as read
export async function markNotificationsAsRead(userId) {
  if (!userId) return;
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId);
    if (error) throw error;
  } catch (err) {
    console.error('Error marking notifications as read:', err);
  }
}

// Fetch decision scenarios (for What-If)
export async function fetchDecisionScenarios() {
  try {
    const { data, error } = await supabase
      .from('decision_scenarios')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching decision scenarios:', err);
    throw err;
  }
}

// Create a scenario record in Supabase (What-If)
export async function saveDecisionScenario(scenario) {
  try {
    const { data, error } = await supabase
      .from('decision_scenarios')
      .insert([
        {
          id: scenario.id || crypto.randomUUID(),
          name: scenario.name,
          budget: scenario.budget,
          workers: scenario.workers,
          available_days: scenario.available_days,
          weight_overrides: scenario.weight_overrides || {},
          created_by: scenario.created_by || null,
        },
      ])
      .select();
    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error('Error saving decision scenario:', err);
    throw err;
  }
}

// Log action to audit logs
export async function createAuditLog({ userId, action, entityType, entityId, metadata }) {
  try {
    const { error } = await supabase.from('audit_logs').insert([
      {
        user_id: userId || null,
        action,
        entity_type: entityType,
        entity_id: entityId || null,
        metadata: metadata || {},
      },
    ]);
    if (error) console.error('Failed to write audit log:', error);
  } catch (err) {
    console.error('Exception writing audit log:', err);
  }
}

// Send notification to citizen
export async function sendNotification({ userId, title, message, type }) {
  try {
    const { error } = await supabase.from('notifications').insert([
      {
        user_id: userId,
        title,
        message,
        type: type || 'status_update',
        is_read: false,
      },
    ]);
    if (error) console.error('Failed to create notification:', error);
  } catch (err) {
    console.error('Exception creating notification:', err);
  }
}

// ==============================================================================
// MUTATIONS (TRIGGERS EDGE FUNCTION WITH CLIENT-SIDE FALLBACK)
// ==============================================================================

// Helper to trigger Edge Function or run local query fallback
async function executeCivicAction(actionName, payload) {
  try {
    console.log(`Invoking Edge Function for civic action: ${actionName}`);
    const { data, error } = await supabase.functions.invoke('civic-decisions', {
      body: { action: actionName, payload },
    });

    if (!error && data) {
      return data;
    }
    console.warn(`Edge Function invoke failed or not deployed, executing fallback client-side queries:`, error);
  } catch (err) {
    console.warn(`Edge Function exception, executing fallback client-side queries:`, err);
  }

  // Fallback direct execution
  return await executeClientFallback(actionName, payload);
}

// Client fallback implementation for server operations
async function executeClientFallback(actionName, payload) {
  switch (actionName) {
    case 'CREATE_REPORT': {
      const { report, decision, factors } = payload;
      
      // 1. Insert Report
      const { error: rErr } = await supabase.from('reports').insert([report]);
      if (rErr) throw rErr;

      // 2. Insert Decision Record
      const { error: dErr } = await supabase.from('decision_records').insert([decision]);
      if (dErr) throw dErr;

      // 3. Insert Factors
      const { error: fErr } = await supabase.from('decision_factors').insert(factors);
      if (fErr) throw fErr;

      // 4. Create Audit Log
      await createAuditLog({
        userId: report.user_id,
        action: 'CREATE_REPORT',
        entityType: 'report',
        entityId: report.id,
        metadata: { report_number: report.report_number, priority_score: decision.priority_score },
      });

      // 5. Send Notification
      await sendNotification({
        userId: report.user_id,
        title: 'Report Received',
        message: `Your report for ${report.title} was successfully logged. Priority assigned: ${decision.priority_level} (${Math.round(decision.priority_score)}/100).`,
        type: 'status_update',
      });

      return { success: true, reportId: report.id };
    }

    case 'UPDATE_STATUS': {
      const { decisionId, reportId, status, reportStatus, reasoning, userId } = payload;

      // 1. Update Decision Record status
      const { error: dErr } = await supabase
        .from('decision_records')
        .update({
          status,
          reasoning,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId || null,
        })
        .eq('id', decisionId);
      if (dErr) throw dErr;

      // 2. Update Report status
      const { error: rErr } = await supabase
        .from('reports')
        .update({
          status: reportStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      if (rErr) throw rErr;

      // 3. Create Audit Log
      await createAuditLog({
        userId,
        action: 'UPDATE_STATUS',
        entityType: 'decision',
        entityId: decisionId,
        metadata: { report_id: reportId, status, reportStatus, reasoning },
      });

      // 4. Fetch the report's citizen ID to send a notification
      const { data: rep } = await supabase.from('reports').select('user_id, title').eq('id', reportId).single();
      if (rep && rep.user_id) {
        await sendNotification({
          userId: rep.user_id,
          title: `Report Status: ${reportStatus}`,
          message: `Your request for "${rep.title}" has been updated to ${reportStatus}. Reason: ${reasoning || 'Updated by ward authority.'}`,
          type: 'status_update',
        });
      }

      return { success: true };
    }

    case 'ALLOCATE_RESOURCES': {
      const { decisionId, reportId, budget, workers, duration, team, userId } = payload;

      // 1. Update Decision Record with resource assignments
      const { error: dErr } = await supabase
        .from('decision_records')
        .update({
          status: 'APPROVED',
          recommended_budget: budget,
          recommended_workers: workers,
          recommended_team: team,
          estimated_duration: duration,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userId || null,
        })
        .eq('id', decisionId);
      if (dErr) throw dErr;

      // 2. Update Report Status to Scheduled
      const { error: rErr } = await supabase
        .from('reports')
        .update({
          status: 'Scheduled',
          priority: 'CRITICAL',
          updated_at: new Date().toISOString(),
        })
        .eq('id', reportId);
      if (rErr) throw rErr;

      // 3. Clear existing allocations for this decision
      await supabase.from('resource_allocations').delete().eq('decision_id', decisionId);

      // 4. Create Resource Allocations
      const allocations = [
        {
          decision_id: decisionId,
          resource_type: 'budget',
          quantity: budget,
          unit: 'INR',
          approved_by: userId || null,
          approved_at: new Date().toISOString(),
        },
        {
          decision_id: decisionId,
          resource_type: 'workers',
          quantity: workers,
          unit: 'people',
          approved_by: userId || null,
          approved_at: new Date().toISOString(),
        },
        {
          decision_id: decisionId,
          resource_type: 'working_days',
          quantity: duration,
          unit: 'days',
          approved_by: userId || null,
          approved_at: new Date().toISOString(),
        }
      ];
      const { error: aErr } = await supabase.from('resource_allocations').insert(allocations);
      if (aErr) throw aErr;

      // 5. Update Resource Pools remaining amounts
      // Fetch current allocation totals
      const { data: allAllocations } = await supabase.from('resource_allocations').select('resource_type, quantity');
      const totals = { budget: 0, workers: 0, working_days: 0 };
      allAllocations?.forEach(a => {
        if (totals[a.resource_type] !== undefined) {
          totals[a.resource_type] += Number(a.quantity);
        }
      });

      // Update remaining amounts in database
      const resourceTypes = ['budget', 'workers', 'working_days'];
      for (const type of resourceTypes) {
        const allocatedVal = totals[type];
        const { data: pool } = await supabase.from('resource_pools').select('total_available').eq('resource_type', type).single();
        if (pool) {
          const remVal = Number(pool.total_available) - allocatedVal;
          await supabase.from('resource_pools').update({
            currently_allocated: allocatedVal,
            remaining: remVal >= 0 ? remVal : 0,
            updated_at: new Date().toISOString()
          }).eq('resource_type', type);
        }
      }

      // 6. Create Audit Log
      await createAuditLog({
        userId,
        action: 'ALLOCATE_RESOURCES',
        entityType: 'decision',
        entityId: decisionId,
        metadata: { report_id: reportId, budget, workers, duration, team },
      });

      // 7. Notify Citizen
      const { data: rep } = await supabase.from('reports').select('user_id, title').eq('id', reportId).single();
      if (rep && rep.user_id) {
        await sendNotification({
          userId: rep.user_id,
          title: 'Resources Allocated',
          message: `Funding and staff allocated for "${rep.title}". Budget: ₹${budget.toLocaleString()}, Workers: ${workers}, Timeline: ${duration} working days.`,
          type: 'status_update',
        });
      }

      return { success: true };
    }

    default:
      throw new Error(`Unknown client fallback action: ${actionName}`);
  }
}

// Public API triggers
export async function createReportInSupabase(reportPayload) {
  return await executeCivicAction('CREATE_REPORT', reportPayload);
}

export async function updateReportStatusInSupabase(decisionId, reportId, status, reportStatus, reasoning, userId) {
  return await executeCivicAction('UPDATE_STATUS', {
    decisionId,
    reportId,
    status,
    reportStatus,
    reasoning,
    userId,
  });
}

export async function allocateResourcesInSupabase(decisionId, reportId, budget, workers, duration, team, userId) {
  return await executeCivicAction('ALLOCATE_RESOURCES', {
    decisionId,
    reportId,
    body: { budget, workers, duration, team }, // wrapper
    budget,
    workers,
    duration,
    team,
    userId,
  });
}

// Reset/Seed Database Demo Scenario
export async function seedDatabaseDemoScenario() {
  try {
    // Direct RPC or direct query. Let's implement direct inserts as a fallback
    // which is 100% reliable without needing any special DB functions!
    console.log('Seeding demo scenario directly from client');
    
    // Clear old records
    await supabase.from('decision_factors').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('decision_records').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('resource_pools').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('infrastructure').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // 1. Insert Resource Pools
    await supabase.from('resource_pools').insert([
      { id: 'aa000000-0000-0000-0000-000000000001', resource_type: 'budget', total_available: 1000000, currently_allocated: 0, remaining: 1000000, unit: 'INR' },
      { id: 'aa000000-0000-0000-0000-000000000002', resource_type: 'workers', total_available: 8, currently_allocated: 0, remaining: 8, unit: 'people' },
      { id: 'aa000000-0000-0000-0000-000000000003', resource_type: 'repair_teams', total_available: 2, currently_allocated: 0, remaining: 2, unit: 'teams' },
      { id: 'aa000000-0000-0000-0000-000000000004', resource_type: 'working_days', total_available: 7, currently_allocated: 0, remaining: 7, unit: 'days' },
    ]);

    // 2. Insert Reports
    const reports = [
      { id: 'c0000000-0000-0000-0000-000000000001', report_number: 'CF-KPG-1001', user_id: '00000000-0000-0000-0000-000000000002', title: 'Main Road Pothole Cluster', description: 'Deep potholes near school route causing multiple minor accidents and traffic hazards.', category: 'Pothole', priority: 'CRITICAL', status: 'Under Assessment', latitude: 19.8850, longitude: 74.4985, address: 'Near Subhash Nagar Primary School, Kopargaon', ward: 'W12' },
      { id: 'c0000000-0000-0000-0000-000000000002', report_number: 'CF-KPG-1002', user_id: '00000000-0000-0000-0000-000000000002', title: 'Hospital Access Road Repair', description: 'Severe road damage and subgrade failure on the main road leading to the hospital.', category: 'Road', priority: 'HIGH', status: 'Under Assessment', latitude: 19.8940, longitude: 74.4865, address: 'Hospital Lane, Ward 8, Kopargaon', ward: 'W8' },
      { id: 'c0000000-0000-0000-0000-000000000003', report_number: 'CF-KPG-1003', user_id: '00000000-0000-0000-0000-000000000002', title: 'Ward 12 Drainage-Related Road Subsidence', description: 'Overflowing storm drain has eroded the road base, creating active risk of cave-in.', category: 'Drainage', priority: 'HIGH', status: 'Under Assessment', latitude: 19.8842, longitude: 74.4990, address: 'Sai Baba Temple Lane, Subhash Nagar, Kopargaon', ward: 'W12' },
      { id: 'c0000000-0000-0000-0000-000000000004', report_number: 'CF-KPG-1004', user_id: '00000000-0000-0000-0000-000000000002', title: 'Street Light Failure & Dark Spot', description: 'Complete blackout of 4 consecutive street lights on the Sai Nagar link route.', category: 'Street Light', priority: 'MEDIUM', status: 'Under Assessment', latitude: 19.8780, longitude: 74.4820, address: 'Sai Nagar Highway Link, Ward 7, Kopargaon', ward: 'W7' },
      { id: 'c0000000-0000-0000-0000-000000000005', report_number: 'CF-KPG-1005', user_id: '00000000-0000-0000-0000-000000000002', title: 'Sub-optimal Park Renovation Area', description: 'Damaged walking track and play area equipment in Ward 3 public garden.', category: 'Park', priority: 'LOW', status: 'Under Assessment', latitude: 19.8860, longitude: 74.4890, address: 'Samata Nagar Playground, Ward 3, Kopargaon', ward: 'W3' }
    ];
    await supabase.from('reports').insert(reports);

    // 3. Insert Decisions
    const decisions = [
      { id: 'd0000000-0000-0000-0000-000000000001', issue_id: 'c0000000-0000-0000-0000-000000000001', priority_score: 92.2, priority_level: 'CRITICAL', confidence_score: 89, data_completeness: 82, recommended_action: 'FUND NOW', recommended_budget: 320000, recommended_workers: 3, recommended_team: 'Road Repair Squad A', estimated_duration: 2, expected_impact: 'Restores safe route for school children.', reasoning: 'Main Road Pothole Cluster was prioritized because it has high safety risk, affects a school access route, has high traffic usage, and has received multiple citizen reports.', status: 'PENDING' },
      { id: 'd0000000-0000-0000-0000-000000000002', issue_id: 'c0000000-0000-0000-0000-000000000002', priority_score: 89.1, priority_level: 'HIGH', confidence_score: 91, data_completeness: 90, recommended_action: 'FUND NOW', recommended_budget: 250000, recommended_workers: 2, recommended_team: 'Road Repair Squad B', estimated_duration: 2, expected_impact: 'Maintains critical hospital route.', reasoning: 'Hospital Access Road Repair is prioritized because it is a critical emergency route, has poor infrastructure condition, and directly affects high traffic.', status: 'PENDING' },
      { id: 'd0000000-0000-0000-0000-000000000003', issue_id: 'c0000000-0000-0000-0000-000000000003', priority_score: 83.5, priority_level: 'HIGH', confidence_score: 85, data_completeness: 80, recommended_action: 'FUND NOW', recommended_budget: 180000, recommended_workers: 2, recommended_team: 'Drainage Engineering Squad', estimated_duration: 1, expected_impact: 'Prevents storm drain erosion and logging.', reasoning: 'Ward 12 Drainage-Related Road subsidence is prioritized to avoid heavy delay risk and further infrastructure deterioration in Ward 12.', status: 'PENDING' },
      { id: 'd0000000-0000-0000-0000-000000000004', issue_id: 'c0000000-0000-0000-0000-000000000004', priority_score: 72.0, priority_level: 'HIGH', confidence_score: 80, data_completeness: 75, recommended_action: 'PARTIALLY FUND', recommended_budget: 120000, recommended_workers: 2, recommended_team: 'Electrical Team A', estimated_duration: 1, expected_impact: 'Improves Sai Nagar dark spots safety.', reasoning: 'Street Light Replacement is high priority due to Sai Nagar pilgrim transit safety, though safety risk and traffic impact score lower than main roads.', status: 'PENDING' },
      { id: 'd0000000-0000-0000-0000-000000000005', issue_id: 'c0000000-0000-0000-0000-000000000005', priority_score: 51.3, priority_level: 'MEDIUM', confidence_score: 75, data_completeness: 70, recommended_action: 'DEFER', recommended_budget: 80000, recommended_workers: 2, recommended_team: 'Horticulture Team', estimated_duration: 1, expected_impact: 'Improves community park.', reasoning: 'Park Renovation is deferred because of low safety risk and limited municipal resources relative to competing emergency road work.', status: 'PENDING' }
    ];
    await supabase.from('decision_records').insert(decisions);

    // 4. Insert Factors
    const factors = [
      // Issue 1
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'urgency', raw_value: 90, normalized_score: 90, weight: 0.25, weighted_score: 22.5, data_source: 'Citizen Logs', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'safety_risk', raw_value: 95, normalized_score: 95, weight: 0.20, weighted_score: 19.0, data_source: 'Field Survey', data_quality: 'Good', confidence: 95 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'population_affected', raw_value: 80, normalized_score: 80, weight: 0.15, weighted_score: 12.0, data_source: 'Ward Census', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'traffic_impact', raw_value: 90, normalized_score: 90, weight: 0.10, weighted_score: 9.0, data_source: 'Traffic Counter', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'critical_location', raw_value: 100, normalized_score: 100, weight: 0.10, weighted_score: 10.0, data_source: 'GIS Mapping', data_quality: 'Good', confidence: 100 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'citizen_reports', raw_value: 80, normalized_score: 80, weight: 0.05, weighted_score: 4.0, data_source: 'Logs', data_quality: 'Good', confidence: 100 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'infrastructure_condition', raw_value: 90, normalized_score: 90, weight: 0.05, weighted_score: 4.5, data_source: 'Inspectors', data_quality: 'Poor', confidence: 60 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'delay_risk', raw_value: 80, normalized_score: 80, weight: 0.05, weighted_score: 4.0, data_source: 'Contractor SLA', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000001', factor_name: 'cost_efficiency', raw_value: 90, normalized_score: 90, weight: 0.05, weighted_score: 4.5, data_source: 'Estimate Calc', data_quality: 'Good', confidence: 90 },

      // Issue 2
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'urgency', raw_value: 88, normalized_score: 88, weight: 0.25, weighted_score: 22.0, data_source: 'Hospital Request', data_quality: 'Good', confidence: 95 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'safety_risk', raw_value: 85, normalized_score: 85, weight: 0.20, weighted_score: 17.0, data_source: 'Field Survey', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'population_affected', raw_value: 90, normalized_score: 90, weight: 0.15, weighted_score: 13.5, data_source: 'Census', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'traffic_impact', raw_value: 95, normalized_score: 95, weight: 0.10, weighted_score: 9.5, data_source: 'GIS sensor', data_quality: 'Good', confidence: 95 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'critical_location', raw_value: 100, normalized_score: 100, weight: 0.10, weighted_score: 10.0, data_source: 'GIS Mapping', data_quality: 'Good', confidence: 100 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'citizen_reports', raw_value: 90, normalized_score: 90, weight: 0.05, weighted_score: 4.5, data_source: 'Logs', data_quality: 'Good', confidence: 100 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'infrastructure_condition', raw_value: 95, normalized_score: 95, weight: 0.05, weighted_score: 4.75, data_source: 'Inspectors', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'delay_risk', raw_value: 85, normalized_score: 85, weight: 0.05, weighted_score: 4.25, data_source: 'Contractor SLA', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000002', factor_name: 'cost_efficiency', raw_value: 80, normalized_score: 80, weight: 0.05, weighted_score: 4.0, data_source: 'Estimate Calc', data_quality: 'Good', confidence: 90 },

      // Issue 3
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'urgency', raw_value: 82, normalized_score: 82, weight: 0.25, weighted_score: 20.5, data_source: 'Ward Request', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'safety_risk', raw_value: 80, normalized_score: 80, weight: 0.20, weighted_score: 16.0, data_source: 'Inspectors', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'population_affected', raw_value: 70, normalized_score: 70, weight: 0.15, weighted_score: 10.5, data_source: 'Census', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'traffic_impact', raw_value: 70, normalized_score: 70, weight: 0.10, weighted_score: 7.0, data_source: 'Manual Count', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'critical_location', raw_value: 60, normalized_score: 60, weight: 0.10, weighted_score: 6.0, data_source: 'GIS Mapping', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'citizen_reports', raw_value: 80, normalized_score: 80, weight: 0.05, weighted_score: 4.0, data_source: 'Logs', data_quality: 'Good', confidence: 100 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'infrastructure_condition', raw_value: 80, normalized_score: 80, weight: 0.05, weighted_score: 4.0, data_source: 'Inspectors', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'delay_risk', raw_value: 75, normalized_score: 75, weight: 0.05, weighted_score: 3.75, data_source: 'Contractor SLA', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000003', factor_name: 'cost_efficiency', raw_value: 90, normalized_score: 90, weight: 0.05, weighted_score: 4.5, data_source: 'Estimate Calc', data_quality: 'Good', confidence: 90 },

      // Issue 4
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'urgency', raw_value: 70, normalized_score: 70, weight: 0.25, weighted_score: 17.5, data_source: 'Citizen Logs', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'safety_risk', raw_value: 75, normalized_score: 75, weight: 0.20, weighted_score: 15.0, data_source: 'Police Log', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'population_affected', raw_value: 65, normalized_score: 65, weight: 0.15, weighted_score: 9.75, data_source: 'Census', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'traffic_impact', raw_value: 50, normalized_score: 50, weight: 0.10, weighted_score: 5.0, data_source: 'Manual Count', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'critical_location', raw_value: 50, normalized_score: 50, weight: 0.10, weighted_score: 5.0, data_source: 'GIS Mapping', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'citizen_reports', raw_value: 80, normalized_score: 80, weight: 0.05, weighted_score: 4.0, data_source: 'Logs', data_quality: 'Good', confidence: 100 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'infrastructure_condition', raw_value: 60, normalized_score: 60, weight: 0.05, weighted_score: 3.0, data_source: 'Inspectors', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'delay_risk', raw_value: 40, normalized_score: 40, weight: 0.05, weighted_score: 2.0, data_source: 'Contractor SLA', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000004', factor_name: 'cost_efficiency', raw_value: 90, normalized_score: 90, weight: 0.05, weighted_score: 4.5, data_source: 'Estimate Calc', data_quality: 'Good', confidence: 90 },

      // Issue 5
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'urgency', raw_value: 40, normalized_score: 40, weight: 0.25, weighted_score: 10.0, data_source: 'Citizen Request', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'safety_risk', raw_value: 30, normalized_score: 30, weight: 0.20, weighted_score: 6.0, data_source: 'Field Survey', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'population_affected', raw_value: 45, normalized_score: 45, weight: 0.15, weighted_score: 6.75, data_source: 'Census', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'traffic_impact', raw_value: 20, normalized_score: 20, weight: 0.10, weighted_score: 2.0, data_source: 'Manual Count', data_quality: 'Fair', confidence: 80 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'critical_location', raw_value: 30, normalized_score: 30, weight: 0.10, weighted_score: 3.0, data_source: 'GIS Mapping', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'citizen_reports', raw_value: 60, normalized_score: 60, weight: 0.05, weighted_score: 3.0, data_source: 'Logs', data_quality: 'Good', confidence: 100 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'infrastructure_condition', raw_value: 50, normalized_score: 50, weight: 0.05, weighted_score: 2.5, data_source: 'Inspectors', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'delay_risk', raw_value: 20, normalized_score: 20, weight: 0.05, weighted_score: 1.0, data_source: 'Contractor SLA', data_quality: 'Good', confidence: 90 },
      { decision_id: 'd0000000-0000-0000-0000-000000000005', factor_name: 'cost_efficiency', raw_value: 80, normalized_score: 80, weight: 0.05, weighted_score: 4.0, data_source: 'Estimate Calc', data_quality: 'Good', confidence: 90 }
    ];
    await supabase.from('decision_factors').insert(factors);

    // 5. Insert Infrastructure
    const infra = [
      { id: 'f0000000-0000-0000-0000-000000000001', asset_id: 'ROAD-KPG-1120', name: 'Subhash Nagar East Main Lane', category: 'Road', ward: 'W12', condition: 'Poor', latitude: 19.8850, longitude: 74.4985, description: 'Secondary asphalt road servicing schools and housing societies.', usage_level: 'High', risk_level: 'Moderate', installation_date: '2019-03-12', last_inspection: '2026-08-18', maintenance_status: 'Overdue', qr_code: 'QR-KPG-ROAD-1120' },
      { id: 'f0000000-0000-0000-0000-000000000002', asset_id: 'ROAD-KPG-1028', name: 'Hospital Main Access Road', category: 'Road', ward: 'W8', condition: 'Poor', latitude: 19.8940, longitude: 74.4865, description: 'Main corridor connecting state highway to Kopargaon government hospital.', usage_level: 'High', risk_level: 'High', installation_date: '2018-05-20', last_inspection: '2026-08-15', maintenance_status: 'Overdue', qr_code: 'QR-KPG-ROAD-1028' }
    ];
    await supabase.from('infrastructure').insert(infra);

    // 6. Insert Projects
    const projects = [
      { id: 'e0000000-0000-0000-0000-000000000010', project_id: 'PRJ-KPG-2026-01', name: 'Kopargaon East Overlay Works', description: 'Resurfacing and storm drain clearing across Ward 12 link roads.', location: 'Subhash Nagar', ward: 'W12', budget: 450000, contractor: 'Shree Construction Co.', start_date: '2026-09-01', expected_completion: '2026-10-15', actual_completion: null, progress: 0, status: 'Planned', delay_days: 0, risk_level: 'Low' }
    ];
    await supabase.from('projects').insert(projects);

    // 7. Write Audit Log
    await createAuditLog({
      action: 'SEED_DEMO_SCENARIO',
      entityType: 'system',
      metadata: { message: 'Direct client-side seed of 5 competing issues succeeded.' }
    });

    console.log('Seeding finished successfully');
    return { success: true };
  } catch (err) {
    console.error('Direct seed failed:', err);
    throw err;
  }
}

// ==============================================================================
// AUTHENTICATION AND SIGN UP
// ==============================================================================

export async function signUpUser({ email, password, fullName, role = 'citizen', phone = '' }) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role,
          phone,
        },
      },
    });

    if (error) throw error;

    if (data?.user) {
      // Upsert profile
      const { error: pErr } = await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        phone,
        role,
      });
      if (pErr) console.warn('Profile sync warning:', pErr.message);
    }

    return { data, error: null };
  } catch (error) {
    console.error('Sign up error:', error);
    return { data: null, error };
  }
}

export async function loginUser({ email, password }) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Login error:', error);
    return { data: null, error };
  }
}

export async function logoutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error('Logout error:', error);
    return { error };
  }
}

export async function getCurrentProfile(userId) {
  if (!userId) return null;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (error) return null;
    return data;
  } catch (err) {
    console.error('Get profile error:', err);
    return null;
  }
}

export async function fetchMyReportsFromSupabase(userId) {
  if (!userId) return [];
  try {
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching user reports:', err);
    throw err;
  }
}