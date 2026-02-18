import { NextRequest, NextResponse } from 'next/server';
import { githubGraphQL, githubREST, cachedFetch, getCacheStats, GitHubError, GITHUB_ORG, GITHUB_REPO } from '@/lib/github-cache';

const PROJECT_NUMBER = 1;

// GET /api/github — fetch issues + project items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'board';

  // Cache/rate limit status
  if (type === 'status') {
    return NextResponse.json(getCacheStats());
  }

  try {

  if (type === 'board') {
    // Fetch project board with status fields
    const { data } = await githubGraphQL(`
      query {
        organization(login: "${GITHUB_ORG}") {
          projectV2(number: ${PROJECT_NUMBER}) {
            title
            items(first: 100, orderBy: {field: POSITION, direction: ASC}) {
              nodes {
                id
                fieldValues(first: 20) {
                  nodes {
                    ... on ProjectV2ItemFieldTextValue { text field { ... on ProjectV2Field { name } } }
                    ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { name } } }
                    ... on ProjectV2ItemFieldDateValue { date field { ... on ProjectV2Field { name } } }
                  }
                }
                content {
                  ... on Issue {
                    number title state body url
                    labels(first: 10) { nodes { name color } }
                    assignees(first: 5) { nodes { login avatarUrl } }
                    createdAt updatedAt closedAt
                  }
                  ... on PullRequest {
                    number title state url
                    createdAt updatedAt
                  }
                }
              }
            }
          }
        }
      }
    `);

    // Transform to board format
    const columns: Record<string, any[]> = { 'Todo': [], 'In Progress': [], 'Done': [] };
    const items = data?.organization?.projectV2?.items?.nodes || [];
    
    for (const item of items) {
      if (!item.content) continue;
      
      let status = 'Todo';
      let priority = '';
      let assignee = '';
      
      for (const fv of item.fieldValues?.nodes || []) {
        if (fv.field?.name === 'Status') status = fv.name || 'Todo';
        if (fv.field?.name === '우선순위') priority = fv.name || '';
        if (fv.field?.name === '담당') assignee = fv.name || '';
      }
      
      const card = {
        id: item.id,
        number: item.content.number,
        title: item.content.title,
        state: item.content.state,
        url: item.content.url,
        body: item.content.body || "",
        labels: item.content.labels?.nodes || [],
        assignees: item.content.assignees?.nodes || [],
        priority,
        assignee,
        createdAt: item.content.createdAt,
        updatedAt: item.content.updatedAt,
      };
      
      if (columns[status]) {
        columns[status].push(card);
      } else {
        columns[status] = [card];
      }
    }

    return NextResponse.json({
      title: data?.organization?.projectV2?.title || 'Board',
      columns,
      totalItems: items.length,
    });
  }

  if (type === 'issues') {
    const state = searchParams.get('state') || 'open';
    const issues = await cachedFetch(`issues-${state}`, () =>
      githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/issues?state=${state}&per_page=100`),
      60_000
    );
    return NextResponse.json(issues);
  }


  if (type === "pulls") {
    // Fetch open + recently closed PRs from all org repos
    const { data } = await githubGraphQL(`
      query {
        organization(login: "${GITHUB_ORG}") {
          repositories(first: 10, orderBy: {field: UPDATED_AT, direction: DESC}) {
            nodes {
              name
              pullRequests(first: 20, states: [OPEN, MERGED, CLOSED], orderBy: {field: UPDATED_AT, direction: DESC}) {
                nodes {
                  number
                  title
                  state
                  isDraft
                  createdAt
                  updatedAt
                  mergedAt
                  closedAt
                  url
                  additions
                  deletions
                  changedFiles
                  author { login avatarUrl }
                  labels(first: 5) { nodes { name color } }
                  reviewDecision
                  reviews(first: 5) { nodes { author { login } state } }
                  headRefName
                  baseRefName
                }
              }
            }
          }
        }
      }
    `);

    const pulls: any[] = [];
    const repos = data?.organization?.repositories?.nodes || [];
    for (const repo of repos) {
      for (const pr of (repo.pullRequests?.nodes || [])) {
        pulls.push({
          repo: repo.name,
          number: pr.number,
          title: pr.title,
          state: pr.state,
          isDraft: pr.isDraft,
          createdAt: pr.createdAt,
          updatedAt: pr.updatedAt,
          mergedAt: pr.mergedAt,
          url: pr.url,
          additions: pr.additions,
          deletions: pr.deletions,
          changedFiles: pr.changedFiles,
          author: pr.author?.login || "unknown",
          authorAvatar: pr.author?.avatarUrl || "",
          labels: (pr.labels?.nodes || []).map((l: any) => ({ name: l.name, color: l.color })),
          reviewDecision: pr.reviewDecision,
          reviews: (pr.reviews?.nodes || []).map((r: any) => ({ author: r.author?.login, state: r.state })),
          branch: pr.headRefName,
          baseBranch: pr.baseRefName,
        });
      }
    }

    return NextResponse.json(pulls.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
  }


  if (type === 'kpi') {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch open + recently closed issues
    const [openIssues, closedIssues] = await Promise.all([
      cachedFetch('kpi-open', () => githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/issues?state=open&per_page=100`), 120_000),
      cachedFetch('kpi-closed', () => githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/issues?state=closed&per_page=100&since=${weekAgo}`), 120_000),
    ]);

    const openArr = Array.isArray(openIssues) ? openIssues.filter((i: any) => !i.pull_request) : [];
    const closedArr = Array.isArray(closedIssues) ? closedIssues.filter((i: any) => !i.pull_request) : [];
    const createdThisWeek = openArr.filter((i: any) => new Date(i.created_at) > new Date(weekAgo)).length
      + closedArr.filter((i: any) => new Date(i.created_at) > new Date(weekAgo)).length;

    // Per-assignee stats
    const assigneeMap: Record<string, { open: number; closed: number }> = {};
    const loginMap: Record<string, { emoji: string; name: string }> = {
      'doyun-kyu': { emoji: '🦁', name: '도윤' },
      'gunwoo-kyu': { emoji: '🐉', name: '건우' },
      'solhee-kyu': { emoji: '🐺', name: '솔희' },
      'lidoky': { emoji: '🐴', name: '동규' },
    };
    for (const issue of openArr) {
      for (const a of (issue.assignees || [])) {
        if (!assigneeMap[a.login]) assigneeMap[a.login] = { open: 0, closed: 0 };
        assigneeMap[a.login].open++;
      }
    }
    for (const issue of closedArr) {
      for (const a of (issue.assignees || [])) {
        if (!assigneeMap[a.login]) assigneeMap[a.login] = { open: 0, closed: 0 };
        assigneeMap[a.login].closed++;
      }
    }

    const byAssignee = Object.entries(assigneeMap).map(([login, stats]) => ({
      ...stats,
      name: loginMap[login]?.name || login,
      emoji: loginMap[login]?.emoji || '👤',
    }));

    // PR stats
    const openPRs = await cachedFetch('kpi-prs', () => githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/pulls?state=all&per_page=30`), 120_000);
    const prArr = Array.isArray(openPRs) ? openPRs : [];
    const openPRCount = prArr.filter((p: any) => p.state === 'open').length;
    const mergedThisWeek = prArr.filter((p: any) => p.merged_at && new Date(p.merged_at) > new Date(weekAgo)).length;

    // Pipeline stats
    const pipelineDirs = await cachedFetch('kpi-pipeline', () => githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/pipeline`), 300_000);
    const dirArr = Array.isArray(pipelineDirs) ? pipelineDirs.filter((d: any) => d.type === 'dir') : [];

    return NextResponse.json({
      issues: {
        openCount: openArr.length,
        closedThisWeek: closedArr.length,
        createdThisWeek,
        avgCloseTimeDays: 0,
        byAssignee,
      },
      prs: {
        openCount: openPRCount,
        mergedThisWeek,
        avgMergeTimeHours: 0,
      },
      pipeline: {
        totalProjects: dirArr.length,
        activeProjects: dirArr.length,
      },
    });
  }

  if (type === 'pipeline') {
    // Fetch pipeline folder structure from GitHub
    const dirs = await cachedFetch('pipeline-dirs', () =>
      githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/pipeline`),
      300_000
    );
    if (!Array.isArray(dirs)) return NextResponse.json([]);

    const items = await Promise.all(
      dirs.filter((d: any) => d.type === 'dir').map(async (dir: any) => {
        const files = await cachedFetch(`pipeline-${dir.name}`, () =>
          githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/pipeline/${dir.name}`),
          300_000
        );
        const allFiles = Array.isArray(files) ? files : [];

        // Classify reports into 6 stages
        const reports = allFiles
          .filter((f: any) => f.name.endsWith('.md') && !f.name.startsWith('gate-') && f.name !== 'lessons-learned.md')
          .map((f: any) => {
            const fn = f.name.toLowerCase();
            let stage = 'brainstorm';
            if (fn.includes('revenue') || fn.includes('scale') || fn.includes('stage6')) stage = 'scaleup';
            else if (fn.includes('pitch') || fn.includes('mvp') || fn.includes('stage5') || fn.includes('execution') || fn.includes('curriculum')) stage = 'mvp';
            else if (fn.includes('strategy') || fn.includes('roadmap') || fn.includes('bizplan') || fn.includes('stage4')) stage = 'strategy';
            else if (fn.includes('research') || fn.includes('debate') || fn.includes('discussion') || fn.includes('stage3')) stage = 'research';
            else if (fn.includes('trend') || fn.includes('stage2')) stage = 'trend';
            else if (fn.includes('brainstorm') || fn.includes('stage1')) stage = 'brainstorm';
            // Default remains brainstorm for unmatched
            return { name: f.name, url: f.html_url, stage };
          });

        // Parse gate decision files
        const gateFiles = allFiles.filter((f: any) => /^gate-\d+-decision\.md$/i.test(f.name));
        const gates: { gate: number; status: string; file: string; url: string }[] = [];
        for (let g = 1; g <= 5; g++) {
          const gf = gateFiles.find((f: any) => f.name.toLowerCase() === `gate-${g}-decision.md`);
          if (gf) {
            // Try to detect status from filename or content header (for now, mark as 'go' if file exists)
            // To detect pivot/kill, we'd need to fetch content — too expensive. Default: go.
            gates.push({ gate: g, status: 'go', file: gf.name, url: gf.html_url });
          } else {
            gates.push({ gate: g, status: 'pending', file: '', url: '' });
          }
        }

        const stageOrder: Record<string, number> = { brainstorm: 1, trend: 2, research: 3, strategy: 4, mvp: 5, scaleup: 6 };
        let latestStage = 0;
        for (const r of reports) {
          const n = stageOrder[r.stage] || 0;
          if (n > latestStage) latestStage = n;
        }

        const match = dir.name.match(/^(\d+)-(.+)$/);
        return {
          id: match ? match[1] : '00',
          name: match ? match[2].replace(/-/g, ' ') : dir.name,
          reports,
          gates,
          latestStage,
        };
      })
    );

    return NextResponse.json(items.sort((a: any, b: any) => a.id.localeCompare(b.id)));
  }

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
  } catch (err) {
    if (err instanceof GitHubError) {
      console.error(`[github-api] ${err.message} (${err.status})`);
      if (err.status === 401) return NextResponse.json({ error: 'Token expired' }, { status: 502 });
      if (err.status === 403 || err.status === 429) return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }
    console.error('[github-api] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}