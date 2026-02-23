import { useState } from 'react'
import { Search, Check } from 'lucide-react'
import { cn } from '../../lib/utils'
import { SelectionModal } from '../ui/selection-modal'
import { Input } from '../ui/input'
import { Typography } from '../ui/typography'

export default function NotebookPicker({ notebooks, selectedId, onSelect, onClose }: any) {
  const [q, setQ] = useState('')
  const [localSelectedId, setLocalSelectedId] = useState(selectedId)
  
  const filtered = notebooks.filter((nb: any) => 
    nb.name.toLowerCase().includes(q.toLowerCase()) || 
    nb.description?.toLowerCase().includes(q.toLowerCase())
  )

  const handleConfirm = () => {
    onSelect(localSelectedId)
    onClose()
  }

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Select Collection"
      subtitle="Where does this memory belong?"
      variant="sheet"
      className="md:max-w-2xl md:mx-auto" // Adjust width for desktop
    >
      {/* 搜索框 */}
      <div className="relative mb-6">
         <Input 
           autoFocus 
           className="pl-12" 
           placeholder="Search volumes..." 
           value={q} 
           onChange={e => setQ(e.target.value)} 
         />
         <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20}/>
      </div>

      {/* 列表区域 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
         {filtered.map((nb: any) => (
           <button 
             key={nb.id} 
             onClick={() => setLocalSelectedId(nb.id)}
             className={cn(
               "flex items-center gap-4 p-4 rounded-[28px] border-2 transition-all text-left group",
               localSelectedId === nb.id 
                 ? "border-indigo-600 bg-indigo-50/50 shadow-lg shadow-indigo-100" 
                 : "border-transparent bg-slate-50 hover:bg-white hover:border-slate-200"
             )}
           >
              <div className="w-16 h-20 rounded-xl overflow-hidden shadow-sm bg-slate-200 flex-shrink-0">
                 {nb.cover_url && <img src={nb.cover_url} className="w-full h-full object-cover" />}
              </div>
              <div className="flex-1 min-w-0">
                 <Typography variant="h4" className={cn("text-base font-black truncate m-0", localSelectedId === nb.id ? "text-indigo-600" : "text-slate-900")}>{nb.name}</Typography>
                 <Typography variant="label" className="mt-1 block">{nb.stats_snapshot?.total_entries || 0} Entries</Typography>
              </div>
              {localSelectedId === nb.id && <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-lg"><Check size={16} strokeWidth={4}/></div>}
           </button>
         ))}
      </div>
    </SelectionModal>
  )
}
