import axios from 'axios'

export const getApiBaseUrl = () => {
  const storedUrl = localStorage.getItem('server_url')
  if (storedUrl) {
    return `${storedUrl.replace(/\/$/, '')}/api`
  }
  return '/api'
}

export const apiClient = axios.create({ baseURL: getApiBaseUrl() })

export const updateApiBaseUrl = (url: string) => {
  localStorage.setItem('server_url', url)
  apiClient.defaults.baseURL = getApiBaseUrl()
}

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.reload()
    }
    return Promise.reject(error)
  },
)
