import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../orchestrator/.env') });

const token = process.env.NOTION_ORCHESTRATOR_TOKEN as string;
const initId = '39af7639-1945-81a3-af9c-f50052725929';

const notion = new Client({ auth: token });

async function verifyNotionRun() {
  console.log(`==================================================`);
  console.log(`VERIFYING NOTION RUN FOR INITIATIVE: ${initId}`);
  console.log(`==================================================`);

  try {
    // 1. Fetch Initiative
    const initiative = await notion.pages.retrieve({ page_id: initId });
    const props = (initiative as any).properties;
    const name = props.Name.title.map((t: any) => t.plain_text).join('');
    const status = props.Status.select.name;
    const owner = props['Owner (Human)'].rich_text.map((t: any) => t.plain_text).join('');
    const summary = props.Summary.rich_text.map((t: any) => t.plain_text).join('');

    console.log(`Initiative Details:`);
    console.log(`- Goal/Name: "${name}"`);
    console.log(`- Status:    \x1b[36m${status}\x1b[0m`);
    console.log(`- Owner:     ${owner}`);
    console.log(`- Summary:   ${summary}`);
    console.log(`--------------------------------------------------`);

    // 2. Fetch Agent Log Entries
    console.log(`Agent Logs written to Notion:`);
    const logsResponse = await notion.databases.query({
      database_id: process.env.NOTION_AGENTLOG_DB_ID!,
      filter: {
        property: 'Initiative',
        relation: {
          contains: initId
        }
      }
    });

    const logs = logsResponse.results.map((page: any) => {
      const p = page.properties;
      return {
        timestamp: p.Timestamp?.created_time || page.created_time,
        agent: p.Agent.select.name,
        type: p['Event Type'].select.name,
        summary: p.Summary.title.map((t: any) => t.plain_text).join(''),
        reasoning: p.Reasoning.rich_text.map((t: any) => t.plain_text).join('')
      };
    });

    // Sort by timestamp
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    logs.forEach((log, idx) => {
      console.log(`[Log ${idx + 1}] Agent: \x1b[35m${log.agent}\x1b[0m | Event: \x1b[33m${log.type}\x1b[0m`);
      console.log(`  Summary:   "${log.summary}"`);
      console.log(`  Reasoning: ${log.reasoning.substring(0, 150)}...`);
      console.log();
    });
    console.log(`--------------------------------------------------`);

    // 3. Fetch Decisions
    console.log(`Decisions created in Notion:`);
    const decResponse = await notion.databases.query({
      database_id: process.env.NOTION_DECISIONS_DB_ID!,
      filter: {
        property: 'Initiative',
        relation: {
          contains: initId
        }
      }
    });

    decResponse.results.forEach((page: any) => {
      const p = page.properties;
      const title = p.Title.title.map((t: any) => t.plain_text).join('');
      const status = p.Status.select.name;
      const amount = p.Amount.number;
      const requestedBy = p['Requested By'].select.name;
      const reasoning = p['Reasoning Summary'].rich_text.map((t: any) => t.plain_text).join('');
      console.log(`- Title:        "${title}"`);
      console.log(`  Status:       \x1b[32m${status}\x1b[0m`);
      console.log(`  Amount:       $${amount}`);
      console.log(`  Requested By: ${requestedBy}`);
      console.log(`  Reasoning:    ${reasoning}`);
    });
    console.log(`==================================================`);

  } catch (error) {
    console.error('Verification failed:', error);
  }
}

verifyNotionRun();
