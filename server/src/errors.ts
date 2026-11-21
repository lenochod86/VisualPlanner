/** Chyba s HTTP kódem; Fastify ji převede na odpověď podle `statusCode`. */
export class AppError extends Error {
  constructor(message: string, readonly statusCode: number) {
    super(message)
  }
}

export const notFound = (what: string) => new AppError(`${what} nenalezen`, 404)
export const badRequest = (message: string) => new AppError(message, 400)
