import { useState } from 'react'
import html2pdf from 'html2pdf.js' // <-- NEW IMPORT
import './App.css'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function App() {
  const [file, setFile] = useState(null)
  const [statusMessage, setStatusMessage] = useState("")
  const [productData, setProductData] = useState(null) 
  const [isResearching, setIsResearching] = useState(false)
  const [competitorData, setCompetitorData] = useState(null)

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
        body: formData,
      })
      const data = await response.json()
      
      if (data.error) {
        setStatusMessage("❌ AI Error: " + data.error)
      } else {
        setStatusMessage("✅ Analysis Complete!")
        setProductData(data)
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_name: productData.product_name })
      })
      const data = await response.json()
      setCompetitorData(data.competitors)
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

  // 👇 --- NEW FUNCTION TO GENERATE PDF --- 👇
  const downloadPDF = () => {
    const element = document.getElementById('report-content');
    const opt = {
      margin:       10,
      filename:     'Smart_Invoice_Report.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak:    { mode: ['css', 'legacy'], after: '.page-break' }
    };
    html2pdf().set(opt).from(element).save();
  }

  return (
    <div className="app-shell">
      <header className="app-hero">
        <div className="hero-content">
          <p className="eyebrow">Invoice AI Assistant</p>
          <h1 className="hero-heading">🧾 Smart Invoice Assistant</h1>
          <p className="app-subtitle">Upload your invoice or receipt and get instant product insights plus competitor research.</p>
        </div>
        <div className="hero-badge">Fast. Friendly. Focused.</div>
      </header>

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
                <span>Generated: {new Date().toLocaleDateString()}</span>
                <span>AI Invoice Assistant</span>
              </div>
            </div>

            <div className="card-header">
              <div>
                <h2>📦 Extracted Details</h2>
                <p className="card-description">A quick breakdown of what the AI found in your document.</p>
              </div>
              <span className="pill">AI Summary</span>
            </div>

            <div className="detail-grid">
              <div className="detail-row">
                <span className="detail-label">Product</span>
                <span>{productData.product_name}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Brand</span>
                <span>{productData.brand}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Price</span>
                <span>{productData.price}</span>
              </div>
            </div>

            <div className="section-block">
              <h3>📖 How to Use:</h3>
              <p>{productData.instructions}</p>
            </div>

            {competitorData && (
              <div className="competitor-section">
                <hr />
                <h3>🛒 Alternative Options & Research</h3>
                <div className="competitor-grid">
                  {competitorData.map((item, index) => (
                    <div key={index} className="card competitor-card">
                      <h4>{item.name}</h4>
                      <p className="competitor-meta"><strong>{item.price}</strong> | ⭐ {item.rating}</p>
                      <p>{item.summary}</p>
                      <a href={item.purchase_link} target="_blank" rel="noopener noreferrer" className="button link-button">
                        🛒 View / Purchase
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
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