import base64
import os
import json
import io
from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from openai import OpenAI
from dotenv import load_dotenv
from pydantic import BaseModel
from pypdf import PdfReader # <-- NEW IMPORT

load_dotenv(dotenv_path=".env")
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    raise RuntimeError(
        "OPENAI_API_KEY is not set. Add it to .env or export it in the environment."
    )
client = OpenAI(api_key=api_key)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_methods=["*"],
    allow_headers=["*"],
)

class ResearchRequest(BaseModel):
    product_name: str

@app.get("/")
def read_root():
    return {"message": "Hello from the Python AI Backend!"}

@app.post("/upload")
async def upload_invoice(file: UploadFile = File(...)):
    file_bytes = await file.read()

    # The same strict JSON prompt for both formats
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
        # CHECK: Is it a PDF or an Image?
        if file.filename.lower().endswith('.pdf'):
            # --- PDF HANDLING ---
            pdf = PdfReader(io.BytesIO(file_bytes))
            invoice_text = ""
            for page in pdf.pages:
                invoice_text += page.extract_text()
            
            messages = [
                {"role": "user", "content": prompt + f"\n\nInvoice Text:\n{invoice_text}"}
            ]
        else:
            # --- IMAGE HANDLING ---
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

        # Send to OpenAI
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            response_format={"type": "json_object"}
        )
        
        ai_data = response.choices[0].message.content
        return json.loads(ai_data)

    except Exception as e:
        return {"error": str(e)}

@app.post("/research")
async def research_similar_products(request: ResearchRequest):
    prompt = f"""
    The user just uploaded an invoice for a "{request.product_name}".
    Act as a personal shopper and recommend 3 similar or competing products.
    
    Return ONLY a valid JSON object using this exact structure:
    {{
        "competitors": [
            {{
                "name": "Exact Name of Alternative Product",
                "price": "Estimated Price (e.g., $25.00)",
                "rating": "Estimated Rating (e.g., 4.5/5)",
                "summary": "One short sentence explaining why it is a good alternative.",
                "purchase_link": "Create a real Amazon search link by formatting it like this: https://www.amazon.com/s?k=Exact+Name+Of+Product"
            }}
        ]
    }}
    """

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        ai_data = response.choices[0].message.content
        return json.loads(ai_data)

    except Exception as e:
        return {"error": str(e)}