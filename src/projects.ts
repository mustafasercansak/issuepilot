export interface ProjectItem {
  id?: string;
  content?: { number?: number; repository?: { nameWithOwner?: string } } | null;
  fieldValueByName?: { name?: string; field?: { id: string; options: { id: string; name: string }[] } } | null;
}
interface ProjectResponse {
  errors?: unknown[];
  data?: { node?: { items?: { nodes: (ProjectItem | null)[];
    pageInfo: { hasNextPage: boolean; endCursor: string | null } } } | null };
}

// The selected project's Status is authoritative; another project's Ready does not qualify.
export async function readProjectItem(repository: string, number: number, projectId: string,
  token: string, request: typeof fetch = fetch): Promise<ProjectItem | null> {
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
            nodes { id content { ... on Issue { number repository { nameWithOwner } } }
              fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name field { ... on ProjectV2SingleSelectField { id options { id name } } } } } }
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
    if (item) return item;
    if (!items.pageInfo.hasNextPage) {
      if (unreadableItems) throw new Error('Project contains unreadable issue content; check PROJECT_TOKEN repository permissions');
      return null;
    }
    if (!items.pageInfo.endCursor || items.pageInfo.endCursor === cursor) throw new Error('Project pagination failed');
    cursor = items.pageInfo.endCursor;
  }
  throw new Error('Project pagination limit reached');
}

export async function readProjectStatus(repository: string, number: number, projectId: string,
  token: string, request: typeof fetch = fetch): Promise<string | null> {
  return (await readProjectItem(repository, number, projectId, token, request))?.fieldValueByName?.name ?? null;
}

export async function setProjectStatus(repository: string, number: number, projectId: string,
  token: string, expected: string, target: string, request: typeof fetch = fetch): Promise<void> {
  const item = await readProjectItem(repository, number, projectId, token, request);
  const value = item?.fieldValueByName;
  const option = value?.field?.options.find(option => option.name === target);
  if (!item?.id || value?.name !== expected || !value.field?.id || !option)
    throw new Error('Project status changed or transition metadata is missing');
  const response = await request('https://api.github.com/graphql', {
    method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'User-Agent': 'IssuePilot/0.1' },
    body: JSON.stringify({ query: `mutation($project: ID!, $item: ID!, $field: ID!, $option: String!) {
      updateProjectV2ItemFieldValue(input: { projectId: $project, itemId: $item, fieldId: $field,
        value: { singleSelectOptionId: $option } }) { projectV2Item { id } }
    }`, variables: { project: projectId, item: item.id, field: value.field.id, option: option.id } }),
  });
  if (!response.ok) throw new Error('Project status update failed; PROJECT_TOKEN needs project write permission');
  const result = await response.json() as { errors?: unknown[]; data?: { updateProjectV2ItemFieldValue?: { projectV2Item?: { id: string } } } };
  if (result.errors?.length || result.data?.updateProjectV2ItemFieldValue?.projectV2Item?.id !== item.id)
    throw new Error('Project status update failed; check project write permission');
}
