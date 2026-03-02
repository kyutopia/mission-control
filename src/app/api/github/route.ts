import { NextRequest, NextResponse } from 'next/server';
import { githubGraphQL, githubREST, cachedFetch, getCacheStats, GitHubError, GITHUB_ORG, GITHUB_REPO, PIPELINE_REPO } from '@/lib/github-cache';

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
    // Fetch all org issues and organize by status labels
    const repoFilter = searchParams.get('repo') || '';
    
    const allIssues = await cachedFetch('board-org-issues', async () => {
      const repos = await githubREST(`/orgs/${GITHUB_ORG}/repos?type=all&per_page=100`);
      const activeRepos = (repos as any[]).filter((r: any) => !r.archived);
      const issuePromises = activeRepos.map(async (repo: any) => {
        try {
          const issues = await githubREST(`/repos/${GITHUB_ORG}/${repo.name}/issues?state=all&per_page=50&sort=updated`);
          return (issues as any[])
            .filter((i: any) => !i.pull_request)
            .map((i: any) => ({ ...i, repo: repo.name }));
        } catch { return []; }
      });
      const results = await Promise.all(issuePromises);
      return results.flat();
    }, 60_000);

    const columns: Record<string, any[]> = { 'Todo': [], 'In Progress': [], 'Done': [] };
    
    for (const issue of (allIssues as any[])) {
      if (repoFilter && issue.repo !== repoFilter) continue;
      
      const labels = (issue.labels || []).map((l: any) => typeof l === 'string' ? l : l.name);
      let status = 'Todo';
      if (issue.state === 'closed') {
        status = 'Done';
      } else if (labels.some((l: string) => l.toLowerCase().includes('in-progress') || l.toLowerCase().includes('in progress') || l.toLowerCase().includes('진행'))) {
        status = 'In Progress';
      } else if (labels.some((l: string) => l.toLowerCase().includes('done') || l.toLowerCase().includes('완료'))) {
        status = 'Done';
      }
      
      // Extract priority from labels
      let priority = '';
      if (labels.some((l: string) => l.includes('긴급') || l.includes('P0'))) priority = '🔴 긴급';
      else if (labels.some((l: string) => l.includes('보통') || l.includes('P1'))) priority = '🟡 보통';
      else if (labels.some((l: string) => l.includes('여유') || l.includes('P2'))) priority = '🟢 여유';
      
      const card = {
        id: `issue-${issue.repo}-${issue.number}`,
        number: issue.number,
        title: issue.title,
        state: issue.state,
        url: issue.html_url,
        body: issue.body || '',
        labels: (issue.labels || []).map((l: any) => ({
          name: typeof l === 'string' ? l : l.name,
          color: typeof l === 'string' ? '666666' : (l.color || '666666'),
        })),
        assignees: (issue.assignees || []).map((a: any) => ({
          login: a.login,
          avatarUrl: a.avatar_url,
        })),
        priority,
        assignee: '',
        createdAt: issue.created_at,
        updatedAt: issue.updated_at,
        repo: issue.repo,
      };
      
      columns[status].push(card);
    }
    
    // Sort: In Progress and Todo by updated, Done by closed
    for (const col of Object.keys(columns)) {
      columns[col].sort((a: any, b: any) => 
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
    }

    const totalItems = Object.values(columns).flat().length;
    return NextResponse.json({
      title: 'KYUTOPIA 업무 보드',
      columns,
      totalItems,
    });
  }


  if (type === 'issues') {
    const state = searchParams.get('state') || 'open';
    const repoFilter = searchParams.get('repo') || '';
    
    // Fetch issues from all org repos (non-archived)
    const allIssues = await cachedFetch(`org-issues-${state}`, async () => {
      const repos = await githubREST(`/orgs/${GITHUB_ORG}/repos?type=all&per_page=100`);
      const activeRepos = (repos as any[]).filter((r: any) => !r.archived);
      const issuePromises = activeRepos.map(async (repo: any) => {
        try {
          const issues = await githubREST(`/repos/${GITHUB_ORG}/${repo.name}/issues?state=${state}&per_page=50`);
          return (issues as any[])
            .filter((i: any) => !i.pull_request)
            .map((i: any) => ({ ...i, repo: repo.name }));
        } catch { return []; }
      });
      const results = await Promise.all(issuePromises);
      return results.flat().sort((a: any, b: any) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    }, 60_000);

    const filtered = repoFilter 
      ? (allIssues as any[]).filter((i: any) => i.repo === repoFilter)
      : allIssues;
    
    return NextResponse.json(filtered);
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



  if (type === 'reports') {
    // Fetch reports from kyutopia-ops/reports/ folder
    const dirs = await cachedFetch('reports-root', () =>
      githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/reports`),
      120_000
    );
    if (!Array.isArray(dirs)) return NextResponse.json([]);

    const reports: any[] = [];

    // Process markdown files at root level
    const mdFiles = dirs.filter((f: any) => f.name.endsWith('.md') && f.name !== 'CONVENTION.md');
    for (const f of mdFiles) {
      const fn = f.name.toLowerCase();
      let reportType = 'strategy';
      if (fn.includes('daily') || fn.includes('coo') || fn.includes('cto') || fn.includes('cso')) reportType = 'daily';
      else if (fn.includes('weekly') || fn.includes('week')) reportType = 'weekly';

      // Extract date from filename
      const dateMatch = f.name.match(/^(\d{4}-\d{2}-\d{2})/);
      const date = dateMatch ? dateMatch[1] : '';

      reports.push({
        id: f.sha.slice(0, 8),
        name: f.name,
        title: f.name.replace('.md', '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' '),
        date,
        type: reportType,
        url: f.html_url,
        downloadUrl: f.download_url,
      });
    }

    // Process subdirectories (daily/, weekly/, strategy/)
    const subDirs = dirs.filter((d: any) => d.type === 'dir');
    for (const dir of subDirs) {
      try {
        const subFiles = await cachedFetch(`reports-${dir.name}`, () =>
          githubREST(`/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/reports/${dir.name}`),
          120_000
        );
        if (!Array.isArray(subFiles)) continue;
        for (const f of subFiles.filter((f: any) => f.name.endsWith('.md') && f.name !== 'CONVENTION.md')) {
          const dateMatch = f.name.match(/(\d{4}-\d{2}-\d{2})/);
          const date = dateMatch ? dateMatch[1] : '';
          reports.push({
            id: f.sha.slice(0, 8),
            name: f.name,
            title: f.name.replace('.md', '').replace(/^\d{4}-\d{2}-\d{2}-/, '').replace(/-/g, ' '),
            date,
            type: dir.name,
            url: f.html_url,
            downloadUrl: f.download_url,
            folder: dir.name,
          });
        }
      } catch {}
    }

    return NextResponse.json(reports.sort((a: any, b: any) => (b.date || '').localeCompare(a.date || '')));
  }

  if (type === 'kpi') {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch open + recently closed issues
    const [openIssues, closedIssues] = await Promise.all([
      cachedFetch('kpi-open', async () => {
        const repos = await githubREST(`/orgs/${GITHUB_ORG}/repos?type=all&per_page=100`);
        const active = (repos as any[]).filter((r: any) => !r.archived);
        const all = await Promise.all(active.map(async (r: any) => {
          try { return await githubREST(`/repos/${GITHUB_ORG}/${r.name}/issues?state=open&per_page=50`); }
          catch { return []; }
        }));
        return all.flat().filter((i: any) => !i.pull_request);
      }, 120_000),
      cachedFetch('kpi-closed', async () => {
        const repos = await githubREST(`/orgs/${GITHUB_ORG}/repos?type=all&per_page=100`);
        const active = (repos as any[]).filter((r: any) => !r.archived);
        const all = await Promise.all(active.map(async (r: any) => {
          try { return await githubREST(`/repos/${GITHUB_ORG}/${r.name}/issues?state=closed&per_page=50&since=${weekAgo}`); }
          catch { return []; }
        }));
        return all.flat().filter((i: any) => !i.pull_request);
      }, 120_000),
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
    const pipelineDirs = await cachedFetch('kpi-pipeline', () => githubREST(`/repos/${GITHUB_ORG}/${PIPELINE_REPO}/contents`), 300_000);
    const dirArr = Array.isArray(pipelineDirs) ? pipelineDirs.filter((d: any) => d.type === 'dir' && /^\d/.test(d.name)) : [];

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
      githubREST(`/repos/${GITHUB_ORG}/${PIPELINE_REPO}/contents`),
      300_000
    );
    if (!Array.isArray(dirs)) return NextResponse.json([]);

    const items = await Promise.all(
      dirs.filter((d: any) => d.type === 'dir' && /^\d/.test(d.name)).map(async (dir: any) => {
        const files = await cachedFetch(`pipeline-${dir.name}`, () =>
          githubREST(`/repos/${GITHUB_ORG}/${PIPELINE_REPO}/contents/${dir.name}`),
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