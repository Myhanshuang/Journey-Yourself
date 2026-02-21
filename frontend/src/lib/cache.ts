/**
 * 日记缓存管理工具
 * 用于自动保存和恢复日记编辑状态
 */

export interface DiaryCache {
  cacheId: string           // 缓存唯一标识: 'new' 或 'edit_{diaryId}'
  diaryId?: number          // 如果是编辑现有日记，记录其ID
  title: string
  content: any              // Tiptap JSON内容
  notebookId: number
  mood: any
  location: any
  weather: any
  tags: string[]
  cachedAt: number          // 缓存时间戳
  isNewDiary: boolean       // 是否是新日记（未保存到服务器的）
  originalCreatedAt?: string // 如果是编辑，记录原始创建时间
}

const CACHE_KEY_PREFIX = 'journey_diary_cache_'
const CACHE_KEY_NEW = `${CACHE_KEY_PREFIX}new`
const CACHE_KEY_EDIT = `${CACHE_KEY_PREFIX}edit_`

/**
 * 生成缓存key
 */
function getCacheKey(diaryId?: number): string {
  if (diaryId) {
    return `${CACHE_KEY_EDIT}${diaryId}`
  }
  return CACHE_KEY_NEW
}

/**
 * 保存日记缓存到localStorage
 */
export function saveDiaryCache(cache: Omit<DiaryCache, 'cachedAt'>): void {
  const fullCache: DiaryCache = {
    ...cache,
    cachedAt: Date.now()
  }
  const key = getCacheKey(cache.diaryId)
  try {
    localStorage.setItem(key, JSON.stringify(fullCache))
  } catch (e) {
    console.error('Failed to save diary cache:', e)
    // 如果存储空间不足，尝试清理旧缓存
    clearAllCaches()
    try {
      localStorage.setItem(key, JSON.stringify(fullCache))
    } catch (e2) {
      console.error('Failed to save diary cache after cleanup:', e2)
    }
  }
}

/**
 * 获取新日记的缓存
 */
export function getNewDiaryCache(): DiaryCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY_NEW)
    if (!raw) return null
    const cache = JSON.parse(raw) as DiaryCache
    // 验证缓存有效性
    if (!cache.notebookId || !cache.cachedAt) return null
    return cache
  } catch (e) {
    console.error('Failed to read new diary cache:', e)
    return null
  }
}

/**
 * 获取编辑日记的缓存
 */
export function getEditDiaryCache(diaryId: number): DiaryCache | null {
  try {
    const key = `${CACHE_KEY_EDIT}${diaryId}`
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const cache = JSON.parse(raw) as DiaryCache
    // 验证缓存有效性
    if (!cache.notebookId || !cache.cachedAt) return null
    return cache
  } catch (e) {
    console.error('Failed to read edit diary cache:', e)
    return null
  }
}

/**
 * 获取任意一个可用的缓存（用于进入编辑页面时的检测）
 * 优先返回新日记缓存，如果没有则返回第一个编辑缓存
 */
export function getAnyDiaryCache(): DiaryCache | null {
  // 先检查新日记缓存
  const newCache = getNewDiaryCache()
  if (newCache) return newCache

  // 查找所有编辑缓存
  const caches = getAllEditCaches()
  return caches.length > 0 ? caches[0] : null
}

/**
 * 获取所有编辑缓存
 */
export function getAllEditCaches(): DiaryCache[] {
  const caches: DiaryCache[] = []
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_EDIT)) {
        try {
          const raw = localStorage.getItem(key)
          if (raw) {
            const cache = JSON.parse(raw) as DiaryCache
            if (cache.notebookId && cache.cachedAt) {
              caches.push(cache)
            }
          }
        } catch (e) {
          // 单个缓存解析失败，跳过
        }
      }
    }
    // 按缓存时间排序，最新的在前
    caches.sort((a, b) => b.cachedAt - a.cachedAt)
  } catch (e) {
    console.error('Failed to get all edit caches:', e)
  }
  return caches
}

/**
 * 清除新日记缓存
 */
export function clearNewDiaryCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY_NEW)
  } catch (e) {
    console.error('Failed to clear new diary cache:', e)
  }
}

/**
 * 清除编辑日记缓存
 */
export function clearEditDiaryCache(diaryId: number): void {
  try {
    const key = `${CACHE_KEY_EDIT}${diaryId}`
    localStorage.removeItem(key)
  } catch (e) {
    console.error('Failed to clear edit diary cache:', e)
  }
}

/**
 * 清除指定缓存
 */
export function clearDiaryCache(cacheId: string, diaryId?: number): void {
  if (cacheId === 'new') {
    clearNewDiaryCache()
  } else if (diaryId) {
    clearEditDiaryCache(diaryId)
  }
}

/**
 * 清除所有日记缓存
 */
export function clearAllCaches(): void {
  try {
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        keysToRemove.push(key)
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key))
  } catch (e) {
    console.error('Failed to clear all caches:', e)
  }
}

/**
 * 检查是否有任何缓存
 */
export function hasAnyCache(): boolean {
  // 检查新日记缓存
  if (getNewDiaryCache()) return true
  
  // 检查编辑缓存
  const caches = getAllEditCaches()
  return caches.length > 0
}

/**
 * 格式化缓存时间为可读字符串
 */
export function formatCacheTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`
  
  return date.toLocaleDateString('en', { 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * 检查缓存内容是否为空
 */
export function isCacheEmpty(cache: DiaryCache): boolean {
  const hasTitle = cache.title && cache.title.trim().length > 0
  const hasContent = cache.content && 
    cache.content.content && 
    cache.content.content.length > 0 &&
    !isContentOnlyEmptyParagraph(cache.content)
  
  return !hasTitle && !hasContent
}

/**
 * 检查内容是否只包含空段落
 */
function isContentOnlyEmptyParagraph(content: any): boolean {
  if (!content.content || content.content.length === 0) return true
  if (content.content.length === 1) {
    const node = content.content[0]
    if (node.type === 'paragraph' && (!node.content || node.content.length === 0)) {
      return true
    }
  }
  return false
}

// DiaryCache 已经通过 export interface 导出
// 这里不需要再次导出
