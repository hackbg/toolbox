export type MaybeAsync<T> = T|PromiseLike<T>

export type Name = string

export type Named<T> = Record<Name, T>

export type Many<T> = Array<T>|Named<T>

function map <T, U> (data: Many<T>,  fn: (x: T, i: keyof typeof data)=>U): Many<U>
function map <T, U> (data: Array<T>, fn: (x: T, i: keyof typeof data)=>U): Array<U>
function map <T, U> (data: Named<T>, fn: (x: T, i: keyof typeof data)=>U): Named<U>
function map <T, U> (data: Many<T>,  fn: (x:unknown, i: keyof typeof data)=>unknown): Many<T> {
  const result = (data instanceof Array) ? [] : {};
  for (const [key, val] of Object.entries(data as any)) {
    ;(result as any)[key] = fn(val, key as keyof typeof data)
  }
  return result
}

export { map }

function mapAsync <T, U> (data: Many<T>,  fn: (x: T, i: keyof typeof data)=>MaybeAsync<U>): Promise<Many<U>>
function mapAsync <T, U> (data: Array<T>, fn: (x: T, i: keyof typeof data)=>MaybeAsync<U>): Promise<Array<U>>
function mapAsync <T, U> (data: Named<T>, fn: (x: T, i: keyof typeof data)=>MaybeAsync<U>): Promise<Named<U>>
function mapAsync <T, U> (data: Many<T>,  fn: (x: T, i: keyof typeof data)=>MaybeAsync<U>): Promise<Named<U>> {
  const result: Named<U> = ((data instanceof Array) ? [] : {}) as unknown as Named<U>
  const values = []
  for (const [key, val] of Object.entries(data)) {
    (result as any)[key] = undefined
    values.push(
      Promise.resolve(fn(val, key as keyof typeof data))
        .then((resolved: unknown)=>(result as any)[key] = resolved)
    )
  }
  return Promise.all(values).then(()=>result)
}

export { mapAsync }

export const call = (x: Function, ...args: unknown[]) => x(...args)

export function pluralize (x: unknown[], singular: string, plural: string) {
  return (x.length > 1) ? `${x.length} ${plural}` : `${x.length} ${singular}`
}
