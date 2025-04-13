from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import logging
import time

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# In-memory storage for tracking progress (in production, use a database)
itinerary_status = {}

class LogEntry(BaseModel):
    timestamp: str
    text: str

class AgentStatus(BaseModel):
    status: str
    progress: float
    is_active: bool
    logs: List[LogEntry] = []
    error: Optional[str] = None

class ItineraryStatusResponse(BaseModel):
    overall_progress: float
    completed: bool
    status_message: str
    agents: Dict[str, AgentStatus]

# Initialize a new itinerary status
def initialize_itinerary_status(itinerary_id: str):
    if itinerary_id not in itinerary_status:
        current_time = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
        itinerary_status[itinerary_id] = {
            "overall_progress": 0.0,
            "completed": False,
            "status_message": "Starting to plan your trip...",
            "created_at": current_time,
            "agents": {
                "attractions": {
                    "status": "pending",
                    "progress": 0.0,
                    "is_active": False,
                    "logs": [{"timestamp": current_time, "text": "Ready to discover attractions"}],
                    "error": None
                },
                "accommodation": {
                    "status": "pending",
                    "progress": 0.0,
                    "is_active": False,
                    "logs": [{"timestamp": current_time, "text": "Ready to find accommodations"}],
                    "error": None
                },
                "food": {
                    "status": "pending",
                    "progress": 0.0,
                    "is_active": False,
                    "logs": [{"timestamp": current_time, "text": "Ready to recommend restaurants"}],
                    "error": None
                },
                "planner": {
                    "status": "pending",
                    "progress": 0.0,
                    "is_active": False, 
                    "logs": [{"timestamp": current_time, "text": "Ready to create your itinerary"}],
                    "error": None
                }
            }
        }
        
        # Start a fake progress process (for demo purposes)
        # In a real app, this would be handled by background tasks
        simulate_progress(itinerary_id)

# Simulate progress for demo purposes
def simulate_progress(itinerary_id: str):
    # This function would be replaced with real agent progress tracking
    # For now, it just sets up some basic status data
    status = itinerary_status.get(itinerary_id)
    if status:
        # We'll update this with real agent progress in production
        pass

@router.get("/{itinerary_id}/status", response_model=ItineraryStatusResponse)
async def get_itinerary_status(itinerary_id: str):
    """
    Get the current status of an itinerary generation process.
    This endpoint returns the progress of all agents working on the itinerary.
    """
    # Initialize status if this is the first check
    if itinerary_id not in itinerary_status:
        initialize_itinerary_status(itinerary_id)
    
    # Get the current status
    status = itinerary_status.get(itinerary_id)
    if not status:
        raise HTTPException(status_code=404, detail=f"Itinerary with ID {itinerary_id} not found")
    
    # Update progress simulation on each request (for demo)
    # In a real app, this would be updated by background processes
    current_time = time.strftime("%Y-%m-%dT%H:%M:%S", time.localtime())
    
    # Add progress to agents based on time since creation
    time_elapsed = time.time() - time.mktime(time.strptime(status["created_at"], "%Y-%m-%dT%H:%M:%S"))
    
    # Simple progress simulation based on elapsed time
    status["agents"]["attractions"]["progress"] = min(100, time_elapsed * 5)
    status["agents"]["accommodation"]["progress"] = min(100, max(0, time_elapsed * 4 - 2))
    status["agents"]["food"]["progress"] = min(100, max(0, time_elapsed * 3 - 4))
    status["agents"]["planner"]["progress"] = min(100, max(0, time_elapsed * 2 - 8))
    
    # Update activity status
    status["agents"]["attractions"]["is_active"] = status["agents"]["attractions"]["progress"] < 100
    status["agents"]["accommodation"]["is_active"] = status["agents"]["accommodation"]["progress"] < 100 and status["agents"]["accommodation"]["progress"] > 0
    status["agents"]["food"]["is_active"] = status["agents"]["food"]["progress"] < 100 and status["agents"]["food"]["progress"] > 0
    status["agents"]["planner"]["is_active"] = status["agents"]["planner"]["progress"] < 100 and status["agents"]["planner"]["progress"] > 0
    
    # Add random logs for demo purposes
    if status["agents"]["attractions"]["progress"] > 20 and len(status["agents"]["attractions"]["logs"]) < 3:
        status["agents"]["attractions"]["logs"].append({"timestamp": current_time, "text": "Found top attractions for your destination"})
    
    if status["agents"]["accommodation"]["progress"] > 30 and len(status["agents"]["accommodation"]["logs"]) < 3:
        status["agents"]["accommodation"]["logs"].append({"timestamp": current_time, "text": "Analyzing accommodation options based on your budget"})
    
    if status["agents"]["food"]["progress"] > 40 and len(status["agents"]["food"]["logs"]) < 3:
        status["agents"]["food"]["logs"].append({"timestamp": current_time, "text": "Discovering local cuisine and restaurants"})
    
    if status["agents"]["planner"]["progress"] > 50 and len(status["agents"]["planner"]["logs"]) < 3:
        status["agents"]["planner"]["logs"].append({"timestamp": current_time, "text": "Creating your personalized itinerary"})
    
    # Calculate overall progress as average of agent progress
    agent_progresses = [agent["progress"] for agent in status["agents"].values()]
    status["overall_progress"] = sum(agent_progresses) / len(agent_progresses)
    
    # Update status message based on progress
    if status["overall_progress"] < 25:
        status["status_message"] = "Getting started with your travel plan..."
    elif status["overall_progress"] < 50:
        status["status_message"] = "Researching options for your trip..."
    elif status["overall_progress"] < 75:
        status["status_message"] = "Finalizing recommendations..."
    elif status["overall_progress"] < 99:
        status["status_message"] = "Almost ready with your perfect travel plan!"
    else:
        status["status_message"] = "Your travel plan is ready!"
        status["completed"] = True
    
    return status 