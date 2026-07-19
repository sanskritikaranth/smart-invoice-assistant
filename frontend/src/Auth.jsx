import { useState } from 'react'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://smart-invoice-backend-qyt4.onrender.com'

function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsSubmitting(true)

    const endpoint = mode === 'login' ? '/auth/login' : '/auth/register'

    try {
      const response = await fetch(`${BACKEND_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await response.json()

      if (!response.ok) {
        setError(data.detail || 'Something went wrong. Please try again.')
      } else {
        localStorage.setItem('token', data.access_token)
        localStorage.setItem('user', JSON.stringify(data.user))
        onAuthenticated(data.access_token, data.user)
      }
    } catch (err) {
      console.error(err)
      setError('Could not connect to the backend.')
    }
    setIsSubmitting(false)
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Invoice AI Assistant</p>
        <h1 className="hero-heading">🧾 Smart Invoice Assistant</h1>
        <p className="app-subtitle">
          {mode === 'login' ? 'Log in to see your saved invoice history.' : 'Create an account to start saving your reports.'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-label">
            Email
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </label>
          <label className="auth-label">
            Password
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          {error && <p className="auth-error">⚠️ {error}</p>}

          <button type="submit" className="button primary-button" disabled={isSubmitting}>
            {isSubmitting ? 'Please wait…' : mode === 'login' ? 'Log In' : 'Create Account'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError('') }}
        >
          {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  )
}

export default Auth
