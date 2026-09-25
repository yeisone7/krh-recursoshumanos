import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { CorrectionChoiceDialog } from '@/components/payroll/CorrectionChoiceDialog';
import type { CorrectionTicket } from './payrollCorrections';

export function chooseCorrectionTicket(tickets: CorrectionTicket[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const host = document.createElement('div'); document.body.appendChild(host);
    const root = createRoot(host);
    const finish = (id: string | null) => {
      root.unmount(); host.remove();
      if (id) resolve(id); else reject(new Error('Operación cancelada. No se guardaron cambios.'));
    };
    root.render(createElement(CorrectionChoiceDialog, { tickets, finish }));
  });
}
