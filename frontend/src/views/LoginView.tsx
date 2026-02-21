import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, User as UserIcon, Lock } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../lib/api'
import { useToast, ToastContainer } from '../components/ui/JourneyUI'
import { useNavigate } from 'react-router-dom'

export default function LoginView() {
  const navigate = useNavigate()
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const addToast = useToast(state => state.add)

  const mutation = useMutation({
    mutationFn: (params: URLSearchParams) => authApi.login(params),
    onSuccess: (res) => {
      localStorage.setItem('token', res.access_token)
      addToast('success', 'Welcome back to Journey')
      navigate('/')
    },
    onError: (error: any) => {
      addToast('error', error.response?.data?.detail || 'Authentication failed')
    }
  })

  const handleSubmit = () => {
    if (!u || !p) return addToast('error', 'Username and password required')
    const ps = new URLSearchParams()
    ps.append('username', u)
    ps.append('password', p)
    mutation.mutate(ps)
  }

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f2f4f2] text-[#232f55]">
      <ToastContainer />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="w-full max-w-md p-12 bg-white/80 backdrop-blur-3xl rounded-[56px] shadow-[0_50px_100px_-20px_rgba(35,47,85,0.1)] border border-white text-center space-y-10">
        <div className="w-24 h-24 bg-[#232f55] rounded-[32px] mx-auto flex items-center justify-center text-white shadow-2xl shadow-[#232f55]/20">
          <BookOpen size={40} strokeWidth={1.5} />
        </div>

        <div className="space-y-2 text-[#232f55]">
          <h2 className="text-4xl font-black tracking-tighter">Journey Your Day</h2>
          <p className="text-[#232f55]/40 font-medium italic">Enter your personal sanctuary.</p>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <UserIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#6ebeea] transition-colors" size={20} />
            <input
              className="w-full pl-16 pr-6 py-5 bg-[#f2f4f2]/50 rounded-[24px] outline-none font-bold text-[#232f55] focus:ring-4 focus:ring-[#6ebeea]/10 transition-all border border-transparent focus:border-white"
              placeholder="Username"
              value={u} onChange={e => setU(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <div className="relative group">
            <Lock className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#6ebeea] transition-colors" size={20} />
            <input
              className="w-full pl-16 pr-6 py-5 bg-[#f2f4f2]/50 rounded-[24px] outline-none font-bold text-[#232f55] focus:ring-4 focus:ring-[#6ebeea]/10 transition-all border border-transparent focus:border-white"
              type="password"
              placeholder="Password"
              value={p} onChange={e => setP(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={mutation.isPending}
            className="w-full py-5 bg-[#232f55] text-white rounded-[24px] font-black tracking-widest shadow-xl active:scale-95 transition-all text-xs uppercase disabled:opacity-50"
          >
            {mutation.isPending ? 'Authenticating...' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}