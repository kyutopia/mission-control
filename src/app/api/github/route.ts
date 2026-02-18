import { NextRequest, NextResponse } from 'next/server';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_ORG = 'kyutopia';
const GITHUB_REPO = 'kyutopia-ops';
const PROJECT_NUMBER = 1;

async function githubGraphQL(query: string, variables: Record<string, unknown> = {}) {
  const res = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
    next: { revalidate: 60 },
  });
  return res.json();
}

// GET /api/github — fetch issues + project items
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'board';

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
    // Fetch open issues
    const state = searchParams.get('state') || 'open';
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/issues?state=${state}&per_page=100`,
      {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` },
        next: { revalidate: 60 },
      }
    );
    const issues = await res.json();
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

  if (type === 'pipeline') {
    // Fetch pipeline folder structure from GitHub
    const res = await fetch(
      `https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/pipeline`,
      {
        headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` },
        next: { revalidate: 300 },
      }
    );
    const dirs = await res.json();
    if (!Array.isArray(dirs)) return NextResponse.json([]);

    const items = await Promise.all(
      dirs.filter((d: any) => d.type === 'dir').map(async (dir: any) => {
        const filesRes = await fetch(
          `https://api.github.com/repos/${GITHUB_ORG}/${GITHUB_REPO}/contents/pipeline/${dir.name}`,
          {
            headers: { 'Authorization': `Bearer ${GITHUB_TOKEN}` },
            next: { revalidate: 300 },
          }
        );
        const files = await filesRes.json();
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
}