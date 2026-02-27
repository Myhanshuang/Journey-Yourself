import { NodeViewWrapper } from '@tiptap/react'
import { useState } from 'react'
import { getAssetUrl } from '../../lib/utils'
import ImageViewer from '../common/ImageViewer'

export default function ImageView({ node }: any) {
  const [showViewer, setShowViewer] = useState(false)
  const src = node.attrs.src
  const assetUrl = getAssetUrl(src)

  if (!assetUrl) return null

  return (
    <NodeViewWrapper className="flex justify-center my-16">
      <img
        src={assetUrl}
        alt={node.attrs.alt || ''}
        className="rounded-[40px] shadow-2xl border border-white/50 cursor-pointer max-w-full hover:opacity-90 transition-opacity"
        onClick={() => setShowViewer(true)}
      />
      {showViewer && (
        <ImageViewer
          images={[assetUrl]}
          onClose={() => setShowViewer(false)}
        />
      )}
    </NodeViewWrapper>
  )
}
