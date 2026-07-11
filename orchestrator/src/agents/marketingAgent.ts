import { OpenAI } from 'openai';

export interface CampaignProposal {
  campaignPlan: string;
  budgetRequest: {
    amount: number;
    justification: string;
  };
}

export interface MarketingNegotiationResponse {
  action: 'accept' | 'revise';
  revisedBudget?: {
    amount: number;
    justification: string;
  };
  justification: string;
}

export class MarketingAgent {
  private openai: OpenAI;
  private model = 'meta/llama-3.1-70b-instruct';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1'
    });
  }

  /**
   * Drafts a new campaign plan and initial budget request based on the company goal.
   */
  async draftCampaign(goal: string, retries = 3): Promise<CampaignProposal> {
    const prompt = `You are the Marketing Lead for our AI-Native company.
Your goal is: "${goal}"

You need to draft a short campaign plan and request a budget.
Please keep the plan concise (2-3 sentences max) as it will be shown to a human.
Your budget should be realistic but compliant with company policy if possible.

You MUST respond with a valid JSON object matching this schema:
{
  "campaignPlan": "A concise description of the marketing campaign.",
  "budgetRequest": {
    "amount": 8000, // The requested budget as a number
    "justification": "Detailed explanation of why this budget is needed."
  }
}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a professional marketing director. You always respond in raw JSON matching the requested schema.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        });

        const jsonText = response.choices[0]?.message?.content || '{}';
        const data = JSON.parse(jsonText) as CampaignProposal;

        // Simple validation
        if (typeof data.campaignPlan === 'string' && data.budgetRequest && typeof data.budgetRequest.amount === 'number') {
          return data;
        }
        throw new Error('JSON response did not match the expected CampaignProposal schema');
      } catch (error: any) {
        console.warn(`[Marketing Agent] Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          throw new Error(`MarketingAgent.draftCampaign failed after ${retries} attempts: ${error.message}`);
        }
      }
    }
    throw new Error('Unreachable state');
  }

  /**
   * Responds to a budget pushback/counter-offer from Finance.
   */
  async negotiateBudget(
    goal: string,
    originalProposal: CampaignProposal,
    financeCounterAmount: number,
    financeReason: string,
    retries = 3
  ): Promise<MarketingNegotiationResponse> {
    const prompt = `You are the Marketing Lead. You requested a budget of $${originalProposal.budgetRequest.amount} for the goal "${goal}".
Finance has countered with a lower budget of $${financeCounterAmount} with the following reason:
"${financeReason}"

You must decide whether to:
1. Accept the counter-offer.
2. Revise your budget request and propose a new number (between the counter-offer and your original request) with stronger justification.

You MUST respond with a valid JSON object matching this schema:
{
  "action": "accept" or "revise",
  "revisedBudget": {
    "amount": 6000, // Required ONLY if action is "revise"
    "justification": "Why this revised budget is critical and cannot be lower." // Required ONLY if action is "revise"
  },
  "justification": "Justification for your decision (e.g. accepting the limit, or explaining the revision)."
}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are a pragmatic marketing lead. You negotiate budget and always respond in raw JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        });

        const jsonText = response.choices[0]?.message?.content || '{}';
        const data = JSON.parse(jsonText) as MarketingNegotiationResponse;

        // Simple validation
        if (data.action === 'accept' || data.action === 'revise') {
          if (data.action === 'revise' && (!data.revisedBudget || typeof data.revisedBudget.amount !== 'number')) {
            throw new Error('Revised budget amount is missing or invalid.');
          }
          return data;
        }
        throw new Error('JSON response did not match the expected MarketingNegotiationResponse schema');
      } catch (error: any) {
        console.warn(`[Marketing Agent] Negotiation attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          throw new Error(`MarketingAgent.negotiateBudget failed after ${retries} attempts: ${error.message}`);
        }
      }
    }
    throw new Error('Unreachable state');
  }
}
