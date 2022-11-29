/** A lazily provided value. The returned value can't be a Function. */
export type Into<X> =
  | X
  | PromiseLike<X>
  | (()=>X)
  | (()=>PromiseLike<X>)

/** Resolve a lazily provided value. */
export async function into <X, Y> (specifier: Into<X>, context?: Y): Promise<X> {
  if (typeof specifier === 'function') {
    if (context) specifier = specifier.bind(context)
    return await Promise.resolve((specifier as Function)())
  }
  return await Promise.resolve(specifier)
}

/** A lazily provided array of lazily provided values. */
export type IntoArray<X> = Into<Array<Into<X>>>

/** Resolve a lazy array. */
export async function intoArray <X, Y> (specifier: IntoArray<X>, context?: Y): Promise<X[]> {
  specifier = await into(specifier)
  return await Promise.all((specifier as Array<Into<X>>).map(x=>into(x, context)))
}

/** A lazily provided record of lazily provided values. */
export type IntoRecord<X extends string|number|symbol, Y> = Into<Record<X, Into<Y>>>

/** Resolve a lazy record. */
export async function intoRecord <X extends string|number|symbol, Y, Z> (
  specifier: IntoRecord<X, Y>, context?: Z
): Promise<Record<X, Y>> {
  specifier = await into(specifier)
  const entries:  [X, Into<Y>][] = Object.entries(specifier) as [X, Into<Y>][]
  const resolved: Y[]            = await Promise.all(entries.map(entry=>into(entry[1])))
  const results:  Record<X, Y>   = {} as Record<X, Y>
  for (const index in resolved) {
    const [key] = entries[index]
    const result = resolved[index]
    results[key] = result
  }
  return results
}
