type Page<T> = { rows: T[]; count: number };

// Retry once when the source changes during an offset-paginated read.
// Never replace the last successful dashboard with a known partial result.
export async function readCompleteEvents<T>(
  readPage: (offset: number, size: number) => Promise<Page<T>>,
  pageSize = 1000,
): Promise<T[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const rows: T[] = [];
    let expected: number | null = null;
    let stable = true;
    for (let offset = 0; ; offset += pageSize) {
      const page = await readPage(offset, pageSize);
      expected ??= page.count;
      if (page.count !== expected) stable = false;
      rows.push(...page.rows);
      if (page.rows.length < pageSize) break;
    }
    if (stable && rows.length === expected) return rows;
  }
  throw new Error("Leitura incompleta ou fonte alterada durante a paginação");
}