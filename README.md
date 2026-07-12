# Smart Invoice Assistant
An AI-powered document processing app that extracts structured data from invoice/receipt images or PDFs, researches competing products, and generates a downloadable PDF report — built with React, FastAPI, and the OpenAI Vision API.
## Features
- 📤 **Upload** an invoice or receipt as an image or PDF
- 🤖 **AI extraction** — pulls product name, brand, price, and usage instructions using GPT-4o-mini (Vision API for images, text parsing for PDFs via `pypdf`)
- 🔍 **Competitor research** — recommends 3 similar/alternative products with estimated pricing and ratings
- 📄 **PDF report export** — generates a polished, downloadable report of the findings using `html2pdf.js`
## Tech Stack
**Backend:** FastAPI, OpenAI API (GPT-4o-mini), pypdf
**Frontend:** React (Vite), html2pdf.js
**Deployment:** Backend on Render, frontend on Vercel
## Project Structure
```
smart-invoice-assistant/
├── main.py              # FastAPI backend — upload, extraction, and research endpoints
├── requirements.txt      # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── App.jsx       # Main UI — upload, results, PDF export
│   │   └── ...
│   └── package.json
└── .env                  # OPENAI_API_KEY (not committed)
```
## Getting Started
### Backend
```bash
# from the project root
python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# add your OpenAI key
cp .env.example .env
# then edit .env and set OPENAI_API_KEY=your_key_here
uvicorn main:app --reload
```
The backend runs at `http://localhost:8000`.
### Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend runs at `http://localhost:5173` (Vite default).
## API Endpoints
| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Health check |
| `/upload` | POST | Upload an invoice image or PDF, returns extracted product details |
| `/research` | POST | Given a product name, returns 3 competitor product suggestions |
## Live Demo
- Frontend: https://smart-invoice-assistant.vercel.app
- Backend: https://smart-invoice-backend-qyt4.onrender.com
## Notes
- Requires an OpenAI API key with access to `gpt-4o-mini`.
- CORS is currently open (`allow_origins=["*"]`) for demo purposes.
- Backend is on Render's free tier and may take ~30-50s to spin up on first request after inactivity.
