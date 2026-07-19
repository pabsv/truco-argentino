interface InfoModalProps {
  onClose: () => void
}

export function InfoModal({ onClose }: InfoModalProps) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-green-900 rounded-xl p-5 max-w-xs w-full border border-green-600" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold mb-3 text-center">Add to Home Screen</h2>

        {(isIOS || (!isIOS && !isAndroid)) && (
          <div className="mb-3">
            <p className="font-semibold text-yellow-400 mb-1">iPhone (Safari only):</p>
            <ol className="text-sm space-y-1 text-green-100">
              <li>1. Open in <strong>Safari</strong></li>
              <li>2. Tap <strong>⋯</strong> (3 dots)</li>
              <li>3. Tap <strong>Share</strong></li>
              <li>4. Tap <strong>⋯</strong> (More)</li>
              <li>5. Tap <strong>Add to Home Screen</strong></li>
            </ol>
          </div>
        )}

        {(isAndroid || (!isIOS && !isAndroid)) && (
          <div className="mb-3">
            <p className="font-semibold text-yellow-400 mb-1">Android (Chrome):</p>
            <ol className="text-sm space-y-1 text-green-100">
              <li>1. Tap menu <strong>⋮</strong></li>
              <li>2. Tap <strong>Add to Home Screen</strong></li>
            </ol>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full mt-2 py-2 bg-green-700 hover:bg-green-600 active:bg-green-500 rounded-lg font-semibold"
        >
          Close
        </button>
      </div>
    </div>
  )
}
