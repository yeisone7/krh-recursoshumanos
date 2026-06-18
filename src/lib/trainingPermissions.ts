export const TRAINING_PERMISSION_CODES = {
  index: 'capacitaciones',
  dashboard: 'capacitaciones_dashboard',
  ai: 'capacitaciones_ia',
  manual: 'capacitaciones_manual',
  library: 'capacitaciones_biblioteca',
  links: 'capacitaciones_enlaces',
  compliance: 'capacitaciones_cumplimiento',
  evidence: 'capacitaciones_evidencias',
  analytics: 'analitica_capacitaciones',
} as const;

export const TRAINING_CHILD_PERMISSION_CODES = Object.values(TRAINING_PERMISSION_CODES).filter(
  (code) => code !== TRAINING_PERMISSION_CODES.index
);
