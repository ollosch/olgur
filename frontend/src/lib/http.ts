import axios from 'axios'
import type { AxiosError, AxiosRequestConfig } from 'axios'

export interface ResponseErrors {
  [key: string]: string
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; errors: ResponseErrors }

export type ApiError =
  | { type: 'validation'; errors: ResponseErrors }
  | { type: 'auth'; message?: string }
  | { type: 'forbidden'; message?: string }
  | { type: 'conflict'; message?: string }
  | { type: 'network'; message?: string }
  | { type: 'unknown'; original?: unknown }

export type LaravelErrors = Record<string, string[] | string>

const API_ERROR_TYPES = ['validation', 'auth', 'forbidden', 'conflict', 'network', 'unknown'] as const

export function isApiError(value: unknown): value is ApiError {
  if (typeof value !== 'object' || value === null) return false
  const type = (value as { type?: unknown }).type
  return typeof type === 'string' && (API_ERROR_TYPES as readonly string[]).includes(type)
}

const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost/api',
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
})

axiosInstance.interceptors.response.use(
  (response) => response,
  async (e) => {
    const error = e as AxiosError
    const status = error.response?.status
    const data = error.response?.data as { message?: string; errors?: LaravelErrors }

    const handled = handleHttpErrors(status, data)
    if (handled) return Promise.reject(handled)

    if (!error.response) {
      return Promise.reject({ type: 'network', message: error.message } as ApiError)
    }

    return Promise.reject({ type: 'unknown', original: data } as ApiError)
  },
)

export function handleHttpErrors(
  status: number | undefined,
  data: { message?: string; errors?: LaravelErrors },
): ApiError | false {
  const message = data?.message

  switch (status) {
    case 401:
      return { type: 'auth', message }
    case 403:
      if (message === 'Already authenticated.') {
        return { type: 'auth', message }
      }
      return { type: 'forbidden', message }
    case 409:
      return { type: 'conflict', message }
    case 422: {
      if (data.errors) {
        return { type: 'validation', errors: mapLaravelErrors(data.errors) }
      }
      break
    }
  }

  return false
}

function mapLaravelErrors(laravelErrors: LaravelErrors) {
  const errors: ResponseErrors = {}

  if (laravelErrors) {
    Object.keys(laravelErrors).forEach((key) => {
      const errorValue = laravelErrors[key]

      if (errorValue) {
        errors[key] = Array.isArray(errorValue) ? errorValue[0] || '' : errorValue
      }
    })
  }
  return errors
}

export async function request<T>(config: AxiosRequestConfig): Promise<T> {
  const res = await axiosInstance.request<T>(config)
  return res.data
}

export default axiosInstance
