# Notion Setup Guide

This folder contains a script to bootstrap the required databases and pages in your Notion workspace.

## Prerequisites

1. Create a blank page in your Notion workspace (e.g. named "AI-Native OS Home").
2. Go to [Notion Developers](https://www.notion.so/my-integrations) and create an integration.
   - For a full production-like access control demo, you can create up to 4 integrations (Orchestrator, Marketing, Finance, Engineering) and get their respective integration tokens.
   - For simple development, you can use a single integration token for all 4.
3. Share the parent page you created in Step 1 with your integration(s) (click the `...` menu on the top right -> Connections -> Add connection -> select your integration).
4. Copy the Page ID of the parent page from its URL:
   - For a URL like `https://www.notion.so/my-workspace/My-Page-Title-a1b2c3d4e5f6g7h8i9j0`, the ID is `a1b2c3d4e5f6g7h8i9j0` (32 characters).
5. Copy `orchestrator/.env.example` to `orchestrator/.env` and populate:
   - `NOTION_ORCHESTRATOR_TOKEN`
   - `NOTION_PARENT_PAGE_ID`

## Running the Setup

To run the database setup, execute the following from the `orchestrator` directory:

```bash
npm install
npx ts-node ../notion-setup/setup.ts
```

The script will automatically create:
- **Decisions** Database
- **Actions** Database
- **Initiatives** Database
- **Agent Log** Database
- **Company Budget Policy** Page

It will also automatically append/update these database IDs inside your `orchestrator/.env` file.
