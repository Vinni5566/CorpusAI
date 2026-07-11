export type FSMState =
  | 'GOAL_RECEIVED'
  | 'MARKETING_DRAFTING'
  | 'BUDGET_REQUESTED'
  | 'FINANCE_REVIEWING'
  | 'NEGOTIATION'
  | 'AWAITING_HUMAN_APPROVAL'
  | 'EXECUTING'
  | 'REJECTED'
  | 'DONE';

export interface Initiative {
  id: string;
  name: string;
  status: 'Planning' | 'Awaiting Approval' | 'Approved' | 'Rejected' | 'Executing' | 'Done';
  owner: string;
  created: string;
  summary: string;
  linkedDecisions?: string[];
  linkedActions?: string[];
}

export type AgentName = 'Marketing' | 'Finance' | 'Engineering' | 'Orchestrator';

export type EventType = 'Request' | 'Response' | 'Disagreement' | 'Resolution' | 'Action' | 'Error';

export interface AgentLogEntry {
  id?: string;
  timestamp: string;
  agent: AgentName;
  eventType: EventType;
  summary: string;
  reasoning: string;
  initiativeId: string;
}

export interface Decision {
  id?: string;
  title: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedBy: AgentName;
  amount: number;
  reasoningSummary: string;
  initiativeId: string;
  decidedBy?: string;
  decidedAt?: string;
}

export interface ActionEntry {
  id?: string;
  title: string;
  tool: 'GitHub' | 'Slack' | 'Calendar' | 'Email';
  link: string;
  performedBy: AgentName;
  initiativeId: string;
  timestamp: string;
}
