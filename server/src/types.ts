// Server projekt neinterpretuje: místnosti a překážky ukládá jako neprůhledné JSON dokumenty.
// Jejich tvar vlastní klient (web/src/domain/types.ts); server hlídá jen, že jde o dvě pole.

export interface ProjectInput {
  rooms: unknown[]
  obstacles: unknown[]
}

export interface ProjectDocument extends ProjectInput {
  updatedAt: string
}

export interface ProjectSummary {
  id: string
  updatedAt: string
}
