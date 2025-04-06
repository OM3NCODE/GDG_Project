from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), "RAG_Model"))

from RAG_Model.model import classify_text # Assuming this is the function in your model.py

app = FastAPI(
    title="Web Content Scraping and RAG API",
    description="API for processing scraped web content with a RAG model"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins during development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScrapedContent(BaseModel):
    url: str
    text: str
    timestamp: Optional[datetime] = None
    metadata: Optional[dict] = None

class ScrapedContentRequest(BaseModel):
    content: List[ScrapedContent]

class RAGResponse(BaseModel):
    url: str
    original_text: str
    processed_result: str
    timestamp: datetime

scraped_contents = []
rag_results = []

@app.post("/scrape")
async def receive_scraped_content(request: ScrapedContentRequest):
    """
    Endpoint to receive scraped web content, process it with the RAG model,
    and store both the original content and the processed results.
    """
    global scraped_contents, rag_results
    scraped_contents = []
    rag_results = []
    
    for content in request.content:
        # Store original content
        scraped_contents.append(content)
        try:
            processed_result = classify_text(content.text)
            rag_result = RAGResponse(
                url=content.url,
                original_text=content.text,
                processed_result=processed_result,
                timestamp=content.timestamp or datetime.now()
            )
            rag_results.append(rag_result)
            
        except Exception as e:
            print(f"Error processing content from {content.url}: {str(e)}")
    
    return {
        "message": "Content received and processed successfully",
        "total_items": len(scraped_contents),
        "processed_items": len(rag_results)
    }

@app.get("/view-scrapes")
async def view_scraped_content():
    """
    Endpoint to view all recently scraped content.
    """
    if not scraped_contents:
        return {"message": "No scraped content available"}
    
    return {
        "total_items": len(scraped_contents),
        "contents": [
            {
                "url": content.url,
                "text_preview": content.text[:200] + "..." if len(content.text) > 200 else content.text,
                "timestamp": content.timestamp,
                "metadata": content.metadata
            } for content in scraped_contents
        ]
    }

@app.get("/view-rag-results")
async def view_rag_results():
    """
    Endpoint to view all processed RAG results.
    """
    if not rag_results:
        return {"message": "No RAG results available"}
    
    return {
        "total_items": len(rag_results),
        "results": [
            {
                "url": result.url,
                "processed_result_preview": result.processed_result[:200] + "..." if len(result.processed_result) > 200 else result.processed_result,
                "timestamp": result.timestamp
            } for result in rag_results
        ]
    }

@app.get("/view-rag-result/{index}")
async def view_specific_rag_result(index: int):
    """
    Endpoint to view a specific RAG result by index.
    """
    if index < 0 or index >= len(rag_results):
        raise HTTPException(status_code=404, detail="RAG result not found")
    
    result = rag_results[index]
    return {
        "url": result.url,
        "original_text": result.original_text,
        "processed_result": result.processed_result,
        "timestamp": result.timestamp
    }


@app.get("/view-scrape/{index}")
async def view_specific_scrape(index: int):
    """
    Endpoint to view a specific scraped content by index.
    """
    if index < 0 or index >= len(scraped_contents):
        raise HTTPException(status_code=404, detail="Scrape not found")
    
    content = scraped_contents[index]
    return {
        "url": content.url,
        "full_text": content.text,
        "timestamp": content.timestamp,
        "metadata": content.metadata
    }

@app.post("/classify")
async def classify_single_text(request: dict):
    text = request.get("text", "")
    if not text:
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        result = classify_text(text)
        return {"processed_result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health_check():
    """Basic API health check."""
    return {"status": "running"}

@app.get("/")
async def root():
    return {"api": "Web Scraping and RAG Processing API is running"}