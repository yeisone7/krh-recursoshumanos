
import { PostgrestFilterBuilder } from '@supabase/postgrest-js';

/**
 * Executes a query in batches to avoid URL length limits with large IN filters.
 * @param ids List of IDs to filter by
 * @param batchSize Number of IDs per batch (default 100)
 * @param queryFn A function that takes a list of IDs and returns a Supabase query
 * @returns Combined results from all batches
 */
export async function batchQuery<T, R>(
  ids: T[],
  batchSize: number = 100,
  queryFn: (chunk: T[]) => Promise<{ data: R[] | null; error: any }>
): Promise<{ data: R[]; error: any | null }> {
  const results: R[] = [];
  
  if (!ids || ids.length === 0) {
    return { data: [], error: null };
  }

  for (let i = 0; i < ids.length; i += batchSize) {
    const chunk = ids.slice(i, i + batchSize);
    const { data, error } = await queryFn(chunk);
    
    if (error) {
      return { data: results, error };
    }
    
    if (data) {
      results.push(...data);
    }
  }

  return { data: results, error: null };
}
