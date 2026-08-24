import React, { useEffect, useState } from 'react';
import { X, Activity, Terminal, GitCommit, Cpu, CheckCircle2, Play, Sparkles, Users, Check, BookOpen, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Incident, LogEntry, MetricEntry, CommitInfo } from '../types';

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
  onRefreshIncident?: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({ incident, onClose, onRefreshIncident }) => {
  const [activeTab, setActiveTab] = useState<'investigation' | 'swarm' | 'rag' | 'logs' | 'metrics' | 'deployments'>('investigation');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [metrics, setMetrics] = useState<MetricEntry[]>([]);
  const [commit, setCommit] = useState<CommitInfo | null>(null);
  const [investigating, setInvestigating] = useState<boolean>(false);
  const [currentIncident, setCurrentIncident] = useState<Incident>(incident);
  const [findings, setFindings] = useState<any>(null);
  const [swarmTrace, setSwarmTrace] = useState<any[]>([]);
  const [approving, setApproving] = useState<boolean>(false);

  const fetchTelemetry = async () => {
    try {
      const [logsRes, metricsRes, deployRes] = await Promise.all([
        fetch(`/api/v1/simulator/logs/${currentIncident.id}`),
        fetch(`/api/v1/simulator/metrics/${currentIncident.id}`),
        fetch(`/api/v1/simulator/deployments/${currentIncident.id}`)
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
    }
  };

  useEffect(() => {
    fetchTelemetry();
  }, [currentIncident.id]);

  const handleRunInvestigation = async () => {
    setInvestigating(true);
    try {
      const res = await fetch(`/api/v1/incidents/${currentIncident.id}/investigate`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentIncident(data.incident);
        setFindings(data.root_cause_findings);
        if (onRefreshIncident) onRefreshIncident();
      }
    } catch (err) {
      console.error('Failed to execute AI investigation', err);
    } finally {
      setInvestigating(false);
    }
  };

  const handleRunSwarm = async () => {
    setInvestigating(true);
    setActiveTab('swarm');
    try {
      const res = await fetch(`/api/v1/incidents/${currentIncident.id}/investigate-swarm`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentIncident(data.incident);
        setSwarmTrace(data.execution_trace || []);
        setFindings({
          probable_root_cause: data.root_cause_hypothesis,
          confidence_score: data.confidence_score,
          supporting_evidence: data.supporting_evidence,
          recommended_remediation: data.recommended_remediation,
          remediation_risk_level: data.remediation_risk_level
        });
        if (onRefreshIncident) onRefreshIncident();
      }
    } catch (err) {
      console.error('Failed to execute LangGraph Swarm', err);
    } finally {
      setInvestigating(false);
    }
  };

  const handleApproveRemediation = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/v1/incidents/${currentIncident.id}/approve-remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'SRE On-Call Engineer', comment: 'Authorized remediation execution' })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentIncident(data.incident);
        if (onRefreshIncident) onRefreshIncident();
      }
    } catch (err) {
      console.error('Failed to approve remediation', err);
    } finally {
      setApproving(false);
    }
  };

  const handleRejectRemediation = async () => {
    setApproving(true);
    try {
      const res = await fetch(`/api/v1/incidents/${currentIncident.id}/reject-remediation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approver: 'SRE On-Call Engineer', comment: 'Action rejected pending secondary review' })
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentIncident(data.incident);
        if (onRefreshIncident) onRefreshIncident();
      }
    } catch (err) {
      console.error('Failed to reject remediation', err);
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="modal-overlay" style={{ alignItems: 'flex-start', paddingTop: '2rem' }}>
      <div className="modal-content" style={{ maxWidth: '980px', width: '94%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
              <span className="incident-id">{currentIncident.id}</span>
              <span className={`badge badge-${currentIncident.severity.toLowerCase()}`}>{currentIncident.severity}</span>
              <span className="badge badge-investigating">{currentIncident.status.replace(/_/g, ' ')}</span>
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>{currentIncident.title}</h2>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', gap: '1.25rem', borderBottom: '1px solid var(--border-color)', margin: '1rem 0' }}>
          {[
            { id: 'investigation', label: 'Single-Agent RCA', icon: <Cpu size={16} /> },
            { id: 'swarm', label: 'LangGraph Swarm', icon: <Users size={16} /> },
            { id: 'rag', label: 'Runbooks (RAG)', icon: <BookOpen size={16} /> },
            { id: 'logs', label: 'Logs Stream', icon: <Terminal size={16} /> },
            { id: 'metrics', label: 'Telemetry Metrics', icon: <Activity size={16} /> },
            { id: 'deployments', label: 'Git & Deployments', icon: <GitCommit size={16} /> },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.6rem 0',
                background: 'none',
                border: 'none',
                color: activeTab === tab.id ? 'var(--accent-primary)' : 'var(--text-secondary)',
                borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
                fontWeight: activeTab === tab.id ? 600 : 400,
                cursor: 'pointer',
                fontSize: '0.86rem'
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
          
          {/* SINGLE AGENT & HUMAN APPROVAL TAB */}
          {activeTab === 'investigation' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    <Sparkles size={16} color="var(--accent-primary)" /> Autonomous Root Cause Investigator
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Executes LogSearchTool, MetricsTool, GitHubTool, and RAGSearchTool.
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleRunInvestigation}
                  disabled={investigating}
                  style={{ background: investigating ? 'var(--border-color)' : 'var(--accent-primary)', color: '#080A0D', cursor: investigating ? 'not-allowed' : 'pointer' }}
                >
                  {investigating ? (
                    <>Analyzing Code & Risk...</>
                  ) : (
                    <><Play size={15} /> Run Analysis Engine</>
                  )}
                </button>
              </div>

              {currentIncident.probable_root_cause || findings ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  
                  {/* Probable Root Cause */}
                  <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glow)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.85rem', color: '#a855f7', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Probable Root Cause Hypothesis
                      </div>
                      {currentIncident.confidence_score && (
                        <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)', fontSize: '0.8rem' }}>
                          <CheckCircle2 size={14} /> {(currentIncident.confidence_score * 100).toFixed(0)}% Confidence
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.5 }}>
                      {currentIncident.probable_root_cause}
                    </p>
                  </div>

                  {/* Supporting Evidence */}
                  {findings?.supporting_evidence && findings.supporting_evidence.length > 0 && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '0.75rem' }}>
                        Correlated Operational Evidence ({findings.supporting_evidence.length} Signals)
                      </div>
                      <ul style={{ listStyleType: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {findings.supporting_evidence.map((ev: string, idx: number) => (
                          <li key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', fontSize: '0.88rem', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)', padding: '0.6rem 0.8rem', borderRadius: 'var(--radius-sm)' }}>
                            <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>•</span>
                            {ev}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Remediation & Human Approval Card */}
                  {currentIncident.recommended_remediation && (
                    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Recommended Remediation Action Plan
                        </div>
                        <span className="badge" style={{ 
                          background: currentIncident.status === 'RESOLVED' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                          color: currentIncident.status === 'RESOLVED' ? '#6ee7b7' : '#fca5a5', 
                          border: currentIncident.status === 'RESOLVED' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', 
                          fontSize: '0.75rem' 
                        }}>
                          {currentIncident.remediation_status || 'HUMAN APPROVAL REQUIRED'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                        {currentIncident.recommended_remediation}
                      </p>

                      {/* Human-in-the-Loop Action Controls */}
                      {currentIncident.status !== 'RESOLVED' && (
                        <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                            <strong>Human-in-the-Loop Control:</strong> Consequential production action requires explicit authorization.
                          </div>
                          <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button
                              onClick={handleRejectRemediation}
                              disabled={approving}
                              style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', padding: '0.5rem 1rem', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
                            >
                              <ThumbsDown size={14} /> Reject Action
                            </button>
                            <button
                              onClick={handleApproveRemediation}
                              disabled={approving}
                              className="btn-primary"
                              style={{ background: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                            >
                              <ThumbsUp size={14} /> Approve & Execute Remediation
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2.5rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px dashed var(--border-color)' }}>
                  <Cpu size={36} color="var(--text-muted)" style={{ marginBottom: '0.75rem' }} />
                  <h4 style={{ marginBottom: '0.4rem' }}>No AI Root Cause Findings Yet</h4>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
                    Click "Run AI Investigation" or "Run Multi-Agent Swarm" to trigger automated tool calling and LLM reasoning.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* SWARM TAB */}
          {activeTab === 'swarm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.12), rgba(59,130,246,0.12))', border: '1px solid rgba(168,85,247,0.3)', borderRadius: 'var(--radius-md)', padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                    <Users size={18} color="#a855f7" /> LangGraph Multi-Agent Swarm Engine
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                    Supervisor ➔ [LogsAgent, MetricsAgent, GitHubAgent, RAGAgent] ➔ RootCauseAgent ➔ ReviewerAgent
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleRunSwarm}
                  disabled={investigating}
                  style={{ background: investigating ? '#4b5563' : 'linear-gradient(135deg, #a855f7, #3b82f6)', cursor: investigating ? 'not-allowed' : 'pointer' }}
                >
                  {investigating ? (
                    <>Executing Swarm DAG...</>
                  ) : (
                    <><Play size={16} /> Run Multi-Agent Swarm</>
                  )}
                </button>
              </div>

              {swarmTrace.length > 0 && (
                <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600, marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Agent Execution Trace ({swarmTrace.length} Steps Executed)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {swarmTrace.map((trace, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem', background: 'rgba(0,0,0,0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid #a855f7' }}>
                        <div style={{ background: 'rgba(168,85,247,0.2)', padding: '0.3rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, color: '#d8b4fe' }}>
                          {trace.agent}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)' }}>{trace.detail}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>{trace.action} • {trace.timestamp}</div>
                        </div>
                        <Check size={16} color="#10b981" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* RAG RUNBOOKS TAB */}
          {activeTab === 'rag' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: '1.25rem' }}>
                <h4 style={{ fontSize: '1rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <BookOpen size={18} color="var(--accent-primary)" /> Internal Runbooks & Architecture Knowledge
                </h4>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Semantic vector search retrieves relevant troubleshooting runbooks for <strong>{currentIncident.service_id}</strong>.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div style={{ background: '#05070d', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        Runbook: {currentIncident.service_id.replace(/-/g, ' ').toUpperCase()} Operations
                      </span>
                      <span className="badge" style={{ background: 'rgba(59,130,246,0.15)', color: '#93c5fd' }}>
                        Relevance: 94%
                      </span>
                    </div>
                    <pre style={{ fontSize: '0.82rem', color: '#9ca3af', fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap' }}>
{`## Symptom
Application logs report QueuePool timeout or high latency threshold breach.

## Root Cause Diagnostics
High-volume query patterns missing composite index or memory leak in connection handlers.

## Remediation Steps
1. Scale pool size to 250 connections.
2. Deploy composite index or rollback deployment commit.
3. Restart application workers.`}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}

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
        </div>
      </div>
    </div>
  );
};
