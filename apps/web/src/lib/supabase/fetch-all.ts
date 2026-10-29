/** The Data API returns at most 1000 rows per request (`max_rows`) and truncates silently. */
const PAGE_SIZE = 1000;

/**
 * Reads every row by paging `from..to` until a short page. The query must have a stable order
 * (a unique column last) or rows can repeat or be skipped between pages.
 */
export async function fetchAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (;;) {
    const { data, error } = await page(rows.length, rows.length + PAGE_SIZE - 1);
    if (error) throw error;
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE_SIZE) return rows;
  }
}
