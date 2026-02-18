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

  return NextResponse.json({ error: 'Unknown type' }, { status: 400 });
}
