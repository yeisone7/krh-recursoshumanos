import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateActaEntregaPdf } from './dotationPdfGenerator';

const pdfMocks = vi.hoisted(() => {
  const addImage = vi.fn();
  const save = vi.fn();
  const doc = {
    internal: {
      pageSize: {
        getWidth: () => 215.9,
        getHeight: () => 279.4,
      },
    },
    addImage,
    save,
    saveGraphicsState: vi.fn(),
    restoreGraphicsState: vi.fn(),
    setGState: vi.fn(),
    setFontSize: vi.fn(),
    setFont: vi.fn(),
    text: vi.fn(),
    setDrawColor: vi.fn(),
    setLineWidth: vi.fn(),
    line: vi.fn(),
    setFillColor: vi.fn(),
    rect: vi.fn(),
    setTextColor: vi.fn(),
    splitTextToSize: vi.fn((text: string) => [text]),
  };

  return { addImage, save, doc };
});

vi.mock('jspdf', () => ({
  default: vi.fn(() => pdfMocks.doc),
  GState: class MockGState {
    constructor(public readonly options: { opacity?: number }) {}
  },
}));

class MockImage {
  crossOrigin = '';
  naturalWidth = 200;
  naturalHeight = 100;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  currentSrc = '';

  set src(value: string) {
    this.currentSrc = value;
    queueMicrotask(() => this.onload?.());
  }
}

describe('generateActaEntregaPdf', () => {
  beforeEach(() => {
    pdfMocks.addImage.mockClear();
    pdfMocks.addImage.mockImplementation(() => undefined);
    pdfMocks.save.mockClear();
    pdfMocks.doc.restoreGraphicsState.mockClear();
    vi.stubGlobal('Image', MockImage);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses the exact same selected company logo in the header and watermark', async () => {
    const logoUrl = 'https://cdn.example.com/company-horizontal.png';

    await generateActaEntregaPdf({
      companyName: 'Empresa Actual',
      companyNit: '900123456-7',
      logoUrl,
      deliveries: [{
        id: 'delivery-1',
        employee_id: 'employee-1',
        item_name: 'BATA BLANCA',
        item_type: 'otros',
        quantity: 1,
        size: null,
        delivery_date: '2026-09-08',
        expiration_date: '2027-01-08',
        employees: {
          first_name: 'Persona',
          last_name: 'Prueba',
          document_number: '123456789',
          operation_centers: { name: 'General' },
        },
      }],
    });

    const renderedSources = pdfMocks.addImage.mock.calls.map(([image]) => image.currentSrc);
    expect(renderedSources.filter(source => source === logoUrl)).toHaveLength(2);
    expect(renderedSources).not.toContain('/images/petrocasinos-watermark.png');
    expect(pdfMocks.save).toHaveBeenCalledOnce();
  });

  it('restores normal opacity when rendering the watermark fails', async () => {
    pdfMocks.addImage.mockImplementationOnce(() => {
      throw new Error('Invalid image');
    });

    await generateActaEntregaPdf({
      companyName: 'Empresa Actual',
      companyNit: '900123456-7',
      logoUrl: 'https://cdn.example.com/company-horizontal.png',
      deliveries: [{
        id: 'delivery-1',
        employee_id: 'employee-1',
        item_name: 'BATA BLANCA',
        item_type: 'otros',
        quantity: 1,
        delivery_date: '2026-09-08',
        expiration_date: '2027-01-08',
        employees: {
          first_name: 'Persona',
          last_name: 'Prueba',
          document_number: '123456789',
        },
      }],
    });

    expect(pdfMocks.doc.restoreGraphicsState).toHaveBeenCalledOnce();
    expect(pdfMocks.save).toHaveBeenCalledOnce();
  });
});
