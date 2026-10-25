'use client'

import * as React from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Camera, ImageUp, Trash2 } from 'lucide-react'
import { Avatar } from './avatar'
import { Button } from './button'
import { Dialog, DialogContent } from './overlay'
import { removeAvatar, uploadAvatar } from '@/server/actions/profile'

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = src
  })
  const size = Math.min(512, Math.round(area.width))
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, size, size)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode failed'))), 'image/webp', 0.86),
  )
}

/** Profile photo: camera or gallery on phones, crop to a square, upload as a compressed WebP. */
export function AvatarUploader({ userId, name, avatarPath }: { userId: string; name: string | null; avatarPath: string | null }) {
  const router = useRouter()
  const [src, setSrc] = React.useState<string | null>(null)
  const [crop, setCrop] = React.useState({ x: 0, y: 0 })
  const [zoom, setZoom] = React.useState(1.2)
  const [area, setArea] = React.useState<Area | null>(null)
  const [busy, setBusy] = React.useState(false)
  const gallery = React.useRef<HTMLInputElement>(null)
  const camera = React.useRef<HTMLInputElement>(null)

  const onPick = (f: File | undefined) => {
    if (!f) return
    if (!f.type.startsWith('image/')) return toast.error('Choose an image (JPG, PNG or WebP).')
    if (f.size > 15 * 1024 * 1024) return toast.error('That image is too large. Try one under 15 MB.')
    const reader = new FileReader()
    reader.onload = () => setSrc(String(reader.result))
    reader.readAsDataURL(f)
  }

  const save = async () => {
    if (!src || !area) return
    setBusy(true)
    try {
      const blob = await cropToBlob(src, area)
      const fd = new FormData()
      fd.set('file', new File([blob], 'avatar.webp', { type: 'image/webp' }))
      const res = await uploadAvatar(fd)
      if (!res.ok) throw new Error(res.error.message)
      toast.success('Photo updated')
      setSrc(null)
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-5">
      <Avatar userId={userId} name={name} hasImage={!!avatarPath} version={avatarPath} size="xl" ring />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => gallery.current?.click()}>
            <ImageUp /> {avatarPath ? 'Change photo' : 'Upload photo'}
          </Button>
          <Button type="button" variant="secondary" size="sm" className="sm:hidden" onClick={() => camera.current?.click()}>
            <Camera /> Take photo
          </Button>
          {avatarPath && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const res = await removeAvatar()
                if (res.ok) {
                  toast.success('Photo removed')
                  router.refresh()
                } else toast.error(res.error.message)
              }}
            >
              <Trash2 /> Remove
            </Button>
          )}
        </div>
        <p className="text-xs text-ink-500">JPG, PNG or WebP. Cropped to a square and compressed before upload.</p>
      </div>
      <input ref={gallery} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" tabIndex={-1} aria-label="Choose a photo" onChange={(e) => onPick(e.target.files?.[0])} />
      <input ref={camera} type="file" accept="image/*" capture="user" className="sr-only" tabIndex={-1} aria-label="Take a photo" onChange={(e) => onPick(e.target.files?.[0])} />
      <Dialog open={!!src} onOpenChange={(o) => !o && setSrc(null)}>
        <DialogContent
          title="Crop your photo"
          description="Drag to position, pinch or use the slider to zoom."
          footer={
            <>
              <Button variant="secondary" onClick={() => setSrc(null)}>
                Cancel
              </Button>
              <Button onClick={save} loading={busy}>
                Save photo
              </Button>
            </>
          }
        >
          <div className="relative h-72 overflow-hidden rounded-xl bg-ink-900">
            {src && <Cropper image={src} crop={crop} zoom={zoom} aspect={1} cropShape="round" showGrid={false} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, px) => setArea(px)} />}
          </div>
          <label className="mt-4 flex items-center gap-3 text-sm text-ink-700">
            Zoom
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="flex-1 accent-[var(--primary-600)]" />
          </label>
        </DialogContent>
      </Dialog>
    </div>
  )
}
