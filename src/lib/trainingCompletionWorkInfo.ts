const TRAINING_WORK_INFO_BATCH_SIZE = 100;

interface WorkInfoQueryResult<Row, ErrorValue> {
  data: Row[] | null;
  error: ErrorValue | null;
}

export async function fetchTrainingCompletionWorkInfoRows<Row, ErrorValue = unknown>(
  employeeIds: string[],
  queryChunk: (
    employeeIds: string[]
  ) => PromiseLike<WorkInfoQueryResult<Row, ErrorValue>>
): Promise<{ data: Row[]; error: ErrorValue | null }> {
  const rows: Row[] = [];

  for (let index = 0; index < employeeIds.length; index += TRAINING_WORK_INFO_BATCH_SIZE) {
    const chunk = employeeIds.slice(index, index + TRAINING_WORK_INFO_BATCH_SIZE);
    const { data, error } = await queryChunk(chunk);

    if (error) return { data: rows, error };
    if (data) rows.push(...data);
  }

  return { data: rows, error: null };
}
