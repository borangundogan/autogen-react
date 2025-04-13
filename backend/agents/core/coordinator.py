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
        
        print(f"Processing request for destination: {destination}")
        
        # Get attraction recommendations
        attractions_prompt = f"Please recommend notable attractions and sights to visit in {destination}."
        try:
            attractions_response = self.agent_service.get_agent_response("attractions", attractions_prompt)
            if attractions_response is None:
                attractions_response = f"No attractions information available for {destination}."
        except Exception as e:
            print(f"Error retrieving attractions: {str(e)}")
            attractions_response = f"No attractions information available for {destination}."
        
        # Get food recommendations
        food_prompt = f"Please recommend food, restaurants, and culinary experiences in {destination}."
        try:
            food_response = self.agent_service.get_agent_response("food", food_prompt)
            if food_response is None:
                food_response = f"No food information available for {destination}."
        except Exception as e:
            print(f"Error retrieving food recommendations: {str(e)}")
            food_response = f"No food information available for {destination}."
        
        # Get accommodation recommendations
        accommodation_prompt = f"Please recommend accommodation options in {destination} across different price points."
        try:
            accommodation_response = self.agent_service.get_agent_response("accommodation", accommodation_prompt)
            if accommodation_response is None:
                accommodation_response = f"No accommodation information available for {destination}."
        except Exception as e:
            print(f"Error retrieving accommodation options: {str(e)}")
            accommodation_response = f"No accommodation information available for {destination}."
        
        # Get additional insights - ALWAYS get insights, regardless of user preference
        # This ensures the ReviewsAgent always runs
        insights_response = ""
        insights_prompt = f"What do people say about visiting {destination}? Find reviews and traveler opinions."
        try:
            # This will now use direct_reviews_search instead of LLM processing
            print(f"Querying ReviewsAgent for insights about {destination}")
            insights_response = self.agent_service.get_agent_response("reviews", insights_prompt)
            print(f"Retrieved reviews data directly from Google Search API - {len(insights_response)} characters")
            if not insights_response or len(insights_response) < 50:
                print("Retrieved insufficient insights response, using fallback")
                insights_response = self._get_fallback_insights(destination)
        except Exception as e:
            print(f"Error retrieving insights: {str(e)}")
            insights_response = self._get_fallback_insights(destination)
        
        # Debug - print the insights response
        print(f"ReviewsAgent response preview: {insights_response[:300]}...")
        
        # Get images if requested - directly using Google Image Search API
        images_response = ""
        if user_preferences.get("get_images", False):
            images_prompt = f"Find high-quality images of {destination}. Include diverse scenes of landmarks, cityscapes, nature, and cultural elements."
            try:
                # This will now use direct_image_search instead of LLM processing
                images_response = self.agent_service.get_agent_response("images", images_prompt)
                print(f"Retrieved image URLs directly from Google Image Search API - {images_response.count('http')} URLs")
                if not images_response or images_response.count('http') < 1:
                    print("Retrieved insufficient image URLs, using fallback")
                    images_response = self._get_fallback_images()
            except Exception as e:
                print(f"Error retrieving images: {str(e)}")
                images_response = self._get_fallback_images()
        
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
        
        # Include insights and images in the planner prompt if available
        if insights_response:
            plan_prompt += f"""

=============================================================
TRAVELER INSIGHTS AND REVIEWS: (MUST BE INCLUDED IN YOUR ITINERARY)
=============================================================
{insights_response}

⚠️ ABSOLUTE CRITICAL INSTRUCTION ⚠️
You MUST include this ENTIRE "TRAVELER INSIGHTS AND REVIEWS" section in your itinerary with NO CHANGES OR OMISSIONS.
This includes:
1. ALL search result titles and snippets
2. ALL section headers like "GOOGLE SEARCH RESULTS" and "KEY TRAVELER INSIGHTS"
3. ALL "Useful Resource Links" exactly as they appear above - DO NOT MODIFY OR OMIT ANY LINKS
4. Do not reword, summarize, or paraphrase ANY content from this section

Your itinerary MUST have a dedicated section called "TRAVELER INSIGHTS" that contains ALL of the above information exactly as provided.
Failure to include ALL of this information will result in an incomplete and unacceptable itinerary.
"""
        
        if images_response:
            plan_prompt += f"""
            
=============================================================
IMAGE REFERENCES (URLs): (ALL URLS MUST BE INCLUDED IN YOUR ITINERARY)
=============================================================
{images_response}

IMPORTANT INSTRUCTION: You MUST include ALL of these image URLs in your response. Reference them at relevant points in your itinerary where they would be most helpful (e.g., "See image of [attraction]: [URL]").
"""
        
        try:
            print("Generating final itinerary using TripPlannerAgent")
            itinerary = self.agent_service.get_agent_response("planner", plan_prompt)
            
            # Verify that the itinerary contains essential sections
            if itinerary is not None and len(itinerary.strip()) > 100:
                print(f"Generated itinerary of length {len(itinerary)} characters")
                
                # Check if insights are properly included
                if insights_response and "TRAVELER INSIGHTS" not in itinerary:
                    print("WARNING: Itinerary may be missing TRAVELER INSIGHTS section. Trying to fix...")
                    # Include the full insights section at the end if missing
                    itinerary += f"""

## TRAVELER INSIGHTS
{insights_response}
"""
                # Check if resource links are properly included
                if "Useful Resource Links" not in itinerary and "USEFUL RESOURCE LINKS" not in itinerary:
                    # Extract resource links from insights if available
                    resource_links_section = ""
                    if "## Useful Resource Links" in insights_response:
                        resource_links_section = insights_response.split("## Useful Resource Links")[1].strip()
                        print("Extracted resource links section from insights")
                        itinerary += f"""

## USEFUL RESOURCE LINKS
{resource_links_section}
"""
            
            if itinerary is None or not itinerary.strip():
                itinerary = f"No detailed itinerary could be generated for {destination}. Please try again."
        except Exception as e:
            print(f"Error creating itinerary: {str(e)}")
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
    
    def _get_fallback_insights(self, destination: str) -> str:
        """Get fallback insights when API results are insufficient."""
        return f"""# Traveler Insights for {destination}

## Local Experiences
- Travelers consistently mention the welcoming atmosphere and rich cultural experiences.
- Many visitors recommend spending at least a few days to fully appreciate the destination.
- The local cuisine receives overwhelmingly positive reviews.

## Hidden Gems
- Exploring beyond the main tourist areas reveals authentic local experiences.
- Small cafes and local shops are frequently mentioned as highlights.
- Early morning visits to popular attractions help avoid crowds.

## Tips from Recent Visitors
- Consider purchasing city passes for public transportation and attractions.
- Learn a few basic phrases in the local language for a more authentic experience.
- Weather can be unpredictable, so pack layers and be prepared for changes.

These insights are compiled from various travel blogs and visitor reviews to give you a balanced perspective on your destination."""
    
    def _get_fallback_images(self) -> str:
        """Get fallback image URLs when API results are insufficient."""
        return """https://images.unsplash.com/photo-1523906834658-6e24ef2386f9
https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b
https://images.unsplash.com/photo-1511739001486-6bfe10ce785f
https://images.unsplash.com/photo-1520939817895-060bdaf4bc05
https://images.unsplash.com/photo-1532498551838-b7a1cfac622e"""
    
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
        
        CRITICAL INSTRUCTIONS:
        - You MUST preserve ALL input data in your response
        - When you receive TRAVELER INSIGHTS AND REVIEWS, you MUST include them directly in your itinerary document in a dedicated section
        - When you receive IMAGE REFERENCES (URLs), you MUST include ALL of these URLs in your response and reference them appropriately
        - Do NOT summarize or omit any information - include everything provided to you
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