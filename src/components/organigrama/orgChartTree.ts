export interface ChartPosition {
  id: string;
  name: string;
  code?: string | null;
  area_id?: string | null;
  parent_position_id?: string | null;
  level?: number | null;
  is_active?: boolean | null;
}

export interface ChartEmployee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string | null;
  work_info?: { position_id?: string | null } | null;
}

export interface PositionNode extends ChartPosition {
  areaName?: string;
  employees: ChartEmployee[];
  children: PositionNode[];
}

export const normalizeOrgSearch = (value: string) =>
  value.normalize('NFD').replace(/\p{Diacritic}/gu, '').trim().toLocaleLowerCase('es');

export function buildOrgTree(positions: ChartPosition[], areas: { id: string; name: string }[], employees: ChartEmployee[]) {
  const areaNames = new Map(areas.map(({ id, name }) => [id, name]));
  const peopleByPosition = new Map<string, ChartEmployee[]>();
  for (const person of employees) {
    const positionId = person.work_info?.position_id;
    if (!positionId) continue;
    const people = peopleByPosition.get(positionId) ?? [];
    people.push(person);
    peopleByPosition.set(positionId, people);
  }

  const nodes = new Map<string, PositionNode>(positions.filter(position => position.is_active !== false).map(position => [
    position.id,
    { ...position, areaName: areaNames.get(position.area_id ?? ''), employees: peopleByPosition.get(position.id) ?? [], children: [] },
  ]));
  const roots: PositionNode[] = [];
  for (const node of nodes.values()) {
    const parent = nodes.get(node.parent_position_id ?? '');
    // A broken reporting cycle must not hide an entire branch.
    const visited = new Set([node.id]);
    let ancestor = parent;
    while (ancestor && !visited.has(ancestor.id)) {
      visited.add(ancestor.id);
      ancestor = nodes.get(ancestor.parent_position_id ?? '');
    }
    if (parent && !ancestor) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (branch: PositionNode[]) => {
    branch.sort((a, b) => (a.level ?? 99) - (b.level ?? 99) || a.name.localeCompare(b.name, 'es'));
    branch.forEach(node => sort(node.children));
  };
  sort(roots);
  return roots;
}

export function filterOrgTree(roots: PositionNode[], query: string, areaId: string) {
  const matches = new Set<string>();
  const ancestors = new Set<string>();
  let assigned = 0;

  const visit = (branch: PositionNode[]): PositionNode[] => branch.flatMap(node => {
    const selfMatches = (areaId === 'all' || node.area_id === areaId) && (!query || [
      node.name, node.code ?? '',
      ...node.employees.map(person => `${person.first_name} ${person.last_name}`),
    ].some(value => normalizeOrgSearch(value).includes(query)));
    if (selfMatches) {
      matches.add(node.id);
      assigned += node.employees.length;
    }
    const children = visit(node.children);
    if (children.length) ancestors.add(node.id);
    return selfMatches || children.length ? [{ ...node, children }] : [];
  });

  return { roots: visit(roots), matches, ancestors, assigned };
}
