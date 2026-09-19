import { ref } from 'vue'
import type { AxiosRequestConfig, AxiosResponse } from 'axios'

import api, { type ApiError, type ApiResult } from '@/lib/http'

export function useApi() {
  const loading = ref(false)

  async function request<T>(callback: () => Promise<AxiosResponse<T>>): Promise<ApiResult<T>> {
    loading.value = true

    try {
      const res = await callback()
      return { ok: true, data: res.data }
    } catch (e) {
      const error = e as ApiError

      if (error.type === 'validation' && error.errors) {
        return { ok: false, errors: error.errors }
      }

      throw e
    } finally {
      loading.value = false
    }
  }

  function get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return request(() => api.request<T>({ url, method: 'GET', ...config }))
  }

  function post<T, D = unknown>(
    url: string,
    data?: D,
    config?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> {
    return request(() => api.request<T>({ url, method: 'POST', data, ...config }))
  }

  function put<T, D = unknown>(
    url: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> {
    return request(() => api.request<T>({ url, method: 'PUT', data, ...config }))
  }

  function patch<T, D = unknown>(
    url: string,
    data: D,
    config?: AxiosRequestConfig,
  ): Promise<ApiResult<T>> {
    return request(() => api.request<T>({ url, method: 'PATCH', data, ...config }))
  }

  function del<T, D = unknown>(url: string, data?: D, config?: AxiosRequestConfig): Promise<ApiResult<T>> {
    return request(() => api.request<T>({ url, method: 'DELETE', data, ...config }))
  }

  return { get, post, put, patch, del, loading }
}
