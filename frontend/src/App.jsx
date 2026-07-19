import { useState } from 'react'
import html2pdf from 'html2pdf.js' // <-- NEW IMPORT
import Auth from './Auth'
import History from './History'
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://smart-invoice-backend-qyt4.onrender.com'

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('user')
    return stored ? JSON.parse(stored) : null
  })
  const [historyRefresh, setHistoryRefresh] = useState(0)

  const [file, setFile] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [productData, setProductData] = useState(null) 
  const [isResearching, setIsResearching] = useState(false)
  const [competitorData, setCompetitorData] = useState(null)

  const handleAuthenticated = (newToken, newUser) => {
    setToken(newToken)
    setUser(newUser)
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setToken(null)
    setUser(null)
    handleReset()
  }

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!file) return setStatusMessage("⚠️ Please select a file first!")

    setStatusMessage("🧠 AI is analyzing your document...")
    setProductData(null)
    setCompetitorData(null) 

    const formData = new FormData()
    formData.append("file", file)

    try {
      const response = await fetch(`${BACKEND_URL}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (response.status === 401) return handleLogout()

      const data = await response.json()

      if (data.error || data.detail) {
        setStatusMessage("❌ AI Error: " + (data.error || data.detail))
      } else {
        setStatusMessage("✅ Analysis Complete!")
        setProductData(data)
        setHistoryRefresh((n) => n + 1)
      }
    } catch (error) {
      console.error(error)
      setStatusMessage("❌ Error connecting to backend.")
    }
  }

  const handleResearch = async () => {
    setIsResearching(true)
    try {
      const response = await fetch(`${BACKEND_URL}/research`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          product_name: productData.product_name,
          invoice_id: productData.invoice_id ?? null,
        }),
      })

      if (response.status === 401) return handleLogout()

      const data = await response.json()
      setCompetitorData(data.competitors)
      setHistoryRefresh((n) => n + 1)
    } catch (error) {
      console.error("Research failed", error)
    }
    setIsResearching(false)
  }

  const handleReset = () => {
    setFile(null)
    setStatusMessage("")
    setProductData(null)
    setCompetitorData(null)
  }

  // Stable-ish report ID so every generated PDF can be referenced/traced later
  const reportId = `INV-${Date.now().toString(36).toUpperCase()}`

  // Figure out which competitor has the best rating, so the PDF can call it out
  const getBestValueIndex = () => {
    if (!competitorData || competitorData.length === 0) return -1
    let bestIndex = 0
    let bestRating = -1
    competitorData.forEach((item, index) => {
      const parsed = parseFloat(String(item.rating).replace(/[^\d.]/g, ''))
      if (!Number.isNaN(parsed) && parsed > bestRating) {
        bestRating = parsed
        bestIndex = index
      }
    })
    return bestIndex
  }

  // 👇 --- NEW FUNCTION TO GENERATE PDF --- 👇
  const downloadPDF = () => {
    const element = document.getElementById('report-content');
    const opt = {
      margin:       [12, 10, 12, 10],
      filename:     'Smart_Invoice_Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, windowWidth: 794 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], after: '.page-break' }
    };
    html2pdf().set(opt).from(element).save();
  }

  if (!token) {
    return <Auth onAuthenticated={handleAuthenticated} />
  }

  return (
    <div className="app-shell">
      <header className="app-hero">
        <div className="hero-content">
          <p className="eyebrow">Invoice AI Assistant</p>
          <h1 className="hero-heading">🧾 Smart Invoice Assistant</h1>
          <p className="app-subtitle">Upload your invoice or receipt and get instant product insights plus competitor research.</p>
        </div>
        <div className="hero-badge-stack">
          <div className="hero-badge">Fast. Friendly. Focused.</div>
          <div className="account-bar">
            <span>{user?.email}</span>
            <button type="button" className="logout-link" onClick={handleLogout}>Log out</button>
          </div>
        </div>
      </header>

      <History token={token} refreshSignal={historyRefresh} />

      <form onSubmit={handleUpload} className="upload-form">
        <label className="file-input-wrapper">
          <span>{file ? file.name : "Choose an invoice or receipt"}</span>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} accept="image/*,.pdf" />
        </label>
        <button type="submit" className="button primary-button">Analyze</button>
      </form>
      <p className="status-message">{statusMessage}</p>

      {productData && (
        <div className="content-stack">
          <section id="report-content" className="card report-card pdf-report">
            <div className="pdf-cover">
              <div>
                <h1>Smart Invoice AI Report</h1>
                <p className="report-description">A clean, printable summary of the extracted invoice data and competitor insights.</p>
              </div>
              <div className="report-meta">
                <span>Report ID: {reportId}</span>
                <span>Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</span>
                <span>AI Invoice Assistant</span>
              </div>
            </div>

            <div className="section-block executive-summary">
              <h3>Executive Summary</h3>
              <p>
                This report covers <strong>{productData.product_name}</strong>
                {productData.brand && productData.brand !== 'Unknown' ? <> by <strong>{productData.brand}</strong></> : null}, 
                purchased for <strong>{productData.price}</strong>.
                {competitorData
                  ? ` ${competitorData.length} alternative product${competitorData.length === 1 ? '' : 's'} were researched below to help you compare value.`
                  : ' Run competitor research to compare this purchase against similar products.'}
              </p>
            </div>

            <div className="card-header">
              <div>
                <h2>1. Extracted Invoice Details</h2>
                <p className="card-description">A structured breakdown of what the AI found in your document.</p>
              </div>
              <span className="pill">AI Extracted</span>
            </div>

            <table className="detail-table">
              <tbody>
                <tr>
                  <th>Field</th>
                  <th>Value</th>
                </tr>
                <tr>
                  <td>Product Name</td>
                  <td>{productData.product_name}</td>
                </tr>
                <tr>
                  <td>Brand</td>
                  <td>{productData.brand}</td>
                </tr>
                <tr>
                  <td>Price Paid</td>
                  <td>{productData.price}</td>
                </tr>
                <tr>
                  <td>Report Generated</td>
                  <td>{new Date().toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="section-block">
              <h2>2. Product Usage Guide</h2>
              <p className="card-description">A short, AI-generated guide for getting the most out of your purchase.</p>
              <p className="usage-text">{productData.instructions}</p>
            </div>

            {competitorData && (
              <div className="competitor-section">
                <hr />
                <h2>3. Alternative Options &amp; Competitor Research</h2>
                <p className="card-description">Similar products available in India, ranked by estimated rating. Prices shown in ₹ (INR).</p>
                <div className="competitor-grid">
                  {competitorData.map((item, index) => (
                    <div key={index} className={`card competitor-card${index === getBestValueIndex() ? ' best-value' : ''}`}>
                      {index === getBestValueIndex() && <span className="best-value-badge">Best Rated</span>}
                      <h4>{item.name}</h4>
                      <p className="competitor-meta"><strong>{item.price}</strong> · Rated {item.rating}</p>
                      <p>{item.summary}</p>
                      <a href={item.purchase_link} target="_blank" rel="noopener noreferrer" className="button link-button">
                        View on Amazon.in
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pdf-footer">
              <hr />
              <p>Generated automatically by Smart Invoice Assistant · Report {reportId} · Prices and competitor suggestions are AI-estimated and may vary from actual retail prices.</p>
            </div>
          </section>

          <div className="card-actions">
            {!competitorData && (
              <button onClick={handleResearch} disabled={isResearching} className="button secondary-button">
                {isResearching ? "🔍 Researching..." : "🔍 Find Similar Products"}
              </button>
            )}

            <button onClick={downloadPDF} className="button accent-button">
              📄 Download Report as PDF
            </button>

            <button onClick={handleReset} className="button secondary-button">
              🔄 Analyze Another Invoice
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App