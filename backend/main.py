from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Travel Planning Agent API",
    description="API for the Travel Planning Agent System",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "Travel Planning Agent API is running!"}

# Import and include routers
from routers import agents
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
# Uncomment other routers as they are implemented
# from routers import travel_plans, users
# app.include_router(travel_plans.router, prefix="/api/travel-plans", tags=["Travel Plans"])
# app.include_router(users.router, prefix="/api/users", tags=["Users"])

if __name__ == "__main__":
    port = int(os.getenv("BACKEND_PORT", 8000))
    host = os.getenv("BACKEND_HOST", "0.0.0.0")
    debug = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    uvicorn.run("main:app", host=host, port=port, reload=debug) 