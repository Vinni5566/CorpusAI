import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.join(__dirname, '../orchestrator/.env') });

const token = process.env.NOTION_ORCHESTRATOR_TOKEN as string;
const initId = '39af7639-1945-815b-af3f-d1a85401bbc6';

const notion = new Client({ auth: token });

async function approveNotionDecision() {
  console.log(`Searching for pending decisions linked to Initiative: ${initId}...`);
  try {
    const dbId = process.env.NOTION_DECISIONS_DB_ID!;
    const response = await notion.databases.query({
      database_id: dbId,
      filter: {
        and: [
          {
            property: 'Initiative',
            relation: {
              contains: initId
            }
          },
          {
            property: 'Status',
            select: {
              equals: 'Pending'
            }
          }
        ]
      }
    });

    if (response.results.length === 0) {
      console.log('No pending decisions found.');
      return;
    }

    const decisionPage = response.results[0];
    console.log(`Found pending decision page: ${decisionPage.id}. Approving it...`);

    await notion.pages.update({
      page_id: decisionPage.id,
      properties: {
        Status: {
          select: {
            name: 'Approved'
          }
        },
        'Decided By': {
          rich_text: [{ text: { content: 'Human (Demo Auditor)' } }]
        },
        'Decided At': {
          date: { start: new Date().toISOString() }
        }
      }
    });

    console.log('\x1b[32m✔ Decision successfully approved in Notion!\x1b[0m');
    console.log('The orchestrator backend polling fallback will detect this and resume FSM within 15 seconds.');

  } catch (error) {
    console.error('Approve failed:', error);
  }
}

approveNotionDecision();
