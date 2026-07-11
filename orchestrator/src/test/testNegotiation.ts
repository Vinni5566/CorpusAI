import * as dotenv from 'dotenv';
import * as path from 'path';
import { MarketingAgent } from '../agents/marketingAgent';
import { FinanceAgent } from '../agents/financeAgent';

// Load .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

const goal = 'Launch a marketing campaign for our new feature, budget capped by company policy.';
const mockPolicy = `
Company Budget Policy:
- Under $5,000: Auto-approved.
- $5,000 to $10,000: Soft threshold. Requires valid justification. Finance will counter-offer $5,000 if not justified.
- Over $10,000: Hard limit. Auto-reject immediately.
`;

async function runTest() {
  console.log('==================================================');
  console.log('STARTING LLM RELIABILITY DE-RISKING TEST (10 RUNS)');
  console.log('==================================================');

  if (!process.env.NVIDIA_API_KEY) {
    console.error('[ERROR] NVIDIA_API_KEY is not set in .env');
    process.exit(1);
  }

  const marketing = new MarketingAgent();
  const finance = new FinanceAgent();

  let successfulRuns = 0;
  const totalRuns = 10;
  const failures: Array<{ run: number; step: string; error: string }> = [];

  for (let i = 1; i <= totalRuns; i++) {
    console.log(`\n--- Run ${i}/${totalRuns} ---`);
    let runFailed = false;
    let step = 'Marketing Drafting';

    try {
      // Step 1: Marketing draft
      console.log(' [1] Marketing drafting campaign...');
      const draft = await marketing.draftCampaign(goal);
      console.log(`     Marketing requested: $${draft.budgetRequest.amount}`);

      // Step 2: Finance evaluate
      step = 'Finance Evaluation';
      console.log(' [2] Finance evaluating budget...');
      const evaluation = await finance.evaluateBudget(
        draft.budgetRequest.amount,
        draft.budgetRequest.justification,
        mockPolicy
      );
      console.log(`     Finance decision: ${evaluation.decision} (Counter: $${evaluation.counterAmount || 'N/A'})`);

      // Step 3: Negotiation (if countered)
      if (evaluation.decision === 'counter' && evaluation.counterAmount) {
        step = 'Marketing Negotiation';
        console.log(' [3] Marketing negotiating...');
        const neg = await marketing.negotiateBudget(
          goal,
          draft,
          evaluation.counterAmount,
          evaluation.reason
        );
        console.log(`     Marketing negotiation action: ${neg.action} (Revised: $${neg.revisedBudget?.amount || 'N/A'})`);
      }

      successfulRuns++;
      console.log(`\x1b[32m✔ Run ${i} completed successfully with valid JSON outputs.\x1b[0m`);
    } catch (err: any) {
      runFailed = true;
      console.error(`\x1b[31m✘ Run ${i} failed at step [${step}]: ${err.message}\x1b[0m`);
      failures.push({
        run: i,
        step,
        error: err.message
      });
    }
  }

  const successRate = (successfulRuns / totalRuns) * 100;
  console.log('\n==================================================');
  console.log('TEST SUMMARY');
  console.log('==================================================');
  console.log(`Total Runs:    ${totalRuns}`);
  console.log(`Successful:    ${successfulRuns}`);
  console.log(`Failed:        ${failures.length}`);
  console.log(`Success Rate:  ${successRate}%`);

  if (successRate < 90) {
    console.error('\n\x1b[31m[CRITICAL FAILURE] LLM Reliability falls below the required 90% threshold!\x1b[0m');
    console.error('Failure Details:');
    failures.forEach(f => {
      console.error(` - Run ${f.run} at step [${f.step}]: ${f.error}`);
    });
    console.error('\nStopping execution. Please resolve the reliability before continuing.');
    process.exit(1);
  } else {
    console.log('\n\x1b[32m[PASS] LLM Reliability meets the 90%+ success criteria!\x1b[0m');
    process.exit(0);
  }
}

runTest();
