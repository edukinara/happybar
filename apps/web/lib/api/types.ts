export interface APIRes<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export async function apiRequest<T>(
  request: () => Promise<APIRes<T>>,
  errorMessage: string = 'Request failed'
): Promise<T> {
  const response = await request()
  if (!response.success || !response.data) {
    throw new Error(response.error || errorMessage)
  }
  return response.data
}