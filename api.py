from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(
    title="Web Content Scraping API",
    description="API for viewing and processing scraped web content"
)

# Add CORS middleware
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

# Global variable to store scraped content (for testing purposes)
scraped_contents = []

@app.post("/scrape")
async def receive_scraped_content(request: ScrapedContentRequest):
    """
    Endpoint to receive and store scraped web content.
    
    This endpoint allows you to:
    1. Store scraped content
    2. Inspect the content before further processing
    """
    # Clear previous contents
    global scraped_contents
    scraped_contents = []
    
    # Store new contents
    for content in request.content:
        scraped_contents.append(content)
    
    return {
        "message": "Content received successfully",
        "total_items": len(scraped_contents)
    }

@app.get("/view-scrapes")
async def view_scraped_content():
    """
    Endpoint to view all recently scraped content.
    
    Returns:
    - List of scraped content
    - Metadata about the scrapes
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

@app.get("/view-scrape/{index}")
async def view_specific_scrape(index: int):
    """
    Endpoint to view a specific scraped content by index.
    
    Returns:
    - Detailed information about a specific scrape
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

@app.get("/health")
async def health_check():
    """Basic API health check."""
    return {"status": "running"}

@app.get("/")
async def root():
    return {"api": "Web Scraping Content API is running"}

