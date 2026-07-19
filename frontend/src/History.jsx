import { useEffect, useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://smart-invoice-backend-qyt4.onrender.com'

function History({ token, refreshSignal }) {
  const [invoices, setInvoices] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    const fetchInvoices = async () => {
      setIsLoading(true)
      try {
        const response = await fetch(`${BACKEND_URL}/invoices`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await response.json()
        if (!cancelled && Array.isArray(data)) setInvoices(data)
      } catch (err) {
        console.error('Failed to load invoice history', err)
      }
      if (!cancelled) setIsLoading(false)
    }

    fetchInvoices()
    return () => { cancelled = true }
  }, [token, refreshSignal])

  return (
    <div className="card history-card">
      <button type="button" className="history-toggle" onClick={() => setIsOpen(!isOpen)}>
        <span>📜 Invoice History {invoices.length > 0 ? `(${invoices.length})` : ''}</span>
        <span>{isOpen ? '▲' : '▼'}</span>
      </button>

      {isOpen && (
        <div className="history-list">
          {isLoading && <p className="history-empty">Loading…</p>}
          {!isLoading && invoices.length === 0 && (
            <p className="history-empty">No invoices saved yet — analyze one above to get started.</p>
          )}
          {invoices.map((inv) => (
            <div key={inv.id} className="history-row">
              <div>
                <strong>{inv.product_name || 'Unknown product'}</strong>
                <span className="history-meta"> · {inv.brand} · {inv.price}</span>
              </div>
              <span className="history-date">{new Date(inv.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default History
