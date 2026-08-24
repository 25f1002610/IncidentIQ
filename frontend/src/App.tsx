import React, { useEffect, useState } from 'react';
import { ShieldAlert, Plus, Zap, ArrowRight, FolderPlus, ExternalLink, Filter, Server } from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus, ScenarioInfo, ProjectInfo } from './types';
import { IncidentDetailModal } from './components/IncidentDetailModal';

const DEFAULT_SCENARIOS: ScenarioInfo[] = [
  { id: 'NORTHSTAR_FINANCE_EXPOSURE', title: 'Northstar Finance Excessive API Data Exposure', service_id: 'northstar-finance', severity: 'CRITICAL', description: 'Unauthenticated API endpoint /api/profile leaks raw user objects with plaintext passwords.' },
  { id: 'DB_CONN_EXHAUSTION', title: 'PostgreSQL Connection Pool Exhaustion', service_id: 'user-db-service', severity: 'CRITICAL', description: 'Database connection pool utilization reached 98%. Active queries blocked; 500 error spike detected.' },
  { id: 'BAD_DEPLOY_MEMORY_LEAK', title: 'Unclosed Session Memory Leak', service_id: 'auth-service', severity: 'HIGH', description: 'RAM consumption steadily escalated from 450MB to 3.8GB following deployment v2.4.1.' },
  { id: 'EXTERNAL_API_TIMEOUT', title: 'Stripe Gateway Latency & 504 Timeouts', service_id: 'payment-service', severity: 'MEDIUM', description: 'HTTP 504 Gateway Timeout errors spike on checkout. Latency exceeds 8,000ms.' }
];

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard' | 'projects' | 'architecture' | 'reports'>('dashboard');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('ALL');
  
  const [loading, setLoading] = useState<boolean>(true);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [showProjectModal, setShowProjectModal] = useState<boolean>(false);
  const [showSimModal, setShowSimModal] = useState<boolean>(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  
  // Create Manual Incident state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formService, setFormService] = useState('northstar-finance');
  const [formSeverity, setFormSeverity] = useState<IncidentSeverity>('HIGH');

  // Register New Project state
  const [projId, setProjId] = useState('');
  const [projName, setProjName] = useState('');
  const [projRepo, setProjRepo] = useState('');
  const [projStack, setProjStack] = useState('Node.js / Express');
  const [projDesc, setProjDesc] = useState('');
  const [registeringProj, setRegisteringProj] = useState(false);

  // Simulator scenarios
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>(DEFAULT_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<string>('NORTHSTAR_FINANCE_EXPOSURE');
  const [triggering, setTriggering] = useState<boolean>(false);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/v1/projects');
      if (res.ok) {
        const data = await res.json();
        setProjects(data || []);
      }
    } catch (err) {
      console.error('Failed to fetch projects', err);
    }
  };

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
    fetchProjects();
    fetchIncidents();
    fetchScenarios();
  }, []);

  const handleRegisterProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projId || !projName) return;
    setRegisteringProj(true);

    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: projId.toLowerCase().replace(/\s+/g, '-'),
          name: projName,
          repository_url: projRepo,
          tech_stack: projStack,
          description: projDesc,
        }),
      });

      if (res.ok) {
        setShowProjectModal(false);
        setProjId('');
        setProjName('');
        setProjRepo('');
        setProjDesc('');
        await fetchProjects();
      }
    } catch (err) {
      console.error('Failed to register project', err);
    } finally {
      setRegisteringProj(false);
    }
  };

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
        await fetchIncidents();
        await fetchProjects();
      }
    } catch (err) {
      console.error('Failed to create incident', err);
    }
  };

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
        await fetchProjects();
        if (data.incident) {
          setSelectedIncident(data.incident);
          setViewMode('dashboard');
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
        return <span className="badge badge-critical">Critical</span>;
      case 'HIGH':
        return <span className="badge badge-high">High</span>;
      case 'MEDIUM':
        return <span className="badge badge-medium">Medium</span>;
      case 'LOW':
        return <span className="badge badge-low">Low</span>;
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    if (status === 'INVESTIGATING') {
      return <span className="badge" style={{ background: 'rgba(255, 107, 61, 0.15)', color: 'var(--accent-primary)', border: '1px solid var(--accent-glow)' }}>Analyzing</span>;
    }
    return <span className="badge" style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>{status.replace(/_/g, ' ')}</span>;
  };

  const filteredIncidents = selectedProjectFilter === 'ALL'
    ? incidents
    : incidents.filter(i => i.service_id === selectedProjectFilter);

  const activeCount = filteredIncidents.filter(i => i.status !== 'RESOLVED').length;
  const criticalCount = filteredIncidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      
      {/* Precision Navigation */}
      <header className="nav-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
          <div className="brand-mark" onClick={() => setViewMode('landing')}>
            <div className="brand-badge" style={{ background: 'var(--accent-primary)', color: '#080A0D' }}>IQ</div>
            <span>Incident<span style={{ color: 'var(--accent-primary)' }}>IQ</span></span>
          </div>

          <nav className="nav-links">
            <button className={`nav-link ${viewMode === 'dashboard' ? 'active' : ''}`} onClick={() => setViewMode('dashboard')}>
              Dashboard
            </button>
            <button className={`nav-link ${viewMode === 'projects' ? 'active' : ''}`} onClick={() => setViewMode('projects')}>
              Projects ({projects.length})
            </button>
            <button className={`nav-link ${viewMode === 'architecture' ? 'active' : ''}`} onClick={() => setViewMode('architecture')}>
              Architecture
            </button>
            <button className={`nav-link ${viewMode === 'reports' ? 'active' : ''}`} onClick={() => setViewMode('reports')}>
              Reports
            </button>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setShowProjectModal(true)}>
            <FolderPlus size={14} /> Add Project
          </button>
          <button className="btn-primary" onClick={() => setShowSimModal(true)}>
            Analyze Repository
          </button>
        </div>
      </header>

      {/* VIEW 1: LANDING PAGE */}
      {viewMode === 'landing' && (
        <div style={{ flex: 1 }}>
          <section style={{ maxWidth: 1280, margin: '0 auto', padding: '5rem 2rem 4rem 2rem', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.3rem 0.75rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '1.5rem' }} className="mono">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
                MULTI-PROJECT AI OPERATIONS PLATFORM
              </div>

              <h1 style={{ fontSize: '3.6rem', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                Find the failures<br />before production does.
              </h1>

              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520, marginBottom: '2.5rem' }}>
                IncidentIQ connects across your software microservices, analyzing code, dependencies, architecture, and operational telemetry signals to diagnose production outages in seconds.
              </p>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }} onClick={() => setShowSimModal(true)}>
                  Analyze Repository <ArrowRight size={16} />
                </button>
                <button className="btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }} onClick={() => setViewMode('projects')}>
                  Manage Connected Projects
                </button>
              </div>
            </div>

            {/* Simulated System Analysis Card */}
            <div className="panel" style={{ padding: '1.75rem', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' }} className="mono">
                  PORTFOLIO AUDIT / northstar-finance
                </div>
                <div className="badge badge-high">73 ELEVATED RISK</div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem' }}>
                  <span className="text-secondary">SYSTEM RISK GAUGE</span>
                  <span className="mono text-accent">73 / 100</span>
                </div>
                <div style={{ height: 8, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
                  <div style={{ width: '73%', background: 'linear-gradient(to right, #4FD18B, #F3C969, #FF6B3D)' }}></div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '1.5rem' }}>
                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="mono">CRITICAL</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-critical)' }}>04</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="mono">HIGH RISK</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--accent-primary)' }}>11</div>
                </div>
                <div style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }} className="mono">MEDIUM</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--color-warning)' }}>27</div>
                </div>
              </div>

              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: '0.78rem' }}>server.js:L52 (northstar-finance)</span>
                  <span className="badge badge-critical">Plaintext Password Leak</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: '0.78rem' }}>user-db-service</span>
                  <span className="badge badge-high">Connection Exhaustion</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* VIEW 2: DASHBOARD VIEW WITH MULTI-PROJECT FILTERING */}
      {viewMode === 'dashboard' && (
        <div style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '2rem' }}>
          
          {/* Breadcrumb Navigation & Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                PORTFOLIO / {selectedProjectFilter === 'ALL' ? 'ALL CONNECTED PROJECTS' : selectedProjectFilter} / INCIDENTS
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>System Health & Operational Incidents</h2>
            </div>

            {/* Project Filter Switcher */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.4rem 0.75rem', borderRadius: 4 }}>
                <Filter size={14} color="var(--text-muted)" />
                <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PROJECT:</span>
                <select
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', outline: 'none', cursor: 'pointer' }}
                  value={selectedProjectFilter}
                  onChange={(e) => setSelectedProjectFilter(e.target.value)}
                >
                  <option value="ALL">All Projects ({projects.length})</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
              </div>

              <button className="btn-secondary" onClick={() => setShowSimModal(true)}>
                <Zap size={15} color="var(--accent-primary)" /> Simulate Outage
              </button>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={15} /> New Incident
              </button>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="panel">
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>ACTIVE INCIDENTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: activeCount > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>
                {activeCount}
              </div>
            </div>

            <div className="panel">
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>CRITICAL ALERTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: criticalCount > 0 ? 'var(--color-critical)' : 'var(--text-primary)' }}>
                {criticalCount}
              </div>
            </div>

            <div className="panel">
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>CONNECTED PROJECTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-info)' }}>
                {projects.length} Services
              </div>
            </div>

            <div className="panel">
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>AVG MTTD</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-success)' }}>
                14.2s
              </div>
            </div>
          </div>

          {/* Incidents Table */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Detected Risk Incidents</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} className="mono">{filteredIncidents.length} ENTRIES</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }} className="mono">
                Loading incidents...
              </div>
            ) : filteredIncidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-primary)', borderRadius: 4, border: '1px solid var(--border-color)' }}>
                <ShieldAlert size={36} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ marginBottom: '0.4rem' }}>No Active Incidents for Selected Project</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  All systems operating normally. Trigger an outage scenario to test multi-agent diagnosis.
                </p>
                <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => setShowSimModal(true)}>
                  <Zap size={15} /> Trigger Outage Test
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {filteredIncidents.map((incident) => (
                  <div
                    key={incident.id}
                    style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: 4, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', transition: 'border-color var(--transition-fast)' }}
                    onClick={() => setSelectedIncident(incident)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <span className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', background: 'var(--bg-elevated)', padding: '0.2rem 0.5rem', borderRadius: 4 }}>
                        {incident.id}
                      </span>
                      <div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{incident.title}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Target Project: <span className="mono" style={{ color: 'var(--accent-primary)' }}>{incident.service_id}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {getSeverityBadge(incident.severity)}
                      {getStatusBadge(incident.status)}
                      <ArrowRight size={16} color="var(--text-muted)" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      {/* VIEW 3: MULTI-PROJECT PORTFOLIO MATRIX VIEW */}
      {viewMode === 'projects' && (
        <div style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>MULTI-PROJECT PORTFOLIO</div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Connected Software Projects ({projects.length})</h2>
            </div>

            <button className="btn-primary" onClick={() => setShowProjectModal(true)}>
              <FolderPlus size={16} /> Register New Project
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat( auto-fill, minmax(380px, 1fr) )', gap: '1.5rem' }}>
            {projects.map((proj) => (
              <div key={proj.id} className="panel" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <div>
                      <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>ID: {proj.id}</div>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 600, color: 'var(--text-primary)', marginTop: '0.1rem' }}>{proj.name}</h3>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: proj.health_score > 70 ? 'var(--color-success)' : 'var(--accent-primary)' }} className="mono">
                        {proj.health_score}% HEALTH
                      </div>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    {proj.description}
                  </p>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                    <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                      <Server size={12} /> {proj.tech_stack || 'Microservice'}
                    </span>
                    <span className="badge" style={{ background: 'var(--bg-primary)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}>
                      Team: {proj.owner_team || 'Core Dev'}
                    </span>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} className="mono">
                    Active Incidents: <strong style={{ color: proj.active_incidents_count > 0 ? 'var(--accent-primary)' : 'var(--text-primary)' }}>{proj.active_incidents_count}</strong>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {proj.repository_url && (
                      <a
                        href={proj.repository_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn-secondary"
                        style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem', textDecoration: 'none' }}
                      >
                        GitHub <ExternalLink size={12} />
                      </a>
                    )}
                    <button
                      className="btn-primary"
                      style={{ padding: '0.35rem 0.65rem', fontSize: '0.75rem' }}
                      onClick={() => {
                        setSelectedProjectFilter(proj.id);
                        setViewMode('dashboard');
                      }}
                    >
                      Inspect Incidents
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 4: ARCHITECTURE VISUALIZATION */}
      {viewMode === 'architecture' && (
        <div style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>SYSTEM TOPOLOGY</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Connected Project Dependency Graph</h2>
          </div>

          <div className="panel" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', alignItems: 'center', maxWidth: 960, margin: '0 auto' }}>
              {projects.slice(0, 6).map((proj) => (
                <div key={proj.id} className="panel" style={{ background: 'var(--bg-primary)', border: proj.id === 'northstar-finance' ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)' }}>
                  <div className="mono" style={{ fontSize: '0.72rem', color: proj.id === 'northstar-finance' ? 'var(--color-critical)' : 'var(--accent-primary)', marginBottom: '0.4rem' }}>{proj.tech_stack || 'MICROSERVICE'}</div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{proj.name}</h4>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }} className="mono">{proj.id}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: REPORTS VIEW */}
      {viewMode === 'reports' && (
        <div style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>AUDIT DOCUMENTATION</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Engineering Risk Reports</h2>
          </div>

          <div style={{ background: '#FFFFFF', color: '#080A0D', borderRadius: 8, padding: '3rem', fontFamily: 'Inter, sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #080A0D', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
              <div>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', color: '#FF6B3D' }} className="mono">
                  INCIDENTIQ ENGINEERING AUDIT REPORT
                </div>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem' }}>Portfolio Security & Risk Audit</h2>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem' }} className="mono">
                <div>REPORT ID: #AN-29481</div>
                <div>DATE: 25 AUG 2026</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2.5rem' }}>
              <div style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 4 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }} className="mono">CONNECTED PROJECTS</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FF6B3D' }}>{projects.length}</div>
              </div>
              <div style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 4 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }} className="mono">CRITICAL ALERTS</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F05B5B' }}>04</div>
              </div>
              <div style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 4 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }} className="mono">ANALYZED REPOSITORIES</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#080A0D' }}>{projects.length}</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Executive Summary</h3>
            <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              IncidentIQ performed a static and behavioral risk audit across {projects.length} connected software repositories (including <strong>northstar-finance</strong> and <strong>memora-backend</strong>). The analysis identified actionable engineering findings across microservice endpoints, plaintext password exposures, and connection pool thresholds.
            </p>
          </div>
        </div>
      )}

      {/* Incident Detail Drawer/Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onRefreshIncident={() => {
            fetchIncidents();
            fetchProjects();
          }}
        />
      )}

      {/* MODAL 1: REGISTER NEW PROJECT MODAL */}
      {showProjectModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FolderPlus size={18} color="var(--accent-primary)" /> Register External Project into IncidentIQ
            </h3>
            <form onSubmit={handleRegisterProject}>
              <div className="form-group">
                <label className="form-label">Service Identifier (Slug)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., memora-backend or auth-api"
                  value={projId}
                  onChange={(e) => setProjId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Memora Intelligence Engine"
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">GitHub Repository URL</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="e.g., https://github.com/Vijaykumar5623/Memora"
                  value={projRepo}
                  onChange={(e) => setProjRepo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Technology Stack</label>
                <select
                  className="form-select"
                  value={projStack}
                  onChange={(e) => setProjStack(e.target.value)}
                >
                  <option value="Node.js / Express">Node.js / Express</option>
                  <option value="Python / FastAPI">Python / FastAPI</option>
                  <option value="Python / Flask">Python / Flask</option>
                  <option value="React / Next.js">React / Next.js</option>
                  <option value="Go / Gin">Go / Gin</option>
                  <option value="Java / Spring Boot">Java / Spring Boot</option>
                  <option value="PostgreSQL / Redis">PostgreSQL / Redis</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  className="form-textarea"
                  rows={2}
                  placeholder="Short description of service responsibility..."
                  value={projDesc}
                  onChange={(e) => setProjDesc(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowProjectModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" disabled={registeringProj} className="btn-primary">
                  {registeringProj ? 'Registering...' : 'Connect Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SIMULATOR OUTAGE TRIGGER MODAL */}
      {showSimModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
              <Zap size={18} color="var(--accent-primary)" /> Simulate Production Outage
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
                <div style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
                  <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '0.2rem' }}>SCENARIO OVERVIEW</div>
                  <p style={{ color: 'var(--text-secondary)' }}>
                    {scenarios.find(s => s.id === selectedScenario)?.description}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowSimModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={triggering}
                  className="btn-primary"
                  style={{ cursor: triggering ? 'not-allowed' : 'pointer' }}
                >
                  {triggering ? 'Simulating Outage...' : 'Trigger Scenario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: NEW MANUAL INCIDENT MODAL */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 600 }}>Create Risk Incident</h3>
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
                <label className="form-label">Target Project Service</label>
                <select
                  className="form-select"
                  value={formService}
                  onChange={(e) => setFormService(e.target.value)}
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.id})
                    </option>
                  ))}
                </select>
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
                  className="btn-secondary"
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
