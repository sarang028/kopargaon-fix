import React from 'react';
import { CircleMarker, Popup, LayerGroup } from 'react-leaflet';
import { useApp } from '../../context/AppContext.jsx';
import { getWardShortName } from '../../data/wards.js';
import { formatDate } from '../../utils/formatters.js';

const CATEGORY_EMOJI = {
  'Road Damage':       '🛣️',
  'Pothole':           '🕳️',
  'Water Problem':     '💧',
  'Drainage':          '🌊',
  'Garbage':           '🗑️',
  'Street Light':      '💡',
  'Public Infrastructure': '🏛️',
  'Traffic':           '🚦',
  'Park':              '🌳',
  'Other':             '📌',
};

// Priority color map
const PRIORITY_COLORS = {
  'CRITICAL': '#ef4444', // Red
  'HIGH': '#f97316',     // Orange
  'MEDIUM': '#f59e0b',   // Yellow
  'LOW': '#3b82f6',      // Blue
};

export default function IssuesLayer({ visible = true }) {
  const { state } = useApp();
  if (!visible) return null;

  return (
    <LayerGroup>
      {state.issues?.map(issue => {
        const lat = issue.latitude !== undefined ? issue.latitude : issue.lat;
        const lng = issue.longitude !== undefined ? issue.longitude : issue.lng;
        const wardId = issue.ward !== undefined ? issue.ward : issue.wardId;
        const priorityLevel = issue.decision?.priority_level || issue.priority || 'LOW';
        const markerColor = PRIORITY_COLORS[priorityLevel] || '#94a3b8';

        if (!lat || !lng) return null;

        return (
          <CircleMarker
            key={issue.id}
            center={[lat, lng]}
            radius={10}
            pathOptions={{
              color: markerColor,
              fillColor: markerColor,
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Popup maxWidth={280} minWidth={240}>
              <div className="font-sans text-slate-800 p-1 text-xs">
                <div className="flex items-start gap-2 mb-2">
                  <span className="text-lg">{CATEGORY_EMOJI[issue.category] || '📌'}</span>
                  <div>
                    <div className="font-semibold text-sm leading-tight text-slate-900">{issue.title || issue.category}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">
                      {issue.report_number || issue.id} · {getWardShortName(wardId)}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed mb-2">{issue.description}</p>
                
                <div className="space-y-1 text-xs border-t border-slate-100 pt-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Priority Level</span>
                    <span className="font-bold uppercase" style={{ color: markerColor }}>
                      {issue.decision?.priority_score || '--'} ({priorityLevel})
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Data Confidence</span>
                    <span className="text-slate-700 font-semibold">{issue.decision?.confidence_score || 100}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Status</span>
                    <span className="text-slate-700 font-bold uppercase">{issue.decision?.status || 'PENDING'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Timeline</span>
                    <span className="text-slate-700">{formatDate(issue.submittedDate || issue.created_at)}</span>
                  </div>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </LayerGroup>
  );
}
