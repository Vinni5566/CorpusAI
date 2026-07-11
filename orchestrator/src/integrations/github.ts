import { Octokit } from 'octokit';

/**
 * Creates a real GitHub issue on the configured repository and returns the issue HTML URL.
 */
export async function createGitHubIssue(title: string, body: string): Promise<string> {
  const token = process.env.GITHUB_TOKEN;
  const repoString = process.env.GITHUB_REPO; // Expected format: owner/repo

  if (!token || !repoString) {
    throw new Error('GITHUB_TOKEN or GITHUB_REPO environment variables are missing.');
  }

  const [owner, repo] = repoString.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid GITHUB_REPO format: "${repoString}". Must be "owner/repo".`);
  }

  console.log(`[GitHub Integration] Creating issue: "${title}" in ${owner}/${repo}...`);

  // Fallback for placeholder token during dev/testing
  if (token.startsWith('ghp_placeholder')) {
    console.log('[GitHub Integration] Using dummy token fallback for development.');
    return `https://github.com/dummy-workspace/dummy-repo/issues/mock-issue-url`;
  }

  const octokit = new Octokit({ auth: token });

  const response = await octokit.rest.issues.create({
    owner,
    repo,
    title,
    body
  });

  return response.data.html_url;
}
