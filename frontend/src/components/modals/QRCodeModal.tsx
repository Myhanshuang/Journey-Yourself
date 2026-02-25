import { motion } from 'framer-motion'
import { X, Loader2 } from 'lucide-react'
import { cn } from '../ui/JourneyUI'

interface QRCodeModalProps {
  platform: 'xhs' | 'bili'
  qrCodeBase64: string | null
  isLoading: boolean
  onClose: () => void
}

export default function QRCodeModal({ platform, qrCodeBase64, isLoading, onClose }: QRCodeModalProps) {
  const platformName = platform === 'xhs' ? '小红书' : 'B站'
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[300] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[24px] shadow-2xl w-full max-w-sm overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-black text-slate-900">扫码登录</h3>
            <p className="text-sm text-slate-400 mt-1">使用{platformName}APP扫描二维码</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>
        
        {/* QR Code */}
        <div className="p-8 flex flex-col items-center justify-center">
          {isLoading ? (
            <div className="w-48 h-48 flex items-center justify-center">
              <Loader2 size={32} className="text-slate-400 animate-spin" />
            </div>
          ) : qrCodeBase64 ? (
            <div className="relative">
              <img
                src={`data:image/png;base64,${qrCodeBase64}`}
                alt="QR Code"
                className="w-48 h-48 rounded-2xl shadow-lg"
              />
              {/* 平台图标覆盖 */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-white px-4 py-1.5 rounded-full shadow-md">
                <span className="text-xs font-bold text-slate-600">
                  {platform === 'xhs' ? '小红书' : '哔哩哔哩'}
                </span>
              </div>
            </div>
          ) : (
            <div className="w-48 h-48 flex items-center justify-center bg-slate-50 rounded-2xl">
              <p className="text-sm text-slate-400">等待二维码...</p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 pb-6">
          <p className="text-xs text-slate-400 text-center">
            请在手机上打开{platformName}APP，使用扫一扫功能扫描上方二维码完成登录
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
