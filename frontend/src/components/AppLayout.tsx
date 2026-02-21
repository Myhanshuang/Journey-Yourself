import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Grid, BookOpen, History, BarChart2, Settings, Search, LayoutList, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { notebookApi } from '../lib/api'
import { SidebarNavItem, GlassHeader, ToastContainer, GlobalConfirmModal, cn, journeySpring } from './ui/JourneyUI'
import { NotebookModal } from './modals/NotebookModal'

export default function AppLayout() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [notebookModal, setNotebookModal] = useState<{ show: boolean, data?: any, afterCreate?: () => void }>({ show: false })

  const location = useLocation()
  const navigate = useNavigate()

  const { data: notebooks = [] } = useQuery({ queryKey: ['notebooks'], queryFn: () => notebookApi.list() })

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Determine current view from path
  const getCurrentView = () => {
    const path = location.pathname
    if (path.startsWith('/notebooks/') && path !== '/notebooks') return 'notebook-detail'
    if (path.startsWith('/diaries/')) return 'diary-detail'
    if (path === '/') return 'home'
    if (path === '/timeline') return 'timeline'
    if (path === '/notebooks') return 'notebooks'
    if (path === '/stats') return 'stats'
    if (path === '/settings') return 'settings'
    if (path === '/search') return 'search'
    return 'home'
  }

  const currentView = getCurrentView()

  const handleNavClick = (id: string) => {
    navigate(`/${id === 'home' ? '' : id}`)
  }

  const handleWriteClick = () => {
    if (notebooks.length === 0) {
      setNotebookModal({ show: true, afterCreate: () => navigate('/write') })
    } else {
      navigate('/write')
    }
  }

  const NavItems = [
    { id: 'home', label: 'Home', icon: <Grid size={20} /> },
    { id: 'notebooks', label: 'Library', icon: <BookOpen size={20} /> },
    { id: 'timeline', label: 'Timeline', icon: <History size={20} /> },
    { id: 'stats', label: 'Insights', icon: <BarChart2 size={20} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} /> },
  ]

  return (
    <div className="flex h-screen bg-[#f2f4f2] text-[#232f55] overflow-hidden selection:bg-[#6ebeea]/20">
      <ToastContainer />
      <GlobalConfirmModal />

      <AnimatePresence>
        {notebookModal.show && (
          <NotebookModal
            notebook={notebookModal.data}
            onClose={(res) => {
              if (res && notebookModal.afterCreate) notebookModal.afterCreate()
              setNotebookModal({ show: false })
            }}
          />
        )}
      </AnimatePresence>

      {!isMobile && (
        <motion.aside animate={{ width: isSidebarCollapsed ? 100 : 300 }} transition={journeySpring} className="h-full bg-white/30 backdrop-blur-3xl flex flex-col z-30 border-r border-[#232f55]/5">
          <div className="p-10 mb-4 flex items-center justify-between">
            {!isSidebarCollapsed && <span className="text-[18px] font-black uppercase tracking-[0.4em] text-[#232f55]">Journey Yourself</span>}
            <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="p-3 hover:bg-white rounded-2xl transition-all text-[#232f55]/40 active:scale-90"><LayoutList size={22} /></button>
          </div>
          <nav className="flex-1 px-6 space-y-2">
            {NavItems.map(item => (
              <SidebarNavItem
                key={item.id}
                icon={item.icon}
                label={item.label}
                active={currentView === item.id}
                onClick={() => handleNavClick(item.id)}
                collapsed={isSidebarCollapsed}
              />
            ))}
          </nav>
        </motion.aside>
      )}

      <main className="flex-1 flex flex-col relative overflow-hidden">
        <GlassHeader className={cn("px-6 md:px-16", isMobile && "bg-transparent border-none")}>
          <div className="w-10 h-10 hidden md:block" />
          <button
            onClick={() => navigate('/search')}
            className="flex items-center gap-3 px-6 py-2 bg-white/40 rounded-full w-full max-w-[320px] text-[#232f55]/30 hover:bg-white transition-all text-left outline-none border border-white/50 shadow-sm group"
          >
            <Search size={16} className="group-hover:scale-110 transition-transform" /><span className="text-[13px] font-bold">Search ripples...</span>
          </button>
        </GlassHeader>

        <div className={cn("flex-1 overflow-y-auto no-scrollbar", isMobile ? "px-6 pb-32" : "px-16")}>
          <div className="max-w-[1000px] mx-auto min-h-full pt-2 pb-10">
            <Outlet context={{ notebooks, setNotebookModal, handleWriteClick }} />
          </div>
        </div>

        {isMobile && (
          <div className="fixed bottom-8 left-6 right-6 z-50">
            <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-2xl border border-white/50 p-2 flex items-center justify-between">
              {NavItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={cn("flex items-center justify-center w-12 h-12 rounded-[20px] transition-all", currentView === item.id ? "bg-[#232f55] text-white" : "text-[#232f55]/40")}
                >
                  {item.icon}
                </button>
              ))}
              <div className="w-px h-8 bg-[#232f55]/5 mx-1" />
              <button onClick={handleWriteClick} className="w-12 h-12 bg-[#6ebeea] text-white rounded-[20px] shadow-lg flex items-center justify-center active:scale-90 transition-all"><Plus size={24} strokeWidth={3} /></button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}