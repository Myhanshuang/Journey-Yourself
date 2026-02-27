import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ImageViewerProps {
  images: string[]
  initialIndex?: number
  onClose: () => void
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)

  // Block body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [])

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  if (!images || images.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[500] bg-black/90 flex flex-col items-center justify-center p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          className="absolute top-6 right-6 z-10 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        >
          <X size={24} />
        </button>

        <div className="relative w-full h-full flex items-center justify-center max-w-7xl">
          {images.map((src, idx) => (
            <motion.img
              key={src}
              src={src}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ 
                opacity: currentIndex === idx ? 1 : 0, 
                scale: currentIndex === idx ? 1 : 0.95,
                zIndex: currentIndex === idx ? 10 : 0
              }}
              transition={{ duration: 0.2 }}
              className={cn(
                "absolute max-w-full max-h-full object-contain",
                currentIndex === idx ? "pointer-events-auto" : "pointer-events-none"
              )}
              onClick={(e) => e.stopPropagation()}
            />
          ))}

          {images.length > 1 && (
            <>
              <button
                onClick={handlePrev}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={32} />
              </button>
              <button
                onClick={handleNext}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={32} />
              </button>
              
              <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/10 text-white text-sm font-medium tracking-widest backdrop-blur-md">
                {currentIndex + 1} / {images.length}
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
