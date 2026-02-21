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
import { useNavigate, useParams } from 'react-router-dom'
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

export default function EditView() {
  const { id } = useParams<{ id: string }>()
  const diaryId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  
  const editorRef = useRef<EditorRef>(null)
  
  // 缓存相关状态
  const [pendingCache, setPendingCache] = useState<DiaryCache | null>(null)
  const [cacheToRestore, setCacheToRestore] = useState<DiaryCache | null>(null)
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const [isSavingDraft, setIsSavingDraft] = useState(false)
  const [editorReady, setEditorReady] = useState(false)
  
  // 获取日记本列表
  const { data: notebooks = [] } = useQuery({ 
    queryKey: ['notebooks'], 
    queryFn: notebookApi.list 
  })
  
  // 加载日记数据
  const { data: diary, isLoading, error } = useQuery({
    queryKey: ['diary', diaryId],
    queryFn: () => diaryApi.get(diaryId),
    enabled: !!diaryId,
  })
  
  // 更新日记 mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => diaryApi.update(diaryId, data),
    onSuccess: (updatedDiary) => {
      queryClient.invalidateQueries()
      // 清除编辑缓存
      clearEditDiaryCache(diaryId)
      addToast('success', 'Diary updated')
      // 返回上一页
      navigate(-1)
    },
    onError: () => {
      addToast('error', 'Failed to update diary')
    }
  })
  
  // 加载完成后检测缓存
  useEffect(() => {
    if (diary) {
      const cache = getEditDiaryCache(diaryId)
      if (cache && !isCacheEmpty(cache)) {
        setPendingCache(cache)
      } else {
        setEditorReady(true)
      }
    }
  }, [diary, diaryId])
  
  // 恢复缓存到编辑器
  const handleRestoreCache = useCallback(() => {
    if (pendingCache) {
      setCacheToRestore(pendingCache)
      setPendingCache(null)
      setEditorReady(true)
    }
  }, [pendingCache])
  
  // 另存为草稿（保留原始日记不变）
  const handleSaveAsDraft = useCallback(async () => {
    if (!pendingCache) return
    
    setIsSavingDraft(true)
    try {
      const draftNotebook = await notebookApi.ensureDraft()
      const title = pendingCache.title?.trim() || 'Untitled Draft'
      
      await diaryApi.create({
        title,
        content: pendingCache.content,
        notebook_id: draftNotebook.id,
        mood: pendingCache.mood,
        location: pendingCache.location,
        tags: pendingCache.tags,
        stats: { weather: pendingCache.weather }
      })
      
      clearEditDiaryCache(diaryId)
      queryClient.invalidateQueries()
      setPendingCache(null)
      setEditorReady(true)
      addToast('success', 'Draft saved')
    } catch (error) {
      addToast('error', 'Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }, [pendingCache, diaryId, queryClient, addToast])
  
  // 放弃缓存
  const handleDiscardCache = useCallback(() => {
    clearEditDiaryCache(diaryId)
    setPendingCache(null)
    setEditorReady(true)
  }, [diaryId])
  
  // 缓存恢复完成回调
  const handleCacheRestored = useCallback(() => {
    setCacheToRestore(null)
    addToast('success', 'Changes restored')
  }, [addToast])
  
  // 处理编辑器关闭
  const handleEditorClose = useCallback(() => {
    if (editorRef.current?.hasUnsavedChanges()) {
      setShowExitConfirm(true)
    } else {
      navigate(-1)
    }
  }, [navigate])
  
  // 退出确认 - 放弃
  const handleExitDiscard = useCallback(() => {
    editorRef.current?.clearCache()
    setShowExitConfirm(false)
    navigate(-1)
  }, [navigate])
  
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
      navigate(-1)
      addToast('success', 'Draft saved')
    } catch (error) {
      addToast('error', 'Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }, [queryClient, addToast, navigate])
  
  // 退出确认 - 继续编辑
  const handleExitContinue = useCallback(() => {
    setShowExitConfirm(false)
  }, [])
  
  // 处理保存
  const handleSave = useCallback((data: any) => {
    saveMutation.mutate(data)
  }, [saveMutation])
  
  // 加载中
  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-[#f2f4f2] z-[200] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
      </div>
    )
  }
  
  // 加载失败
  if (error || !diary) {
    return (
      <div className="fixed inset-0 bg-[#f2f4f2] z-[200] flex flex-col items-center justify-center text-[#232f55]">
        <p className="text-xl font-medium mb-4">Diary not found</p>
        <button 
          onClick={() => navigate(-1)} 
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
