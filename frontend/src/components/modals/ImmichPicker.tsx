import { useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, Loader2, Play, Image as ImageIcon } from 'lucide-react'
import { cn } from '../../lib/utils'
import api from '../../lib/api'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { Modal } from '../ui/modal'
import { Button } from '../ui/button'
import { Card } from '../ui/card'
import { Typography } from '../ui/typography'

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

interface ImmichPickerProps {
  onSelect: (id: string, sig: string, mode: 'link' | 'copy') => void
  onClose: () => void
  isOpen?: boolean // Add isOpen prop to control the modal state from parent if needed, though usually mounted conditionally
}

export default function ImmichPicker({ onSelect, onClose }: ImmichPickerProps) {
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
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      variant="fullscreen" 
      className="bg-white p-0"
    >
      <header className="flex-none pt-safe px-6 pb-4 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md z-10 sticky top-0">
         <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={selectedAlbum ? () => setSelectedAlbum(null) : onClose}
              className="rounded-full hover:bg-slate-100"
            >
               <ChevronLeft size={24} className="text-slate-400"/>
            </Button>
            <div className="space-y-0.5">
               <Typography variant="h4" className="text-lg md:text-xl">
                 {selectedAlbum ? selectedAlbum.albumName : 'Immich Library'}
               </Typography>
               <Typography variant="label">
                  {selectedAlbum ? `${selectedAlbum.assetCount} items` : 'Photos & Videos'}
               </Typography>
            </div>
         </div>

         {/* 标签页与模式切换 */}
         {!selectedAlbum && (
           <div className="hidden md:flex bg-slate-100 p-1 rounded-[16px] gap-1">
              <Button 
                variant={activeTab === 'all' ? 'active' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('all')}
                className={cn("rounded-[12px]", activeTab === 'all' && "bg-white shadow-sm border-transparent")}
              >
                All
              </Button>
              <Button 
                variant={activeTab === 'albums' ? 'active' : 'ghost'} 
                size="sm" 
                onClick={() => setActiveTab('albums')}
                className={cn("rounded-[12px]", activeTab === 'albums' && "bg-white shadow-sm border-transparent")}
              >
                Albums
              </Button>
           </div>
         )}

         <div className="bg-slate-900 p-1 rounded-[16px] flex gap-1 shadow-lg">
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setImportMode('link')} 
              className={cn("h-8 rounded-[12px] text-[10px]", importMode === 'link' ? "bg-white/20 text-white hover:bg-white/20 hover:text-white" : "text-slate-500 hover:text-slate-300 hover:bg-transparent")}
            >
              Link
            </Button>
            <Button 
              variant="ghost"
              size="sm"
              onClick={() => setImportMode('copy')} 
              className={cn("h-8 rounded-[12px] text-[10px]", importMode === 'copy' ? "bg-white/20 text-white hover:bg-white/20 hover:text-white" : "text-slate-500 hover:text-slate-300 hover:bg-transparent")}
            >
              Copy
            </Button>
         </div>
      </header>

      {/* Mobile Tabs (Secondary Header) */}
      {!selectedAlbum && (
         <div className="md:hidden px-6 py-2 flex items-center gap-2 border-b border-slate-50 bg-white">
            <Button 
              variant={activeTab === 'all' ? 'default' : 'secondary'} 
              size="sm" 
              onClick={() => setActiveTab('all')}
              className={cn("rounded-full px-6 h-8", activeTab !== 'all' && "bg-slate-100 border-transparent text-slate-400")}
            >
              All Photos
            </Button>
            <Button 
              variant={activeTab === 'albums' ? 'default' : 'secondary'} 
              size="sm" 
              onClick={() => setActiveTab('albums')}
              className={cn("rounded-full px-6 h-8", activeTab !== 'albums' && "bg-slate-100 border-transparent text-slate-400")}
            >
              Albums
            </Button>
         </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-10 pb-safe no-scrollbar">
         {activeTab === 'all' ? (
            <div className="space-y-10 pb-20">
              <AssetGrid assets={allPhotos} onSelect={(id:string, sig:string) => onSelect(id, sig, importMode)} />
              <div ref={lastElementRef} className="h-20 flex items-center justify-center">
                 {(hasNextPage || isFetchingNextPage) && <Loader2 className="animate-spin text-indigo-500" size={32}/>}
              </div>
            </div>
         ) : selectedAlbum ? (
            <AssetGrid assets={albumAssets} onSelect={(id:string, sig:string) => onSelect(id, sig, importMode)} loading={loadingAlbumAssets} />
         ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-8 pb-20">
               {loadingAlbums ? [1,2,3,4].map(i => <div key={i} className="aspect-[4/5] bg-slate-50 rounded-[32px] animate-pulse" />) :
                albums.map((album: any) => (
                 <Card key={album.id} padding="none" className="aspect-[4/5] cursor-pointer group relative" onClick={() => setSelectedAlbum(album)}>
                    <img 
                      src={album.albumThumbnailSig ? getThumbUrl(album.albumThumbnailAssetId, album.albumThumbnailSig) : ''} 
                      className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-6">
                       <Typography variant="h4" className="text-white text-lg">{album.albumName}</Typography>
                       <Typography variant="label" className="text-white/60">{album.assetCount} Items</Typography>
                    </div>
                 </Card>
               ))}
            </div>
         )}
      </div>
    </Modal>
  )
}

function AssetGrid({ assets, onSelect, loading }: any) {
  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-slate-200" size={48}/></div>
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-4">
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
             className="aspect-square rounded-[16px] md:rounded-[28px] overflow-hidden bg-slate-50 border border-slate-100 group relative"
           >
              <img src={getThumbUrl(id, sig)} className="w-full h-full object-cover" loading="lazy" />
              
              {/* 视频标识 */}
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="w-8 h-8 md:w-12 md:h-12 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg">
                    <Play size={16} className="text-slate-900 ml-0.5 md:ml-1 md:w-5 md:h-5" fill="currentColor" />
                  </div>
                </div>
              )}
              
              {/* 视频时长 */}
              {isVideo && duration && (
                <div className="absolute bottom-1 right-1 md:bottom-2 md:right-2 px-1.5 py-0.5 md:px-2 md:py-1 bg-black/70 rounded-md md:rounded-lg text-white text-[9px] md:text-[10px] font-bold">
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