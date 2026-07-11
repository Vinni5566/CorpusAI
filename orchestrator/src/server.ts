import express from 'express';
import cors from 'cors';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { checkEnv } from './checkEnv';
import { NotionClientWrapper } from './notion/client';
import { OrchestratorFSM, processingInitiatives } from './stateMachine';

// Load .env
dotenv.config({ path: path.join(__dirname, '../.env') });

// Run environment sanity check (fail fast if variables are missing)
checkEnv('server');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const notion = new NotionClientWrapper();
const fsm = new OrchestratorFSM();

/**
 * GET /api/config
 * Fetch environment configuration for the frontend dashboard.
 */
app.get('/api/config', (req, res) => {
  return res.status(200).json({
    parentPageId: process.env.NOTION_PARENT_PAGE_ID || ''
  });
});

/**
 * GET /api/initiatives
 * Fetch all initiatives from Notion.
 */
app.get('/api/initiatives', async (req, res) => {
  try {
    const list = await notion.getAllInitiatives();
    return res.status(200).json(list);
  } catch (error: any) {
    console.error('[Server] Failed to get initiatives:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/decisions
 * Fetch all decisions from Notion.
 */
app.get('/api/decisions', async (req, res) => {
  try {
    const list = await notion.getAllDecisions();
    return res.status(200).json(list);
  } catch (error: any) {
    console.error('[Server] Failed to get decisions:', error);
    return res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to trigger a new initiative goal.
 * Request body: { goal: string, owner: string }
 */
app.post('/api/initiatives/trigger', async (req, res) => {
  const { goal, owner } = req.body;

  if (!goal || !owner) {
    return res.status(400).json({ error: 'Missing required fields: goal, owner' });
  }

  try {
    console.log(`[Server] Creating new Initiative for goal: "${goal}"`);
    const initiative = await notion.createInitiative(goal, owner, `Setting up goal: ${goal}`);
    
    // Run FSM in background asynchronously
    fsm.run(initiative.id, goal).catch(err => {
      console.error('[Server] Background FSM execution error:', err);
    });

    return res.status(200).json({
      success: true,
      message: 'Initiative successfully created & state machine triggered',
      initiativeId: initiative.id
    });
  } catch (error: any) {
    console.error('[Server Error] Triggering initiative failed:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * Endpoint for Notion Webhooks (e.g. via Pipedream, Zapier, or native webhooks).
 * Resumes the FSM when a decision changes state.
 */
app.post('/webhooks/notion', async (req, res) => {
  const signature = req.headers['x-notion-signature'] || req.query.secret;
  const expectedSecret = process.env.WEBHOOK_SHARED_SECRET;

  // 1. Webhook security check
  if (!expectedSecret || signature !== expectedSecret) {
    console.warn('[Security Warn] Webhook signature verification failed.');
    
    // Log the spoofing attempt to the Agent Log as an Error
    try {
      await notion.createAgentLog('orchestrator', {
        agent: 'Orchestrator',
        eventType: 'Error',
        summary: 'Unauthorized webhook attempt blocked',
        reasoning: `Received a request on /webhooks/notion with signature: "${signature}". This did not match the expected secret.`,
        initiativeId: process.env.NOTION_INITIATIVES_DB_ID || '' // Root fallback ID or blank
      });
    } catch (logErr) {
      console.error('[Server] Could not write security warning to Notion:', logErr);
    }

    return res.status(401).json({ error: 'Unauthorized: Webhook signature verification failed.' });
  }

  const { decisionId, status } = req.body;
  if (!decisionId || !status) {
    return res.status(400).json({ error: 'Missing decisionId or status in payload' });
  }

  try {
    console.log(`[Webhook] Received update for Decision ${decisionId}: status -> ${status}`);
    const decision = await notion.getDecision(decisionId);
    
    if (decision.initiativeId) {
      // Trigger the FSM to resume
      fsm.run(decision.initiativeId).catch(err => {
        console.error('[Webhook] Background FSM resume error:', err);
      });
    }

    return res.status(200).json({ success: true, message: 'FSM signaled' });
  } catch (error: any) {
    console.error('[Webhook Error] Processing webhook failed:', error);
    return res.status(500).json({ error: error.message });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`\x1b[32m✔ AI-Native Enterprise OS Orchestrator listening on port ${port}\x1b[0m`);
  
  // Start the background polling fallback
  startPollingFallback();
});

/**
 * Fallback polling mechanism: polls the Decisions database every 15 seconds to check if
 * human approvals have changed, resuming the FSM without requiring webhooks.
 */
function startPollingFallback() {
  console.log('[Polling Fallback] Starting background DB scanner (checks every 15s)...');
  
  setInterval(async () => {
    try {
      // Get all pending decisions in Notion
      const pendingDecisions = await notion.getPendingDecisions();
      
      // If we poll and see a decision is NO LONGER pending in our DB but we find approved/rejected,
      // wait: getPendingDecisions() filters by Status = 'Pending'.
      // To see if any decision was APPROVED or REJECTED recently, we query recently updated decisions.
      // But wait! If we query recently approved decisions, how do we know if we already processed them?
      // In a real system, the FSM state changes the initiative status.
      // If initiative status is 'Awaiting Approval' and we find an approved decision linked to it, we resume!
      // Let's implement this logic:
      const recentApproved = await notion.getRecentApprovedDecisions();
      
      for (const decision of recentApproved) {
        if (!decision.initiativeId) continue;
        
        const cleanInitId = decision.initiativeId.replace(/-/g, '').toLowerCase();
        
        // De-duplicate check: if it's currently running in FSM, don't run it again
        if (processingInitiatives.has(cleanInitId)) {
          continue;
        }

        // Retrieve initiative details to see if it is still stuck in Awaiting Approval
        const initiative = await notion.getInitiative(decision.initiativeId);
        if (initiative.status === 'Awaiting Approval') {
          console.log(`[Polling Fallback] Found approved decision for initiative ${initiative.id}. Resuming FSM...`);
          // Resume the FSM!
          fsm.run(initiative.id).catch(err => {
            console.error('[Polling Fallback] FSM execution failed:', err);
          });
        }
      }
    } catch (error) {
      console.error('[Polling Fallback Error] Scanning Decisions database failed:', error);
    }
  }, 15000);
}
