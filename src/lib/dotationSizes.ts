const CLOTHING_SIZE_SUGGESTIONS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
const FOOTWEAR_SIZE_SUGGESTIONS = Array.from({ length: 13 }, (_, index) => String(35 + index));

interface DotationSizeConfig {
  category?: string | null;
  sizes_available?: string[] | null;
}

interface DotationInventorySize {
  item_type: string;
  operation_center_id: string | null;
  size: string | null;
}

function normalizeSizes(sizes: Array<string | null | undefined>): string[] {
  return Array.from(new Set(
    sizes
      .map((size) => size?.trim())
      .filter((size): size is string => Boolean(size)),
  ));
}

export function getDotationSizeSuggestions(itemType?: DotationSizeConfig | null): string[] {
  const configuredSizes = normalizeSizes(itemType?.sizes_available ?? []);
  const fallbackSizes = itemType?.category?.toLowerCase().includes('calzado')
    ? FOOTWEAR_SIZE_SUGGESTIONS
    : CLOTHING_SIZE_SUGGESTIONS;

  return Array.from(new Set([...configuredSizes, ...fallbackSizes]));
}

export function getInventorySizeSuggestions(
  inventory: DotationInventorySize[],
  itemTypeId: string,
  operationCenterId?: string | null,
): string[] {
  if (!itemTypeId) return [];

  const sizes = inventory
    .filter((item) => {
      if (item.item_type !== itemTypeId) return false;
      if (operationCenterId === undefined) return true;
      if (operationCenterId === null) return item.operation_center_id === null;
      return item.operation_center_id === operationCenterId || item.operation_center_id === null;
    })
    .map((item) => item.size);

  return normalizeSizes(sizes).sort((left, right) => (
    left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' })
  ));
}
