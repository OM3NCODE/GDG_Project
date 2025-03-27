from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import logging
import traceback
import subprocess
import json

logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='api_logs.log'
)
logger = logging.getLogger(__name__)

class ContentRequest(BaseModel):
    text: str
    context: dict = {}  # Optional context for additional information

class ClassificationResponse(BaseModel):
    classification: str
    confidence: float
    details: dict = {}

app = FastAPI(
    title="AI Content Classification API",
    description="API for processing text through an AI classification model",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def run_ai_model(text: str) -> dict:
    """
    Function to run the local AI model as a subprocess.
    Replace with actual model calling mechanism.
    """
    try:
        # Example of calling a local script
        result = subprocess.run(
            ['python', 'ai_model_script.py', text], 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        
        # Parse the output
        return json.loads(result.stdout)
    except subprocess.TimeoutExpired:
        logger.error(f"AI model subprocess timed out for text: {text}")
        raise HTTPException(
            status_code=504, 
            detail="AI model processing timed out"
        )
    except (subprocess.CalledProcessError, json.JSONDecodeError) as e:
        logger.error(f"Error in AI model subprocess: {e}")
        raise HTTPException(
            status_code=500, 
            detail="Error processing text through AI model"
        )

@app.post("/classify", response_model=ClassificationResponse)
async def classify_content(request: ContentRequest):
    """
    Main endpoint for text classification
    """
    try:
        # Validate input
        if not request.text or len(request.text.strip()) == 0:
            raise HTTPException(
                status_code=400, 
                detail="Empty text content is not allowed"
            )

        # Log incoming request
        logger.info(f"Received classification request for text: {request.text[:100]}...")

        # Run AI model
        model_response = run_ai_model(request.text)

        # Validate model response
        if not isinstance(model_response, dict):
            raise HTTPException(
                status_code=500, 
                detail="Invalid response from AI model"
            )

        # Prepare response
        classification_result = ClassificationResponse(
            classification=model_response.get('classification', 'Unknown'),
            confidence=model_response.get('confidence', 0.0),
            details=model_response.get('details', {})
        )

        # Log successful classification
        logger.info(f"Classified text as: {classification_result.classification}")

        return classification_result

    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Unexpected error: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500, 
            detail=f"Internal server error: {str(e)}"
        )

# Optional health check endpoint
@app.get("/health")
async def health_check():
    """
    Simple health check endpoint
    """
    return {"status": "healthy"}

# Error handler for validation errors
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    Custom error handler for HTTP exceptions
    """
    logger.error(f"HTTP Error {exc.status_code}: {exc.detail}")
    return {
        "error": True,
        "status_code": exc.status_code,
        "message": exc.detail
    }

# Run the API with: uvicorn main:app --reload
