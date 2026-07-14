# 🏗️ CorpusAI: Comprehensive Master Technical Specification

This document is the complete, low-level technical specification blueprint for **CorpusAI** — the multi-agent autonomous enterprise operating system. It details the file structures, database schemas, LLM agent prompts, WebSocket messaging protocols, D3.js node graph physics, execution logs, and environment configurations.

---

## 📂 1. Directory Structure & File Map

### A. Backend Orchestrator (`/orchestrator`)
*   [`package.json`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/package.json): Manages Node backend dependencies (`express`, `ws`, `openai`, `octokit`, `@slack/web-api`, `@notionhq/client`, `ts-node`).
*   [`src/server.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/server.ts): Express HTTP API routes + WebSockets combined server. Manages clients, routes triggers, handles Notion webhooks, and serves fallback polling loops.
*   [`src/stateMachine.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/stateMachine.ts): Central Finite State Machine (`OrchestratorFSM`). Controls state transitions, handles agent tasks, processes approval checks, and executes GitHub/Slack integrations.
*   [`src/autonomy.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/autonomy.ts): Risk evaluator containing the `AdaptiveAutonomyEngine` which checks variance of budgets against past approvals.
*   [`src/checkEnv.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/checkEnv.ts): Verifies that all required `.env` keys exist before startup, failing fast to prevent run-time exceptions.
*   [`src/types.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/types.ts): TypeScript interface files defining models for `Initiative`, `Decision`, `AgentLogEntry`, `ActionEntry`, and FSM states.
*   [`src/notion/client.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/notion/client.ts): Database client wrapper interacting with Notion. Queries database states and formats records.
*   [`src/agents/marketingAgent.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/agents/marketingAgent.ts): LLM engine drafting marketing campaigns and budget proposals.
*   [`src/agents/financeAgent.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/agents/financeAgent.ts): LLM engine evaluating budget requests against Notion policy text.
*   [`src/agents/engineeringAgent.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/agents/engineeringAgent.ts): LLM engine translating approved plans into developer deliverables.
*   [`src/integrations/github.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/integrations/github.ts): Octokit adapter creating issues in repositories.
*   [`src/integrations/slack.ts`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/orchestrator/src/integrations/slack.ts): Slack bot client posting messages and fetching permalinks.

### B. Frontend Dashboard (`/frontend`)
*   [`package.json`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/frontend/package.json): Lists libraries (`react`, `vite`, `d3`, `recharts`, `lucide-react`, `tailwindcss`).
*   [`src/App.tsx`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/frontend/src/App.tsx): Dashboard application layout, state loops, forms, WebSocket event listeners, terminal, and negotiation chats.
*   [`src/components/LineageGraph.tsx`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/frontend/src/components/LineageGraph.tsx): Force-directed simulation network displaying dynamic, glowing data flows and agent status highlights.
*   [`src/components/AnalyticsPanel.tsx`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/frontend/src/components/AnalyticsPanel.tsx): Metrics panel mapping spending, risk profiles, and autonomy rates.
*   [`src/components/ThemeToggle.tsx`](file:///C:/Users/Yash/.gemini/antigravity/scratch/AI_Enterprise_OS/frontend/src/components/ThemeToggle.tsx): Controls light/dark CSS variables.

---

## 📓 2. Notion Database Property Mapping

The orchestrator reads and writes to four core databases. Below are the precise property configurations:

### A. Initiatives Database
*   `Name` (Title): The goal name.
*   `Status` (Select): `Planning` | `Awaiting Approval` | `Approved` | `Rejected` | `Executing` | `Done`.
*   `Owner` (Rich Text): Person driving the objective.
*   `Summary` (Rich Text): LLM-generated outline of the campaign.
*   `Created` (Date): Creation timestamp.

### B. Agent Log Database
*   `Summary` (Title): High-level description of the action.
*   `Agent` (Select): `Marketing` | `Finance` | `Engineering` | `Orchestrator`.
*   `EventType` (Select): `Request` | `Response` | `Disagreement` | `Resolution` | `Action` | `Error`.
*   `Reasoning` (Rich Text): Agent thoughts and LLM planning processes.
*   `Initiative ID` (Rich Text): Relational reference key to tie logs to initiatives.
*   `Timestamp` (Date): Entry creation timestamp.

### C. Decisions Database
*   `Title` (Title): The decision summary.
*   `Status` (Select): `Pending` | `Approved` | `Rejected`.
*   `Requested By` (Select): `Marketing` | `Finance`.
*   `Amount` (Number): Budget requested.
*   `Reasoning Summary` (Rich Text): Why the budget is necessary.
*   `Initiative ID` (Rich Text): Tying decision to main initiative.
*   `Decided By` (Rich Text): User signature (optional).
*   `Decided At` (Date): User approval timestamp.

### D. Actions Database
*   `Title` (Title): Description of the output.
*   `Tool` (Select): `GitHub` | `Slack` | `Calendar` | `Email`.
*   `Link` (URL): Real link (e.g. issue URL, Slack message permalink).
*   `Performed By` (Select): `Engineering` | `Marketing` | `Finance`.
*   `Initiative ID` (Rich Text): Relational context linking back to the goal.

---

## 🤖 3. AI Agent Prompts & JSON Schema Specification

Agents utilize `meta/llama-3.1-70b-instruct` on the NVIDIA NIM network, enforcing strict JSON structures (`response_format: { type: "json_object" }`).

### 📢 A. Marketing Agent

#### 1. Plan Drafting
*   **System Prompt:** `You are a professional marketing director. You always respond in raw JSON matching the requested schema.`
*   **User Prompt:**
    ```
    You are the Marketing Lead for our AI-Native company.
    Your goal is: "{goal}"

    You need to draft a short campaign plan and request a budget.
    Please keep the plan concise (2-3 sentences max) as it will be shown to a human.
    Your budget should be realistic but compliant with company policy if possible.

    You MUST respond with a valid JSON object matching this schema:
    {
      "campaignPlan": "Description of the campaign.",
      "budgetRequest": {
        "amount": 8000,
        "justification": "Detailed explanation of why this budget is needed."
      }
    }
    ```

#### 2. Negotiation Loop
*   **System Prompt:** `You are a pragmatic marketing lead. You negotiate budget and always respond in raw JSON.`
*   **User Prompt:**
    ```
    You are the Marketing Lead. You requested a budget of ${originalProposal.amount} for the goal "{goal}".
    Finance has countered with a lower budget of ${financeCounterAmount} with the following reason:
    "{financeReason}"

    You must decide whether to:
    1. Accept the counter-offer.
    2. Revise your budget request and propose a new number (between the counter-offer and your original request) with stronger justification.

    You MUST respond with a valid JSON object matching this schema:
    {
      "action": "accept" | "revise",
      "revisedBudget": {
        "amount": 6000, // Required ONLY if action is "revise"
        "justification": "Why this revised budget is critical and cannot be lower."
      },
      "justification": "Justification for your decision."
    }
    ```

### 💸 B. Finance Agent

#### Budget Policy Evaluation
*   **System Prompt:** `You are a strict, policy-enforcing finance director. You always respond in raw JSON.`
*   **User Prompt:**
    ```
    You are the Finance Lead for our company. You enforce budget policy stringently.
    Here is the current corporate budget policy:
    ====================
    {policyDoc}
    ====================

    A request has been submitted for budget:
    - Requested Amount: ${requestedAmount}
    - Justification: "{justification}"

    Evaluate this request.
    - If it is under $5,000, you should 'approve' it.
    - If it is between $5,000 and $10,000, it is a soft threshold and requires a strong, solid justification.
      - If the justification is reasonable, you may 'approve'.
      - If the justification seems weak, you should 'counter' with a lower amount (typically $5,000) and explain why.
    - If it is over $10,000, it is a hard threshold. You must 'reject' or 'counter' with a maximum of $5,000.

    You MUST respond with a valid JSON object matching this schema:
    {
      "decision": "approve" | "reject" | "counter",
      "counterAmount": 5000, // Include ONLY if decision is "counter"
      "reason": "A one-sentence policy-based explanation of your decision."
    }
    ```

### 🛠️ C. Engineering Agent

#### Technical Ticket Formulation
*   **System Prompt:** `You are an engineering manager. You always respond in raw JSON.`
*   **User Prompt:**
    ```
    You are the Engineering Lead. A marketing initiative has been approved:
    - Campaign Plan: "{campaignPlan}"
    - Approved Budget: ${approvedBudget}
    - Campaign Justification: "{justification}"

    You must create a GitHub issue spec describing the technical deliverable (landing page, tracking, database integration) needed to support this campaign.
    Include clear acceptance criteria.

    You MUST respond with a valid JSON object matching this schema:
    {
      "title": "A concise GitHub issue title (e.g. [FE] Build landing page for X campaign)",
      "body": "Markdown formatted description containing details, tasks, and acceptance criteria."
    }
    ```

---

## 🔌 4. WebSocket Communication Protocol

Real-time browser synchronization is driven by JSON payloads pushed over the shared WebSockets tunnel.

### A. Server Greeting (On Connection Open)
```json
{
  "type": "welcome",
  "message": "Connected to FSM updates"
}
```

### B. Live Tick FSM Update (State Transition / Event)
```json
{
  "type": "fsm-update",
  "initiativeId": "5db172f3-18ef-417b-944c-9f681a812e9b",
  "state": "BUDGET_REQUESTED",
  "eventType": "log",
  "log": {
    "id": "9ac18e24-ff52-47d3-b258-3d1f9a2d3e14",
    "timestamp": "2026-07-14T05:31:19.450Z",
    "agent": "Marketing",
    "eventType": "Response",
    "summary": "Proposed campaign plan with budget $7500",
    "reasoning": "We need this budget to secure ad placements during prime traffic slots.",
    "initiativeId": "5db172f3-18ef-417b-944c-9f681a812e9b"
  }
}
```

---

## 🕸️ 5. D3.js Network Layout & Math

The lineage map in `LineageGraph.tsx` utilizes **D3-Force** algorithms to dynamic layout positions:

### Force Parameters
1.  **Link Distance:** `d3.forceLink(d3Links).id((d: any) => d.id).distance(180)` - node connectors pull together but lock at 180px distance.
2.  **Charge (Many-Body):** `d3.forceManyBody().strength(-350)` - nodes repel one another to maximize graph spread.
3.  **Center:** `d3.forceCenter(width / 2, height / 2)` - pulls the gravity center to the canvas middle.
4.  **Collision Prevention:** `d3.forceCollide().radius(50)` - locks node boundaries to prevent overlaps.

### Particle Flow Interpolation
Glowing data flows are animated by calculating relative coordinates between connection nodes on every frame tick:

$$\text{cx} = x_{\text{source}} + t \times (x_{\text{target}} - x_{\text{source}})$$

$$\text{cy} = y_{\text{source}} + t \times (y_{\text{target}} - y_{\text{source}})$$

Where $t \in [0, 1)$ incremented at a rate of $0.006$ per frame tick. When $t$ crosses $1.0$, it modulus loops back to $0$ to create a continuous stream.

---

## 📋 6. Full Operational Execution Trace (Mock Log)

When a goal is kicked off, the server registers the following debug sequence:

```text
[HTTP] Received trigger request for goal: "Launch Q3 B2B Campaign"
[FSM] [Initiative: 5db] Transitions to: GOAL_RECEIVED
[FSM] [Initiative: 5db] Transitions to: MARKETING_DRAFTING
[Marketing Agent] Generating campaign plan...
[Marketing Agent] Proposed $7500 for paid LinkedIn acquisition campaign.
[FSM] [Initiative: 5db] Transitions to: BUDGET_REQUESTED
[FSM] [Initiative: 5db] Transitions to: FINANCE_REVIEWING
[Finance Agent] Fetching corporate policy page from Notion...
[Finance Agent] Policy read: $5000 soft threshold limit.
[Finance Agent] Budget $7500 exceeds policy threshold. Countering with $5000.
[FSM] [Initiative: 5db] Transitions to: NEGOTIATION
[Marketing Agent] Negotiating counter proposal of $5000.
[Marketing Agent] Submitting concession budget of $6250.
[Finance Agent] Evaluating negotiation revised amount $6250.
[Finance Agent] Amount still exceeds policy threshold. Decision: Escalate to human.
[Autonomy Engine] Assessing risk for amount $6250 (Category: marketing)...
[Autonomy Engine] No matching approved decision found within 15% budget variance. Risk is Medium.
[FSM] [Initiative: 5db] Escapes to: AWAITING_HUMAN_APPROVAL. Paused.
[Notion Client] Created Decision Page in Decisions DB: ID 8a9b2c
[WS] Broadcast event 'fsm-update' -> AWAITING_HUMAN_APPROVAL
... (Human toggles status to "Approved" in Notion) ...
[Notion Poll] Polling database... Found Decision ID 8a9b2c status changed to: Approved
[FSM] [Initiative: 5db] Resuming. Transitions to: EXECUTING
[Engineering Agent] Creating issue specification for landing page development...
[GitHub Integration] Creating issue: "[FE] B2B Landing Page" in HSVM-exe/CorpusAI
[GitHub Integration] Issue created successfully. URL: https://github.com/HSVM-exe/CorpusAI/issues/12
[Slack Integration] Posting message to Slack channel C12345...
[Slack Integration] Announcement posted. Permalink: https://slack.com/archives/C12345/p16298129
[Notion Client] Writing external URLs to Actions DB...
[FSM] [Initiative: 5db] Transitions to: DONE. Lock released.
[WS] Broadcast event 'fsm-update' -> DONE
```

---

## 🔐 7. Environment Variables Reference Guide

The backend sanity checker validates these variables on bootstrap:

```ini
# --- AI Configuration ---
NVIDIA_API_KEY=nvapi-... # NVIDIA NIM authorization credentials

# --- Notion Workspace Identifiers ---
NOTION_ORCHESTRATOR_TOKEN=secret_... # Integration token for State Machine
NOTION_MARKETING_TOKEN=secret_...     # Integration token for Marketing Agent
NOTION_FINANCE_TOKEN=secret_...       # Integration token for Finance Agent
NOTION_ENGINEERING_TOKEN=secret_...   # Integration token for Engineering Agent

NOTION_PARENT_PAGE_ID=... # ID of root Workspace parent page
NOTION_INITIATIVES_DB_ID=... # Database ID for Initiatives
NOTION_AGENTLOG_DB_ID=... # Database ID for logs
NOTION_DECISIONS_DB_ID=... # Database ID for approvals
NOTION_ACTIONS_DB_ID=... # Database ID for external links
NOTION_POLICY_PAGE_ID=... # Standalone document page ID containing policies

# --- External Service API Integrations ---
GITHUB_TOKEN=ghp_... # Personal Access Token with repo scope
GITHUB_REPO=HSVM-exe/CorpusAI # Targeted Github Repository path

SLACK_BOT_TOKEN=xoxb-... # Slack app authorization token
SLACK_CHANNEL_ID=C... # Targeted channel ID for announcements

# --- Network Configuration ---
PORT=3000 # Server port (Express API & WebSockets share this port)
WEBHOOK_SHARED_SECRET=... # Secret string to validate Notion webhooks
```
