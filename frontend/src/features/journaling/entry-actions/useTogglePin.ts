import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useToast } from '../../../hooks/useToast'
import { diaryApi } from '../../../lib/api'
import type { HomePayload, TimelinePayload } from '../../../shared/api/appQuery'

type DiaryRecord = {
  id: number
  is_pinned?: boolean
}

type TogglePinContext = {
  previousDiary?: DiaryRecord
}

type NotebookEntriesKey = ['app', 'notebook', number, 'entries']

/**
 * useTogglePin - 统一的日记置顶/取消置顶 hook
 * 
 * 功能：
 * - 乐观更新：立即更新 UI，无需等待 API 响应
 * - 全局同步：更新所有相关的缓存（单个日记 + 所有列表 + timeline）
 * - 错误回滚：API 失败时自动回滚到之前的状态
 * - 统一提示：统一的 toast 消息
 */
export function useTogglePin(diaryId: number, currentPinned: boolean) {
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)

  return useMutation({
    mutationFn: () => diaryApi.togglePin(diaryId),
    
    onMutate: async () => {
      // 取消正在进行的查询，防止乐观更新被覆盖
      await queryClient.cancelQueries({ queryKey: ['diaries'] })
      await queryClient.cancelQueries({ queryKey: ['timeline'] })
      await queryClient.cancelQueries({ queryKey: ['diary', diaryId] })
      await queryClient.cancelQueries({ queryKey: ['app', 'home'] })
      await queryClient.cancelQueries({ queryKey: ['app', 'timeline'] })
      await queryClient.cancelQueries({ queryKey: ['app', 'entry', diaryId] })
      await queryClient.cancelQueries({ queryKey: ['app', 'notebook'] })

      // 保存旧值以便回滚
      const previousDiary = queryClient.getQueryData<DiaryRecord>(['diary', diaryId])

      // 乐观更新单个日记
      queryClient.setQueryData<DiaryRecord>(['diary', diaryId], (old) => ({
        ...old,
        is_pinned: !old?.is_pinned
      }))

      // 乐观更新所有 diaries 列表
      queryClient.setQueriesData<DiaryRecord[]>({ queryKey: ['diaries'] }, (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((d) =>
          d.id === diaryId ? { ...d, is_pinned: !d.is_pinned } : d
        )
      })

      // 乐观更新所有 timeline 列表
      queryClient.setQueriesData<DiaryRecord[]>({ queryKey: ['timeline'] }, (old) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((d) =>
          d.id === diaryId ? { ...d, is_pinned: !d.is_pinned } : d
        )
      })

      queryClient.setQueryData<HomePayload | undefined>(['app', 'home'], (old) => {
        if (!old) return old
        const updateItems = (items: DiaryRecord[] | undefined) =>
          Array.isArray(items)
            ? items.map((d) => (d.id === diaryId ? { ...d, is_pinned: !d.is_pinned } : d))
            : items
        return {
          ...old,
          pinned: updateItems(old.pinned),
          recent: updateItems(old.recent),
          on_this_day: updateItems(old.on_this_day),
        }
      })

      queryClient.setQueriesData<TimelinePayload>({ queryKey: ['app', 'timeline'] }, (old) => {
        if (!old || !Array.isArray(old.items)) return old
        return {
          ...old,
          items: old.items.map((d: DiaryRecord) =>
            d.id === diaryId ? { ...d, is_pinned: !d.is_pinned } : d
          ),
        }
      })

      const notebookQueries = queryClient.getQueriesData<DiaryRecord[]>({ queryKey: ['app', 'notebook'] })
      notebookQueries.forEach(([queryKey, queryData]) => {
        if (!Array.isArray(queryData)) return
        queryClient.setQueryData(queryKey as NotebookEntriesKey, queryData.map((d) =>
          d.id === diaryId ? { ...d, is_pinned: !d.is_pinned } : d
        ))
      })

      return { previousDiary }
    },

    onError: (...args) => {
      const context = args[2] as TogglePinContext | undefined
      // 回滚到之前的状态
      if (context?.previousDiary) {
        queryClient.setQueryData(['diary', diaryId], context.previousDiary)
      }
      // 重新获取数据
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['app', 'home'] })
      queryClient.invalidateQueries({ queryKey: ['app', 'timeline'] })
      queryClient.invalidateQueries({ queryKey: ['app', 'entry', diaryId] })
      queryClient.invalidateQueries({ queryKey: ['app', 'notebook'] })
      addToast('error', 'Failed to toggle pin')
    },

    onSettled: () => {
      // 无论成功失败，重新获取数据确保与服务器同步
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['diary', diaryId] })
      queryClient.invalidateQueries({ queryKey: ['app', 'home'] })
      queryClient.invalidateQueries({ queryKey: ['app', 'timeline'] })
      queryClient.invalidateQueries({ queryKey: ['app', 'entry', diaryId] })
      queryClient.invalidateQueries({ queryKey: ['app', 'notebook'] })
    },

    onSuccess: () => {
      addToast('success', currentPinned ? 'Unpinned' : 'Pinned')
    }
  })
}
