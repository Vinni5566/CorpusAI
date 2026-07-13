import { OpenAI } from 'openai';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export interface EngineeringResponse {
  title: string;
  body: string;
}

export class EngineeringAgent {
  private openai: OpenAI;
  private model = 'meta/llama-3.1-70b-instruct';

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.NVIDIA_API_KEY,
      baseURL: 'https://integrate.api.nvidia.com/v1'
    });
  }

  /**
   * Generates a GitHub issue title and body for the approved campaign.
   */
  async planDeliverables(
    campaignPlan: string,
    approvedBudget: number,
    justification: string,
    retries = 3
  ): Promise<EngineeringResponse> {
    const prompt = `You are the Engineering Lead. A marketing initiative has been approved:
- Campaign Plan: "${campaignPlan}"
- Approved Budget: $${approvedBudget}
- Campaign Justification: "${justification}"

You must create a GitHub issue spec describing the technical deliverable (e.g., landing page, tracking setup, database integrations) needed to support this campaign.
Include clear acceptance criteria.

You MUST respond with a valid JSON object matching this schema:
{
  "title": "A concise GitHub issue title (e.g. [FE] Build landing page for X campaign)",
  "body": "Markdown formatted description containing details, tasks, and acceptance criteria."
}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await this.openai.chat.completions.create({
          model: this.model,
          messages: [
            { role: 'system', content: 'You are an engineering manager. You always respond in raw JSON.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.2
        });

        const jsonText = response.choices[0]?.message?.content || '{}';
        const data = JSON.parse(jsonText) as EngineeringResponse;

        // Simple validation
        if (typeof data.title === 'string' && typeof data.body === 'string') {
          return data;
        }
        throw new Error('JSON response did not match the expected EngineeringResponse schema');
      } catch (error: any) {
        console.warn(`[Engineering Agent] Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          throw new Error(`EngineeringAgent.planDeliverables failed after ${retries} attempts: ${error.message}`);
        }
        await delay(1000 * attempt);
      }
    }
    throw new Error('Unreachable state');
  }
}
