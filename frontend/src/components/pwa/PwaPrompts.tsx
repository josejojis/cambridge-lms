import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { Download, RefreshCw, WifiOff, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/** Install banner, "new version available" prompt, and offline indicator. */
export function PwaPrompts() {
  const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW()
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [offline, setOffline] = useState(typeof navigator !== 'undefined' && !navigator.onLine)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvt(e as BeforeInstallPromptEvent) }
    const on = () => setOffline(false)
    const off = () => setOffline(true)
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4" aria-live="polite">
      {offline && (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-navy-900 px-4 py-2 text-sm text-white shadow-lg">
          <WifiOff size={16} className="text-gold-400" /> You're offline. Saved pages still work.
        </div>
      )}
      {needRefresh && (
        <Toast onClose={() => setNeedRefresh(false)}>
          <span>A new version of Elite Revision is available.</span>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 font-semibold text-navy-950" onClick={() => updateServiceWorker(true)}>
            <RefreshCw size={14} /> Update
          </button>
        </Toast>
      )}
      {installEvt && !needRefresh && (
        <Toast onClose={() => setInstallEvt(null)}>
          <span>Install Elite Revision for quick, app-like access.</span>
          <button className="inline-flex items-center gap-1.5 rounded-lg bg-gold-500 px-3 py-1.5 font-semibold text-navy-950"
            onClick={async () => { await installEvt.prompt(); setInstallEvt(null) }}>
            <Download size={14} /> Install
          </button>
        </Toast>
      )}
    </div>
  )
}

function Toast({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div role="status" className="pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border border-white/10 bg-navy-900 p-3 pl-4 text-sm text-white shadow-2xl">
      <div className="flex flex-1 flex-wrap items-center justify-between gap-3">{children}</div>
      <button aria-label="Dismiss" onClick={onClose} className="rounded p-1 text-navy-100 hover:text-white"><X size={16} /></button>
    </div>
  )
}
