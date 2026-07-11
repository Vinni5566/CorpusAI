import { Client } from '@notionhq/client';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load .env from the orchestrator directory
const envPath = path.join(__dirname, '../orchestrator/.env');
const envExamplePath = path.join(__dirname, '../orchestrator/.env.example');

dotenv.config({ path: envPath });

const token = process.env.NOTION_ORCHESTRATOR_TOKEN as string;
const parentPageId = process.env.NOTION_PARENT_PAGE_ID as string;

if (!token || !parentPageId) {
  console.error('\x1b[31m[ERROR] Setup failed: NOTION_ORCHESTRATOR_TOKEN and NOTION_PARENT_PAGE_ID must be set in your orchestrator/.env file.\x1b[0m');
  process.exit(1);
}

const notion = new Client({ auth: token });

async function createDatabases() {
  try {
    console.log('Connecting to Notion and starting database creation...');

    // 1. Create Decisions Database
    console.log('Creating Decisions Database...');
    const decisionsDb = await notion.databases.create({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Decisions' } }],
      properties: {
        Title: { title: {} },
        Status: {
          select: {
            options: [
              { name: 'Pending', color: 'orange' },
              { name: 'Approved', color: 'green' },
              { name: 'Rejected', color: 'red' }
            ]
          }
        },
        'Requested By': {
          select: {
            options: [
              { name: 'Marketing', color: 'blue' },
              { name: 'Finance', color: 'green' },
              { name: 'Engineering', color: 'purple' },
              { name: 'Orchestrator', color: 'gray' }
            ]
          }
        },
        Amount: { number: { format: 'number' } },
        'Reasoning Summary': { rich_text: {} },
        'Decided By': { rich_text: {} },
        'Decided At': { date: {} }
      }
    });
    console.log(`\x1b[32m✔ Decisions Database created: ${decisionsDb.id}\x1b[0m`);

    // 2. Create Actions Database
    console.log('Creating Actions Database...');
    const actionsDb = await notion.databases.create({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Actions' } }],
      properties: {
        Title: { title: {} },
        Tool: {
          select: {
            options: [
              { name: 'GitHub', color: 'default' },
              { name: 'Slack', color: 'purple' },
              { name: 'Calendar', color: 'blue' },
              { name: 'Email', color: 'orange' }
            ]
          }
        },
        Link: { url: {} },
        'Performed By': {
          select: {
            options: [
              { name: 'Marketing', color: 'blue' },
              { name: 'Finance', color: 'green' },
              { name: 'Engineering', color: 'purple' },
              { name: 'Orchestrator', color: 'gray' }
            ]
          }
        },
        Timestamp: { date: {} }
      }
    });
    console.log(`\x1b[32m✔ Actions Database created: ${actionsDb.id}\x1b[0m`);

    // 3. Create Initiatives Database
    console.log('Creating Initiatives Database...');
    const initiativesDb = await notion.databases.create({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Initiatives' } }],
      properties: {
        Name: { title: {} },
        Status: {
          select: {
            options: [
              { name: 'Planning', color: 'blue' },
              { name: 'Awaiting Approval', color: 'orange' },
              { name: 'Approved', color: 'green' },
              { name: 'Rejected', color: 'red' },
              { name: 'Executing', color: 'purple' },
              { name: 'Done', color: 'gray' }
            ]
          }
        },
        'Owner (Human)': { rich_text: {} },
        Created: { created_time: {} },
        Summary: { rich_text: {} },
        'Linked Decisions': {
          relation: {
            database_id: decisionsDb.id,
            type: 'dual_property',
            dual_property: {
              synced_property_name: 'Initiative'
            }
          }
        } as any,
        'Linked Actions': {
          relation: {
            database_id: actionsDb.id,
            type: 'dual_property',
            dual_property: {
              synced_property_name: 'Initiative'
            }
          }
        } as any
      }
    });
    console.log(`\x1b[32m✔ Initiatives Database created: ${initiativesDb.id}\x1b[0m`);

    // 4. Create Agent Log Database
    console.log('Creating Agent Log Database...');
    const agentLogDb = await notion.databases.create({
      parent: { type: 'page_id', page_id: parentPageId },
      title: [{ type: 'text', text: { content: 'Agent Log' } }],
      properties: {
        Summary: { title: {} }, // Primary Key/Title field representing the Event
        Timestamp: { created_time: {} },
        Agent: {
          select: {
            options: [
              { name: 'Marketing', color: 'blue' },
              { name: 'Finance', color: 'green' },
              { name: 'Engineering', color: 'purple' },
              { name: 'Orchestrator', color: 'gray' }
            ]
          }
        },
        'Event Type': {
          select: {
            options: [
              { name: 'Request', color: 'blue' },
              { name: 'Response', color: 'green' },
              { name: 'Disagreement', color: 'orange' },
              { name: 'Resolution', color: 'purple' },
              { name: 'Action', color: 'gray' },
              { name: 'Error', color: 'red' }
            ]
          }
        },
        Reasoning: { rich_text: {} },
        Initiative: {
          relation: {
            database_id: initiativesDb.id,
            type: 'dual_property',
            dual_property: {
              synced_property_name: 'Agent Logs'
            }
          }
        } as any
      }
    });
    console.log(`\x1b[32m✔ Agent Log Database created: ${agentLogDb.id}\x1b[0m`);

    // 5. Create Company Budget Policy Page
    console.log('Creating Company Budget Policy Page...');
    const policyPage = await notion.pages.create({
      parent: { type: 'page_id', page_id: parentPageId },
      properties: {
        title: {
          title: [
            {
              text: {
                content: 'Company Budget Policy'
              }
            }
          ]
        }
      },
      children: [
        {
          object: 'block',
          type: 'heading_1',
          heading_1: {
            rich_text: [{ type: 'text', text: { content: 'Company Budget Policy' } }]
          }
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: 'This policy governs all marketing campaigns and operations budgets.' } }]
          }
        },
        {
          object: 'block',
          type: 'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: 'Threshold Rules' } }]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: 'Under $5,000: Auto-approved. No human sign-off needed.' } }]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: '$5,000 to $10,000: Soft threshold. Requires valid justification. Finance will counter-offer $5,000 if not justified.' } }]
          }
        },
        {
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: 'Over $10,000: Hard limit. Auto-reject immediately.' } }]
          }
        }
      ]
    });
    console.log(`\x1b[32m✔ Company Budget Policy page created: ${policyPage.id}\x1b[0m`);

    // 6. Write Database IDs to the .env file
    console.log('Writing Database IDs to .env file...');
    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    } else if (fs.existsSync(envExamplePath)) {
      envContent = fs.readFileSync(envExamplePath, 'utf8');
    }

    const updates = {
      NOTION_INITIATIVES_DB_ID: initiativesDb.id.replace(/-/g, ''),
      NOTION_AGENTLOG_DB_ID: agentLogDb.id.replace(/-/g, ''),
      NOTION_DECISIONS_DB_ID: decisionsDb.id.replace(/-/g, ''),
      NOTION_ACTIONS_DB_ID: actionsDb.id.replace(/-/g, ''),
      NOTION_POLICY_PAGE_ID: policyPage.id.replace(/-/g, '')
    };

    for (const [key, value] of Object.entries(updates)) {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        envContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(envPath, envContent, 'utf8');
    console.log(`\x1b[32m✔ Successfully updated .env file at ${envPath}!\x1b[0m`);
    console.log('\nGenerated Database Details:');
    console.log(`Initiatives DB ID: ${updates.NOTION_INITIATIVES_DB_ID}`);
    console.log(`Agent Log DB ID:   ${updates.NOTION_AGENTLOG_DB_ID}`);
    console.log(`Decisions DB ID:   ${updates.NOTION_DECISIONS_DB_ID}`);
    console.log(`Actions DB ID:     ${updates.NOTION_ACTIONS_DB_ID}`);
    console.log(`Policy Page ID:    ${updates.NOTION_POLICY_PAGE_ID}`);

  } catch (error: any) {
    console.error('\x1b[31m[ERROR] Database creation failed:\x1b[0m', error);
  }
}

createDatabases();
