import { ref } from 'vue'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

import api, { type ApiError, type ResponseErrors } from '@/lib/http'

export function useApi() {
  const loading = ref(false)
  const errors = ref<ResponseErrors | null>(null)

  async function request<T>(callback: () => Promise<AxiosResponse<T>>): Promise<T> {
    loading.value = true
    errors.value = null

    try {
      const res = await callback()
      return res.data
    } catch (e) {
      const error = e as ApiError

      if (error.type === 'validation' && error.errors) {
        errors.value = error.errors
        return null as unknown as T
      }

      throw e
    } finally {
      loading.value = false
    }
  }

  function get<T>(url: string, config?: AxiosRequestConfig) {
    return request(() => api.request<T>({ url, method: 'GET', ...config }))
  }

  function post<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig) {
    return request(() => api.request<T>({ url, method: 'POST', data, ...config }))
  }

  function put<T, D = unknown>(url: string, data: D, config?: AxiosRequestConfig) {
    return request(() => api.request<T>({ url, method: 'PUT', data, ...config }))
  }

  function del<T>(url: string, config?: AxiosRequestConfig) {
    return request(() => api.request<T>({ url, method: 'DELETE', ...config }))
  }

  return { get, post, put, del, loading, errors }
}
