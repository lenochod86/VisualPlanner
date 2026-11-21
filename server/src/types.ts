// Server projekt neinterpretuje: místnosti, překážky a nábytek ukládá jako neprůhledné JSON dokumenty.
// Jejich tvar vlastní klient (web/src/domain/types.ts); server hlídá jen, že jde o pole (nábytek je nepovinný).

export interface ProjectInput {
  rooms: unknown[]
  obstacles: unknown[]
  furniture?: unknown[]   // starší klienti ho neposílají
}

export interface ProjectDocument extends Required<ProjectInput> {
  updatedAt: string
}

export interface ProjectSummary {
  id: string
  updatedAt: string
}
