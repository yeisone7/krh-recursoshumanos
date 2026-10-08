import { describe, expect, it } from 'vitest';
import { generateNoveltyPDF } from './noveltyPdf';
import type { PayrollNovelty } from '@/types/payroll';
describe('custom concept receipt', () => {
  it('prints identifier, name and original days instead of equivalent hours', async () => {
    const novelty = {
      novelty_type: 'custom', quantity: 2, quantity_unit: 'days', hours: 16,
      novelty_date: '2026-10-08', created_at: '2026-10-08T12:00:00Z',
      employees_v2: { id: 'employee-a', first_name: 'Ana', last_name: 'Prueba', document_number: 'TEST' },
      payroll_concepts: { identifier: 'BONO_D', name: 'Bono especial' },
    } as PayrollNovelty;
    const { doc } = await generateNoveltyPDF(novelty, 'Operador de prueba');
    const output = doc.output();
    expect(output).toContain('BONO_D');
    expect(output).toContain('Bono especial');
    expect(output).toContain('Días reportados');
    expect(output).not.toContain('Horas reportadas');
  });
});
