import api from '../../lib/api'

export type EntryCard = {
  id: number
  notebook_id: number
  title?: string | null
  cover_image_url?: string | null
  date: string
  updated_at: string
  word_count: number
  image_count: number
  is_pinned: boolean
  mood?: Record<string, unknown> | null
  weather_snapshot?: Record<string, unknown> | null
}

export type CursorPage = {
  next_cursor: string | null
  has_more: boolean
}

export type TimelinePayload = {
  items: EntryCard[]
  page: CursorPage
}

export type PublicShareEntry = EntryCard & {
  content: Record<string, unknown>
  tags: string[]
}

export type PublicTimelinePayload = {
  items: PublicShareEntry[]
  page: CursorPage
}

export type PublicShareSummary = {
  share_type: 'diary' | 'notebook'
  diary?: EntryDetail
  notebook?: NotebookDetail
}

export type BookmarkSearchItem = {
  id?: string | number
  title?: string
  description?: string
  url: string
  image_url?: string | null
  created_at?: string
  tags?: unknown[]
}

export type StatsSummaryPayload = {
  summary: {
    total_words: number
    total_entries: number
    streak: number
  }
  mood_distribution: Array<{ label: string; count: number }>
  activity_trend: Array<{ day: string; count: number }>
}

export type HomePayload = {
  pinned: EntryCard[]
  recent: EntryCard[]
  on_this_day: EntryCard[]
}

export type NotebookDetail = {
  id: number
  name: string
  description?: string | null
  cover_url?: string | null
  stats_snapshot: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type EntryDetail = EntryCard & {
  content: Record<string, unknown>
  is_favorite: boolean
  location_snapshot?: { name?: string } | null
  weather_snapshot?: { weather?: string; temperature?: number } | null
  stats: Record<string, unknown>
  tags: string[]
}

async function collectAllPages<T extends { page: CursorPage; items: U[] }, U>(
  loader: (cursor?: string) => Promise<T>,
): Promise<U[]> {
  const items: U[] = []
  let cursor: string | undefined

  for (let i = 0; i < 50; i += 1) {
    const page = await loader(cursor)
    items.push(...page.items)
    if (!page.page.has_more || !page.page.next_cursor) {
      return items
    }
    cursor = page.page.next_cursor
  }

  return items
}

export const appQueryApi = {
  entryDetail: async (entryId: number): Promise<EntryDetail> => (await api.get(`/app/entries/${entryId}`)).data,
  home: async (): Promise<HomePayload> => (await api.get('/app/home')).data,
  notebookDetail: async (notebookId: number): Promise<NotebookDetail> => (await api.get(`/app/notebooks/${notebookId}`)).data,
  publicShareSummary: async (token: string): Promise<PublicShareSummary> => (await api.get(`/app/public/shares/${token}`)).data,
  statsSummary: async (days: number): Promise<StatsSummaryPayload> => (await api.get('/app/stats', { params: { days } })).data,
  searchEntries: async (params: { q?: string; tag?: string; mood?: string; weather?: string; notebookId?: number }): Promise<EntryCard[]> =>
    (
      await api.get('/app/search/entries', {
        params: {
          q: params.q,
          tag: params.tag,
          mood: params.mood,
          weather: params.weather,
          notebook_id: params.notebookId,
        },
      })
    ).data,
  searchBookmarks: async (params: { q?: string; tag?: string }): Promise<BookmarkSearchItem[]> =>
    (
      await api.get('/app/search/bookmarks', {
        params: { q: params.q, tag: params.tag },
      })
    ).data,
  timelinePage: async (params?: { cursor?: string; limit?: number; notebookId?: number }): Promise<TimelinePayload> =>
    (
      await api.get('/app/timeline', {
        params: {
          cursor: params?.cursor,
          limit: params?.limit,
          notebook_id: params?.notebookId,
        },
      })
    ).data,
  timelineAll: async (params?: { notebookId?: number; limit?: number }) =>
    collectAllPages((cursor) => appQueryApi.timelinePage({ cursor, limit: params?.limit, notebookId: params?.notebookId })),
  notebookEntriesPage: async (notebookId: number, params?: { cursor?: string; limit?: number }): Promise<TimelinePayload> =>
    (
      await api.get(`/app/notebooks/${notebookId}/entries`, {
        params: { cursor: params?.cursor, limit: params?.limit },
      })
    ).data,
  notebookEntriesAll: async (notebookId: number, params?: { limit?: number }) =>
    collectAllPages((cursor) => appQueryApi.notebookEntriesPage(notebookId, { cursor, limit: params?.limit })),
  publicShareEntriesPage: async (token: string, params?: { cursor?: string; limit?: number }): Promise<PublicTimelinePayload> =>
    (
      await api.get(`/app/public/shares/${token}/entries`, {
        params: { cursor: params?.cursor, limit: params?.limit },
      })
    ).data,
  publicShareEntriesAll: async (token: string, params?: { limit?: number }) =>
    collectAllPages((cursor) => appQueryApi.publicShareEntriesPage(token, { cursor, limit: params?.limit })),
}
