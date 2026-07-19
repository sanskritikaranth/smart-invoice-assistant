import base64
import os
import json
import io
from fastapi import FastAPI, UploadFile, File, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy.orm import Session

from database import engine, get_db, Base
import models
import schemas
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
)

load_dotenv(dotenv_path=".env")
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError(
        "OPENAI_API_KEY is not set. Add it to .env or export it in the environment."
    )
client = OpenAI(api_key=api_key)

# Create all tables on startup if they don't exist yet (fine for SQLite/small projects;
# a real production app would use Alembic migrations instead).
Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class ResearchRequest(BaseModel):
    product_name: str
    invoice_id: int | None = None  # optional: attach research results to a saved invoice


@app.get("/")
def read_root():
    return {"message": "Hello from the Python AI Backend!"}


# ------------------------------------------------------------------
# AUTH
# ------------------------------------------------------------------
@app.post("/auth/register", response_model=schemas.Token)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == user_in.email).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    user = models.User(email=user_in.email, hashed_password=hash_password(user_in.password))
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": user}


@app.post("/auth/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "user": user}


@app.get("/auth/me", response_model=schemas.UserOut)
def get_me(current_user: models.User = Depends(get_current_user)):
    return current_user


# ------------------------------------------------------------------
# INVOICE UPLOAD + EXTRACTION (now saved to the logged-in user's account)
# ------------------------------------------------------------------
@app.post("/upload")
async def upload_invoice(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    file_bytes = await file.read()

    prompt = """
    Analyze this invoice. Extract the purchased product details.
    Return ONLY a valid JSON object with these exact keys:
    {
        "product_name": "Name of the main product",
        "brand": "Brand name if visible, otherwise 'Unknown'",
        "price": "Price of the product",
        "instructions": "Write a short 3-step guide on how to use this product based on its name."
    }
    """

    try:
        if file.filename.lower().endswith('.pdf'):
            pdf = PdfReader(io.BytesIO(file_bytes))
            invoice_text = ""
            for page in pdf.pages:
                invoice_text += page.extract_text()

            messages = [
                {"role": "user", "content": prompt + f"\n\nInvoice Text:\n{invoice_text}"}
            ]
        else:
            base64_image = base64.b64encode(file_bytes).decode('utf-8')
            messages = [
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": f"data:{file.content_type};base64,{base64_image}"}}
                    ]
                }
            ]

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={"type": "json_object"}
        )

        ai_data = json.loads(response.choices[0].message.content)

        # Persist this extraction to the user's history
        invoice = models.Invoice(
            owner_id=current_user.id,
            product_name=ai_data.get("product_name"),
            brand=ai_data.get("brand"),
            price=ai_data.get("price"),
            instructions=ai_data.get("instructions"),
        )
        db.add(invoice)
        db.commit()
        db.refresh(invoice)

        ai_data["invoice_id"] = invoice.id
        return ai_data

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@app.post("/research")
async def research_similar_products(
    request: ResearchRequest,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    prompt = f"""
    The user just uploaded an invoice for a "{request.product_name}".
    Act as a personal shopper for an Indian customer and recommend 3 similar or competing products
    that are actually available for purchase in India.

    Return ONLY a valid JSON object using this exact structure:
    {{
        "competitors": [
            {{
                "name": "Exact Name of Alternative Product",
                "price": "Estimated price in Indian Rupees, formatted like '₹2,499'",
                "rating": "Estimated Rating (e.g., 4.5/5)",
                "summary": "One short sentence explaining why it is a good alternative.",
                "purchase_link": "Create a real Amazon India search link by formatting it like this: https://www.amazon.in/s?k=Exact+Name+Of+Product"
            }}
        ]
    }}

    Rules:
    - All prices MUST be in Indian Rupees using the ₹ symbol, never $ or USD.
    - All purchase_link values MUST use the amazon.in domain, never amazon.com.
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        ai_data = json.loads(response.choices[0].message.content)

        # If this research is tied to a saved invoice owned by this user, persist it
        if request.invoice_id is not None:
            invoice = (
                db.query(models.Invoice)
                .filter(models.Invoice.id == request.invoice_id, models.Invoice.owner_id == current_user.id)
                .first()
            )
            if invoice:
                invoice.competitors_json = json.dumps(ai_data.get("competitors", []))
                db.commit()

        return ai_data

    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


# ------------------------------------------------------------------
# INVOICE HISTORY
# ------------------------------------------------------------------
@app.get("/invoices", response_model=list[schemas.InvoiceOut])
def list_invoices(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    invoices = (
        db.query(models.Invoice)
        .filter(models.Invoice.owner_id == current_user.id)
        .order_by(models.Invoice.created_at.desc())
        .all()
    )
    results = []
    for inv in invoices:
        results.append(
            schemas.InvoiceOut(
                id=inv.id,
                product_name=inv.product_name,
                brand=inv.brand,
                price=inv.price,
                instructions=inv.instructions,
                competitors=json.loads(inv.competitors_json) if inv.competitors_json else None,
                created_at=inv.created_at,
            )
        )
    return results


@app.get("/invoices/{invoice_id}", response_model=schemas.InvoiceOut)
def get_invoice(
    invoice_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    inv = (
        db.query(models.Invoice)
        .filter(models.Invoice.id == invoice_id, models.Invoice.owner_id == current_user.id)
        .first()
    )
    if not inv:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    return schemas.InvoiceOut(
        id=inv.id,
        product_name=inv.product_name,
        brand=inv.brand,
        price=inv.price,
        instructions=inv.instructions,
        competitors=json.loads(inv.competitors_json) if inv.competitors_json else None,
        created_at=inv.created_at,
    )
