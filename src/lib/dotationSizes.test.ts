import { describe, expect, it } from 'vitest';

import { getDotationSizeSuggestions } from './dotationSizes';

describe('getDotationSizeSuggestions', () => {
  it('preserves configured numeric pant sizes', () => {
    expect(getDotationSizeSuggestions({
      category: 'Uniforme',
      sizes_available: ['6', '8', '10', '12', '14'],
    })).toEqual(['6', '8', '10', '12', '14', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']);
  });

  it('uses footwear sizes as fallback for footwear', () => {
    const suggestions = getDotationSizeSuggestions({ category: 'Calzado' });

    expect(suggestions).toContain('35');
    expect(suggestions).toContain('47');
    expect(suggestions).not.toContain('XS');
  });

  it('removes duplicate and blank configured sizes', () => {
    expect(getDotationSizeSuggestions({
      category: 'Uniforme',
      sizes_available: [' S ', '', 'M'],
    })).toEqual(['S', 'M', 'XS', 'L', 'XL', 'XXL', 'XXXL']);
  });
});
