/**
 * EditView - 编辑日记页面
 * 
 * 流程：
 * 1. 进入页面 → 加载日记数据 → 检测该日记的编辑缓存
 * 2. 有缓存 → 显示 CacheRecoveryModal
 * 3. 无缓存或恢复后 → 渲染 Editor，开始自动保存
 * 4. 退出时检测未保存内容 → ExitConfirmModal
 * 5. 保存成功后保留原始创建时间 (date)，更新 updated_at
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { diaryApi, notebookApi } from '../lib/api'
import { useToast } from '../components/ui/JourneyUI'
import Editor from '../components/Editor'
import type { EditorRef } from '../components/Editor'
import { CacheRecoveryModal, ExitConfirmModal } from '../components/modals/CacheRecoveryModal'
import { 
  getEditDiaryCache, 
  clearEditDiaryCache, 
  isCacheEmpty 
} from '../lib/cache'
import type { DiaryCache } from '../lib/cache'
import { useJourneyNavigation } from '../hooks/useJourneyNavigation'

export default function EditView() {
  const { id } = useParams<{ id: string }>()
  const diaryId = Number(id)
  const { back } = useJourneyNavigation()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  
  const editorRef = useRef<EditorRef>(null)
  
  // ... (rest of states)

  // 更新日记 mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => diaryApi.update(diaryId, data),
    onSuccess: (updatedDiary) => {
      queryClient.invalidateQueries()
      // 清除编辑缓存
      clearEditDiaryCache(diaryId)
      addToast('success', 'Diary updated')
      // 返回上一页
      back()
    },
    onError: () => {
      addToast('error', 'Failed to update diary')
    }
  })
  
  // ... (rest of effects)

  // 处理编辑器关闭
  const handleEditorClose = useCallback(() => {
    if (editorRef.current?.hasUnsavedChanges()) {
      setShowExitConfirm(true)
    } else {
      back()
    }
  }, [back])
  
  // 退出确认 - 放弃
  const handleExitDiscard = useCallback(() => {
    editorRef.current?.clearCache()
    setShowExitConfirm(false)
    back()
  }, [back])
  
  // 退出确认 - 保存草稿（作为新日记保存到Drafts，保留原始日记）
  const handleExitSaveDraft = useCallback(async () => {
    if (!editorRef.current) return
    
    setIsSavingDraft(true)
    try {
      const data = editorRef.current.getCurrentData()
      const draftNotebook = await notebookApi.ensureDraft()
      const title = data.title?.trim() || 'Untitled Draft'
      
      await diaryApi.create({
        title,
        content: data.content,
        notebook_id: draftNotebook.id,
        mood: data.mood,
        location: data.location,
        tags: data.tags,
        stats: { weather: data.weather }
      })
      
      editorRef.current.clearCache()
      queryClient.invalidateQueries()
      setShowExitConfirm(false)
      back()
      addToast('success', 'Draft saved')
    } catch (error) {
      addToast('error', 'Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }, [queryClient, addToast, back])

  // ... (rest of handlers)

  // 加载失败
  if (error || !diary) {
    return (
      <div className="fixed inset-0 bg-[#f2f4f2] z-[200] flex flex-col items-center justify-center text-[#232f55]">
        <p className="text-xl font-medium mb-4">Diary not found</p>
        <button 
          onClick={() => back()} 
          className="text-[#6ebeea] font-bold"
        >
          Go back
        </button>
      </div>
    )
  }
  
  return (
    <>
      {/* 缓存恢复弹窗 */}
      {pendingCache && (
        <CacheRecoveryModal
          cache={pendingCache}
          onRestore={handleRestoreCache}
          onSaveAsDraft={handleSaveAsDraft}
          onDiscard={handleDiscardCache}
          onClose={() => {
            setPendingCache(null)
            setEditorReady(true)
          }}
          loading={isSavingDraft}
        />
      )}
      
      {/* 编辑器 */}
      {editorReady && (
        <Editor
          ref={editorRef}
          notebooks={notebooks}
          initialNotebookId={diary.notebook_id}
          initialData={diary}
          cacheToRestore={cacheToRestore}
          onCacheRestored={handleCacheRestored}
          onSave={handleSave}
          onClose={handleEditorClose}
        />
      )}
      
      {/* 退出确认弹窗 */}
      {showExitConfirm && (
        <ExitConfirmModal
          onDiscard={handleExitDiscard}
          onSaveDraft={handleExitSaveDraft}
          onClose={handleExitContinue}
          loading={isSavingDraft}
        />
      )}
    </>
  )
}
