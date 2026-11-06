import { useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'

const SHARE_TEXT = 'Truco scoreboard: open this link and add it to your home screen'

function QRCode({ value }: { value: string }) {
  const { size, path } = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    const n = qr.getModuleCount()
    let d = ''
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        if (qr.isDark(r, c)) d += `M${c} ${r}h1v1h-1z`
      }
    }
    return { size: n, path: d }
  }, [value])

  const pad = 2
  return (
    <svg
      viewBox={`${-pad} ${-pad} ${size + pad * 2} ${size + pad * 2}`}
      className="w-40 h-40 rounded-lg bg-white"
      shapeRendering="crispEdges"
      role="img"
      aria-label="QR code with the app link"
    >
      <path d={path} fill="#14532d" />
    </svg>
  )
}

export function ShareApp() {
  const url = `${window.location.origin}/`
  const [copied, setCopied] = useState(false)
  const canShare = typeof navigator.share === 'function'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      el.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const share = async () => {
    try {
      await navigator.share({ title: 'Truco', text: SHARE_TEXT, url })
    } catch {
      // user dismissed the share sheet
    }
  }

  return (
    <div className="mb-4 pb-4 border-b border-green-700 flex flex-col items-center">
      <h2 className="text-lg font-bold mb-1">Share the app</h2>
      <p className="text-xs text-green-200 mb-3">Scan with a phone camera</p>
      <QRCode value={url} />
      <p className="mt-2 text-xs text-green-300 break-all text-center">{url.replace(/^https?:\/\//, '').replace(/\/$/, '')}</p>
      <div className="mt-3 w-full flex gap-2">
        {canShare && (
          <button
            onClick={share}
            className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-300 text-green-950 rounded-lg font-semibold"
          >
            Share
          </button>
        )}
        <button
          onClick={copy}
          className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
            canShare
              ? 'bg-green-700 hover:bg-green-600 active:bg-green-500'
              : 'bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-300 text-green-950'
          }`}
        >
          {copied ? 'Copied ✓' : 'Copy link'}
        </button>
      </div>
    </div>
  )
}
