interface Delivery {
  id: string;
  employee_id: string;
  dotation_item_type_id?: string | null;
  item_name: string;
  delivery_date: string;
  created_at: string;
}

export function getRenewedDotationIds(deliveries: Delivery[]): Set<string> {
  const latestByCatalog = new Map<string, string>();
  const latestByName = new Map<string, string>();
  const latestLegacyByName = new Map<string, string>();
  const order = (delivery: Delivery) => `${delivery.delivery_date}|${delivery.created_at}`;
  const nameKey = (delivery: Delivery) =>
    JSON.stringify([delivery.employee_id, delivery.item_name.trim().toLowerCase()]);
  const catalogKey = (delivery: Delivery) =>
    JSON.stringify([delivery.employee_id, delivery.dotation_item_type_id]);
  const recordLatest = (index: Map<string, string>, key: string, value: string) => {
    if (value > (index.get(key) ?? '')) index.set(key, value);
  };

  for (const delivery of deliveries) {
    const value = order(delivery);
    recordLatest(latestByName, nameKey(delivery), value);
    if (delivery.dotation_item_type_id) {
      recordLatest(latestByCatalog, catalogKey(delivery), value);
    } else {
      recordLatest(latestLegacyByName, nameKey(delivery), value);
    }
  }

  return new Set(deliveries.filter(delivery => {
    const value = order(delivery);
    const name = nameKey(delivery);
    if (!delivery.dotation_item_type_id) return (latestByName.get(name) ?? '') > value;
    return (latestByCatalog.get(catalogKey(delivery)) ?? '') > value
      || (latestLegacyByName.get(name) ?? '') > value;
  }).map(delivery => delivery.id));
}
