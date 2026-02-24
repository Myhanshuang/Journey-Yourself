import { useState } from 'react'
import { Timer, ChevronLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { taskApi } from '../lib/api'
import { Card, useToast, cn, ManageListItem, useAdjustedTime, TimePicker } from '../components/ui/JourneyUI'
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

export default function TasksView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const addToast = useToast(state => state.add)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  
  const { data: tasks, isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: taskApi.list
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-12 h-12 border-4 border-[#6ebeea]/30 border-t-[#6ebeea] rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="py-12 max-w-[700px] mx-auto space-y-8 pb-32">
      <header className="space-y-2 px-3 md:px-0">
        <button 
          onClick={() => navigate('/settings')}
          className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all mb-6"
        >
          <ChevronLeft size={20} /> Settings
        </button>
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900">Scheduled Tasks</h2>
        <p className="text-lg md:text-xl text-slate-400 font-medium italic">Manage automated background tasks</p>
      </header>

      <Card className="divide-y divide-slate-100">
        {tasks?.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            onToggle={() => toggleMutation.mutate({ name: task.name, enabled: !task.user_enabled })}
            onEdit={() => setEditingTask(task)}
          />
        ))}
        
        {(!tasks || tasks.length === 0) && (
          <div className="p-8 md:p-12 text-center text-slate-400">
            <Timer size={48} className="mx-auto mb-4 opacity-50" />
            <p className="font-medium">No scheduled tasks configured</p>
          </div>
        )}
      </Card>

      {editingTask && (
        <TaskEditModal
          task={editingTask}
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

// Task Row 组件
function TaskRow({ 
  task, 
  onToggle, 
  onEdit
}: { 
  task: Task
  onToggle: () => void
  onEdit: () => void
}) {
  const userEnabled = task.user_enabled
  const globallyEnabled = task.is_enabled
  const isActive = userEnabled && globallyEnabled

  return (
    <ManageListItem
      icon={<Timer size={20} />}
      iconBgClass={isActive ? "bg-emerald-50 text-emerald-500" : "bg-slate-100 text-slate-400"}
      title={task.display_name}
      subtitle={task.description + (!globallyEnabled ? ' (Globally Disabled)' : '')}
      leftAction={
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggle()
          }}
          className={cn(
            "relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0",
            userEnabled ? "bg-emerald-500" : "bg-slate-200"
          )}
        >
          <div className={cn(
            "absolute top-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300",
            userEnabled ? "right-0.5" : "left-0.5"
          )} />
        </button>
      }
      onClick={onEdit}
    />
  )
}

function TaskEditModal({ 
  task, 
  onClose, 
  onSave, 
  isPending 
}: { 
  task: Task
  onClose: () => void
  onSave: (cronExpr: string, isEnabled: boolean) => void
  isPending: boolean
}) {
  const { timezone } = useAdjustedTime()

  // 解析 cron 表达式获取 UTC 小时和分钟，然后转换为用户本地时间
  const parseCron = (cronExpr: string) => {
    const parts = cronExpr.split(' ')
    if (parts.length !== 5) return { hour: 0, minute: 0, dayOfMonth: '*', dayOfWeek: '*' }
    
    const utcMinute = parseInt(parts[0]) || 0
    const utcHour = parseInt(parts[1]) || 0
    
    // 将 UTC 时间转换为用户本地时间
    try {
      const utcDate = new Date()
      utcDate.setUTCHours(utcHour, utcMinute, 0, 0)
      
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone || 'UTC',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      const parts_result = formatter.formatToParts(utcDate)
      const map: Record<string, string> = {}
      parts_result.forEach(p => map[p.type] = p.value)
      
      return {
        minute: parseInt(map.minute) || 0,
        hour: parseInt(map.hour) || 0,
        dayOfMonth: parts[2],
        month: parts[3],
        dayOfWeek: parts[4]
      }
    } catch {
      return {
        minute: utcMinute,
        hour: utcHour,
        dayOfMonth: parts[2],
        month: parts[3],
        dayOfWeek: parts[4]
      }
    }
  }
  
  const initial = parseCron(task.cron_expr)
  const [time, setTime] = useState(
    `${initial.hour.toString().padStart(2, '0')}:${initial.minute.toString().padStart(2, '0')}`
  )
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    initial.dayOfMonth === '*' && initial.dayOfWeek === '*' ? 'daily' :
    initial.dayOfWeek !== '*' ? 'weekly' : 'monthly'
  )
  const [isEnabled, setIsEnabled] = useState(task.is_enabled)
  
  // 将用户本地时间转换为 UTC 时间，构建 cron 表达式
  const buildCronExpr = () => {
    const [hour, minute] = time.split(':').map(Number)
    
    try {
      // 用户输入的是本地时间，需要转换为 UTC
      const tz = timezone || 'UTC'
      
      // 创建一个本地时间
      const localDateStr = `2024-01-01T${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`
      const localDate = new Date(localDateStr)
      
      // 计算时区偏移
      const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }))
      const tzDate = new Date(localDate.toLocaleString('en-US', { timeZone: tz }))
      const offsetMs = utcDate.getTime() - tzDate.getTime()
      
      // 转换后的 UTC 时间
      const utcTime = new Date(localDate.getTime() + offsetMs)
      const utcHour = utcTime.getUTCHours()
      const utcMinute = utcTime.getUTCMinutes()
      
      const minuteStr = utcMinute.toString().padStart(2, '0')
      const hourStr = utcHour.toString().padStart(2, '0')
      
      switch (frequency) {
        case 'daily':
          return `${minuteStr} ${hourStr} * * *`
        case 'weekly':
          return `${minuteStr} ${hourStr} * * 0`
        case 'monthly':
          return `${minuteStr} ${hourStr} 1 * *`
      }
    } catch {
      // fallback: 直接使用用户输入的时间作为 UTC
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
      subtitle={task.description}
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
        
        {/* Time Input */}
        <div className="space-y-3">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">
            Time
          </label>
          <TimePicker
            value={time}
            onChange={setTime}
          />
        </div>
      </div>
    </SelectionModal>
  )
}