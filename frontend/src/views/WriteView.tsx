/**
 * WriteView - 新建日记页面
 * 
 * 流程：
 * 1. 进入页面 → 检测新日记缓存
 * 2. 有缓存 → 显示 CacheRecoveryModal
 * 3. 无缓存或恢复后 → 渲染 Editor，开始自动保存
 * 4. 退出时检测未保存内容 → ExitConfirmModal
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { diaryApi, notebookApi } from '../lib/api'
import { useToast } from '../components/ui/JourneyUI'
import Editor from '../components/Editor'
import type { EditorRef } from '../components/Editor'
import { CacheRecoveryModal, ExitConfirmModal } from '../components/modals/CacheRecoveryModal'
import { 
  getNewDiaryCache, 
  clearNewDiaryCache, 
  isCacheEmpty 
} from '../lib/cache'
import type { DiaryCache } from '../lib/cache'

export default function WriteView() {
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  
  const editorRef = useRef<EditorRef>(null)
  
  // 从导航 state 获取初始日记本 ID
  const initialNotebookId = location.state?.notebookId
  
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
  
  // 保存日记 mutation
  const saveMutation = useMutation({
    mutationFn: (data: any) => diaryApi.create(data),
    onSuccess: (savedDiary) => {
      queryClient.invalidateQueries()
      // 清除缓存
      clearNewDiaryCache()
      addToast('success', 'Diary published')
      // 返回上一页
      navigate(-1)
    },
    onError: () => {
      addToast('error', 'Failed to save diary')
    }
  })
  
  // 进入页面时检测缓存
  useEffect(() => {
    const cache = getNewDiaryCache()
    if (cache && !isCacheEmpty(cache)) {
      setPendingCache(cache)
    } else {
      setEditorReady(true)
    }
  }, [])
  
  // 恢复缓存到编辑器
  const handleRestoreCache = useCallback(() => {
    if (pendingCache) {
      setCacheToRestore(pendingCache)
      setPendingCache(null)
      setEditorReady(true)
    }
  }, [pendingCache])
  
  // 另存为草稿
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
      
      clearNewDiaryCache()
      queryClient.invalidateQueries()
      setPendingCache(null)
      setEditorReady(true)
      addToast('success', 'Draft saved')
    } catch (error) {
      addToast('error', 'Failed to save draft')
    } finally {
      setIsSavingDraft(false)
    }
  }, [pendingCache, queryClient, addToast])
  
  // 放弃缓存
  const handleDiscardCache = useCallback(() => {
    clearNewDiaryCache()
    setPendingCache(null)
    setEditorReady(true)
  }, [])
  
  // 缓存恢复完成回调
  const handleCacheRestored = useCallback(() => {
    setCacheToRestore(null)
    addToast('success', 'Draft restored')
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
  
  // 退出确认 - 保存草稿
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
    if (!data.notebook_id) {
      addToast('error', 'Please select a notebook')
      return
    }
    saveMutation.mutate(data)
  }, [saveMutation, addToast])
  
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
          initialNotebookId={initialNotebookId || notebooks[0]?.id}
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
