export type IncidentStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'ROOT_CAUSE_IDENTIFIED'
  | 'AWAITING_APPROVAL'
  | 'REMEDIATING'
  | 'RESOLVED'
  | 'FAILED';

export type IncidentSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface Service {
  id: string;
  name: string;
  description?: string;
  owner_team?: string;
  repository_url?: string;
  created_at: string;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  service_id: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  probable_root_cause?: string;
  confidence_score?: number;
  recommended_remediation?: string;
  remediation_status?: string;
  detected_at: string;
  resolved_at?: string;
  updated_at: string;
  service?: Service;
}

export interface IncidentListResponse {
  total: number;
  incidents: Incident[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  service: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface MetricEntry {
  timestamp: string;
  [key: string]: number | string;
}

export interface CommitInfo {
  hash: string;
  author: string;
  message: string;
  timestamp: string;
  diff: string;
}

export interface ScenarioInfo {
  id: string;
  title: string;
  service_id: string;
  severity: IncidentSeverity;
  description: string;
}
