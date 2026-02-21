import { motion } from 'framer-motion'
import { Plus, Trash2, BookOpen } from 'lucide-react'
import { Card, useAdjustedTime, useConfirm, useToast, getAssetUrl } from '../components/ui/JourneyUI'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { notebookApi } from '../lib/api'

interface OutletContextType {
  notebooks: any[]
  setNotebookModal: (config: { show: boolean; data?: any; afterCreate?: () => void }) => void
  handleWriteClick: () => void
}

export default function NotebooksListView() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { getAdjusted } = useAdjustedTime()
  const askConfirm = useConfirm(state => state.ask)
  const addToast = useToast(state => state.add)
  const outletContext = useOutletContext<OutletContextType>()
  const { notebooks, setNotebookModal } = outletContext

  const handleSelect = (notebook: any) => {
    navigate(`/notebooks/${notebook.id}`)
  }

  const handleAdd = () => {
    setNotebookModal({ show: true })
  }

  const handleDelete = (id: number) => {
    askConfirm(
      "Delete Collection?",
      "This will permanently delete all diaries in this collection. This action cannot be undone.",
      () => {
        notebookApi.delete(id).then(() => {
          queryClient.invalidateQueries({ queryKey: ['notebooks'] })
          addToast('success', 'Collection deleted')
        })
      }
    )
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8 md:py-12 space-y-8 md:space-y-12">
      <header className="flex items-start md:items-end justify-between gap-4">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-4xl md:text-6xl font-black tracking-tighter text-slate-900 leading-none">Collections</h2>
          <p className="text-base md:text-xl text-slate-400 font-medium italic">Every volume tells a different story.</p>
        </div>
        <button onClick={handleAdd} className="p-4 md:p-5 bg-slate-900 text-white rounded-2xl md:rounded-3xl shadow-2xl hover:bg-indigo-600 transition-all active:scale-95"><Plus size={24} strokeWidth={3} /></button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-10 pb-32">
        {notebooks.map((nb: any) => {
          const adjCreated = getAdjusted(nb.created_at)
          return (
            <Card key={nb.id} className="group relative" onClick={() => handleSelect(nb)}>
              <div className="aspect-[3/4] md:aspect-[4/5] overflow-hidden bg-slate-100">
                {nb.cover_url ? (
                  <img src={getAssetUrl(nb.cover_url)} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200"><BookOpen size={48} /></div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 group-hover:opacity-100 transition-opacity" />

                {/* 底部悬浮信息 */}
                <div className="absolute inset-0 p-4 md:p-8 flex flex-col justify-end text-white pointer-events-none">
                  <h3 className="text-xl md:text-3xl font-black tracking-tight mb-1 md:mb-2 translate-y-2 group-hover:translate-y-0 transition-transform duration-500">{nb.name}</h3>
                  <p className="text-white/60 text-[10px] md:text-xs font-bold uppercase tracking-widest line-clamp-2 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-75 mb-2 md:mb-4">{nb.description || "The unwritten chapters of your journey."}</p>

                  <div className="flex items-center justify-between border-t border-white/10 pt-2 md:pt-4 opacity-0 group-hover:opacity-100 transition-all duration-500 delay-150">
                    <div className="flex flex-col gap-0.5 md:gap-1">
                      <span className="text-[8px] md:text-[9px] font-black uppercase text-white/40 tracking-tighter">Created At</span>
                      <span className="text-[9px] md:text-[10px] font-black">{adjCreated.toLocaleDateString()}</span>
                    </div>
                    <div className="text-right flex flex-col gap-0.5 md:gap-1">
                      <span className="text-[8px] md:text-[9px] font-black uppercase text-white/40 tracking-tighter">Entries</span>
                      <span className="text-[9px] md:text-[10px] font-black">{nb.stats_snapshot?.total_entries || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDelete(nb.id); }}
                className="absolute top-3 right-3 md:top-6 md:right-6 p-2 md:p-3 bg-white/10 backdrop-blur-md rounded-xl md:rounded-2xl text-white/40 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={16} />
              </button>
            </Card>
          )
        })}
      </div>
    </motion.div>
  )
}