/** Exécute des tâches avec un nombre limité en parallèle (rester poli avec les sources). */
export async function pool<T, R>(
  items: readonly T[],
  size: number,
  fn: (x: T) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const out: PromiseSettledResult<R>[] = new Array<PromiseSettledResult<R>>(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, items.length) }, async () => {
      while (i < items.length) {
        const k = i++;
        try {
          out[k] = { status: 'fulfilled', value: await fn(items[k]!) };
        } catch (reason) {
          out[k] = { status: 'rejected', reason };
        }
      }
    }),
  );
  return out;
}
