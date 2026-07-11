import { WebClient } from '@slack/web-api';

/**
 * Posts a message to Slack using the WebClient and returns the permalink of the posted message.
 */
export async function postSlackMessage(message: string): Promise<string> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_CHANNEL_ID;

  if (!token || !channel) {
    throw new Error('SLACK_BOT_TOKEN or SLACK_CHANNEL_ID environment variables are missing.');
  }

  console.log(`[Slack Integration] Posting message to channel ${channel}...`);

  // Fallback for placeholder token during dev/testing
  if (token.startsWith('xoxb-placeholder')) {
    console.log('[Slack Integration] Using dummy token fallback for development.');
    return `https://slack.com/archives/${channel}/p1234567890dummy`;
  }

  const web = new WebClient(token);

  const response = await web.chat.postMessage({
    channel,
    text: message
  });

  if (!response.ok) {
    throw new Error(`Slack postMessage API failed: ${response.error}`);
  }

  try {
    const permalinkRes = await web.chat.getPermalink({
      channel,
      message_ts: response.ts as string
    });
    return permalinkRes.permalink || `https://slack.com/archives/${channel}/p${response.ts}`;
  } catch (error) {
    console.warn('[Slack Integration] Failed to fetch permalink, returning direct fallback URL:', error);
    return `https://slack.com/archives/${channel}/p${response.ts}`;
  }
}
