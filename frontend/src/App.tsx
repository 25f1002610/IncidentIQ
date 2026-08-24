import React, { useEffect, useState } from 'react';
import { ShieldAlert, Activity, Plus, Zap, ArrowRight, Layers, FileCode, AlertOctagon } from 'lucide-react';
import { Incident, IncidentSeverity, IncidentStatus, ScenarioInfo } from './types';
import { IncidentDetailModal } from './components/IncidentDetailModal';

const DEFAULT_SCENARIOS: ScenarioInfo[] = [
  { id: 'NORTHSTAR_FINANCE_EXPOSURE', title: 'Northstar Finance Excessive API Data Exposure', service_id: 'northstar-finance', severity: 'CRITICAL', description: 'Unauthenticated API endpoint /api/profile leaks raw user objects with plaintext passwords.' },
  { id: 'DB_CONN_EXHAUSTION', title: 'PostgreSQL Connection Pool Exhaustion', service_id: 'user-db-service', severity: 'CRITICAL', description: 'Database connection pool utilization reached 98%. Active queries blocked; 500 error spike detected.' },
  { id: 'BAD_DEPLOY_MEMORY_LEAK', title: 'Unclosed Session Memory Leak', service_id: 'auth-service', severity: 'HIGH', description: 'RAM consumption steadily escalated from 450MB to 3.8GB following deployment v2.4.1.' },
  { id: 'EXTERNAL_API_TIMEOUT', title: 'Stripe Gateway Latency & 504 Timeouts', service_id: 'payment-service', severity: 'MEDIUM', description: 'HTTP 504 Gateway Timeout errors spike on checkout. Latency exceeds 8,000ms.' }
];

export const App: React.FC = () => {
  const [viewMode, setViewMode] = useState<'landing' | 'dashboard' | 'architecture' | 'reports'>('landing');
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

  // Simulator scenarios
  const [scenarios, setScenarios] = useState<ScenarioInfo[]>(DEFAULT_SCENARIOS);
  const [selectedScenario, setSelectedScenario] = useState<string>('DB_CONN_EXHAUSTION');
  const [triggering, setTriggering] = useState<boolean>(false);

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

  const activeCount = incidents.filter(i => i.status !== 'RESOLVED').length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL' && i.status !== 'RESOLVED').length;

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
            <button className={`nav-link ${viewMode === 'landing' ? 'active' : ''}`} onClick={() => setViewMode('landing')}>
              Product
            </button>
            <button className={`nav-link ${viewMode === 'dashboard' ? 'active' : ''}`} onClick={() => setViewMode('dashboard')}>
              Dashboard
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
          <button className="btn-secondary" style={{ fontSize: '0.8rem' }} onClick={() => setViewMode('dashboard')}>
            Explore Console
          </button>
          <button className="btn-primary" onClick={() => setShowSimModal(true)}>
            Analyze Repository
          </button>
        </div>
      </header>

      {/* VIEW 1: LANDING PAGE */}
      {viewMode === 'landing' && (
        <div style={{ flex: 1 }}>
          
          {/* Hero Section */}
          <section style={{ maxWidth: 1280, margin: '0 auto', padding: '5rem 2rem 4rem 2rem', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '4rem', alignItems: 'center' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', padding: '0.3rem 0.75rem', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '1.5rem' }} className="mono">
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-primary)' }}></span>
                ENGINEERING INTELLIGENCE PLATFORM
              </div>

              <h1 style={{ fontSize: '3.6rem', fontWeight: 700, lineHeight: 1.08, letterSpacing: '-0.03em', color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                Find the failures<br />before production does.
              </h1>

              <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, maxWidth: 520, marginBottom: '2.5rem' }}>
                IncidentIQ analyzes code, dependencies, architecture, and operational telemetry signals to identify and resolve root causes before expensive production outages.
              </p>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button className="btn-primary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }} onClick={() => setShowSimModal(true)}>
                  Analyze Repository <ArrowRight size={16} />
                </button>
                <button className="btn-secondary" style={{ padding: '0.75rem 1.5rem', fontSize: '0.95rem' }} onClick={() => setViewMode('dashboard')}>
                  Explore Platform
                </button>
              </div>
            </div>

            {/* Simulated Live System Analysis Card */}
            <div className="panel" style={{ padding: '1.75rem', background: 'var(--bg-surface)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600, letterSpacing: '0.08em', color: 'var(--text-muted)' }} className="mono">
                  SYSTEM ANALYSIS / breaksmith-core
                </div>
                <div className="badge badge-high">73 ELEVATED RISK</div>
              </div>

              {/* Gauge Bar */}
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
                  <span className="mono" style={{ fontSize: '0.78rem' }}>src/auth/session.ts</span>
                  <span className="badge badge-critical">Unsafe Fallback</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem', background: 'var(--bg-primary)', borderRadius: 4 }}>
                  <span className="mono" style={{ fontSize: '0.78rem' }}>services/api/client.ts</span>
                  <span className="badge badge-high">Unbounded Retry</span>
                </div>
              </div>
            </div>
          </section>

          {/* Section 01: Problem Statement */}
          <section style={{ borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-surface)' }}>
            <div style={{ maxWidth: 1280, margin: '0 auto', padding: '5rem 2rem' }}>
              <div style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto 3.5rem auto' }}>
                <h2 style={{ fontSize: '2.4rem', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '1rem' }}>
                  Fast code creates slow failures.
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                  Modern development velocity introduces subtle architectural coupling, version drift, and unhandled edge cases that evade unit tests.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', alignItems: 'center' }}>
                {['Code generated', 'Dependencies added', 'Architecture evolves', 'Complexity compounds', 'Production failure'].map((step, idx) => (
                  <React.Fragment key={idx}>
                    <div className="panel" style={{ padding: '1.25rem 1rem', textAlign: 'center', background: idx === 4 ? 'rgba(240,91,91,0.06)' : 'var(--bg-primary)', borderColor: idx === 4 ? 'var(--color-critical)' : 'var(--border-color)' }}>
                      <div className="mono" style={{ fontSize: '0.75rem', color: idx === 4 ? 'var(--color-critical)' : 'var(--accent-primary)', marginBottom: '0.4rem' }}>0{idx + 1}</div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, color: idx === 4 ? 'var(--color-critical)' : 'var(--text-primary)' }}>{step}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          {/* Section 02: What BreakSmith Sees */}
          <section style={{ maxWidth: 1280, margin: '0 auto', padding: '5rem 2rem' }}>
            <div style={{ marginBottom: '3rem' }}>
              <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--accent-primary)', marginBottom: '0.5rem' }}>ANALYTICAL COVERAGE</div>
              <h2 style={{ fontSize: '2.2rem', fontWeight: 700 }}>What BreakSmith Sees</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem' }}>
              <div className="panel">
                <FileCode size={20} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Code Risk</h3>
                <ul style={{ listStyleType: 'none', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>• Cyclomatic Complexity</li>
                  <li>• Unhandled Exec Paths</li>
                  <li>• Silent Exceptions</li>
                  <li>• Dead Code Vectors</li>
                </ul>
              </div>

              <div className="panel">
                <Layers size={20} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Architecture</h3>
                <ul style={{ listStyleType: 'none', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>• Dependency Chains</li>
                  <li>• Tight Service Coupling</li>
                  <li>• Single Points of Failure</li>
                  <li>• Circular References</li>
                </ul>
              </div>

              <div className="panel">
                <AlertOctagon size={20} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Dependencies</h3>
                <ul style={{ listStyleType: 'none', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>• Version Instability</li>
                  <li>• Known CVE Exposure</li>
                  <li>• Abandoned Packages</li>
                  <li>• License Conflicts</li>
                </ul>
              </div>

              <div className="panel">
                <Activity size={20} color="var(--accent-primary)" style={{ marginBottom: '1rem' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Behavior</h3>
                <ul style={{ listStyleType: 'none', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <li>• Connection Pools</li>
                  <li>• Heap Accumulation</li>
                  <li>• Retry Amplification</li>
                  <li>• Latency Degradation</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 03: Final Call to Action */}
          <section style={{ borderTop: '1px solid var(--border-color)', background: 'var(--bg-surface)', padding: '5rem 2rem', textAlign: 'center' }}>
            <div style={{ maxWidth: 600, margin: '0 auto' }}>
              <h2 style={{ fontSize: '2.4rem', fontWeight: 700, marginBottom: '1rem' }}>
                Understand your system before it breaks.
              </h2>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Run deep static and behavioral risk audits across your software repositories.
              </p>
              <button className="btn-primary" style={{ padding: '0.8rem 1.8rem', fontSize: '1rem', margin: '0 auto' }} onClick={() => setShowSimModal(true)}>
                Analyze Your Repository
              </button>
            </div>
          </section>

        </div>
      )}

      {/* VIEW 2: DASHBOARD VIEW */}
      {viewMode === 'dashboard' && (
        <div style={{ flex: 1, maxWidth: 1400, width: '100%', margin: '0 auto', padding: '2rem' }}>
          
          {/* Breadcrumb Navigation & Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                PROJECTS / breaksmith-core / ANALYSIS OVERVIEW
              </div>
              <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>System Health & Risk Intelligence</h2>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn-secondary" onClick={() => setShowSimModal(true)}>
                <Zap size={15} color="var(--accent-primary)" /> Simulate Infrastructure Outage
              </button>
              <button className="btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={15} /> Create Risk Report
              </button>
            </div>
          </div>

          {/* Risk Score Horizontal Gauge */}
          <div className="panel" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SYSTEM RISK AUDIT</div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent-primary)', display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
                  73 <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 400 }}>/ 100 SCORE</span>
                </div>
              </div>
              <div className="badge badge-high">ELEVATED SYSTEM RISK</div>
            </div>

            <div style={{ height: 10, background: 'var(--bg-primary)', borderRadius: 4, overflow: 'hidden', position: 'relative', marginBottom: '1rem' }}>
              <div style={{ width: '73%', height: '100%', background: 'linear-gradient(to right, #4FD18B, #F3C969, #FF6B3D)' }}></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }} className="mono">
              <span>0 (LOW RISK)</span>
              <span>25 (MODERATE)</span>
              <span>50 (HIGH)</span>
              <span className="text-accent">73 (ELEVATED)</span>
              <span>100 (CRITICAL)</span>
            </div>
          </div>

          {/* Metric Stats Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.25rem', marginBottom: '2rem' }}>
            <div className="panel">
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>ACTIVE FINDINGS</div>
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
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>SWARM AGENTS</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-info)' }}>
                6 Active Nodes
              </div>
            </div>

            <div className="panel">
              <div className="mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>AVG MTTD</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--color-success)' }}>
                14.2s
              </div>
            </div>
          </div>

          {/* Findings Table */}
          <div className="panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Detected Risk Findings</h3>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} className="mono">{incidents.length} ENTRIES</span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }} className="mono">
                Loading analytical repository findings...
              </div>
            ) : incidents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', background: 'var(--bg-primary)', borderRadius: 4, border: '1px border var(--border-color)' }}>
                <ShieldAlert size={36} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
                <h4 style={{ marginBottom: '0.4rem' }}>No Active Risk Findings</h4>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', marginBottom: '1.25rem' }}>
                  All systems operating within normal parameters. Run an outage scenario to test risk detection.
                </p>
                <button className="btn-primary" style={{ margin: '0 auto' }} onClick={() => setShowSimModal(true)}>
                  <Zap size={15} /> Simulate Outage Scenario
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {incidents.map((incident) => (
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
                          Service: <span className="mono" style={{ color: 'var(--text-secondary)' }}>{incident.service_id}</span>
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

      {/* VIEW 3: ARCHITECTURE VISUALIZATION */}
      {viewMode === 'architecture' && (
        <div style={{ flex: 1, maxWidth: 1280, width: '100%', margin: '0 auto', padding: '2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>SYSTEM TOPOLOGY</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700 }}>Interactive Service & Dependency Graph</h2>
          </div>

          <div className="panel" style={{ padding: '3rem', textAlign: 'center', background: 'var(--bg-surface)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', alignItems: 'center', maxWidth: 900, margin: '0 auto' }}>
              
              <div className="panel" style={{ background: 'var(--bg-primary)' }}>
                <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', marginBottom: '0.4rem' }}>FRONTEND GATEWAY</div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>checkout-ui</h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }} className="mono">React 18 / Nginx</div>
              </div>

              <div className="panel" style={{ background: 'var(--bg-primary)', border: '1px solid var(--accent-primary)' }}>
                <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-critical)', marginBottom: '0.4rem' }}>API SERVICE</div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>user-db-service</h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }} className="mono">PostgreSQL / Connection Pool</div>
              </div>

              <div className="panel" style={{ background: 'var(--bg-primary)' }}>
                <div className="mono" style={{ fontSize: '0.72rem', color: 'var(--color-warning)', marginBottom: '0.4rem' }}>AUTH MICROSERVICE</div>
                <h4 style={{ fontSize: '1rem', fontWeight: 600 }}>auth-service</h4>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.4rem' }} className="mono">Node.js / Memory Usage</div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* VIEW 4: REPORTS VIEW */}
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
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem' }}>Repository Risk Findings</h2>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem' }} className="mono">
                <div>REPORT ID: #AN-29481</div>
                <div>DATE: 25 AUG 2026</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem', marginBottom: '2.5rem' }}>
              <div style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 4 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }} className="mono">OVERALL HEALTH SCORE</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#FF6B3D' }}>73 / 100</div>
              </div>
              <div style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 4 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }} className="mono">CRITICAL FINDINGS</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F05B5B' }}>04</div>
              </div>
              <div style={{ border: '1px solid #E2E8F0', padding: '1rem', borderRadius: 4 }}>
                <div style={{ fontSize: '0.75rem', color: '#64748B' }} className="mono">ANALYZED FILES</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#080A0D' }}>127</div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '1rem' }}>Executive Summary</h3>
            <p style={{ color: '#334155', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '2rem' }}>
              IncidentIQ performed a static and behavioral risk audit over repository <strong>northstar-finance</strong>. The analysis identified 42 actionable engineering findings across 127 files. Key vulnerabilities include excessive API data exposure on `/api/profile` and exposed JWT secret credentials.
            </p>
          </div>
        </div>
      )}

      {/* Incident Detail Drawer/Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          onClose={() => setSelectedIncident(null)}
          onRefreshIncident={fetchIncidents}
        />
      )}

      {/* Simulator Outage Trigger Modal */}
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

      {/* New Manual Incident Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 style={{ marginBottom: '1.25rem', fontSize: '1.1rem', fontWeight: 600 }}>Create Risk Findings Entry</h3>
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
