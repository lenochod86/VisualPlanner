// Server projekt neinterpretuje: místnosti, překážky, nábytek i elektro ukládá jako neprůhledné JSON dokumenty.
// Jejich tvar vlastní klient (web/src/domain/types.ts); server hlídá jen, že jde o pole.

/** Kolekce, které musí klient poslat vždy. */
export const REQUIRED_COLLECTIONS = ['rooms', 'obstacles'] as const
/** Pozdější přírůstky; starší klienti je neposílají, server pak uloží prázdné pole. */
export const OPTIONAL_COLLECTIONS = ['furniture', 'electric', 'cables'] as const

type Collections<K extends readonly string[]> = { [P in K[number]]: unknown[] }

export type ProjectInput = Collections<typeof REQUIRED_COLLECTIONS> & Partial<Collections<typeof OPTIONAL_COLLECTIONS>>

export type ProjectDocument = Collections<typeof REQUIRED_COLLECTIONS> & Collections<typeof OPTIONAL_COLLECTIONS> & {
  updatedAt: string
}

export interface ProjectSummary {
  id: string
  updatedAt: string
}
