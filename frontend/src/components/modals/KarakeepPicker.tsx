import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, X, Loader2, Bookmark, ExternalLink } from 'lucide-react'
import { karakeepApi } from '../../lib/api'
import { useInfiniteQuery } from '@tanstack/react-query'

export default function KarakeepPicker({ onSelect, onClose }: any) {
  const observer = useRef<IntersectionObserver | null>(null)

  const { 
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading 
  } = useInfiniteQuery({
    queryKey: ['karakeep', 'bookmarks'],
    queryFn: ({ pageParam = undefined }) => karakeepApi.listBookmarks(20, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
        // Karakeep returns { bookmarks: [], nextCursor: string | null }
        return lastPage?.nextCursor || undefined
    }
  })

  const bookmarks = data?.pages.flatMap(page => page?.bookmarks || []) || []

  const lastElementRef = useCallback((node: any) => {
    if (isLoading || isFetchingNextPage) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) fetchNextPage()
    })
    if (node) observer.current.observe(node)
  }, [isLoading, isFetchingNextPage, hasNextPage, fetchNextPage])

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 20 }} 
      className="fixed inset-0 z-[250] bg-white flex flex-col overflow-hidden text-slate-900 font-sans"
    >
      <header className="h-24 border-b border-slate-100 px-10 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
         <div className="flex items-center gap-6">
            <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400">
               <X size={24}/>
            </button>
            <div className="space-y-0.5">
               <h4 className="text-3xl font-black tracking-tight text-pink-500">Karakeep</h4>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  Select a bookmark
               </p>
            </div>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 no-scrollbar pb-32">
         {isLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-pink-200" size={48}/></div>
         ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {bookmarks.map((bookmark: any) => (
                 <motion.button 
                   key={bookmark.id || Math.random()}
                   whileHover={{ scale: 1.02 }}
                   whileTap={{ scale: 0.98 }}
                   onClick={() => onSelect(bookmark)}
                   className="text-left bg-slate-50 hover:bg-white border border-transparent hover:border-pink-100 p-6 rounded-[24px] group transition-all shadow-sm hover:shadow-xl hover:shadow-pink-500/10 flex flex-col gap-3 h-full"
                 >
                    <div className="flex items-start justify-between w-full">
                        <div className="p-3 bg-white rounded-2xl shadow-sm text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-colors">
                            <Bookmark size={20} />
                        </div>
                        {bookmark.image_url && (
                             <img src={bookmark.image_url} className="w-12 h-12 rounded-xl object-cover bg-slate-200" alt="" />
                        )}
                    </div>
                    <div>
                        <h5 className="font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-pink-600 transition-colors">{bookmark.title || bookmark.url}</h5>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2 font-medium">{bookmark.description || bookmark.url}</p>
                    </div>
                    <div className="mt-auto pt-4 flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        <span>{bookmark.created_at ? new Date(bookmark.created_at).toLocaleDateString() : 'Unknown Date'}</span>
                    </div>
                 </motion.button>
               ))}
               
               <div ref={lastElementRef} className="col-span-full h-20 flex items-center justify-center">
                  {(hasNextPage || isFetchingNextPage) && <Loader2 className="animate-spin text-pink-500" size={32}/>}
               </div>
            </div>
         )}
      </div>
    </motion.div>
  )
}
