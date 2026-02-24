import { useState, useEffect } from 'react'
import { Timer, ChevronLeft, Clock, CheckCircle2, XCircle, ChevronRight, Plus, Minus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskApi, userApi } from '../lib/api'
import { Card, useToast, cn } from '../components/ui/JourneyUI'
import { SelectionModal } from '../components/ui/selection-modal'

interface Task {
  id: number
  name: string
  display_name: string
  description: string
  is_enabled: boolean
  cron_expr: string
  last_run: string | null
  next_run: string | null
  user_enabled: boolean
}

interface UserData {
  timezone: string
}

export default function TasksView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: taskApi.list
  })
  
  const { data: user } = useQuery<UserData>({
    queryKey: ['user', 'me'],
    queryFn: userApi.me
  })
  
  const toggleMutation = useMutation({
    mutationFn: ({ name, enabled }: { name: string; enabled: boolean }) => 
      taskApi.toggle(name, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      addToast('success', 'Task preference saved')
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.detail || 'Failed to update task')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ name, data }: { name: string; data: { is_enabled?: boolean; cron_expr?: string } }) =>
      taskApi.update(name, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      addToast('success', 'Task configuration updated')
      setEditingTask(null)
    },
    onError: (err: any) => {
      addToast('error', err.response?.data?.detail || 'Failed to update task')
    }
  })

  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Never'
    const date = new Date(isoString)
    return date.toLocaleString()
  }

  const getCronDescription = (cronExpr: string, timezone?: string) => {
    // 解析 cron 表达式获取 UTC 时间
    const parts = cronExpr.split(' ')
    if (parts.length !== 5) return cronExpr
    
    const minute = parseInt(parts[0]) || 0
    const hour = parseInt(parts[1]) || 0
    
    // 计算用户时区的时间
    const tz = timezone || 'UTC'
    try {
      const utcDate = new Date()
      utcDate.setUTCHours(hour, minute, 0, 0)
      const localHour = utcDate.toLocaleString('en-US', { hour: '2-digit', hour12: false, timeZone: tz })
      const localMinute = utcDate.toLocaleString('en-US', { minute: '2-digit', timeZone: tz })
      const localHourNum = parseInt(localHour)
      
      // 判断频率
      if (parts[2] === '*' && parts[3] === '*' && parts[4] === '*') {
        return `Daily at ${localHourNum.toString().padStart(2, '0')}:${localMinute} (${tz})`
      } else if (parts[4] === '0') {
        return `Weekly on Sunday at ${localHourNum.toString().padStart(2, '0')}:${localMinute} (${tz})`
      } else if (parts[2] === '1') {
        return `Monthly on 1st at ${localHourNum.toString().padStart(2, '0')}:${localMinute} (${tz})`
      }
    } catch {
      // fallback
    }
    
    return cronExpr
  }

  if (isLoading) {
    return (
      <div className="p-20 text-slate-400 font-black animate-pulse uppercase tracking-widest text-xs">
        Loading Tasks...
      </div>
    )
  }

  return (
    <div className="py-12 max-w-[700px] mx-auto space-y-8 pb-32"
    >
      <header className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/settings')}
          className="p-3 hover:bg-slate-100 rounded-xl transition-all"
        >
          <ChevronLeft size={24} className="text-slate-400" />
        </button>
        <div className="space-y-1">
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Scheduled Tasks</h2>
          <p className="text-sm text-slate-400 font-medium">Manage automated background tasks</p>
        </div>
      </header>

      <Card className="divide-y divide-slate-100">
        {tasks?.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => toggleMutation.mutate({ name: task.name, enabled: !task.user_enabled })}
            onEdit={() => setEditingTask(task)}
            formatTime={formatTime}
            getCronDescription={(expr) => getCronDescription(expr, user?.timezone)}
          />
        ))}
        
        {(!tasks || tasks.length === 0) && (
          <div className="p-12 text-center text-slate-400">
            <Timer size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No scheduled tasks configured</p>
          </div>
        )}
      </Card>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
          timezone={user?.timezone || 'UTC'}
          onClose={() => setEditingTask(null)}
          onSave={(cronExpr, isEnabled) => {
            updateMutation.mutate({ 
              name: editingTask.name, 
              data: { cron_expr: cronExpr, is_enabled: isEnabled } 
            })
          }}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}

function TaskRow({ 
  task, 
  onToggle, 
  onEdit, 
  formatTime, 
  getCronDescription 
}: { 
  task: Task
  onToggle: () => void
  onEdit: () => void
  formatTime: (s: string | null) => string
  getCronDescription: (s: string) => string
}) {
  // 滑块只控制用户的个人开关
  // 任务实际生效需要：全局启用 + 用户启用
  const userEnabled = task.user_enabled
  const globallyEnabled = task.is_enabled
  const isActive = userEnabled && globallyEnabled
  
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between">
        <button 
          onClick={onEdit}
          className="flex items-center gap-4 text-left flex-1 group"
        >
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center",
            isActive ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-400"
          )}>
            <Timer size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
              {task.display_name}
            </h3>
            <p className="text-sm text-slate-500">
              {task.description}
              {!globallyEnabled && <span className="text-amber-500 ml-1">(Globally Disabled)</span>}
            </p>
          </div>
          <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />
        </button>
        
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className={cn(
            "relative w-14 h-8 rounded-full transition-all duration-300 ml-4 flex-shrink-0",
            userEnabled ? "bg-emerald-500" : "bg-slate-200"
          )}
        >
          <div className={cn(
            "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
            userEnabled ? "right-1" : "left-1"
          )} />
        </button>
      </div>
      
      <div className="flex items-center gap-6 ml-16 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Clock size={14} />
          <span>{getCronDescription(task.cron_expr)}</span>
        </div>
        
        {isActive && (
          <>
            <div className="flex items-center gap-2">
              {task.last_run ? (
                <>
                  <CheckCircle2 size={14} className="text-emerald-500" />
                  <span>Last: {formatTime(task.last_run)}</span>
                </>
              ) : (
                <>
                  <XCircle size={14} />
                  <span>Last: Never</span>
                </>
              )}
            </div>
            
            {task.next_run && (
              <div className="flex items-center gap-2">
                <span>Next: {formatTime(task.next_run)}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function TaskEditModal({ 
  task, 
  timezone,
  onClose, 
  onSave, 
  isPending 
}: { 
  task: Task
  timezone: string
  onClose: () => void
  onSave: (cronExpr: string, isEnabled: boolean) => void
  isPending: boolean
}) {
  // 解析 cron 表达式获取小时和分钟
  const parseCron = (cronExpr: string) => {
    const parts = cronExpr.split(' ')
    if (parts.length !== 5) return { hour: 0, minute: 0, dayOfMonth: '*', dayOfWeek: '*' }
    return {
      minute: parseInt(parts[0]) || 0,
      hour: parseInt(parts[1]) || 0,
      dayOfMonth: parts[2],
      month: parts[3],
      dayOfWeek: parts[4]
    }
  }
  
  const initial = parseCron(task.cron_expr)
  const [hour, setHour] = useState(initial.hour)
  const [minute, setMinute] = useState(initial.minute)
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    initial.dayOfMonth === '*' && initial.dayOfWeek === '*' ? 'daily' :
    initial.dayOfWeek !== '*' ? 'weekly' : 'monthly'
  )
  const [isEnabled, setIsEnabled] = useState(task.is_enabled)
  
  // 实时预览用户时区的时间
  const [previewTime, setPreviewTime] = useState<string>('')
  
  useEffect(() => {
    try {
      const utcDate = new Date()
      utcDate.setUTCHours(hour, minute, 0, 0)
      const localTime = utcDate.toLocaleString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false,
        timeZone: timezone 
      })
      setPreviewTime(`${localTime} (${timezone})`)
    } catch {
      setPreviewTime(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} UTC`)
    }
  }, [hour, minute, timezone])
  
  const buildCronExpr = () => {
    const minuteStr = minute.toString().padStart(2, '0')
    const hourStr = hour.toString().padStart(2, '0')
    
    switch (frequency) {
      case 'daily':
        return `${minuteStr} ${hourStr} * * *`
      case 'weekly':
        return `${minuteStr} ${hourStr} * * 0`
      case 'monthly':
        return `${minuteStr} ${hourStr} 1 * *`
    }
  }

  const handleConfirm = () => {
    onSave(buildCronExpr(), isEnabled)
  }

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleConfirm}
      title={task.display_name}
      subtitle="Configure task schedule"
      confirmLabel="Save"
      loading={isPending}
      variant="sheet"
      className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-6">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
          <div>
            <p className="font-bold text-slate-700">Enable Task</p>
            <p className="text-xs text-slate-400">Run this task on schedule</p>
          </div>
          <button
            onClick={() => setIsEnabled(!isEnabled)}
            className={cn(
              "relative w-14 h-8 rounded-full transition-all duration-300",
              isEnabled ? "bg-emerald-500" : "bg-slate-200"
            )}
          >
            <div className={cn(
              "absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
              isEnabled ? "right-1" : "left-1"
            )} />
          </button>
        </div>
        
        {/* Frequency Selection */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">
            Frequency
          </label>
          <div className="bg-slate-100 p-1.5 rounded-[20px] flex gap-1 shadow-inner">
            {(['daily', 'weekly', 'monthly'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFrequency(f)}
                className={cn(
                  "flex-1 py-3 rounded-[14px] text-xs font-black transition-all",
                  frequency === f ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"
                )}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Time Selection - Hour/Minute Controls */}
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">
            Time (UTC)
          </label>
          
          <div className="flex items-center gap-4">
            <TimeControl 
              label="Hour" 
              value={hour} 
              min={0} 
              max={23} 
              onChange={setHour} 
            />
            <span className="text-2xl font-black text-slate-300">:</span>
            <TimeControl 
              label="Minute" 
              value={minute} 
              min={0} 
              max={59} 
              onChange={setMinute} 
            />
          </div>
          
          {/* Preview in user's timezone */}
          <div className="text-center p-4 bg-slate-900 rounded-2xl text-white">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">
              Your Local Time
            </p>
            <p className="text-2xl font-black">{previewTime}</p>
          </div>
        </div>
      </div>
    </SelectionModal>
  )
}

function TimeControl({ 
  label, 
  value, 
  min, 
  max, 
  onChange 
}: { 
  label: string
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex-1 flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
      <button 
        onClick={() => onChange(value > min ? value - 1 : max)}
        className="p-2 bg-white rounded-xl shadow-sm hover:bg-emerald-50 hover:text-emerald-500 transition-all"
      >
        <Minus size={16} />
      </button>
      <div className="text-center">
        <span className="text-2xl font-black w-12 text-center text-slate-900 tabular-nums">
          {value.toString().padStart(2, '0')}
        </span>
        <p className="text-[10px] text-slate-400 font-bold uppercase">{label}</p>
      </div>
      <button 
        onClick={() => onChange(value < max ? value + 1 : min)}
        className="p-2 bg-white rounded-xl shadow-sm hover:bg-emerald-50 hover:text-emerald-500 transition-all"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
