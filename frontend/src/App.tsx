import React, { useState, useEffect } from 'react';
import { Play, ShieldAlert, Award, FileText, CheckCircle2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import AnimatedBackground from './AnimatedBackground';

interface Initiative {
  id: string;
  name: string;
  status: 'Planning' | 'Awaiting Approval' | 'Approved' | 'Rejected' | 'Executing' | 'Done';
  owner: string;
  created: string;
  summary: string;
}

interface Decision {
  id: string;
  title: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  requestedBy: string;
  amount: number;
  reasoningSummary: string;
  initiativeId: string;
  decidedBy?: string;
  decidedAt?: string;
}

export default function App() {
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [activeInitiativeId, setActiveInitiativeId] = useState<string | null>(null);
  const [parentPageId, setParentPageId] = useState<string>('');
  
  const [goal, setGoal] = useState('Launch a marketing campaign for our new feature, budget capped by company policy.');
  const [owner, setOwner] = useState('John Doe');
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch Parent Page ID configuration
  const fetchConfig = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/config');
      if (res.ok) {
        const data = await res.json();
        setParentPageId(data.parentPageId || '');
      }
    } catch (err) {
      console.error('Failed to fetch parent page ID:', err);
    }
  };

  // Poll backend for updates
  const fetchData = async () => {
    try {
      const initRes = await fetch('http://localhost:3000/api/initiatives');
      const decRes = await fetch('http://localhost:3000/api/decisions');
      
      if (!initRes.ok || !decRes.ok) {
        throw new Error('Server returned an error');
      }

      const initData = await initRes.json();
      const decData = await decRes.json();

      setInitiatives(initData);
      setDecisions(decData);
      
      // Auto-set the active initiative to the most recent one if not set
      if (initData.length > 0 && !activeInitiativeId) {
        setActiveInitiativeId(initData[0].id);
      }
      
      setError(null);
    } catch (err: any) {
      console.error('Failed to poll server:', err);
      setError('Could not connect to the orchestrator server. Make sure it is running.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [activeInitiativeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:3000/api/initiatives/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal, owner })
      });

      if (!response.ok) {
        throw new Error('Failed to trigger initiative');
      }

      const result = await response.json();
      setActiveInitiativeId(result.initiativeId);
      setGoal('');
      
      // Fetch fresh data immediately
      await fetchData();
    } catch (err: any) {
      setError(err.message || 'Server connection failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const activeInitiative = initiatives.find(i => i.id === activeInitiativeId);
  const activeDecisions = decisions.filter(d => d.initiativeId === activeInitiativeId);

  // Calculate Autonomy Metrics
  const totalDecisionsCount = decisions.length;
  const autoApprovedCount = decisions.filter(d => d.title.includes('(Auto-Approved)')).length;
  const autonomyRate = totalDecisionsCount > 0 ? Math.round((autoApprovedCount / totalDecisionsCount) * 100) : 0;
  const humanRequiredRate = 100 - autonomyRate;

  // Determine active node for visual timeline
  const getTimelineStep = (status: string | undefined): number => {
    if (!status) return 0;
    switch (status) {
      case 'Planning': return 1;
      case 'Awaiting Approval': return 2;
      case 'Approved':
      case 'Executing': return 3;
      case 'Done': return 4;
      default: return 0;
    }
  };

  const currentStep = getTimelineStep(activeInitiative?.status);

  return (
    <>
      <AnimatedBackground />
      <div className="dashboard-container">
      {/* Header */}
      <div className="header">
        <div className="header-title">
          <h1>AI-Native Enterprise OS</h1>
          <p>Multi-Agent Corporation Orchestrator Dashboard</p>
        </div>
        <button 
          className="notion-link-btn"
          onClick={() => {
            window.open(`https://notion.so/${parentPageId}`, '_blank');
          }}
          disabled={!parentPageId}
        >
          <FileText size={18} />
          Open Notion Workspace
        </button>
      </div>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid var(--accent-red)', padding: '1rem', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5' }}>
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="main-grid">
        {/* Left Column: Forms & State Controls */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Kickoff Form */}
          <div className="glass-card">
            <h2 className="card-title">
              <Play size={20} color="#3b82f6" />
              Launch New Initiative
            </h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Company Goal / Objective</label>
                <textarea 
                  className="form-textarea" 
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  placeholder="Enter goal for the company agents..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Initiator Name (Owner)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={owner}
                  onChange={(e) => setOwner(e.target.value)}
                  required
                />
              </div>
              <button className="submit-btn" type="submit" disabled={submitting}>
                <RefreshCw size={18} className={submitting ? 'spin' : ''} style={{ display: submitting ? 'inline' : 'none' }} />
                {submitting ? 'Triggering Agents...' : 'Kick Off Goal'}
              </button>
            </form>
          </div>

          {/* Autonomy Dashboard */}
          <div className="glass-card">
            <h2 className="card-title">
              <Award size={20} color="#10b981" />
              Adaptive Autonomy Engine
            </h2>
            <div className="autonomy-stats">
              <div className="autonomy-score-container">
                <div className="autonomy-circle" style={{ borderTopColor: autonomyRate > 0 ? 'var(--accent-green)' : 'var(--border-color)' }}>
                  <span className="autonomy-percent">{autonomyRate}%</span>
                  <span className="autonomy-label">Autonomous</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Auto-Approved Decisions</p>
              </div>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem' }}>Autonomy Analytics</h3>
                <div className="autonomy-history-list">
                  <div className="autonomy-history-item">
                    <span>Auto-Approved Decisions:</span>
                    <span className="success">{autoApprovedCount}</span>
                  </div>
                  <div className="autonomy-history-item">
                    <span>Human Approval Required:</span>
                    <span className="pending">{totalDecisionsCount - autoApprovedCount}</span>
                  </div>
                  <div className="autonomy-history-item">
                    <span>Total Decisions Tracked:</span>
                    <span style={{ fontWeight: 600 }}>{totalDecisionsCount}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: State View & Log */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Active Status & FSM Visualization */}
          {activeInitiative ? (
            <div className="glass-card">
              <h2 className="card-title">
                <CheckCircle2 size={20} color="#6366f1" />
                Active Initiative State Machine
              </h2>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{activeInitiative.name}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Owner: {activeInitiative.owner} | Started: {new Date(activeInitiative.created).toLocaleString()}
                </p>
              </div>

              {/* Steps Visualizer */}
              <div className="fsm-timeline">
                <div className={`fsm-node ${currentStep >= 1 ? (currentStep === 1 ? 'active' : 'completed') : ''}`}>
                  <div className="fsm-dot">1</div>
                  <span className="fsm-label">Marketing</span>
                </div>
                <div className={`fsm-node ${currentStep >= 2 ? (currentStep === 2 ? 'active' : 'completed') : ''}`}>
                  <div className="fsm-dot">2</div>
                  <span className="fsm-label">Finance</span>
                </div>
                <div className={`fsm-node ${currentStep >= 3 ? (currentStep === 3 ? 'active' : 'completed') : ''}`}>
                  <div className="fsm-dot">3</div>
                  <span className="fsm-label">Sign-off</span>
                </div>
                <div className={`fsm-node ${currentStep >= 4 ? (currentStep === 4 ? 'active' : 'completed') : ''}`}>
                  <div className="fsm-dot">4</div>
                  <span className="fsm-label">Fired</span>
                </div>
              </div>

              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(0, 0, 0, 0.2)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--accent-indigo)' }}>
                  State Rollup Summary:
                </span>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                  {activeInitiative.summary || 'Initial scheduling state...'}
                </p>
              </div>

              {/* Decision Cards */}
              {activeDecisions.length > 0 && (
                <div style={{ marginTop: '1.5rem' }}>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Decision Gates:</h4>
                  {activeDecisions.map((dec) => (
                    <div key={dec.id} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{dec.title}</span>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 600, 
                          padding: '0.2rem 0.5rem', 
                          borderRadius: '4px',
                          background: dec.status === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : dec.status === 'Pending' ? 'rgba(249, 115, 22, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: dec.status === 'Approved' ? '#34d399' : dec.status === 'Pending' ? '#f97316' : '#f87171'
                        }}>
                          {dec.status}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Justification: {dec.reasoningSummary}</p>
                      {dec.decidedBy && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          Decided By: {dec.decidedBy} at {new Date(dec.decidedAt!).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', flexDirection: 'column', color: 'var(--text-secondary)' }}>
              <AlertCircle size={40} style={{ marginBottom: '1rem' }} />
              <p>No active initiative. Submit a goal to see the FSM live.</p>
            </div>
          )}

          {/* Historical Initiatives */}
          <div className="glass-card">
            <h2 className="card-title">
              <FileText size={20} color="#a855f7" />
              Notion Initiatives Ledger
            </h2>
            <div className="log-list">
              {initiatives.map((init) => (
                <div 
                  key={init.id} 
                  onClick={() => setActiveInitiativeId(init.id)}
                  style={{ 
                    cursor: 'pointer', 
                    padding: '1rem', 
                    background: activeInitiativeId === init.id ? 'rgba(99, 102, 241, 0.1)' : 'rgba(0, 0, 0, 0.15)', 
                    border: '1px solid',
                    borderColor: activeInitiativeId === init.id ? 'var(--accent-indigo)' : 'var(--border-color)',
                    borderRadius: '8px', 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 600, fontSize: '0.95rem' }}>{init.name}</h4>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Owner: {init.owner} | {new Date(init.created).toLocaleDateString()}
                    </span>
                  </div>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    fontWeight: 600,
                    padding: '0.2rem 0.5rem',
                    borderRadius: '4px',
                    background: init.status === 'Done' ? 'rgba(16, 185, 129, 0.15)' : init.status === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(99, 102, 241, 0.15)',
                    color: init.status === 'Done' ? '#34d399' : init.status === 'Rejected' ? '#f87171' : '#818cf8'
                  }}>
                    {init.status}
                  </span>
                </div>
              ))}
              {initiatives.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No initiatives found in the Notion ledger.</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
