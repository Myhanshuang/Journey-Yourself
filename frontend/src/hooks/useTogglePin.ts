import { useMutation, useQueryClient } from '@tanstack/react-query'
import { diaryApi } from '../lib/api'
import { useToast } from '../components/ui/JourneyUI'

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

      // 保存旧值以便回滚
      const previousDiary = queryClient.getQueryData(['diary', diaryId])

      // 乐观更新单个日记
      queryClient.setQueryData(['diary', diaryId], (old: any) => ({
        ...old,
        is_pinned: !old?.is_pinned
      }))

      // 乐观更新所有 diaries 列表
      queryClient.setQueriesData({ queryKey: ['diaries'] }, (old: any) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((d: any) =>
          d.id === diaryId ? { ...d, is_pinned: !d.is_pinned } : d
        )
      })

      // 乐观更新所有 timeline 列表
      queryClient.setQueriesData({ queryKey: ['timeline'] }, (old: any) => {
        if (!old || !Array.isArray(old)) return old
        return old.map((d: any) =>
          d.id === diaryId ? { ...d, is_pinned: !d.is_pinned } : d
        )
      })

      return { previousDiary }
    },

    onError: (err, variables, context) => {
      // 回滚到之前的状态
      if (context?.previousDiary) {
        queryClient.setQueryData(['diary', diaryId], context.previousDiary)
      }
      // 重新获取数据
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      addToast('error', 'Failed to toggle pin')
    },

    onSettled: () => {
      // 无论成功失败，重新获取数据确保与服务器同步
      queryClient.invalidateQueries({ queryKey: ['diaries'] })
      queryClient.invalidateQueries({ queryKey: ['timeline'] })
      queryClient.invalidateQueries({ queryKey: ['diary', diaryId] })
    },

    onSuccess: () => {
      addToast('success', currentPinned ? 'Unpinned' : 'Pinned')
    }
  })
}
