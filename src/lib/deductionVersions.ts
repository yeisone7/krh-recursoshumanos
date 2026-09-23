type Version = { id: string; previous_version_id?: string | null; start_date?: string; end_date?: string | null };
// A period crossing a change of terms must be calculated in separate spans.
// Do not silently charge both versions in full or invent a proration policy.
export function crossingDeductionVersions<T extends Version>(rows: T[], start: string, end: string): Set<string> {
  const byId = new Map(rows.map(r => [r.id, r]));
  const groups = new Map<string, string[]>();
  for (const row of rows) {
    if ((row.start_date && row.start_date > end) || (row.end_date && row.end_date < start)) continue;
    let root = row;
    const visited = new Set<string>();
    while (root.previous_version_id && byId.has(root.previous_version_id) && !visited.has(root.id)) {
      visited.add(root.id); root = byId.get(root.previous_version_id)!;
    }
    const key = root.previous_version_id || root.id;
    groups.set(key, [...(groups.get(key) || []), row.id]);
  }
  return new Set([...groups.values()].filter(ids => ids.length > 1).flat());
}
