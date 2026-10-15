// Thin fetch wrapper around the lume-backend. Every backend route is mounted
// under `/api` and replies with a `{ success, data, message }` envelope; this
// unwraps `data` and throws a readable Error on failure.

const BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

type Envelope<T> = {
  success: boolean
  data?: T
  message?: string
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!BASE) {
    throw new ApiError('VITE_API_URL is not set', 0)
  }

  const url = `${BASE}/api${path.startsWith('/') ? path : `/${path}`}`

  // For multipart uploads (FormData) let the browser set Content-Type (with the
  // boundary); only default to JSON for everything else.
  const isFormData = options.body instanceof FormData
  const headers: Record<string, string> = isFormData
    ? { ...(options.headers as Record<string, string> | undefined) }
    : { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> | undefined) }

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers,
    })
  } catch (err) {
    // Network / CORS failure — surface a clean message, not the raw TypeError.
    throw new ApiError(
      `Network error reaching ${url}: ${(err as Error).message}`,
      0,
    )
  }

  let body: Envelope<T> | null = null
  try {
    body = (await res.json()) as Envelope<T>
  } catch {
    // Non-JSON response (e.g. an HTML error page)
  }

  if (!res.ok || !body?.success) {
    throw new ApiError(
      body?.message ?? `Request to ${path} failed (${res.status})`,
      res.status,
    )
  }

  return body.data as T
}
