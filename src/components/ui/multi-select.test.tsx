import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MultiSelect, type Option } from './multi-select';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);
Object.defineProperty(Element.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
});

const options: Option[] = [
  { label: 'Ana Activa', value: 'Ana Activa' },
  {
    label: 'Iván Inactivo',
    value: 'Iván Inactivo',
    badge: {
      label: 'Inactivo',
      className: 'border-red-200 bg-red-50 text-red-700',
    },
  },
];

describe('MultiSelect option badges', () => {
  it('renders the optional badge beside an option and keeps active options unbadged', () => {
    const onChange = vi.fn();
    render(<MultiSelect options={options} value={[]} onChange={onChange} />);

    fireEvent.click(screen.getByRole('combobox'));

    expect(screen.getByText('Ana Activa')).toBeInTheDocument();
    expect(screen.getByText('Iván Inactivo')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toHaveClass('bg-red-50', 'text-red-700');

    fireEvent.click(screen.getByText('Inactivo'));
    expect(onChange).toHaveBeenCalledWith(['Iván Inactivo']);
  });

  it('keeps the badge visible on a selected value and removes it without opening the list', () => {
    const onChange = vi.fn();
    const { container } = render(
      <MultiSelect options={options} value={['Iván Inactivo']} onChange={onChange} />,
    );
    const combobox = screen.getByRole('combobox');
    const removeControl = container.querySelector('[data-remove-option="Iván Inactivo"]');

    expect(screen.getByText('Inactivo')).toHaveClass('bg-red-50', 'text-red-700');
    expect(removeControl).not.toBeNull();

    fireEvent.click(removeControl!);
    expect(onChange).toHaveBeenCalledWith([]);
    expect(combobox).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not add a status badge to an active selected value', () => {
    render(<MultiSelect options={options} value={['Ana Activa']} onChange={() => undefined} />);

    expect(screen.getByText('Ana Activa')).toBeInTheDocument();
    expect(screen.queryByText('Inactivo')).not.toBeInTheDocument();
  });

  it('renders a badge when no custom badge class is provided', () => {
    render(
      <MultiSelect
        options={[{ label: 'Persona', value: 'Persona', badge: { label: 'Estado' } }]}
        value={['Persona']}
        onChange={() => undefined}
      />,
    );

    expect(screen.getByText('Estado')).toBeInTheDocument();
  });
});
