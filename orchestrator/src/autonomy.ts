import { NotionClientWrapper } from './notion/client';

export interface RiskAssessment {
  risk: 'Low' | 'Medium' | 'High';
  reason: string;
}

export class AdaptiveAutonomyEngine {
  private notion: NotionClientWrapper;

  constructor(notion: NotionClientWrapper) {
    this.notion = notion;
  }

  /**
   * Assesses the risk of a new decision based on historical approvals.
   * If a similar approved decision is found (within 15% amount variance),
   * the risk is Low, allowing auto-approval.
   */
  async assessRisk(amount: number, category: string): Promise<RiskAssessment> {
    console.log(`[Autonomy Engine] Assessing risk for amount $${amount} (Category: ${category})...`);

    try {
      // Query recently approved decisions
      const approvedDecisions = await this.notion.getRecentApprovedDecisions();
      console.log(`[Autonomy Engine] Found ${approvedDecisions.length} historical approved decisions to evaluate.`);

      if (approvedDecisions.length === 0) {
        return {
          risk: 'High',
          reason: 'No historical approved decisions exist yet.'
        };
      }

      // Check for a match within 15% budget variance
      for (const dec of approvedDecisions) {
        const histAmount = dec.amount;
        const variance = Math.abs(histAmount - amount) / histAmount;

        if (variance <= 0.15) {
          const percentage = (variance * 100).toFixed(1);
          const reason = `Auto-approved under established policy. Matches approved decision "${dec.title}" ($${histAmount}) within ${percentage}% variance (threshold is 15%).`;
          
          console.log(`[Autonomy Engine] Match found! ${reason}`);
          return {
            risk: 'Low',
            reason
          };
        }
      }

      return {
        risk: 'Medium',
        reason: `No matching approved decision found within 15% budget variance of $${amount}.`
      };

    } catch (error) {
      console.error('[Autonomy Engine] Failed to assess risk, defaulting to High risk:', error);
      return {
        risk: 'High',
        reason: `Autonomy engine assessment error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
