import { useQueryClient } from '@tanstack/react-query'
import { diaryApi } from '../lib/api'
import { useToast } from '../components/ui/JourneyUI'
import { useConfirm } from './useConfirm'

/**
 * useDeleteDiary - 统一的日记删除 hook
 * 
 * 功能：
 * - 确认对话框：删除前显示确认对话框
 * - 乐观更新：立即从列表中移除
 * - 统一提示：统一的 toast 消息
 */
export function useDeleteDiary() {
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const askConfirm = useConfirm(state => state.ask)

  const deleteDiary = (diaryId: number, diaryTitle?: string) => {
    askConfirm(
      "Erase Memory?",
      diaryTitle 
        ? `"${diaryTitle}" will be lost in time. Are you sure?`
        : "This thought will be lost in time. Are you sure?",
      async () => {
        try {
          await diaryApi.delete(diaryId)
          // 使所有相关查询失效
          queryClient.invalidateQueries({ queryKey: ['diaries'] })
          queryClient.invalidateQueries({ queryKey: ['timeline'] })
          queryClient.invalidateQueries({ queryKey: ['diary', diaryId] })
          queryClient.invalidateQueries({ queryKey: ['notebook'] })
          addToast('success', 'Memory erased')
        } catch (error) {
          addToast('error', 'Failed to erase memory')
        }
      },
      'danger'
    )
  }

  return { deleteDiary }
}