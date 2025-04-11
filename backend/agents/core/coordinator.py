import autogen
import os
from dotenv import load_dotenv
from typing import Dict, List, Any
from .specialized_agents import AgentService

# Load environment variables
load_dotenv()

class CoordinatorAgent:
    """
    Coordinates communication between all specialized agents in the system.
    Acts as the central hub for processing user requests and organizing agent responses.
    """
    
    def __init__(self):
        """Initialize the coordinator agent with configuration and specialized agents."""
        try:
            # Configure OpenAI
            self.config_list = [
                {
                    "model": "gpt-3.5-turbo",
                    "api_key": os.getenv("OPENAI_API_KEY")
                }
            ]
            
            # LLM configuration
            self.llm_config = {
                "config_list": self.config_list,
                "temperature": 0.7,
            }
            
            # Initialize user proxy agent (interface between user and system)
            self.user_proxy = autogen.UserProxyAgent(
                name="User",
                human_input_mode="NEVER",
                max_consecutive_auto_reply=10,
                system_message="I need help planning a trip."
            )
            
            # Initialize the agent service
            self.agent_service = AgentService()
        except Exception as e:
            # Log the error
            print(f"Critical error initializing CoordinatorAgent: {str(e)}")
            # Re-raise to prevent normal operation with broken initialization
            raise
        
    def process_request(self, user_preferences: Dict[str, Any]) -> Dict[str, Any]:
        """
        Process a travel planning request by coordinating between specialized agents.
        
        Args:
            user_preferences: Dictionary containing user preferences from questionnaire
            
        Returns:
            Dict containing the complete travel itinerary
        """
        destination = user_preferences.get("destination", "Unknown")
        trip_length = user_preferences.get("trip_length", 3)
        budget = user_preferences.get("budget", "moderate")
        interests = user_preferences.get("interests", [])
        
        # Ensure interests is a list even if it's None
        if interests is None:
            interests = []
        
        # Get attraction recommendations
        attractions_prompt = f"Please recommend notable attractions and sights to visit in {destination}."
        try:
            attractions_response = self.agent_service.get_agent_response("attractions", attractions_prompt)
            if attractions_response is None:
                attractions_response = f"No attractions information available for {destination}."
        except Exception as e:
            attractions_response = f"Error retrieving attractions: {str(e)}"
        
        # Get food recommendations
        food_prompt = f"Please recommend food, restaurants, and culinary experiences in {destination}."
        try:
            food_response = self.agent_service.get_agent_response("food", food_prompt)
            if food_response is None:
                food_response = f"No food information available for {destination}."
        except Exception as e:
            food_response = f"Error retrieving food recommendations: {str(e)}"
        
        # Get accommodation recommendations
        accommodation_prompt = f"Please recommend accommodation options in {destination} across different price points."
        try:
            accommodation_response = self.agent_service.get_agent_response("accommodation", accommodation_prompt)
            if accommodation_response is None:
                accommodation_response = f"No accommodation information available for {destination}."
        except Exception as e:
            accommodation_response = f"Error retrieving accommodation options: {str(e)}"
        
        # Get additional insights if requested
        insights_response = ""
        if user_preferences.get("get_insights", False):
            insights_prompt = f"What do people say about visiting {destination}? Find reviews and traveler opinions."
            try:
                insights_response = self.agent_service.get_agent_response("reviews", insights_prompt)
                if insights_response is None:
                    insights_response = f"No insights available for {destination}."
            except Exception as e:
                insights_response = f"Error retrieving insights: {str(e)}"
        
        # Get images if requested
        images_response = ""
        if user_preferences.get("get_images", False):
            images_prompt = f"Find high-quality images of {destination}. Include diverse scenes of landmarks, cityscapes, nature, and cultural elements."
            try:
                images_response = self.agent_service.get_agent_response("images", images_prompt)
                if images_response is None:
                    images_response = f"No images available for {destination}."
            except Exception as e:
                images_response = f"Error retrieving images: {str(e)}"
        
        # Create a comprehensive plan with the trip planner agent
        plan_prompt = self._create_plan_prompt(
            destination=destination,
            trip_length=trip_length,
            budget=budget,
            interests=interests,
            attractions=attractions_response,
            food=food_response,
            accommodation=accommodation_response
        )
        
        try:
            itinerary = self.agent_service.get_agent_response("planner", plan_prompt)
            if itinerary is None or not itinerary.strip():
                itinerary = f"No detailed itinerary could be generated for {destination}. Please try again."
        except Exception as e:
            itinerary = f"Error creating itinerary: {str(e)}"
        
        # Compile results into a single response
        return {
            "destination": destination,
            "trip_length": trip_length,
            "budget": budget,
            "interests": interests,
            "itinerary": itinerary,
            "attractions": attractions_response,
            "food": food_response,
            "accommodation": accommodation_response,
            "insights": insights_response,
            "images": images_response,
        }
    
    def _create_plan_prompt(self, destination: str, trip_length: int, budget: str, 
                           interests: List[str], attractions: str, food: str, 
                           accommodation: str) -> str:
        """
        Create a detailed prompt for the trip planner agent.
        
        Args:
            destination: Destination name
            trip_length: Number of days
            budget: Budget level (economy, moderate, luxury)
            interests: List of user interests
            attractions: Attraction recommendations from attractions agent
            food: Food recommendations from food agent
            accommodation: Accommodation recommendations from accommodation agent
            
        Returns:
            Formatted prompt string
        """
        # Ensure interests is a list and handle None values
        if interests is None:
            interests = []
            
        interests_str = ', '.join(interests) if interests else 'Various activities'
        
        prompt = f"""
        Create a detailed day-by-day travel plan for a {trip_length}-day trip to {destination}.
        
        Travel preferences:
        - Budget: {budget}
        - Interests: {interests_str}
        
        Use the following information to create a cohesive itinerary:
        
        ATTRACTIONS AND SIGHTSEEING INFORMATION:
        {attractions}
        
        FOOD AND DINING INFORMATION:
        {food}
        
        ACCOMMODATION INFORMATION:
        {accommodation}
        
        For each day, provide:
        1. Morning, afternoon, and evening activities
        2. Recommended places to eat for each meal
        3. Transportation suggestions between locations
        4. Estimated costs where applicable
        
        Create a logical flow for the itinerary that minimizes travel time and groups activities by geographic proximity.
        """
        
        return prompt
    
    def get_recommendations(self, agent_type: str, query: str) -> str:
        """
        Get recommendations from a specific agent type.
        
        Args:
            agent_type: Type of agent to query (attractions, food, accommodation, reviews, images)
            query: The query string
            
        Returns:
            String response from the agent
        """
        try:
            if not agent_type or not query:
                return "Invalid request. Agent type and query are required."
                
            if agent_type not in ["attractions", "food", "accommodation", "reviews", "images", "planner"]:
                return f"Unknown agent type: {agent_type}. Please use a valid agent type."
                
            response = self.agent_service.get_agent_response(agent_type, query)
            if response is None or not response.strip():
                return f"No information available for this query. Please try with a different query or agent type."
            return response
        except Exception as e:
            return f"Error retrieving recommendations: {str(e)}" 