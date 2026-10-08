import { NOVELTY_TYPE_LABELS, type PayrollConcept, type PayrollConceptDraft, type PayrollNovelty } from '@/types/payroll';

export function validateConcepts(concepts: PayrollConceptDraft[]): Record<string, string> {
  const errors: Record<string, string> = {};
  const identifiers = new Map<string, string>();
  for (const concept of concepts) {
    const identifier = concept.identifier.trim().toLocaleUpperCase();
    if (!concept.name.trim()) errors[concept.id] = 'Ingrese el nombre del concepto.';
    else if (!identifier) errors[concept.id] = 'Ingrese el identificador.';
    else if (identifiers.has(identifier)) {
      errors[concept.id] = 'El identificador ya está en uso.';
      errors[identifiers.get(identifier)!] = 'El identificador ya está en uso.';
    } else if (!concept.percentage.trim() || !Number.isFinite(Number(concept.percentage)) || Number(concept.percentage) < 0) {
      errors[concept.id] = 'Ingrese un porcentaje válido, mayor o igual a cero.';
    }
    identifiers.set(identifier, concept.id);
  }
  return errors;
}

type ConceptNovelty = Pick<PayrollNovelty, 'novelty_type' | 'concept_id' | 'payroll_concepts' | 'hours' | 'quantity' | 'quantity_unit'>;
export function noveltyConceptKey(novelty: { novelty_type: string; concept_id?: string | null }): string {
  return novelty.novelty_type === 'custom' ? `concept:${novelty.concept_id}` : novelty.novelty_type;
}
export function noveltyConceptLabel(novelty: { novelty_type: string; payroll_concepts?: PayrollConcept | null }): string {
  const concept = novelty.payroll_concepts;
  return concept ? `${concept.identifier} · ${concept.name}` : NOVELTY_TYPE_LABELS[novelty.novelty_type as keyof typeof NOVELTY_TYPE_LABELS] || novelty.novelty_type;
}
export function noveltyQuantity(novelty: ConceptNovelty) {
  return { quantity: novelty.quantity ?? novelty.hours, unit: novelty.quantity_unit ?? 'hours' };
}
export function conceptOptions(concepts: PayrollConcept[], editingConceptId?: string | null) {
  const managedTypes = new Set(concepts.map(c => c.system_type).filter(Boolean));
  return [
    ...concepts.filter(c => c.is_active || c.id === editingConceptId).map(c => ({
      value: c.system_type || `concept:${c.id}`, label: `${c.identifier} · ${c.name}${c.is_active ? '' : ' (inactivo)'}`,
    })),
    ...Object.entries(NOVELTY_TYPE_LABELS).filter(([key]) => key !== 'custom' && !managedTypes.has(key as PayrollConcept['system_type']))
      .map(([value, label]) => ({ value, label })),
  ];
}
