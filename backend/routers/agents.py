from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging
import uuid
from agents.core.coordinator import CoordinatorAgent

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()

# Initialize coordinator
coordinator = CoordinatorAgent()

# In-memory storage for travel plans (in a production app, this would be a database)
travel_plans = {}

# Request models
class TravelPreferences(BaseModel):
    destination: str
    trip_length: int
    budget: str = "moderate"
    interests: List[str] = []
    get_insights: bool = False
    get_images: bool = False

class AgentQuery(BaseModel):
    agent_type: str
    query: str

# Response models
class TravelPlanResponse(BaseModel):
    id: str
    destination: str
    trip_length: int
    budget: str
    interests: List[str]
    itinerary: str
    attractions: str
    food: str
    accommodation: str
    insights: Optional[str] = None
    images: Optional[str] = None

class AgentResponse(BaseModel):
    response: str

# Valid agent types
VALID_AGENT_TYPES = ["attractions", "food", "accommodation", "reviews", "images", "planner"]

# Routes
@router.post("/travel-plan", response_model=TravelPlanResponse)
async def create_travel_plan(preferences: TravelPreferences):
    """
    Create a comprehensive travel plan based on user preferences.
    
    This endpoint coordinates multiple specialized agents to generate a complete
    travel itinerary with attractions, food, and accommodation recommendations.
    """
    try:
        # Convert model to dict for processing
        pref_dict = preferences.model_dump()
        
        # Process the request with the coordinator
        response = coordinator.process_request(pref_dict)
        
        # Generate a unique ID for this travel plan
        plan_id = str(uuid.uuid4())
        
        # Add the ID to the response
        response["id"] = plan_id
        
        # Ensure all required fields exist with default values if needed
        # This prevents Pydantic validation errors
        required_fields = {
            "destination": pref_dict.get("destination", "Unknown"),
            "trip_length": pref_dict.get("trip_length", 3),
            "budget": pref_dict.get("budget", "moderate"),
            "interests": pref_dict.get("interests", []),
            "itinerary": "No itinerary available.",
            "attractions": "No attractions information available.",
            "food": "No food recommendations available.",
            "accommodation": "No accommodation information available.",
        }
        
        # Ensure all required fields are in the response
        for field, default_value in required_fields.items():
            if field not in response or response[field] is None:
                response[field] = default_value
        
        # Store the travel plan for later retrieval
        travel_plans[plan_id] = response
        
        return response
    except Exception as e:
        logger.error(f"Error creating travel plan: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error creating travel plan: {str(e)}")

@router.get("/travel-plan/{plan_id}", response_model=TravelPlanResponse)
async def get_travel_plan(plan_id: str):
    """
    Retrieve a previously created travel plan by its ID.
    """
    # Check if the plan exists in our storage
    if plan_id not in travel_plans:
        raise HTTPException(status_code=404, detail=f"Travel plan with ID {plan_id} not found")
    
    return travel_plans[plan_id]

@router.post("/query", response_model=AgentResponse)
async def query_agent(query: AgentQuery):
    """
    Query a specific agent type with a custom question.
    
    Valid agent types:
    - attractions: For sightseeing and entertainment recommendations
    - food: For restaurant and culinary experiences
    - accommodation: For hotel and lodging options
    - reviews: For traveler opinions and insights (uses Google search)
    - images: For destination images (uses Google image search)
    - planner: For creating itineraries
    """
    # Check for valid agent type - do this before any try/except block
    if query.agent_type not in VALID_AGENT_TYPES:
        error_msg = f"Invalid agent type. Must be one of {', '.join(VALID_AGENT_TYPES)}"
        logger.error(error_msg)
        raise HTTPException(status_code=400, detail=error_msg)
    
    try:
        # Get response from the requested agent
        response = coordinator.get_recommendations(query.agent_type, query.query)
        
        return {"response": response}
    except ValueError as e:
        # Handle specific ValueError which could be from invalid agent types
        logger.error(f"Value error querying agent: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Handle other exceptions
        logger.error(f"Error querying agent: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error querying agent: {str(e)}") 