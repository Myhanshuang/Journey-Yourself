import { Image as ImageIcon, MapPin, Bookmark } from 'lucide-react'
import { Modal } from '../ui/modal'
import { Button } from '../ui/button'
import { Typography } from '../ui/typography'

interface ServiceSetupModalProps {
  type: 'immich' | 'geo' | 'karakeep'
  onClose: () => void
  isOpen?: boolean
}

export default function ServiceSetupModal({ type, onClose, isOpen = true }: ServiceSetupModalProps) {
  const config = {
    immich: {
      icon: <ImageIcon size={40} />,
      title: "Immich Required",
      desc: "Connect your Immich instance in Settings to access your personal photo library directly.",
    },
    geo: {
      icon: <MapPin size={40} />,
      title: "Location Services",
      desc: "Configure your Amap API Key in Settings to enable smart location tagging and weather updates.",
    },
    karakeep: {
      icon: <Bookmark size={40} />,
      title: "Karakeep Required",
      desc: "Connect your Karakeep account in Settings to access your bookmarks directly.",
    }
  }[type]

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant="dialog"
      className="max-w-sm text-center p-8 md:p-10"
    >
      <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-3xl mx-auto flex items-center justify-center mb-6">
        {config?.icon}
      </div>
      
      <Typography variant="h3" className="mb-2 text-[#232f55]">
        {config?.title}
      </Typography>
      
      <Typography variant="p" className="text-slate-400 font-medium text-sm leading-relaxed mb-8 mt-2">
        {config?.desc}
      </Typography>
      
      <div className="flex flex-col gap-3 w-full">
        <Button 
          onClick={onClose} 
          className="w-full py-6 rounded-2xl text-xs"
        >
          I'LL DO IT LATER
        </Button>
        <Typography variant="label" className="mt-2 block">
          Go to Settings {">"} Integrations
        </Typography>
      </div>
    </Modal>
  )
}
