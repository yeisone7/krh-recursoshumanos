const CLOTHING_SIZE_SUGGESTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const FOOTWEAR_SIZE_SUGGESTIONS = Array.from({ length: 13 }, (_, index) => String(35 + index));

interface DotationSizeConfig {
  category?: string | null;
  sizes_available?: string[] | null;
}

export function getDotationSizeSuggestions(itemType?: DotationSizeConfig | null): string[] {
  const configuredSizes = (itemType?.sizes_available ?? [])
    .map((size) => size.trim())
    .filter(Boolean);
  const fallbackSizes = itemType?.category?.toLowerCase().includes('calzado')
    ? FOOTWEAR_SIZE_SUGGESTIONS
    : CLOTHING_SIZE_SUGGESTIONS;

  return Array.from(new Set([...configuredSizes, ...fallbackSizes]));
}
