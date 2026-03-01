import axios from 'axios'

const getBaseUrl = () => {
  const storedUrl = localStorage.getItem('server_url')
  if (storedUrl) {
    // Ensure no trailing slash for consistency
    return `${storedUrl.replace(/\/$/, '')}/api`
  }
  return '/api'
}

const api = axios.create({ baseURL: getBaseUrl() })

export const updateApiBaseUrl = (url: string) => {
  localStorage.setItem('server_url', url)
  api.defaults.baseURL = getBaseUrl()
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  r => r,
  e => {
    if (e.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.reload()
    }
    return Promise.reject(e)
  }
)

export const authApi = {
  login: async (p: URLSearchParams) => (await api.post('/auth/login', p)).data
}

export const assetApi = {
  uploadCover: async (f: File) => {
    const fd = new FormData(); fd.append('file', f)
    return (await api.post('/assets/upload-cover', fd)).data
  },
  uploadVideo: async (f: File) => {
    const fd = new FormData(); fd.append('file', f)
    return (await api.post('/assets/upload-video', fd)).data
  },
  uploadAudio: async (f: File) => {
    const fd = new FormData(); fd.append('file', f)
    return (await api.post('/assets/upload-audio', fd)).data
  },
  uploadMedia: async (f: File) => {
    const fd = new FormData(); fd.append('file', f)
    return (await api.post('/assets/upload-media', fd)).data
  }
}

export const notebookApi = {
  list: async (limit?: number, offset?: number) => (await api.get('/notebooks/', { params: { limit, offset } })).data,
  get: async (id: number) => (await api.get(`/notebooks/${id}`)).data,
  create: async (n: any) => (await api.post('/notebooks/', n)).data,
  update: async (id: number, n: any) => (await api.put(`/notebooks/${id}`, n)).data,
  delete: async (id: number) => (await api.delete(`/notebooks/${id}`)).data,
  ensureDraft: async () => (await api.get('/notebooks/drafts/ensure')).data
}

export const diaryApi = {
  recent: async (limit?: number, offset?: number) => (await api.get('/diaries/recent', { params: { limit, offset } })).data,
  pinned: async () => (await api.get('/diaries/pinned')).data,
  lastYearToday: async () => (await api.get('/diaries/last-year-today')).data,
  get: async (id: number) => (await api.get(`/diaries/${id}`)).data,
  listByNotebook: async (id: number, limit?: number, offset?: number) => (await api.get(`/diaries/notebook/${id}`, { params: { limit, offset } })).data,
  create: async (d: any) => (await api.post('/diaries/', d)).data,
  update: async (id: number, d: any) => (await api.put(`/diaries/${id}`, d)).data,
  delete: async (id: number) => (await api.delete(`/diaries/${id}`)).data,
  togglePin: async (id: number) => (await api.post(`/diaries/${id}/toggle-pin`)).data
}

export const timelineApi = {
  list: async (notebookId?: number) => (await api.get('/timeline/', { params: { notebook_id: notebookId } })).data,
  search: async (params: any) => (await api.get('/timeline/', { params })).data
}

export const searchApi = {
  unified: async (params: any) => (await api.get('/search/unified', { params })).data
}

export const statsApi = {
  get: async (days: number = 30) => (await api.get('/stats/', { params: { days } })).data
}

export const amapApi = {
  regeo: async (location: string, coordsys?: string) => 
    (await api.get('/proxy/amap/regeo', { params: { location, ...(coordsys && { coordsys }) } })).data,
  search: async (keywords: string) => (await api.get('/proxy/amap/search', { params: { keywords } })).data,
  getWeather: async (city: string) => (await api.get('/proxy/amap/weather', { params: { city_code: city } })).data
}

export const karakeepApi = {
  listBookmarks: async (limit: number = 20, cursor?: string) => 
    (await api.get('/proxy/karakeep/bookmarks', { params: { limit, ...(cursor && { cursor }) } })).data
}

export const immichApi = {
  listAssets: async () => (await api.get('/proxy/immich/assets')).data,
  importAsset: async (id: string, mode: 'link' | 'copy') => 
    (await api.post('/proxy/immich/import', null, { params: { asset_id: id, mode } })).data
}

export const notionApi = {
  search: async (query: string = '', pageSize: number = 20, startCursor?: string) => 
    (await api.get('/proxy/notion/search', { params: { query, page_size: pageSize, ...(startCursor && { start_cursor: startCursor }) } })).data,
  getPage: async (pageId: string) => 
    (await api.get(`/proxy/notion/page/${pageId}`)).data,
  getBlockChildren: async (blockId: string) => 
    (await api.get(`/proxy/notion/block/${blockId}/children`)).data
}

export const crawlerApi = {
  check: async () => (await api.get('/crawler/check')).data,
  getStatus: async () => (await api.get('/crawler/status')).data,
  crawlXhs: async (url: string, enable_comments: boolean = false) => (await api.post('/crawler/xhs', { url, enable_comments })).data,
  getXhsPost: async (noteId: string) => (await api.get(`/crawler/xhs/${noteId}`)).data,
  crawlBili: async (url: string, enable_comments: boolean = false) => (await api.post('/crawler/bili', { url, enable_comments })).data,
  getBiliVideo: async (videoId: string) => (await api.get(`/crawler/bili/${videoId}`)).data
}

export const userApi = {
  me: async () => (await api.get('/users/me')).data,
  updateProfile: async (data: any) => (await api.patch('/users/me', data)).data,
  updatePassword: async (data: any) => (await api.patch('/users/me/password', data)).data,
  updateImmich: async (data: any) => (await api.patch('/users/me/immich', data)).data,
  updateKarakeep: async (data: any) => (await api.patch('/users/me/karakeep', data)).data,
  updateNotion: async (data: any) => (await api.patch('/users/me/notion', data)).data,
  updateAI: async (data: any) => (await api.patch('/users/me/ai', data)).data,
  updateGeo: async (data: any) => (await api.patch('/users/me/geo', data)).data,
  createUser: async (data: any) => (await api.post('/users/', data)).data,
  // Admin user management
  listAll: async () => (await api.get('/users/')).data,
  updateRole: async (userId: number, role: string) => (await api.patch(`/users/${userId}/role`, { role })).data,
  resetPassword: async (userId: number, newPassword: string) => (await api.patch(`/users/${userId}/password`, { new_password: newPassword })).data,
  deleteUser: async (userId: number) => (await api.delete(`/users/${userId}`)).data,
  exportDb: async () => {
    const res = await api.get('/users/system/export', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url; link.setAttribute('download', 'journey_backup.db')
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  },
  importDb: async (file: File) => {
    const fd = new FormData(); fd.append('file', file)
    return (await api.post('/users/system/import', fd)).data
  },
  getOrphanFiles: async () => (await api.get('/users/system/orphan-files')).data,
  deleteOrphanFiles: async (paths: string[]) => (await api.delete('/users/system/orphan-files', { data: { paths } })).data
}

export const shareApi = {
  list: async () => (await api.get('/share/')).data,
  create: async (data: { diary_id?: number; notebook_id?: number; expires_in_days?: number | null }) => (await api.post('/share/', data)).data,
  update: async (id: number, data: { expires_at: string | null }) => (await api.patch(`/share/${id}`, data)).data,
  delete: async (id: number) => (await api.delete(`/share/${id}`)).data,
  getPublic: async (token: string) => (await api.get(`/share/${token}`)).data
}

export const taskApi = {
  list: async () => (await api.get('/tasks/')).data,
  toggle: async (taskName: string, enabled: boolean) => (await api.patch(`/tasks/${taskName}/toggle`, { enabled })).data,
  update: async (taskName: string, data: { is_enabled?: boolean; cron_expr?: string }) => 
    (await api.patch(`/tasks/${taskName}`, data)).data
}

export default api
