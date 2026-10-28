interface ProjectItem {
  content?: { number?: number; repository?: { nameWithOwner?: string } } | null;
  fieldValueByName?: { name?: string } | null;
}
interface ProjectResponse {
  errors?: unknown[];
  data?: { node?: { items?: { nodes: (ProjectItem | null)[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null } } } | null };
}

// The selected project's Status is authoritative; another project's Ready does not qualify.
export async function readProjectStatus(repository: string, number: number, projectId: string,
  token: string, request: typeof fetch = fetch): Promise<string | null> {
  if (!projectId || !token) throw new Error('Project access configuration is missing');
  let cursor: string | null = null;
  let unreadableItems = false;
  for (let page = 0; page < 100; page++) {
    const response = await request('https://api.github.com/graphql', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'IssuePilot/0.1' },
      body: JSON.stringify({ query: `query($project: ID!, $cursor: String) {
        node(id: $project) { ... on ProjectV2 {
          items(first: 100, after: $cursor) {
            nodes { content { ... on Issue { number repository { nameWithOwner } } }
              fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } }
            pageInfo { hasNextPage endCursor }
          }
        } }
      }`, variables: { project: projectId, cursor } }),
    });
    if (!response.ok) throw new Error('Project API access failed');
    const result = await response.json() as ProjectResponse;
    const items = result.data?.node?.items;
    if (result.errors?.length || !items || !Array.isArray(items.nodes) || !items.pageInfo)
      throw new Error('Project API returned errors or inaccessible project');
    unreadableItems ||= items.nodes.some(item => item?.content === null);
    const item = items.nodes.find(item => item?.content?.number === number &&
      item.content.repository?.nameWithOwner?.toLowerCase() === repository.toLowerCase());
    if (item) return item.fieldValueByName?.name ?? null;
    if (!items.pageInfo.hasNextPage) {
      if (unreadableItems) throw new Error('Project contains unreadable issue content; check PROJECT_TOKEN repository permissions');
      return null;
    }
    if (!items.pageInfo.endCursor || items.pageInfo.endCursor === cursor) throw new Error('Project pagination failed');
    cursor = items.pageInfo.endCursor;
  }
  throw new Error('Project pagination limit reached');
}
