import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentTable } from './Analytics';

describe('COPASST operation center export action', () => {
  it('offers the Excel export from the operation-center table', () => {
    const onExport = vi.fn();
    render(<SegmentTable
      title="Participación por centro de operación"
      segmentLabel="Centro de operación"
      data={[{ label: 'Centro Norte', eligible: 40, voted: 31 }]}
      onExport={onExport}
    />);

    fireEvent.click(screen.getByRole('button', { name: 'Exportar Excel' }));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('does not expose the export action without export permission', () => {
    render(<SegmentTable
      title="Participación por centro de operación"
      segmentLabel="Centro de operación"
      data={[{ label: 'Centro Norte', eligible: 40, voted: 31 }]}
    />);

    expect(screen.queryByRole('button', { name: 'Exportar Excel' })).not.toBeInTheDocument();
  });
});
