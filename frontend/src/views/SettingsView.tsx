import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, Lock, Database, Cloud, ChevronRight, Save, Download, Upload, LogOut, X, Info, CheckCircle2, AlertCircle, Globe, Clock, Plus, Minus, UserPlus, Shield, User as UserIcon, Link2
} from 'lucide-react'
import { cn, Card, useToast, useAdjustedTime } from '../components/ui/JourneyUI'
import { userApi } from '../lib/api'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

export default function SettingsView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user, isLoading } = useQuery({ queryKey: ['user', 'me'], queryFn: userApi.me })
  const [activeModal, setActiveModal] = useState<'profile' | 'password' | 'immich' | 'geo' | 'system' | 'timezone' | 'timeoffset' | 'createuser' | null>(null)

  const handleLogout = () => {
    localStorage.removeItem('token')
    queryClient.clear()
    navigate('/login')
  }

  if (isLoading) return <div className="p-20 text-slate-400 font-black animate-pulse uppercase tracking-widest text-xs text-slate-900">Loading Settings...</div>

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12 max-w-[700px] mx-auto space-y-12 pb-32 text-slate-900">
      <header className="space-y-2 text-slate-900">
        <h2 className="text-5xl font-black tracking-tight">Settings</h2>
        <p className="text-xl text-slate-400 font-medium italic">Your private sanctuary, secured.</p>
      </header>

      <div className="space-y-10">
        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 ml-2">Personal</h3>
          <Card className="divide-y divide-slate-50 text-slate-900">
            <SettingsRow icon={<User size={18} />} label="Rename Profile" sub={user?.username} onClick={() => setActiveModal('profile')} />
            <SettingsRow icon={<Lock size={18} />} label="Account Security" sub="Update password" onClick={() => setActiveModal('password')} />
            <SettingsRow icon={<Globe size={18} />} label="Timezone" sub={user?.timezone || 'UTC'} onClick={() => setActiveModal('timezone')} />
            <SettingsRow icon={<Clock size={18} />} label="Time Correction" sub={`${Math.floor((user?.time_offset_mins || 0) / 60)}h ${(user?.time_offset_mins || 0) % 60}m`} onClick={() => setActiveModal('timeoffset')} />
          </Card>
        </div>

        {user?.role === 'admin' && (
          <div className="space-y-4">
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-400 ml-2">Administration</h3>
            <Card className="divide-y divide-slate-50 text-slate-900">
              <SettingsRow icon={<UserPlus size={18} className="text-indigo-500" />} label="Provision Account" sub="Add new user or administrator" onClick={() => setActiveModal('createuser')} />
            </Card>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 ml-2">Integrations</h3>
          <Card className="divide-y divide-slate-50 text-slate-900">
            <SettingsRow icon={<Cloud size={18} className={cn(user?.has_immich_key ? "text-emerald-500" : "text-indigo-500")} />} label="Immich Library" sub={user?.has_immich_key ? "Connected" : "Not Configured"} onClick={() => setActiveModal('immich')} />
            <SettingsRow icon={<Globe size={18} className={cn(user?.has_geo_key ? "text-emerald-500" : "text-indigo-500")} />} label="Geographic Service" sub={user?.has_geo_key ? "Configured" : "Not Configured"} onClick={() => setActiveModal('geo')} />
          </Card>
        </div>

        <div className="space-y-4">
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300 ml-2">System</h3>
          <Card className="divide-y divide-slate-50 text-slate-900">
            <SettingsRow icon={<Link2 size={18} className="text-indigo-500" />} label="Share Manager" sub="Manage shared links" onClick={() => navigate('/shares')} />
            <SettingsRow icon={<Database size={18} className="text-amber-500" />} label="Maintenance" sub="Export/Import DB" onClick={() => setActiveModal('system')} />
          </Card>
        </div>

        <button onClick={handleLogout} className="w-full py-5 bg-red-50 text-red-500 rounded-[24px] font-black text-xs uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-red-100 transition-all shadow-sm">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <AnimatePresence>
        {activeModal === 'profile' && <ProfileModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'password' && <PasswordModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'immich' && <ImmichModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'geo' && <GeoModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'system' && <SystemModal onClose={() => setActiveModal(null)} />}
        {activeModal === 'timezone' && <TimezoneModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'timeoffset' && <TimeOffsetModal user={user} onClose={() => { setActiveModal(null); queryClient.invalidateQueries(); }} />}
        {activeModal === 'createuser' && <CreateUserModal onClose={() => setActiveModal(null)} />}
      </AnimatePresence>
    </motion.div>
  )
}

function CreateUserModal({ onClose }: any) {
  const [form, setForm] = useState({ username: '', password: '', role: 'user' })
  const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => { addToast('success', `Account ${form.username} created`); onClose(); },
    onError: (e: any) => addToast('error', e.response?.data?.detail || 'Failed')
  })

  return (
    <ModalWrapper title="Provision Account" onClose={onClose}>
      <div className="space-y-6">
        <div className="space-y-4">
          <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 focus:ring-2 focus:ring-indigo-100" placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
          <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">Assign Role</label>
          <div className="bg-slate-100 p-1.5 rounded-[20px] flex gap-1 shadow-inner">
            <button onClick={() => setForm({ ...form, role: 'user' })} className={cn("flex-1 py-3 rounded-[14px] text-xs font-black transition-all flex items-center justify-center gap-2", form.role === 'user' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400")}>
              <UserIcon size={14} /> User
            </button>
            <button onClick={() => setForm({ ...form, role: 'admin' })} className={cn("flex-1 py-3 rounded-[14px] text-xs font-black transition-all flex items-center justify-center gap-2", form.role === 'admin' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400")}>
              <Shield size={14} /> Admin
            </button>
          </div>
        </div>

        <button onClick={() => mutation.mutate(form)} disabled={mutation.isPending} className="w-full py-5 bg-slate-900 text-white rounded-[24px] font-black shadow-2xl active:scale-95 transition-all text-xs uppercase tracking-widest">Create Account</button>
      </div>
    </ModalWrapper>
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

function ModalWrapper({ title, children, onClose }: any) {
  return (
    <div className="fixed inset-0 z-[100] bg-black/5 backdrop-blur-md flex items-center justify-center p-6 text-slate-900">
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-10 rounded-[48px] max-w-md w-full shadow-2xl border border-white">
        <div className="flex items-center justify-between mb-8">
          <h4 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h4>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-xl text-slate-300"><X /></button>
        </div>
        {children}
      </motion.div>
    </div>
  )
}

function ProfileModal({ user, onClose }: any) {
  const [name, setName] = useState(user.username); const addToast = useToast(state => state.add)
  const mutation = useMutation({ mutationFn: userApi.updateProfile, onSuccess: () => { addToast('success', 'Profile renamed'); onClose(); } })
  return (
    <ModalWrapper title="Rename Profile" onClose={onClose}>
      <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" value={name} onChange={e => setName(e.target.value)} />
      <button onClick={() => mutation.mutate({ username: name })} className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-bold shadow-xl mt-6">Update</button>
    </ModalWrapper>
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
    <ModalWrapper title="Change Password" onClose={onClose}>
      <div className="space-y-4">
        <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" type="password" placeholder="Old Password" value={form.old} onChange={e => setForm({ ...form, old: e.target.value })} />
        <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" type="password" placeholder="New Password" value={form.new} onChange={e => setForm({ ...form, new: e.target.value })} />
      </div>
      <button onClick={() => {
        if (!form.old || !form.new) return addToast('error', 'Fields required');
        mutation.mutate({ old_password: form.old, new_password: form.new })
      }} disabled={mutation.isPending} className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-bold shadow-xl mt-6 disabled:opacity-50">Update</button>
    </ModalWrapper>
  )
}

function TimezoneModal({ user, onClose }: any) {
  const [tz, setTz] = useState(user.timezone || 'UTC'); const addToast = useToast(state => state.add)
  const mutation = useMutation({ mutationFn: userApi.updateProfile, onSuccess: () => { addToast('success', 'Timezone synced'); onClose(); } })
  const timezones = ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Asia/Tokyo']
  return (
    <ModalWrapper title="Select Timezone" onClose={onClose}>
      <div className="grid gap-2">{timezones.map(t => (<button key={t} onClick={() => setTz(t)} className={cn("px-6 py-4 rounded-2xl text-left font-bold transition-all", tz === t ? "bg-indigo-600 text-white shadow-lg" : "bg-slate-50 text-slate-600")}>{t}</button>))}</div>
      <button onClick={() => mutation.mutate({ timezone: tz })} className="w-full py-4 bg-slate-900 text-white rounded-[20px] font-bold shadow-xl mt-4">Save</button>
    </ModalWrapper>
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
    <ModalWrapper title="Time Correction" onClose={onClose}>
      <div className="text-center p-8 bg-slate-900 rounded-[32px] text-white shadow-2xl mb-8">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">Adjusted Real-time</p>
        <p className="text-5xl font-black tabular-nums">{adj.toLocaleTimeString([], { hour12: false })}</p>
        <p className="text-xs font-bold text-slate-400 mt-2">{adj.toDateString()}</p>
      </div>
      <div className="space-y-4">
        <OffsetControl label="Hours" value={Math.floor(mins / 60)} onAdd={() => setMins(mins + 60)} onSub={() => setMins(mins - 60)} />
        <OffsetControl label="Minutes" value={mins % 60} onAdd={() => setMins(mins + 1)} onSub={() => setMins(mins - 1)} />
      </div>
      <button onClick={() => mutation.mutate({ time_offset_mins: mins })} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl mt-8 text-xs">APPLY CALIBRATION</button>
    </ModalWrapper>
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
    <ModalWrapper title="Immich Link" onClose={onClose}>
      <div className="space-y-4">
        <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" placeholder="e.g. https://immich.yourdomain.com" value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} />
        <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" type="password" placeholder="API Key" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} />
      </div>
      <button onClick={() => {
        if (!form.url || !form.key) return addToast('error', 'URL and Key required')
        mutation.mutate({ url: form.url, api_key: form.key })
      }} disabled={mutation.isPending} className="w-full py-4 bg-indigo-600 text-white rounded-[20px] font-bold shadow-xl mt-6 disabled:opacity-50">
        {mutation.isPending ? 'Verifying...' : 'Verify & Link'}
      </button>
    </ModalWrapper>
  )
}

function SystemModal({ onClose }: any) {
  return (
    <ModalWrapper title="Maintenance" onClose={onClose}>
      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => userApi.exportDb()} className="flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[28px] hover:bg-indigo-50 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100"><Download size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Export DB</span></button>
        <div className="relative flex flex-col items-center gap-3 p-6 bg-slate-50 rounded-[28px] hover:bg-amber-50 hover:text-amber-600 transition-all border border-transparent hover:border-amber-100"><Upload size={24} /><span className="text-[10px] font-black uppercase tracking-widest">Import DB</span><input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => { const f = e.target.files?.[0]; if (f) userApi.importDb(f).then(() => window.location.reload()) }} /></div>
      </div>
    </ModalWrapper>
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
    <ModalWrapper title="Geographic API" onClose={onClose}>
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">Service Provider</label>
          <div className="relative">
            <select
              className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700 appearance-none border-2 border-transparent focus:border-indigo-100 transition-all cursor-pointer"
              value={form.provider}
              onChange={e => setForm({ ...form, provider: e.target.value })}
            >
              <option value="amap">高德地图 (Amap)</option>
            </select>
            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 rotate-90 text-slate-300 pointer-events-none" size={18} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">API Key (Web Service)</label>
          <input className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" type="password" placeholder="Enter your API Key" value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} />
        </div>
        <button onClick={() => {
          if (!form.key) return addToast('error', 'API Key required')
          mutation.mutate({ provider: form.provider, api_key: form.key })
        }} disabled={mutation.isPending} className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black shadow-xl disabled:opacity-50 text-xs uppercase tracking-widest active:scale-95 transition-all">
          {mutation.isPending ? 'Verifying...' : 'Verify & Bind'}
        </button>
      </div>
    </ModalWrapper>
  )
}