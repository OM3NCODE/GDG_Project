from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests 

app = FastAPI()

class TextRequest(BaseModel):
    text: str

""""
def classify_text(text):                 aapka AI Model
    if "hate" in text.lower():
        return "flagged"
    return "safe"
"""

@app.post("/classify")
def classify(request: TextRequest):
    try:
        result = classify_text(request.text)
        return {"text": request.text, "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Run with: uvicorn main:app --reload
