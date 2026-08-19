import React, { useEffect, useState } from 'react';
import { X, Activity, Terminal, GitCommit, FileText, Cpu, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
import { Incident, LogEntry, MetricEntry, CommitInfo } from '../types';

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({ incident, onClose }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'metrics' | 'deployments' | 'investigation'>('logs');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [commit, setCommit] = useState<CommitInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchTelemetry = async () => {
      setLoading(true);
      try {
        const [logsRes, metricsRes, deployRes] = await Promise.all([
          fetch(`/api/v1/simulator/logs/${incident.id}`),
          fetch(`/api/v1/simulator/metrics/${incident.id}`),
          fetch(`/api/v1/simulator/deployments/${incident.id}`)
        ]);

        if (logsRes.ok) {
          const data = await logsRes.json();
          setLogs(data.logs || []);
        }

        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setMetrics(data.metrics || []);
        }

        if (deployRes.ok) {
          const data = await deployRes.json();
          setCommit(data.commit || null);
        }
      } catch (err) {
        console.error('Failed to load telemetry', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTelemetry();
  }, [incident.id]);

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '4rem' }}>
      <div className="modal-content" style={{ maxWidth: '900px', width: '90%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
              <span className="incident-id">{incident.id}</span>
              <span className={`badge badge-${incident.severity.toLowerCase()}`}>{incident.severity}</span>
              <span className="badge badge-investigating">{incident.status}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{incident.title}</h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1.5rem', borderBottom: '1px solid var(--border-color)', margin: '1rem 0' }}>
          {[
            { id: 'logs', label: 'Logs Stream', icon: <Terminal size={16} /> },
            { id: 'metrics', label: 'Telemetry Metrics', icon: <Activity size={16} /> },
            { id: 'deployments', label: 'Git & Deployments', icon: <GitCommit size={16} /> },
            { id: 'investigation', label: 'AI Diagnosis & RCA', icon: <Cpu size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 0',
                background: 'none',
                border: 'none',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Gathering operational telemetry from services...
            </div>
          ) : (
            <>
              {/* LOGS TAB */}
              {activeTab === 'logs' && (
                <div style={{ background: '#05070d', borderRadius: 'var(--radius-sm)', padding: '1rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {logs.map((log) => (
                    <div key={log.id || Math.random()} style={{ display: 'flex', gap: '0.75rem', lineHeight: '1.4' }}>
                      <span style={{ color: '#4b5563' }}>[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                      <span style={{ 
                        color: log.level === 'ERROR' ? '#ef4444' : log.level === 'WARN' ? '#f59e0b' : '#3b82f6',
                        fontWeight: 600,
                        width: '50px'
                      }}>
                        {log.level}
                      </span>
                      <span style={{ color: '#9ca3af' }}>[{log.service}]</span>
                      <span style={{ color: '#e5e7eb', flex: 1 }}>{log.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* METRICS TAB */}
              {activeTab === 'metrics' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  {metrics.length > 0 && Object.keys(metrics[0]).filter(k => k !== 'timestamp' && k !== 'incident_id').map(metricKey => (
                    <div key={metricKey} style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'capitalize' }}>
                        {metricKey.replace(/_/g, ' ')}
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.75rem' }}>
                        {metrics[metrics.length - 1][metricKey]}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.3rem' }}>
                          {metricKey.includes('percent') || metricKey.includes('rate') ? '%' : 'ms'}
                        </span>
                      </div>
                      {/* Trend bar */}
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '40px', paddingTop: '10px' }}>
                        {metrics.map((m, idx) => {
                          const val = Number(m[metricKey]) || 0;
                          const heightPct = Math.min(Math.max((val / 100) * 100, 10), 100);
                          return (
                            <div 
                              key={idx} 
                              style={{ 
                                flex: 1, 
                                height: `${heightPct}%`, 
                                background: val > 75 ? '#ef4444' : val > 40 ? '#f59e0b' : 'var(--accent-primary)',
                                borderRadius: '2px' 
                              }} 
                              title={`${val}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* DEPLOYMENTS TAB */}
              {activeTab === 'deployments' && (
                <div>
                  {commit ? (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <div>
                          <span style={{ fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.06)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                            {commit.hash}
                          </span>
                          <h4 style={{ margin: '0.5rem 0 0.2rem 0', fontSize: '1rem' }}>{commit.message}</h4>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>By {commit.author} • {commit.timestamp}</div>
                        </div>
                      </div>
                      <div style={{ marginTop: '1rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>Code Diff:</div>
                        <pre style={{ background: '#05070d', padding: '0.85rem', borderRadius: 'var(--radius-sm)', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#6be585', overflowX: 'auto' }}>
                          {commit.diff}
                        </pre>
                      </div>
                    </div>
                  ) : (
                    <div style={{ color: 'var(--text-secondary)' }}>No recent deployments detected for this service.</div>
                  )}
                </div>
              )}

              {/* AI INVESTIGATION TAB */}
              {activeTab === 'investigation' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#a855f7', fontWeight: 600, marginBottom: '0.75rem' }}>
                      <Cpu size={18} /> Probable Root Cause Analysis
                    </div>
                    {incident.probable_root_cause ? (
                      <div>
                        <p style={{ color: 'var(--text-primary)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                          {incident.probable_root_cause}
                        </p>
                        {incident.confidence_score && (
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            Confidence: <strong>{(incident.confidence_score * 100).toFixed(0)}%</strong>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        AI investigation queue ready. In Phase 4, Ollama agents will analyze these correlated telemetry signals to produce backed root cause findings.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
