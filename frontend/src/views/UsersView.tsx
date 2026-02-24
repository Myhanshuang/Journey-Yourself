import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, UserPlus, Shield, User as UserIcon, Trash2 } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { userApi } from '../lib/api'
import { Card, useToast, useConfirm, journeySpring, cn, ConfigSelect } from '../components/ui/JourneyUI'
import { SelectionModal } from '../components/ui/selection-modal'
import { Input } from '../components/ui/input'

interface UserItem {
  id: number
  username: string
  role: string
  timezone: string
  time_offset_mins: number
  has_immich_key: boolean
  has_karakeep_key: boolean
  has_ai_key: boolean
  has_geo_key: boolean
  ai_provider: string | null
  geo_provider: string | null
}

const ROLE_OPTIONS = [
  { value: 'user', label: 'User' },
  { value: 'admin', label: 'Admin' }
]

export default function UsersView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null)

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.listAll
  })

  const handleBack = () => navigate('/settings')

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={journeySpring}
      className="py-12 max-w-[700px] mx-auto space-y-12 pb-32 text-slate-900 px-4 md:px-0"
    >
      <header className="space-y-2">
        <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-bold transition-all mb-6">
          <ChevronLeft size={20} /> Settings
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter">User Manager</h2>
            <p className="text-xl text-slate-400 font-medium italic mt-2">Manage all users and permissions.</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-[#232f55] text-white rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-[#232f55]/90 transition-all shadow-lg"
          >
            <UserPlus size={16} /> Add User
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="p-20 text-center text-slate-400 font-black animate-pulse uppercase tracking-widest text-xs">
          Loading Users...
        </div>
      ) : users.length === 0 ? (
        <Card className="p-12 text-center">
          <UserIcon size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-400 font-medium">No users found.</p>
        </Card>
      ) : (
        <Card className="divide-y divide-slate-100" padding="none">
          <AnimatePresence mode="popLayout">
            {users.map((user: UserItem) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
                onClick={() => setSelectedUser(user)}
                className="flex items-center gap-5 p-6 hover:bg-slate-50/50 transition-all cursor-pointer"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center",
                  user.role === 'admin' ? "bg-[#6ebeea]/20 text-[#6ebeea]" : "bg-slate-100 text-slate-500"
                )}>
                  {user.role === 'admin' ? <Shield size={20} /> : <UserIcon size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-800 truncate">{user.username}</p>
                    <span className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black uppercase",
                      user.role === 'admin' ? "bg-[#6ebeea]/20 text-[#6ebeea]" : "bg-slate-100 text-slate-500"
                    )}>
                      {user.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {user.timezone} · {[
                      user.has_immich_key && 'Immich',
                      user.has_karakeep_key && 'Karakeep',
                      user.has_ai_key && 'AI',
                      user.has_geo_key && 'Geo'
                    ].filter(Boolean).join(' · ') || 'No integrations'}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </Card>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <CreateUserModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
          />
        )}
        {selectedUser && (
          <UserDetailModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['users'] })}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function CreateUserModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ username: '', password: '', role: 'user' })
  const addToast = useToast(state => state.add)
  const mutation = useMutation({
    mutationFn: userApi.createUser,
    onSuccess: () => {
      addToast('success', `Account ${form.username} created`)
      onSuccess()
      onClose()
    },
    onError: (e: any) => addToast('error', e.response?.data?.detail || 'Failed')
  })

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      title="Provision Account"
      onConfirm={() => {
        if (!form.username || !form.password) {
          addToast('error', 'Username and password required')
          return
        }
        mutation.mutate(form)
      }}
      confirmLabel="Create"
      loading={mutation.isPending}
      className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-6">
        <Input placeholder="Username" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} />
        <Input type="password" placeholder="Password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <ConfigSelect
          label="Role"
          options={ROLE_OPTIONS}
          value={form.role}
          onChange={v => setForm({ ...form, role: v })}
          theme="indigo"
          placement="top"
        />
      </div>
    </SelectionModal>
  )
}

function UserDetailModal({ user, onClose, onSuccess }: { user: UserItem; onClose: () => void; onSuccess: () => void }) {
  const addToast = useToast(state => state.add)
  const askConfirm = useConfirm(state => state.ask)
  const [role, setRole] = useState(user.role)
  const [password, setPassword] = useState('')
  const isPrimaryAdmin = user.id === 1

  const updateMutation = useMutation({
    mutationFn: async () => {
      const promises = []
      
      // 更新角色（如果有变化且不是主管理员）
      if (role !== user.role && !isPrimaryAdmin) {
        promises.push(userApi.updateRole(user.id, role))
      }
      
      // 更新密码（如果填写了）
      if (password) {
        promises.push(userApi.resetPassword(user.id, password))
      }
      
      return Promise.all(promises)
    },
    onSuccess: () => {
      addToast('success', 'User updated')
      onSuccess()
      onClose()
    },
    onError: (e: any) => addToast('error', e.response?.data?.detail || 'Failed')
  })

  const deleteMutation = useMutation({
    mutationFn: () => userApi.deleteUser(user.id),
    onSuccess: () => {
      addToast('success', `User ${user.username} deleted`)
      onSuccess()
      onClose()
    },
    onError: (e: any) => addToast('error', e.response?.data?.detail || 'Failed')
  })

  const handleDelete = () => {
    askConfirm(
      "Delete User?",
      `This will permanently delete "${user.username}" and all their data. This action cannot be undone.`,
      () => deleteMutation.mutate()
    )
  }

  const handleSave = () => {
    if (role === user.role && !password) {
      addToast('error', 'No changes to save')
      return
    }
    updateMutation.mutate()
  }

  const hasChanges = (role !== user.role && !isPrimaryAdmin) || password

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      title={`Manage ${user.username}`}
      onConfirm={handleSave}
      confirmLabel="Save"
      loading={updateMutation.isPending}
      disabled={!hasChanges}
      className="md:max-w-md md:mx-auto"
    >
      <div className="space-y-6">
        {/* User Info Header */}
        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0",
            user.role === 'admin' ? "bg-[#6ebeea]/20 text-[#6ebeea]" : "bg-slate-200 text-slate-500"
          )}>
            {user.role === 'admin' ? <Shield size={20} /> : <UserIcon size={20} />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-800 truncate">{user.username}</p>
            <p className="text-xs text-slate-400">{user.timezone} · ID: {user.id}</p>
          </div>
          {/* Delete button - hidden for primary admin */}
          {!isPrimaryAdmin && (
            <button
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-all flex-shrink-0"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {/* Role Select - disabled for primary admin */}
        <ConfigSelect
          label="Role"
          options={ROLE_OPTIONS}
          value={role}
          onChange={setRole}
          theme="indigo"
        />
        {isPrimaryAdmin && (
          <p className="text-xs text-slate-400 -mt-4 ml-2">Primary administrator role cannot be changed</p>
        )}

        {/* Password Input */}
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-300 ml-2 tracking-widest">New Password</label>
          <Input
            type="password"
            placeholder="Leave blank to keep current password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </div>
      </div>
    </SelectionModal>
  )
}
