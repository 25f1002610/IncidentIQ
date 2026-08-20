import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Activity, CheckCircle2, Plus, Clock, Cpu, Zap } from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus, ScenarioInfo } from './types';
import { IncidentDetailModal } from './components/IncidentDetailModal';

const DEFAULT_SCENARIOS: ScenarioInfo[] = [
  { id: 'DB_CONN_EXHAUSTION', title: 'PostgreSQL Connection Pool Exhaustion', service_id: 'user-db-service', severity: 'CRITICAL', description: 'Simulates active pool limits reached and HTTP 500 error rate spikes.' },
  { id: 'BAD_DEPLOY_MEMORY_LEAK', title: 'Unclosed Session Memory Leak', service_id: 'auth-service', severity: 'HIGH', description: 'Simulates heap memory accumulation post-release causing OOMKilled.' },
  { id: 'EXTERNAL_API_TIMEOUT', title: 'Stripe Gateway Latency & 504 Timeouts', service_id: 'payment-service', severity: 'MEDIUM', description: 'Simulates 504 Gateway Timeouts from third-party payment vendor.' }
];

export const App: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Create Manual Incident state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formService, setFormService] = useState('auth-service');
  const [formSeverity, setFormSeverity] = useState<IncidentSeverity>('HIGH');

  // Simulator scenarios initialized with defaults
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>(DEFAULT_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<string>('DB_CONN_EXHAUSTION');

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

  const fetchScenarios = async () => {
    try {
      const res = await fetch('/api/v1/simulator/scenarios');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setScenarios(data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch scenarios', err);
    }
  };

  useEffect(() => {
    fetchIncidents();
    fetchScenarios();
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

  const [triggering, setTriggering] = useState<boolean>(false);

  const handleTriggerScenario = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriggering(true);
    try {
      const res = await fetch('/api/v1/simulator/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_type: selectedScenario }),
      });

      if (res.ok) {
        const data = await res.json();
        setShowSimModal(false);
        await fetchIncidents();
        if (data.incident) {
          setSelectedIncident(data.incident);
        }
      }
    } catch (err) {
      console.error('Failed to trigger scenario', err);
    } finally {
      setTriggering(false);
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
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn-primary" style={{ background: 'linear-gradient(135deg, #f97316, #ef4444)' }} onClick={() => setShowSimModal(true)}>
              <Zap size={16} /> Simulate Production Outage
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> New Incident
            </button>
          </div>
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
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.25rem' }}>
              All services are operating normally. Click "Simulate Production Outage" to trigger an infrastructure failure test.
            </p>
            <button className="btn-primary" style={{ margin: '0 auto', background: 'linear-gradient(135deg, #f97316, #ef4444)' }} onClick={() => setShowSimModal(true)}>
              <Zap size={16} /> Simulate Outage
            </button>
          </div>
        ) : (
          <div className="incidents-container">
            {incidents.map((incident) => (
              <div key={incident.id} className="incident-card" onClick={() => setSelectedIncident(incident)}>
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

      {/* Incident Detail Drawer/Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
        />
      )}

      {/* Simulator Outage Trigger Modal */}
      {showSimModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="#f97316" /> Simulate Production Outage
            </h3>
            <form onSubmit={handleTriggerScenario}>
              <div className="form-group">
                <label className="form-label">Select Failure Scenario</label>
                <select
                  className="form-select"
                  value={selectedScenario}
                  onChange={(e) => setSelectedScenario(e.target.value)}
                >
                  {scenarios.map(sc => (
                    <option key={sc.id} value={sc.id}>
                      [{sc.severity}] {sc.title} ({sc.service_id})
                    </option>
                  ))}
                </select>
              </div>

              {scenarios.find(s => s.id === selectedScenario) && (
                <div style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.25)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                  <strong>Scenario Overview:</strong>
                  <p style={{ marginTop: '0.3rem', color: 'var(--text-secondary)' }}>
                    {scenarios.find(s => s.id === selectedScenario)?.description}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }}
                  onClick={() => setShowSimModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triggering}
                  className="btn-primary"
                  style={{ background: triggering ? '#4b5563' : 'linear-gradient(135deg, #f97316, #ef4444)', cursor: triggering ? 'not-allowed' : 'pointer' }}
                >
                  {triggering ? 'Simulating Outage...' : 'Trigger Scenario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Manual Incident Modal */}
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
