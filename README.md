# 🧾 Smart Invoice Assistant

An AI-powered document processing app that extracts structured data from invoice/receipt images or PDFs, researches Indian retail alternatives, saves everything to a per-user account, and generates a polished downloadable PDF report — built with React, FastAPI, SQLAlchemy, and the OpenAI Vision API.

## ✨ Features

- 🔐 **Accounts & auth** — email/password signup and login, passwords hashed with `bcrypt`, sessions handled with JWTs
- 📤 **Upload** an invoice or receipt as an image or PDF
- 🤖 **AI extraction** — pulls product name, brand, price, and usage instructions using GPT-4o-mini (Vision API for images, text parsing for PDFs via `pypdf`)
- 🔍 **Competitor research** — recommends 3 similar/alternative products available in India, with pricing in ₹ (INR) and Amazon.in links
- 📜 **Invoice history** — every upload and research result is saved to the logged-in user's account, browsable in-app
- 📄 **PDF report export** — generates a structured, print-safe report (executive summary, extracted details table, usage guide, competitor comparison) using `html2pdf.js`

## 🛠️ Tech Stack

**Backend:** FastAPI, SQLAlchemy (SQLite by default, swappable to Postgres), `python-jose` (JWT), `bcrypt`, OpenAI API (GPT-4o-mini), `pypdf`
**Frontend:** React (Vite), `html2pdf.js`
**Deployment:** Backend on Render, frontend on Vercel

## 📂 Project Structure

```
smart-invoice-assistant/
├── main.py               # FastAPI app — auth, upload, research, and invoice-history endpoints
├── database.py           # SQLAlchemy engine/session setup
├── models.py              # User and Invoice ORM models
├── schemas.py             # Pydantic request/response schemas
├── auth.py                 # Password hashing + JWT creation/verification
├── requirements.txt       # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main UI — upload, results, history, PDF export
│   │   ├── Auth.jsx       # Login / signup screen
│   │   ├── History.jsx    # Invoice history panel
│   │   └── ...
│   └── package.json
└── .env                    # OPENAI_API_KEY, JWT_SECRET_KEY, DATABASE_URL (not committed)
```

## Getting Started

### Backend
```bash
# from the project root
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# then edit .env and set:
#   OPENAI_API_KEY=your_key_here
#   JWT_SECRET_KEY=<generate with: python -c "import secrets; print(secrets.token_hex(32))">
#   DATABASE_URL=sqlite:///./smart_invoice.db   (default, no setup needed)

uvicorn main:app --reload
```
The backend runs at `http://localhost:8000`. Database tables are created automatically on first run.

### Frontend
```bash
cd frontend
npm install
```
Create `frontend/.env`:
```
VITE_BACKEND_URL=http://localhost:8000
```
```bash
npm run dev
```
The frontend runs at `http://localhost:5173` (Vite default).

## API Endpoints

| Endpoint | Method | Auth required | Description |
|---|---|---|---|
| `/` | GET | No | Health check |
| `/auth/register` | POST | No | Create an account, returns a JWT |
| `/auth/login` | POST | No | Log in, returns a JWT |
| `/auth/me` | GET | Yes | Get the current logged-in user |
| `/upload` | POST | Yes | Upload an invoice image or PDF, returns extracted product details and saves it to your history |
| `/research` | POST | Yes | Given a product name, returns 3 India-based competitor suggestions |
| `/invoices` | GET | Yes | List the current user's saved invoices |
| `/invoices/{id}` | GET | Yes | Get a single saved invoice, including its competitor research |

## Live Demo
- Frontend: https://smart-invoice-assistant.vercel.app
- Backend: https://smart-invoice-backend-qyt4.onrender.com

## Notes
- Requires an OpenAI API key with access to `gpt-4o-mini`.
- CORS is currently open (`allow_origins=["*"]`) for demo purposes; restrict this to the deployed frontend origin in a production setting.
- Backend is on Render's free tier and may take ~30-50s to spin up on first request after inactivity.
- Uses SQLite locally by default; set `DATABASE_URL` to a Postgres connection string to use Postgres instead — no code changes required.
