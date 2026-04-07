/**
 * GitPulse AI — Agent A: The Scout
 *
 * Real GitHub REST API calls to gather raw repository data.
 * This is the "Anti-Wrapper" moat — actual API orchestration, not prompt engineering.
 *
 * Fetches: repo metadata, contributors, commits, issues, PRs, releases, languages, dependency files
 * All data is RAW — no LLM involvement. Pure tool use.
 */

const GITHUB_API = 'https://api.github.com';

/** @param {string} owner @param {string} repo */
function headers() {
  const h = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'GitPulse-AI/1.0'
  };
  if (process.env.GITHUB_TOKEN) {
    h['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function ghFetch(path) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    headers: headers(),
    signal: AbortSignal.timeout(10000)
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GitHub API ${res.status}: ${path} — ${body.substring(0, 200)}`);
  }
  return res.json();
}

async function ghFetchSafe(path, fallback = null) {
  try {
    return await ghFetch(path);
  } catch (e) {
    return fallback;
  }
}

/**
 * Parse a GitHub repo URL into owner/repo
 * Handles: github.com/owner/repo, https://github.com/owner/repo, owner/repo
 */
export function parseRepoUrl(input) {
  const cleaned = input.trim().replace(/\/+$/, '').replace(/\.git$/, '');

  // Full URL
  const urlMatch = cleaned.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };

  // owner/repo format
  const slashMatch = cleaned.match(/^([^/]+)\/([^/]+)$/);
  if (slashMatch) return { owner: slashMatch[1], repo: slashMatch[2] };

  throw new Error(`Invalid GitHub repo format: "${input}". Use owner/repo or a GitHub URL.`);
}

/**
 * Scout Mission: Gather all raw data from GitHub API
 * Returns structured raw data for the Analyst agent
 */
export async function scoutRepo(owner, repo) {
  const startTime = Date.now();

  // Parallel fetch — all independent API calls at once
  const [
    repoMeta,
    contributors,
    commitsRecent,
    issuesOpen,
    issuesClosed,
    pullsOpen,
    pullsClosed,
    releases,
    languages,
    branches,
    tags
  ] = await Promise.all([
    // Core metadata
    ghFetch(`/repos/${owner}/${repo}`),
    // Top 100 contributors by commit count
    ghFetchSafe(`/repos/${owner}/${repo}/contributors?per_page=100&anon=true`, []),
    // Last 100 commits on default branch
    ghFetchSafe(`/repos/${owner}/${repo}/commits?per_page=100`, []),
    // Open issues (up to 100)
    ghFetchSafe(`/repos/${owner}/${repo}/issues?state=open&per_page=100`, []),
    // Recently closed issues (up to 100)
    ghFetchSafe(`/repos/${owner}/${repo}/issues?state=closed&per_page=100&sort=updated&direction=desc`, []),
    // Open PRs
    ghFetchSafe(`/repos/${owner}/${repo}/pulls?state=open&per_page=100`, []),
    // Recently closed/merged PRs
    ghFetchSafe(`/repos/${owner}/${repo}/pulls?state=closed&per_page=100&sort=updated&direction=desc`, []),
    // Releases
    ghFetchSafe(`/repos/${owner}/${repo}/releases?per_page=30`, []),
    // Language breakdown
    ghFetchSafe(`/repos/${owner}/${repo}/languages`, {}),
    // Branches
    ghFetchSafe(`/repos/${owner}/${repo}/branches?per_page=100`, []),
    // Tags
    ghFetchSafe(`/repos/${owner}/${repo}/tags?per_page=30`, [])
  ]);

  // Fetch dependency files (package.json, requirements.txt, etc.)
  const depFiles = await scoutDependencies(owner, repo);

  // Fetch commit activity (last year, weekly)
  const commitActivity = await ghFetchSafe(`/repos/${owner}/${repo}/stats/commit_activity`, []);
  const codeFrequency = await ghFetchSafe(`/repos/${owner}/${repo}/stats/code_frequency`, []);

  return {
    meta: {
      owner,
      repo,
      fullName: repoMeta.full_name,
      description: repoMeta.description,
      homepage: repoMeta.homepage,
      stars: repoMeta.stargazers_count,
      forks: repoMeta.forks_count,
      watchers: repoMeta.subscribers_count,
      openIssues: repoMeta.open_issues_count,
      size: repoMeta.size, // KB
      defaultBranch: repoMeta.default_branch,
      license: repoMeta.license?.spdx_id || repoMeta.license?.name || null,
      topics: repoMeta.topics || [],
      createdAt: repoMeta.created_at,
      updatedAt: repoMeta.updated_at,
      pushedAt: repoMeta.pushed_at,
      archived: repoMeta.archived,
      disabled: repoMeta.disabled,
      hasWiki: repoMeta.has_wiki,
      hasPages: repoMeta.has_pages,
      hasDiscussions: repoMeta.has_discussions,
      visibility: repoMeta.visibility
    },
    contributors: (contributors || []).map(c => ({
      login: c.login || 'anonymous',
      contributions: c.contributions,
      type: c.type
    })),
    commits: (commitsRecent || []).map(c => ({
      sha: c.sha?.substring(0, 7),
      author: c.author?.login || c.commit?.author?.name || 'unknown',
      date: c.commit?.author?.date,
      message: c.commit?.message?.split('\n')[0]?.substring(0, 100)
    })),
    issues: {
      open: (issuesOpen || []).filter(i => !i.pull_request).map(i => ({
        number: i.number,
        title: i.title?.substring(0, 80),
        createdAt: i.created_at,
        labels: (i.labels || []).map(l => l.name),
        comments: i.comments
      })),
      closed: (issuesClosed || []).filter(i => !i.pull_request).map(i => ({
        number: i.number,
        createdAt: i.created_at,
        closedAt: i.closed_at
      }))
    },
    pullRequests: {
      open: (pullsOpen || []).map(p => ({
        number: p.number,
        title: p.title?.substring(0, 80),
        createdAt: p.created_at,
        draft: p.draft
      })),
      closed: (pullsClosed || []).map(p => ({
        number: p.number,
        createdAt: p.created_at,
        closedAt: p.closed_at,
        mergedAt: p.merged_at
      }))
    },
    releases: (releases || []).map(r => ({
      tag: r.tag_name,
      name: r.name,
      publishedAt: r.published_at,
      prerelease: r.prerelease,
      draft: r.draft
    })),
    languages,
    branches: (branches || []).length,
    tags: (tags || []).length,
    dependencies: depFiles,
    activity: {
      commitActivity: commitActivity || [],
      codeFrequency: codeFrequency || []
    },
    scoutTime: Date.now() - startTime
  };
}

/**
 * Fetch dependency manifest files from the repo
 */
async function scoutDependencies(owner, repo) {
  const depFileNames = [
    'package.json',
    'requirements.txt',
    'Pipfile',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
    'Gemfile',
    'pom.xml',
    'build.gradle',
    'composer.json'
  ];

  const results = {};

  // Try to fetch each dependency file
  await Promise.all(depFileNames.map(async (fileName) => {
    try {
      const data = await ghFetch(`/repos/${owner}/${repo}/contents/${fileName}`);
      if (data.content) {
        const content = Buffer.from(data.content, 'base64').toString('utf-8');
        results[fileName] = content.substring(0, 5000); // Cap at 5KB
      }
    } catch (e) {
      // File doesn't exist — that's fine
    }
  }));

  return results;
}
