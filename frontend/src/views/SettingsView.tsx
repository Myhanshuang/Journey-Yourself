import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Lock, Database, Cloud, ChevronRight, Download, Upload, LogOut, Globe, Clock, Plus, Minus, Link2, Bookmark, Sparkles, Timer, FileText, Trash2
} from 'lucide-react'
import { cn, Card, useToast, ConfigSelect } from '../components/ui/JourneyUI'
import { userApi } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SelectionModal } from '../components/ui/selection-modal'
import { Input } from '../components/ui/input'
import { Typography } from '../components/ui/typography'
import { Button } from '../components/ui/button'

export default function SettingsView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useQuery({ queryKey: ['user', 'me'], queryFn: userApi.me })
  const [activeModal, setActiveModal] = useState<'profile' | 'password' | 'immich' | 'karakeep' | 'notion' | 'ai' | 'geo' | 'system' | 'timezone' | 'timeoffset' | 'cleanup' | null>(null)

  const handleLogout = () => {
    localStorage.removeItem('token')
    queryClient.clear()
    navigate('/login')
  }

  if (isLoading) return <div className="p-20 text-slate-400 font-black animate-pulse uppercase tracking-widest text-xs text-slate-900">Loading Settings...</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12 max-w-[700px] mx-auto space-y-12 pb-32 text-slate-900 px-4 md:px-0">
      <header className="space-y-2 text-slate-900">
        <h2 className="text-5xl md:text-6xl font-black tracking-tighter">Settings</h2>
        <p className="text-xl text-slate-400 font-medium italic">Your private sanctuary, secured.</p>
      </header>

      <div className="space-y-10">
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 ml-2">Personal</h3>
          <Card className="divide-y divide-slate-50 text-slate-900" padding="none">
            <SettingsRow icon={<User size={18} />} label="Rename Profile" sub={user?.username} onClick={() => setActiveModal('profile')} />
            <SettingsRow icon={<Lock size={18} />} label="Account Security" sub="Update password" onClick={() => setActiveModal('password')} />
            <SettingsRow icon={<Globe size={18} />} label="Timezone" sub={user?.timezone || 'UTC'} onClick={() => setActiveModal('timezone')} />
            <SettingsRow icon={<Clock size={18} />} label="Time Correction" sub={`${Math.floor((user?.time_offset_mins || 0) / 60)}h ${(user?.time_offset_mins || 0) % 60}m`} onClick={() => setActiveModal('timeoffset')} />
          </Card>
        </div>

        {user?.role === 'admin' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 ml-2">Administration</h3>
            <Card className="divide-y divide-slate-50 text-slate-900" padding="none">
              <SettingsRow icon={<User size={18} className="text-indigo-500" />} label="User Manager" sub="Manage users and permissions" onClick={() => navigate('/users')} />
              <SettingsRow icon={<Database size={18} className="text-amber-500" />} label="Maintenance" sub="Export/Import DB" onClick={() => setActiveModal('system')} />
              <SettingsRow icon={<Trash2 size={18} className="text-red-500" />} label="Clean Storage" sub="Remove unused files" onClick={() => setActiveModal('cleanup')} />
            </Card>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 ml-2">Integrations</h3>
          <Card className="divide-y divide-slate-50 text-slate-900" padding="none">
            <SettingsRow icon={<Cloud size={18} className={cn(user?.has_immich_key ? "text-emerald-500" : "text-indigo-500")} />} label="Immich Library" sub={user?.has_immich_key ? "Connected" : "Not Configured"} onClick={() => setActiveModal('immich')} />
            <SettingsRow icon={<Bookmark size={18} className={cn(user?.has_karakeep_key ? "text-emerald-500" : "text-pink-500")} />} label="Karakeep Bookmarks" sub={user?.has_karakeep_key ? "Connected" : "Not Configured"} onClick={() => setActiveModal('karakeep')} />
            <SettingsRow icon={<FileText size={18} className={cn(user?.has_notion_key ? "text-emerald-500" : "text-slate-500")} />} label="Notion Pages" sub={user?.has_notion_key ? "Connected" : "Not Configured"} onClick={() => setActiveModal('notion')} />
            <SettingsRow icon={<Sparkles size={18} className={cn(user?.has_ai_key ? "text-emerald-500" : "text-purple-500")} />} label="AI Assistant" sub={user?.has_ai_key ? "Connected" : "Not Configured"} onClick={() => setActiveModal('ai')} />
            <SettingsRow icon={<Globe size={18} className={cn(user?.has_geo_key ? "text-emerald-500" : "text-indigo-500")} />} label="Geographic Service" sub={user?.has_geo_key ? "Configured" : "Not Configured"} onClick={() => setActiveModal('geo')} />
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 ml-2">System</h3>
          <Card className="divide-y divide-slate-50 text-slate-900" padding="none">
            <SettingsRow icon={<Link2 size={18} className="text-indigo-500" />} label="Share Manager" sub="Manage shared links" onClick={() => navigate('/shares')} />
            <SettingsRow icon={<Timer size={18} className="text-emerald-500" />} label="Scheduled Tasks" sub="Manage automated tasks" onClick={() => navigate('/tasks')} />
          </Card>
        </div>

        <button onClick={handleLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-100 transition-all shadow-sm">
          <LogOut size={16} /> Sign Out
        </button>

        <div className="text-center text-xs text-slate-300 font-medium pt-8">
          v0.1.0
        </div>
      </div>

      <AnimatePresence>
        {activeModal === 'profile' && <ProfileModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'password' && <PasswordModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'immich' && <ImmichModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'karakeep' && <KarakeepModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'notion' && <NotionModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'ai' && <AIModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'geo' && <GeoModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'system' && <SystemModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'cleanup' && <CleanupModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'timezone' && <TimezoneModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'timeoffset' && <TimeOffsetModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
      </AnimatePresence>
    </motion.div>
  )
}

// Reusable Styles for Settings Modal Confirm Buttons
const confirmBtnClass = "w-full py-5 rounded-[24px] font-black shadow-xl mt-8 disabled:opacity-50 text-xs uppercase tracking-widest active:scale-95 transition-all"
// Light/Pale Confirm Button Style
const lightConfirmBtnClass = "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shadow-none"

function AIModal({ user, onClose }: any) {
  const [form, setForm] = useState({ 
    provider: user?.ai_provider || 'openai', 
    base_url: user?.ai_base_url || 'https://api.openai.com/v1', 
    key: '', 
    model: user?.ai_model || 'gpt-3.5-turbo',
    language: user?.ai_language || 'zh'
  });
  const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.updateAI,
    onSuccess: () => {
      addToast('success', 'AI Service Linked');
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Verification failed. Check your config.'
      addToast('error', msg)
    }
  })

  const AI_PROVIDERS = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'ollama', label: 'Ollama (Local)' },
    { value: 'other', label: 'Other (OpenAI Compatible)' },
  ]
  
  const AI_LANGUAGES = [
    { value: 'zh', label: '中文' },
    { value: 'en', label: 'English' },
  ]

  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="AI Assistant" 
        onConfirm={() => {
            if (!form.key) return addToast('error', 'API Key required')
            mutation.mutate({ provider: form.provider, base_url: form.base_url, api_key: form.key, model: form.model, language: form.language })
        }}
        confirmLabel={mutation.isPending ? 'Verifying...' : 'Enable'}
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-4">
        <ConfigSelect 
          label="Provider"
          options={AI_PROVIDERS}
          value={form.provider}
          onChange={v => setForm({ ...form, provider: v })}
          theme="purple"
        />
        <div className="space-y-2">
            <Typography variant="label" className="ml-2">Base URL</Typography>
            <Input 
                placeholder="e.g. https://api.openai.com/v1" 
                value={form.base_url} 
                onChange={e => setForm({ ...form, base_url: e.target.value })} 
            />
        </div>
        <div className="space-y-2">
            <Typography variant="label" className="ml-2">API Key</Typography>
            <Input 
                type="password" 
                placeholder="Paste your API Key" 
                value={form.key} 
                onChange={e => setForm({ ...form, key: e.target.value })} 
            />
        </div>
        <div className="space-y-2">
            <Typography variant="label" className="ml-2">Model Name</Typography>
            <Input 
                placeholder="e.g. gpt-4, claude-3-opus" 
                value={form.model} 
                onChange={e => setForm({ ...form, model: e.target.value })} 
            />
        </div>
        <ConfigSelect 
          label="Summary Language"
          options={AI_LANGUAGES}
          value={form.language}
          onChange={v => setForm({ ...form, language: v })}
          theme="purple"
        />
      </div>
    </SelectionModal>
  )
}

function KarakeepModal({ user, onClose }: any) {
  const [form, setForm] = useState({ url: user?.karakeep_url || 'https://api.karakeep.app', key: '' });
  const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.updateKarakeep,
    onSuccess: () => {
      addToast('success', 'Karakeep Linked');
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Verification failed. Check URL and Key.'
      addToast('error', msg)
    }
  })

  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Karakeep Link"
        onConfirm={() => {
            if (!form.url || !form.key) return addToast('error', 'URL and Key required')
            mutation.mutate({ url: form.url, api_key: form.key })
        }}
        confirmLabel={mutation.isPending ? 'Verifying...' : 'Link'}
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-4">
        <div className="space-y-2">
            <Typography variant="label" className="ml-2">Server URL</Typography>
            <Input 
                placeholder="e.g. https://api.karakeep.app" 
                value={form.url} 
                onChange={e => setForm({ ...form, url: e.target.value })} 
            />
        </div>
        <div className="space-y-2">
            <Typography variant="label" className="ml-2">API Token</Typography>
            <Input 
                type="password" 
                placeholder="Paste your API Token" 
                value={form.key} 
                onChange={e => setForm({ ...form, key: e.target.value })} 
            />
        </div>
      </div>
    </SelectionModal>
  )
}

function SettingsRow({ icon, label, sub, onClick }: any) {
  return (
    <button onClick={onClick} className="w-full text-left outline-none group">
      <div className="flex items-center gap-5 p-6 hover:bg-slate-50/50 transition-all">
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:shadow-sm transition-all">{icon}</div>
        <div className="flex-1 overflow-hidden">
          <p className="font-bold text-slate-800">{label}</p>
          <div className="text-xs text-slate-400 font-medium truncate">{sub}</div>
        </div>
        {onClick && <ChevronRight size={18} className="text-slate-200 group-hover:text-slate-400 group-hover:translate-x-1 transition-all" />}
      </div>
    </button>
  )
}

function ProfileModal({ user, onClose }: any) {
  const [name, setName] = useState(user.username); const addToast = useToast(state => state.add)
  const mutation = useMutation({ mutationFn: userApi.updateProfile, onSuccess: () => { addToast('success', 'Profile renamed'); onClose(); } })
  
  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Rename Profile"
        onConfirm={() => mutation.mutate({ username: name })}
        confirmLabel="Update"
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <Input value={name} onChange={e => setName(e.target.value)} />
    </SelectionModal>
  )
}

function PasswordModal({ onClose }: any) {
  const [form, setForm] = useState({ old: '', new: '' }); const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.updatePassword,
    onSuccess: () => { addToast('success', 'Security updated'); onClose(); },
    onError: (error: any) => {
      const msg = error.response?.data?.detail || 'Incorrect password or update failed'
      addToast('error', msg)
    }
  })
  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Change Password"
        onConfirm={() => {
            if (!form.old || !form.new) return addToast('error', 'Fields required');
            mutation.mutate({ old_password: form.old, new_password: form.new })
        }}
        confirmLabel="Update"
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-4">
        <Input type="password" placeholder="Old Password" value={form.old} onChange={e => setForm({ ...form, old: e.target.value })} />
        <Input type="password" placeholder="New Password" value={form.new} onChange={e => setForm({ ...form, new: e.target.value })} />
      </div>
    </SelectionModal>
  )
}

function TimezoneModal({ user, onClose }: any) {
  const [tz, setTz] = useState(user.timezone || 'UTC'); const addToast = useToast(state => state.add)
  const mutation = useMutation({ mutationFn: userApi.updateProfile, onSuccess: () => { addToast('success', 'Timezone synced'); onClose(); } })
  const timezones = ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
  
  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Select Timezone"
        onConfirm={() => mutation.mutate({ timezone: tz })}
        confirmLabel="Save"
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <div className="grid gap-2">
          {timezones.map(t => (
            <button key={t} onClick={() => setTz(t)} className={cn("px-6 py-4 rounded-2xl text-left font-bold transition-all", tz === t ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-50 text-slate-600")}>
                {t}
            </button>
          ))}
      </div>
    </SelectionModal>
  )
}

function TimeOffsetModal({ user, onClose }: any) {
  const [mins, setMins] = useState(user.time_offset_mins || 0)
  const [now, setNow] = useState(new Date())
  const addToast = useToast(state => state.add)
  const mutation = useMutation({ mutationFn: userApi.updateProfile, onSuccess: () => { addToast('success', 'Time Corrected'); onClose(); } })
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t) }, [])
  const adj = new Date(now.getTime() + mins * 60000)
  
  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Time Correction"
        onConfirm={() => mutation.mutate({ time_offset_mins: mins })}
        confirmLabel="Apply"
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <div className="text-center p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Adjusted Real-time</p>
        <p className="text-5xl font-black tabular-nums">{adj.toLocaleTimeString([], { hour12: false })}</p>
        <p className="text-xs font-bold text-slate-400 mt-2">{adj.toDateString()}</p>
      </div>
      <div className="space-y-4">
        <OffsetControl label="Hours" value={Math.floor(mins / 60)} onAdd={() => setMins(mins + 60)} onSub={() => setMins(mins - 60)} />
        <OffsetControl label="Minutes" value={mins % 60} onAdd={() => setMins(mins + 1)} onSub={() => setMins(mins - 1)} />
      </div>
    </SelectionModal>
  )
}

function OffsetControl({ label, value, onAdd, onSub }: any) {
  return (
    <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-100">
      <span className="text-[10px] font-black uppercase text-slate-400 ml-2">{label}</span>
      <div className="flex items-center gap-4">
        <button onClick={onSub} className="p-2 bg-white rounded-xl shadow-sm hover:bg-red-50 hover:text-red-500 transition-all"><Minus size={16} /></button>
        <span className="text-xl font-black w-12 text-center text-slate-900">{value > 0 ? `+${value}` : value}</span>
        <button onClick={onAdd} className="p-2 bg-white rounded-xl shadow-sm hover:bg-emerald-50 hover:text-emerald-500 transition-all"><Plus size={16} /></button>
      </div>
    </div>
  )
}

function ImmichModal({ user, onClose }: any) {
  const [form, setForm] = useState({ url: user?.immich_url || '', key: '' }); const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.updateImmich,
    onSuccess: () => { addToast('success', 'Immich Linked'); onClose(); },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Verification failed. Check URL and Key.'
      addToast('error', msg)
    }
  })
  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Immich Link"
        onConfirm={() => {
            if (!form.url || !form.key) return addToast('error', 'URL and Key required')
            mutation.mutate({ url: form.url, api_key: form.key })
        }}
        confirmLabel={mutation.isPending ? 'Verifying...' : 'Link'}
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-4">
        <Input placeholder="e.g. https://immich.yourdomain.com" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
        <Input type="password" placeholder="API Key" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} />
      </div>
    </SelectionModal>
  )
}

function SystemModal({ onClose }: any) {
  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Maintenance"
        className="md:max-w-md md:mx-auto"
    >
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => userApi.exportDb()} className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[28px] hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100">
            <Download size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Export DB</span>
        </button>
        <div className="relative flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[28px] hover:bg-amber-50 hover:text-amber-600 transition-all border border-transparent hover:border-amber-100">
            <Upload size={24} />
            <span className="text-[10px] font-black uppercase tracking-widest">Import DB</span>
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if (f) userApi.importDb(f).then(() => window.location.reload()) }} />
        </div>
      </div>
    </SelectionModal>
  )
}

function GeoModal({ user, onClose }: any) {
  const [form, setForm] = useState({ provider: user?.geo_provider || 'amap', key: '' }); const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.updateGeo,
    onSuccess: () => { addToast('success', 'Geo API Linked'); onClose(); },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Verification failed. Check your API Key.'
      addToast('error', msg)
    }
  })
  
  return (
    <SelectionModal 
        isOpen={true} onClose={onClose} 
        title="Geographic API"
        onConfirm={() => {
            if (!form.key) return addToast('error', 'API Key required')
            mutation.mutate({ provider: form.provider, api_key: form.key })
        }}
        confirmLabel={mutation.isPending ? 'Verifying...' : 'Bind'}
        loading={mutation.isPending}
        className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Typography variant="label" className="ml-2">Service Provider</Typography>
          <div className="px-6 py-4 bg-indigo-50 rounded-2xl font-bold text-indigo-600 flex items-center gap-3">
            <Globe size={18} />
            高德地图 (Amap)
          </div>
        </div>
        <div className="space-y-2">
          <Typography variant="label" className="ml-2">API Key (Web Service)</Typography>
          <Input type="password" placeholder="Enter your API Key" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} />
        </div>
      </div>
    </SelectionModal>
  )
}

function NotionModal({ user, onClose }: any) {
  const [key, setKey] = useState('')
  const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.updateNotion,
    onSuccess: () => { addToast('success', 'Notion Connected'); onClose(); },
    onError: (err: any) => {
      const msg = err.response?.data?.detail || 'Verification failed. Check your API Key.'
      addToast('error', msg)
    }
  })

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      title="Notion Integration"
      onConfirm={() => {
        if (!key) return addToast('error', 'API Key required')
        mutation.mutate({ api_key: key })
      }}
      confirmLabel={mutation.isPending ? 'Verifying...' : 'Connect'}
      loading={mutation.isPending}
      className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-4">
        <div className="p-4 bg-slate-50 rounded-2xl text-sm text-slate-600 leading-relaxed">
          <p className="font-bold mb-2">How to get your Notion API Key:</p>
          <ol className="list-decimal list-inside space-y-1 text-xs">
            <li>Go to notion.so/my-integrations</li>
            <li>Create a new integration</li>
            <li>Copy the Internal Integration Token</li>
            <li>Share pages with your integration in Notion</li>
          </ol>
        </div>
        <div className="space-y-2">
          <Typography variant="label" className="ml-2">Internal Integration Token</Typography>
          <Input
            type="password"
            placeholder="secret_..."
            value={key}
            onChange={e => setKey(e.target.value)}
          />
        </div>
      </div>
    </SelectionModal>
  )
}

function CleanupModal({ onClose }: any) {
  const [files, setFiles] = useState<any[]>([])
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const addToast = useToast(state => state.add)

  useEffect(() => {
    loadOrphanFiles()
  }, [])

  const loadOrphanFiles = async () => {
    setIsLoading(true)
    try {
      const result = await userApi.getOrphanFiles()
      setFiles(result.files || [])
    } catch (error) {
      addToast('error', 'Failed to load orphan files')
    } finally {
      setIsLoading(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
  }

  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const selectedSize = files.filter(f => selectedFiles.has(f.path)).reduce((sum, f) => sum + f.size, 0)

  const toggleFile = (path: string) => {
    const newSelected = new Set(selectedFiles)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedFiles(newSelected)
  }

  const toggleAll = () => {
    if (selectedFiles.size === files.length) {
      setSelectedFiles(new Set())
    } else {
      setSelectedFiles(new Set(files.map(f => f.path)))
    }
  }

  const handleDelete = async () => {
    if (selectedFiles.size === 0) {
      addToast('error', 'No files selected')
      return
    }

    if (!confirm(`Are you sure you want to delete ${selectedFiles.size} file(s)? This cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      const result = await userApi.deleteOrphanFiles(Array.from(selectedFiles))
      addToast('success', `Deleted ${result.deleted_count} file(s)`)
      setFiles(files.filter(f => !result.deleted.includes(f.path)))
      setSelectedFiles(new Set())
    } catch (error) {
      addToast('error', 'Failed to delete files')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      title="Clean Storage"
      className="md:max-w-lg md:mx-auto"
    >
      <div className="space-y-4">
        <div className="p-4 bg-amber-50 rounded-2xl text-sm text-amber-700">
          <strong>Warning:</strong> These files are not referenced anywhere. Delete with caution - this cannot be undone.
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-slate-400">Scanning...</div>
        ) : files.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <Trash2 size={32} className="mx-auto mb-2 opacity-50" />
            <p>No orphan files found</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">Found {files.length} file(s), {formatSize(totalSize)}</span>
              <button onClick={toggleAll} className="text-indigo-500 font-medium">
                {selectedFiles.size === files.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-xl divide-y divide-slate-50">
              {files.map(file => (
                <label
                  key={file.path}
                  className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedFiles.has(file.path)}
                    onChange={() => toggleFile(file.path)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-slate-600 truncate">{file.path}</p>
                  </div>
                  <span className="text-xs text-slate-400">{formatSize(file.size)}</span>
                </label>
              ))}
            </div>

            {selectedFiles.size > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500">
                  Selected: {selectedFiles.size} file(s), {formatSize(selectedSize)}
                </span>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl text-sm font-bold hover:bg-red-600 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </SelectionModal>
  )
}
