import { useState } from 'react'
import { Tag as TagIcon, Plus, X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useQuery } from '@tanstack/react-query'
import api from '../../lib/api'
import { SelectionModal } from '../ui/selection-modal'
import { Input } from '../ui/input'
import { Button } from '../ui/button'
import { Typography } from '../ui/typography'

export default function TagPicker({ selectedTags, onUpdate, onClose }: any) {
  const [q, setQ] = useState('')
  const [localTags, setLocalTags] = useState<string[]>(selectedTags)
  
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/tags/').then(r => r.data) })

  const toggleTag = (name: string) => {
    setLocalTags(prev => 
      prev.includes(name) ? prev.filter(t => t !== name) : [...prev, name]
    )
  }

  const handleAdd = () => {
    if (!q.trim()) return
    const newTag = q.trim()
    if (!localTags.includes(newTag)) {
      setLocalTags(prev => [...prev, newTag])
    }
    setQ('')
  }

  const filtered = allTags.filter((t:string) => t.toLowerCase().includes(q.toLowerCase()) && !localTags.includes(t))

  const handleConfirm = () => {
    onUpdate(localTags)
    onClose()
  }

  return (
    <SelectionModal
      isOpen={true}
      onClose={onClose}
      onConfirm={handleConfirm}
      title="Collections Tags"
      subtitle="Organize your memories"
      variant="sheet"
      className="md:max-w-md md:mx-auto"
      confirmLabel="Done"
    >
      {/* 已选标签 */}
      <div className="flex flex-wrap gap-2 min-h-[40px] mb-6">
        {localTags.map((t: string) => (
          <button 
            key={t} 
            onClick={() => toggleTag(t)} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-full text-xs font-black cursor-pointer hover:bg-red-500 transition-colors flex items-center gap-2 group"
          >
              {t} <X size={12} className="opacity-50 group-hover:opacity-100" />
          </button>
        ))}
        {localTags.length === 0 && (
          <Typography variant="label" className="text-xs text-slate-300 italic normal-case">No tags selected...</Typography>
        )}
      </div>

      <div className="relative mb-6">
        <Input 
          autoFocus 
          className="pr-12" 
          placeholder="Search or Create Tag..." 
          value={q} 
          onChange={e => setQ(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && handleAdd()} 
        />
        <Button 
          size="icon"
          onClick={handleAdd} 
          className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl shadow-lg bg-slate-900 text-white hover:bg-slate-800"
        >
          <Plus size={16}/>
        </Button>
      </div>

      {/* 建议标签 */}
      <div className="max-h-48 overflow-y-auto space-y-2 no-scrollbar -mx-2 px-2">
        {filtered.map((t: string) => (
          <button 
            key={t} 
            onClick={() => toggleTag(t)} 
            className="w-full text-left px-5 py-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 group transition-all text-sm font-bold text-slate-600 hover:text-indigo-600 flex items-center gap-3"
          >
              <TagIcon size={14} className="opacity-30" /> {t}
          </button>
        ))}
        {filtered.length === 0 && q && (
           <div className="py-4 text-center">
             <Typography variant="label" className="text-slate-300">Press + to create "{q}"</Typography>
           </div>
        )}
      </div>
    </SelectionModal>
  )
}
