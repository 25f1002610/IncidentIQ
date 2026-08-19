import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Activity, CheckCircle2, Plus, Clock, Cpu } from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus } from './types';

export const App: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formService, setFormService] = useState('auth-service');
  const [formSeverity, setFormSeverity] = useState<IncidentSeverity>('HIGH');

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/v1/incidents');
      if (res.ok) {
        const data = await res.json();
        setIncidents(data.incidents || []);
      }
    } catch (err) {
      console.error('Failed to fetch incidents', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle || !formDescription) return;

    try {
      const res = await fetch('/api/v1/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle,
          description: formDescription,
          service_id: formService,
          severity: formSeverity,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        setFormTitle('');
        setFormDescription('');
        fetchIncidents();
      }
    } catch (err) {
      console.error('Failed to create incident', err);
    }
  };

  const getSeverityBadge = (severity: IncidentSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <span className="badge badge-critical"><AlertTriangle size={12} /> Critical</span>;
      case 'HIGH':
        return <span className="badge badge-high"><AlertTriangle size={12} /> High</span>;
      case 'MEDIUM':
        return <span className="badge badge-medium"><AlertTriangle size={12} /> Medium</span>;
      case 'LOW':
        return <span className="badge badge-low"><CheckCircle2 size={12} /> Low</span>;
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    if (status === 'INVESTIGATING') {
      return <span className="badge badge-investigating"><Activity size={12} /> Investigating</span>;
    }
    return <span className="badge badge-status">{status.replace(/_/g, ' ')}</span>;
  };

  const activeCount = incidents.filter(i => i.status !== 'RESOLVED').length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;

  return (
    <div className="app-container">
      <header className="header">
        <div className="logo-section">
          <div className="logo-badge">
            <Cpu size={20} color="#ffffff" />
          </div>
          <span>Incident<span style={{ color: 'var(--accent-primary)' }}>IQ</span></span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }}></span>
            AI Engine: Ollama (Local)
          </span>
        </div>
      </header>

      <main className="main-content">
        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Active Incidents</div>
            <div className="stat-value" style={{ color: activeCount > 0 ? '#f97316' : 'var(--text-primary)' }}>
              {activeCount}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Critical Alerts</div>
            <div className="stat-value" style={{ color: criticalCount > 0 ? '#ef4444' : 'var(--text-primary)' }}>
              {criticalCount}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Investigating Agents</div>
            <div className="stat-value" style={{ color: '#a855f7' }}>
              8 Active
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Mean Time to Diagnose</div>
            <div className="stat-value" style={{ color: 'var(--text-primary)' }}>
              14s
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="section-header">
          <h2 className="section-title">Incidents Queue</h2>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Incident
          </button>
        </div>

        {/* Incidents List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>
            Loading operational incidents...
          </div>
        ) : incidents.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
            <ShieldAlert size={40} color="var(--text-muted)" style={{ marginBottom: '1rem' }} />
            <h3 style={{ marginBottom: '0.5rem' }}>No Active Production Incidents</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              All services are operating nominally. Click "New Incident" to report or simulate an incident.
            </p>
          </div>
        ) : (
          <div className="incidents-container">
            {incidents.map((incident) => (
              <div key={incident.id} className="incident-card">
                <div className="incident-header-line">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span className="incident-id">{incident.id}</span>
                    <span className="incident-title-text">{incident.title}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {getSeverityBadge(incident.severity)}
                    {getStatusBadge(incident.status)}
                  </div>
                </div>

                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  {incident.description}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <div>Affected Service: <strong style={{ color: 'var(--text-primary)' }}>{incident.service_id}</strong></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={12} />
                    {new Date(incident.detected_at).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Incident Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem' }}>Report Production Incident</h3>
            <form onSubmit={handleCreateIncident}>
              <div className="form-group">
                <label className="form-label">Incident Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., HTTP 500 Spike on Payment API"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Affected Service</label>
                <input
                  type="text"
                  className="form-input"
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Severity Level</label>
                <select
                  className="form-select"
                  value={formSeverity}
                  onChange={(e) => setFormSeverity(e.target.value as IncidentSeverity)}
                >
                  <option value="CRITICAL">Critical (P1)</option>
                  <option value="HIGH">High (P2)</option>
                  <option value="MEDIUM">Medium (P3)</option>
                  <option value="LOW">Low (P4)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Observed Symptoms / Description</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  placeholder="Describe error logs, metric spikes, or user impact..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Incident
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
