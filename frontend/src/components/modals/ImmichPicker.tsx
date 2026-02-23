import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, X, Cloud, Loader2, Check, Video as VideoIcon, Image as ImageIcon, Play } from 'lucide-react'
import { cn, Card } from '../ui/JourneyUI'
import api, { immichApi } from '../../lib/api'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'

// 获取完整的API URL，移动端需要使用存储的server_url
const getApiBaseUrl = () => {
  const storedUrl = localStorage.getItem('server_url')
  if (storedUrl) {
    return `${storedUrl.replace(/\/$/, '')}/api`
  }
  return '/api'
}

// 使用签名URL获取缩略图（asset对象包含sig字段）
const getThumbUrl = (assetId: string, sig: string) => {
  const baseUrl = getApiBaseUrl()
  return `${baseUrl}/proxy/immich/asset/${assetId}?sig=${sig}`
}

export default function ImmichPicker({ onSelect, onClose }: any) {
  const [activeTab, setActiveTab] = useState<'all' | 'albums'>('all')
  const [selectedAlbum, setSelectedAlbum] = useState<any>(null)
  const [importMode, setImportMode] = useState<'link' | 'copy'>('link')
  
  const observer = useRef<IntersectionObserver | null>(null)

  // 1. 所有照片的分页查询
  const { 
    data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading: loadingAll 
  } = useInfiniteQuery({
    queryKey: ['immich', 'all', 'infinite'],
    queryFn: ({ pageParam = 1 }) => api.get('/proxy/immich/assets', { params: { page: pageParam, size: 40 } }).then(r => r.data),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => lastPage.length === 40 ? allPages.length + 1 : undefined,
    enabled: activeTab === 'all'
  })

  // 2. 自动无限滚动逻辑
  const lastElementRef = useCallback((node: any) => {
    if (loadingAll || isFetchingNextPage) return
    if (observer.current) observer.current.disconnect()
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasNextPage) fetchNextPage()
    })
    if (node) observer.current.observe(node)
  }, [loadingAll, isFetchingNextPage, hasNextPage, fetchNextPage])

  // 3. 相册列表与详情查询
  const { data: albums = [], isLoading: loadingAlbums } = useQuery({ 
    queryKey: ['immich', 'albums'], 
    queryFn: () => api.get('/proxy/immich/albums').then(r => r.data), 
    enabled: activeTab === 'albums' && !selectedAlbum 
  })

  const { data: albumAssets = [], isLoading: loadingAlbumAssets } = useQuery({ 
    queryKey: ['immich', 'album', selectedAlbum?.id], 
    queryFn: () => api.get(`/proxy/immich/album/${selectedAlbum.id}/assets`).then(r => r.data), 
    enabled: !!selectedAlbum 
  })

  const allPhotos = data?.pages.flat() || []

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 20 }} 
      className="fixed inset-0 z-[250] bg-white flex flex-col overflow-hidden text-slate-900 font-sans"
    >
      <header className="h-24 border-b border-slate-100 px-10 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
         <div className="flex items-center gap-6">
            <button onClick={selectedAlbum ? () => setSelectedAlbum(null) : onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all text-slate-400">
               {selectedAlbum ? <ChevronLeft size={24}/> : <X size={24}/>}
            </button>
            <div className="space-y-0.5">
               <h4 className="text-3xl font-black tracking-tight">{selectedAlbum ? selectedAlbum.albumName : 'Immich Library'}</h4>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                  {selectedAlbum ? `${selectedAlbum.assetCount} items inside` : 'Photos, Videos & More'}
               </p>
            </div>
         </div>

         {/* 标签页与模式切换 */}
         {!selectedAlbum && (
           <div className="bg-slate-100 p-1.5 rounded-[20px] flex gap-1">
              <button onClick={() => setActiveTab('all')} className={cn("px-6 py-2.5 rounded-[14px] text-xs font-black transition-all uppercase tracking-widest", activeTab === 'all' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>All</button>
              <button onClick={() => setActiveTab('albums')} className={cn("px-6 py-2.5 rounded-[14px] text-xs font-black transition-all uppercase tracking-widest", activeTab === 'albums' ? "bg-white text-indigo-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}>Albums</button>
           </div>
         )}

         <div className="bg-slate-900 p-1.5 rounded-[20px] flex gap-1 shadow-xl">
            <button onClick={() => setImportMode('link')} className={cn("px-5 py-2 rounded-[14px] text-[10px] font-black transition-all uppercase tracking-widest", importMode === 'link' ? "bg-white/20 text-white" : "text-slate-500")}>Link</button>
            <button onClick={() => setImportMode('copy')} className={cn("px-5 py-2 rounded-[14px] text-[10px] font-black transition-all uppercase tracking-widest", importMode === 'copy' ? "bg-white/20 text-white" : "text-slate-500")}>Copy</button>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-10 no-scrollbar pb-32">
         {activeTab === 'all' ? (
            <div className="space-y-10">
              <AssetGrid assets={allPhotos} onSelect={(id:string, sig:string) => onSelect(id, sig, importMode)} />
              <div ref={lastElementRef} className="h-20 flex items-center justify-center">
                 {(hasNextPage || isFetchingNextPage) && <Loader2 className="animate-spin text-indigo-500" size={32}/>}
              </div>
            </div>
         ) : selectedAlbum ? (
            <AssetGrid assets={albumAssets} onSelect={(id:string, sig:string) => onSelect(id, sig, importMode)} loading={loadingAlbumAssets} />
         ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
               {loadingAlbums ? [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[32px] animate-pulse" />) :
                albums.map((album: any) => (
                 <Card key={album.id} className="aspect-[4/5] cursor-pointer group relative overflow-hidden" onClick={() => setSelectedAlbum(album)}>
                    <img 
                      src={album.albumThumbnailSig ? getThumbUrl(album.albumThumbnailAssetId, album.albumThumbnailSig) : ''} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-8">
                       <h5 className="text-white text-xl font-black tracking-tight">{album.albumName}</h5>
                       <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{album.assetCount} Items</p>
                    </div>
                 </Card>
               ))}
            </div>
         )}
      </div>
    </motion.div>
  )
}

function AssetGrid({ assets, onSelect, loading }: any) {
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-slate-200" size={48}/></div>
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
       {assets.map((asset: any) => {
         const id = asset.id || asset.assetId; 
         if (!id) return null
         const isVideo = asset.type === 'VIDEO'
         const duration = asset.duration
         const sig = asset.sig
         
         return (
           <motion.button 
             key={id} 
             whileHover={{ scale: 1.02 }} 
             whileTap={{ scale: 0.98 }} 
             onClick={() => onSelect(id, sig)} 
             className="aspect-square rounded-[28px] overflow-hidden bg-slate-50 border border-slate-100 group relative"
           >
              <img src={getThumbUrl(id, sig)} className="w-full h-full object-cover" loading="lazy" />
              
              {/* 视频标识 */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-12 h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                    <Play size={20} className="text-slate-900 ml-1" fill="currentColor" />
                  </div>
                </div>
              )}
              
              {/* 视频时长 */}
              {isVideo && duration && (
                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 rounded-lg text-white text-[10px] font-bold">
                  {formatDuration(duration)}
                </div>
              )}
              
              <div className="absolute inset-0 bg-indigo-600/10 opacity-0 group-hover:opacity-100 transition-opacity" />
           </motion.button>
         )
       })}
    </div>
  )
}

function formatDuration(duration: string): string {
  // duration 格式可能是 "00:01:30" 或秒数
  if (!duration) return ''
  if (duration.includes(':')) {
    const parts = duration.split(':')
    if (parts.length === 3) {
      const h = parseInt(parts[0])
      const m = parseInt(parts[1])
      const s = parseInt(parts[2])
      if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
      return `${m}:${s.toString().padStart(2, '0')}`
    }
    return duration
  }
  // 如果是秒数
  const seconds = parseInt(duration)
  if (isNaN(seconds)) return duration
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}