/** Amendments keep old extensions as evidence, but their dates no longer govern
 * the newly agreed contract terms. Extensions starting afterwards remain valid. */
export function effectiveContractExtensions<T extends { start_date?: string; end_date: string }>(contract: {
  contract_type: string; amendment_effective_on?: string | null; contract_extensions?: T[] | null;
}): T[] {
  if (contract.contract_type === 'indefinido') return [];
  return (contract.contract_extensions || []).filter(e => !contract.amendment_effective_on || (!!e.start_date && e.start_date >= contract.amendment_effective_on));
}
export function effectiveContractEndDate(contract: {
  contract_type: string; end_date: string | null; amendment_effective_on?: string | null;
  contract_extensions?: { start_date?: string; end_date: string }[] | null;
}) {
  if (contract.contract_type === 'indefinido') return null;
  const dates = effectiveContractExtensions(contract).map(e => e.end_date).sort();
  return dates[dates.length - 1] || contract.end_date;
}
