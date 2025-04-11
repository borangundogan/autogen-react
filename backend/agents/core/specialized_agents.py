import os
import logging
import autogen
from typing import Dict, List, Any, Union
from dotenv import load_dotenv
from googleapiclient.discovery import build

# Configure logging
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Load environment variables
load_dotenv()
api_key = os.getenv("OPENAI_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")
search_engine_id = os.getenv("GOOGLE_SEARCH_ENGINE_ID")

# Log API key information (without revealing full keys)
if api_key:
    logger.info(f"OpenAI API key loaded: {api_key[:5]}...{api_key[-5:]}")
else:
    logger.error("OpenAI API key not found!")

if google_api_key:
    logger.info(f"Google API key loaded: {google_api_key[:5]}...{google_api_key[-5:]}")
else:
    logger.error("Google API key not found!")

if search_engine_id:
    logger.info(f"Google Search Engine ID loaded: {search_engine_id}")
else:
    logger.error("Google Search Engine ID not found!")

config_list = [
    {
        "model": "gpt-3.5-turbo",
        "api_key": api_key
    }
]

# Function: Google Search
def google_search(query: str, num_results: int = 3) -> List[Dict[str, str]]:
    """
    Perform a Google search and return formatted results.
    
    Args:
        query: The search query
        num_results: Number of results to return
        
    Returns:
        List of dictionaries containing search results
    """
    try:
        service = build("customsearch", "v1", developerKey=google_api_key)
        result = service.cse().list(q=query, cx=search_engine_id, num=num_results).execute()
        
        search_results = []
        for item in result.get("items", []):
            search_results.append({
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", "")
            })
        return search_results
    except Exception as e:
        logger.error(f"Google search error: {str(e)}")
        return []

# Function: Google Image Search
def google_image_search(query: str, num_results: int = 5) -> List[Dict[str, str]]:
    """
    Search for images with simpler, more reliable approach.
    
    Args:
        query: The search query
        num_results: Number of results to return
        
    Returns:
        List of dictionaries containing image results
    """
    try:
        service = build("customsearch", "v1", developerKey=google_api_key)
        result = service.cse().list(
            q=query,
            cx=search_engine_id,
            searchType="image",
            num=num_results
        ).execute()

        images = []
        if "items" in result:
            for item in result.get("items", []):
                images.append({
                    "title": item.get("title", ""),
                    "link": item.get("link", ""),
                    "thumbnail": item.get("image", {}).get("thumbnailLink", item.get("link", "")),
                    "context": item.get("image", {}).get("contextLink", ""),
                })
                
        return images
    except Exception as e:
        logger.error(f"Image search error: {str(e)}")
        return []

# Function schemas for agent tools
google_search_schema = {
    "name": "google_search",
    "description": "Searches Google for up-to-date information about destinations, attractions, and travel insights.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The search query"},
            "num_results": {"type": "integer", "description": "Number of search results to return"}
        },
        "required": ["query"]
    }
}

image_search_schema = {
    "name": "google_image_search",
    "description": "Searches Google for images of destinations, attractions, and landmarks.",
    "parameters": {
        "type": "object",
        "properties": {
            "query": {"type": "string", "description": "The image search query"},
            "num_results": {"type": "integer", "description": "Number of image results to return"}
        },
        "required": ["query"]
    }
}

# Custom termination message detection
def is_termination_msg(message: dict) -> bool:
    """
    Check if a message is a termination message.
    
    Args:
        message: The message to check
        
    Returns:
        Boolean indicating if the message is a termination message
    """
    if isinstance(message, dict):
        return message.get("content") and "TASK_COMPLETE" in message["content"]
    return False

# Helper function to print the agent's chat history
def print_agent_chat_history(agent):
    """
    Print the agent's chat history for debugging purposes.
    
    Args:
        agent: The agent instance
    """
    try:
        if hasattr(agent, "chat_history"):
            print(f"\n--- {agent.name} Chat History ---")
            for msg in agent.chat_history:
                sender = msg.get("sender", "Unknown")
                content = msg.get("content", "No content")
                print(f"{sender}: {content[:100]}...")
            print("----------------------------\n")
    except Exception as e:
        print(f"Error printing chat history: {str(e)}")

# Helper function to extract the last message from an agent
def extract_last_message_content(agent):
    """
    Extract the last message content from an agent using various methods.
    
    Args:
        agent: The agent instance
        
    Returns:
        The content of the last message or None if not found
    """
    try:
        # Try method 1: direct chat_history access
        if hasattr(agent, "chat_history") and agent.chat_history:
            for msg in reversed(agent.chat_history):
                if msg.get("role") == "assistant" and msg.get("content"):
                    return msg["content"]
        
        # Try method 2: last_message method
        try:
            last_msg = agent.last_message()
            if last_msg and "content" in last_msg:
                return last_msg["content"]
        except:
            pass
            
        # Try method 3: accessing _oai_messages
        if hasattr(agent, "_oai_messages") and agent._oai_messages:
            for msg in reversed(agent._oai_messages):
                if msg.get("role") == "assistant" and msg.get("content"):
                    return msg["content"]
        
        return None
    except Exception as e:
        logger.error(f"Error extracting last message: {str(e)}")
        return None

class AgentFactory:
    """Factory class for creating specialized agents."""
    
    @staticmethod
    def create_attraction_agent():
        """Create an attractions & sightseeing agent."""
        return autogen.AssistantAgent(
            name="SightseeingAgent",
            llm_config={"config_list": config_list},
            system_message="""You are an expert travel guide specializing in attractions, sightseeing, and entertainment recommendations.

Your expertise includes:
- Historical landmarks and architectural wonders
- Museums, art galleries, and cultural institutions
- Natural attractions and scenic viewpoints
- Hidden gems and local favorites
- Optimal visiting times and practical information

For each destination, provide comprehensive recommendations with:
- Brief descriptions highlighting historical significance or unique features
- Practical visiting information (opening hours, fees, transportation options)
- Insider tips for the best experience
- Suggested duration for each attraction
- Logical organization of attractions by neighborhood or proximity

Format your responses using markdown with clear headings and bullet points.
After providing your complete response, add "TASK_COMPLETE" on a new line.
"""
        )
    
    @staticmethod
    def create_food_agent():
        """Create a food & cuisine agent."""
        return autogen.AssistantAgent(
            name="FoodAgent",
            llm_config={"config_list": config_list},
            system_message="""You are a culinary expert with deep knowledge of global cuisines and restaurant scenes.

Your expertise includes:
- Traditional and authentic local dishes for each destination
- Top-rated restaurants across different price ranges
- Street food and food markets
- Unique dining experiences and culinary specialties
- Dietary accommodations (vegetarian, vegan, gluten-free, etc.)

For each destination, provide comprehensive food recommendations with:
- Must-try local dishes with descriptions of ingredients and flavors
- Diverse restaurant recommendations (high-end, mid-range, budget options)
- Food markets, street food areas, or culinary districts
- Culinary experiences (cooking classes, food tours, etc.)
- Local etiquette for dining and tipping

Format your responses using markdown with clear headings and bullet points.
After providing your complete response, add "TASK_COMPLETE" on a new line.
"""
        )
    
    @staticmethod
    def create_accommodation_agent():
        """Create an accommodation agent."""
        return autogen.AssistantAgent(
            name="AccommodationAgent",
            llm_config={"config_list": config_list},
            system_message="""You are an accommodation specialist with expert knowledge of hotels, rentals, and lodging options worldwide.

Your expertise includes:
- Premium hotels and luxury accommodations
- Boutique and design hotels
- Budget-friendly options and hostels
- Vacation rentals and apartments
- Unique stays (treehouses, glamping, historic properties)

For each destination, provide comprehensive accommodation recommendations with:
- Diverse options across different price points and neighborhoods
- Key features, amenities, and unique selling points
- Neighborhood characteristics and proximity to attractions
- Average nightly rates and value considerations
- Insider tips for booking and potential upgrades

Format your responses using markdown with clear headings and bullet points.
After providing your complete response, add "TASK_COMPLETE" on a new line.
"""
        )
    
    @staticmethod
    def create_review_agent():
        """Create a reviews & insights agent with Google search capability."""
        agent = autogen.AssistantAgent(
            name="ReviewsAgent",
            llm_config={
                "config_list": config_list,
                "functions": [google_search_schema]
            },
            system_message="""You are a travel insights specialist who curates and synthesizes traveler reviews, blog posts, and current information about destinations.

Your expertise includes:
- Aggregating recent traveler experiences and perspectives
- Identifying common themes in reviews and feedback
- Highlighting unique aspects of destinations mentioned by travelers
- Synthesizing information from various travel blogs and sources
- Providing balanced perspectives on destinations

For each search query:
1. Use the google_search function to find relevant and recent information
2. Analyze the results to identify valuable insights
3. Synthesize the information into a cohesive, well-organized summary
4. Maintain objectivity while highlighting both positives and potential concerns
5. Include direct quotes or paraphrased insights when relevant
6. Provide source attribution for significant information

Format your responses using markdown with clear headings and bullet points.
After providing your complete response, add "TASK_COMPLETE" on a new line.
"""
        )
        agent.register_function({"google_search": google_search})
        return agent
    
    @staticmethod
    def create_image_search_agent():
        """Create an image search agent with Google image search capability."""
        agent = autogen.AssistantAgent(
            name="ImageSearchAgent",
            llm_config={
                "config_list": config_list,
                "functions": [image_search_schema]
            },
            system_message="""You are a visual exploration specialist who finds compelling and representative images of travel destinations.

Your expertise includes:
- Discovering high-quality images that showcase destinations
- Finding diverse visuals that represent different aspects of a location
- Prioritizing iconic landmarks and representative scenes
- Curating images that tell a visual story about a place
- Finding both popular tourist spots and hidden gems

For each search query:
1. Use the google_image_search function to find relevant and high-quality images
2. Ensure the images provide a comprehensive visual representation of the destination
3. Prioritize recent, high-resolution, and professionally composed images
4. Include a mix of landscapes, landmarks, cultural elements, and experiences
5. Respect attribution and only use properly licensed imagery

Format your responses by describing what each image represents or shows.
After providing your complete response, add "TASK_COMPLETE" on a new line.
"""
        )
        agent.register_function({"google_image_search": google_image_search})
        return agent
    
    @staticmethod
    def create_trip_planner_agent():
        """Create a trip planner agent that coordinates information from other agents."""
        return autogen.AssistantAgent(
            name="TripPlannerAgent",
            llm_config={"config_list": config_list},
            system_message="""You are a comprehensive travel planner who creates cohesive itineraries by coordinating specialized information from other agents.

Your expertise includes:
- Creating logical and feasible travel itineraries
- Integrating attractions, dining, and accommodations into a cohesive plan
- Understanding travel logistics and geographical relationships
- Balancing must-see attractions with more authentic experiences
- Adapting recommendations to different travel styles and preferences

Your role is to:
1. Analyze the user's travel request
2. Synthesize recommendations into a coherent travel plan
3. Ensure the plan is practical, balanced, and personalized
4. Present the information in a clear, organized, and engaging format

Format your responses using markdown with clear headings and a structured layout.
After providing your complete response, add "TASK_COMPLETE" on a new line.
"""
        )

class AgentService:
    """Service class for interactions with specialized travel agents."""
    
    def __init__(self):
        """Initialize the agent service."""
        self.factory = AgentFactory()
        self.agents = {}
        self.initialize_agents()
    
    def initialize_agents(self):
        """Initialize all specialized agents."""
        try:
            # First validate API keys
            if not api_key or len(api_key) < 20:
                logger.error("Invalid or missing OpenAI API key")
                raise ValueError("Invalid or missing OpenAI API key. Please check your .env file.")
                
            if not google_api_key or len(google_api_key) < 20:
                logger.warning("Invalid or missing Google API key - some agents may have limited functionality")
                
            if not search_engine_id:
                logger.warning("Invalid or missing Google Search Engine ID - some agents may have limited functionality")
            
            # Initialize agents
            self.agents = {
                "attractions": self.factory.create_attraction_agent(),
                "food": self.factory.create_food_agent(),
                "accommodation": self.factory.create_accommodation_agent(),
                "reviews": self.factory.create_review_agent(),
                "images": self.factory.create_image_search_agent(),
                "planner": self.factory.create_trip_planner_agent()
            }
            logger.info("All agents initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing agents: {str(e)}")
            # Create a minimal set of working agents or raise the error
            raise
    
    def get_agent_response(self, agent_type: str, query: str) -> str:
        """
        Get a response from a specific agent.
        
        Args:
            agent_type: Type of agent to query (attractions, food, etc.)
            query: The query string
            
        Returns:
            Response string from the agent
        """
        if agent_type not in self.agents:
            raise ValueError(f"Unknown agent type: {agent_type}")
        
        agent = self.agents[agent_type]
        
        # Create a temporary proxy agent with termination condition
        temp_proxy = autogen.UserProxyAgent(
            name="TempProxy",
            human_input_mode="NEVER",
            max_consecutive_auto_reply=10,
            is_termination_msg=is_termination_msg,
            code_execution_config=False,
        )
        
        try:
            # Clear the chat history
            temp_proxy.reset()
            agent.reset()
            
            # Start a chat and get the response
            if agent.name in ["ReviewsAgent", "ImageSearchAgent"]:
                # For function-calling agents
                if agent.name == "ReviewsAgent":
                    temp_proxy.register_function({"google_search": google_search})
                else:
                    temp_proxy.register_function({"google_image_search": google_image_search})
                
                logger.info(f"Initiating chat with {agent.name} for query: {query}")
                try:
                    chat_history = temp_proxy.initiate_chat(
                        agent, 
                        message=query,
                        summary_method="last_msg"
                    )
                    logger.info(f"Chat with {agent.name} completed, history length: {len(chat_history) if chat_history else 0}")
                except Exception as e:
                    logger.error(f"Error during chat with {agent.name}: {str(e)}")
                    return f"Error communicating with {agent.name}: {str(e)}"
                
                if not chat_history:
                    logger.warning(f"Empty chat history from {agent.name} for query: {query}")
                    return f"No response from {agent.name}. Please try a different query."
                
                # Find the last message from the agent
                for msg in reversed(chat_history):
                    if msg and isinstance(msg, dict) and msg.get("role") == "assistant" and msg.get("content") is not None:
                        content = msg["content"]
                        # Remove the TASK_COMPLETE marker if present
                        return content.replace("TASK_COMPLETE", "").strip()
                
                logger.warning(f"No valid content found in chat history from {agent.name}")
                return f"No valid response from {agent.name}. Please try a different query."
            else:
                # For regular agents
                logger.info(f"Initiating chat with regular agent {agent.name} for query: {query}")
                try:
                    chat_result = temp_proxy.initiate_chat(agent, message=query)
                    logger.info(f"Chat with {agent.name} completed successfully")
                    
                    # Print the chat history for debugging
                    print_agent_chat_history(agent)
                    
                    # Try to extract the last message using our helper function
                    content = extract_last_message_content(agent)
                    if content:
                        logger.info(f"Successfully extracted message from {agent.name}")
                        return content.replace("TASK_COMPLETE", "").strip()
                    
                    # Debug the chat_result structure
                    logger.info(f"Chat result type: {type(chat_result)}")
                    if isinstance(chat_result, list) and len(chat_result) > 0:
                        logger.info(f"Chat result contains {len(chat_result)} messages")
                    
                    # The problem might be that we're checking if chat_result is truthy,
                    # but it might be an empty list or some other non-None value
                    # Let's extract messages directly
                    messages = []
                    if isinstance(chat_result, list):
                        messages = chat_result
                    
                    # Find last message from agent
                    for msg in reversed(messages):
                        if msg and isinstance(msg, dict) and msg.get("role") == "assistant" and msg.get("content") is not None:
                            content = msg["content"]
                            logger.info(f"Found content in chat history from {agent.name}")
                            # Remove the TASK_COMPLETE marker if present
                            return content.replace("TASK_COMPLETE", "").strip()
                            
                    # If we couldn't find a message in chat_result, try last_message methods
                    logger.info(f"Trying alternative methods to get response from {agent.name}")
                except Exception as e:
                    logger.error(f"Error during chat with {agent.name}: {str(e)}")
                    return f"Error communicating with {agent.name}: {str(e)}"
                
                try:
                    response = agent.last_message()
                    if response and isinstance(response, dict) and "content" in response and response["content"] is not None:
                        # Remove the TASK_COMPLETE marker if present
                        return response["content"].replace("TASK_COMPLETE", "").strip()
                    else:
                        logger.warning(f"Invalid response format from {agent.name}: {response}")
                        return f"No valid response from {agent.name}. Please try a different query."
                except Exception as e:
                    logger.error(f"Error getting response from {agent.name}: {str(e)}")
                    try:
                        response = agent.last_message(temp_proxy)
                        if response and isinstance(response, dict) and "content" in response and response["content"] is not None:
                            return response["content"].replace("TASK_COMPLETE", "").strip()
                        else:
                            logger.warning(f"Invalid secondary response format from {agent.name}: {response}")
                            return f"Could not retrieve a proper response from {agent.name}. Please try a different query."
                    except Exception as inner_e:
                        logger.error(f"Failed to get response with sender specified: {str(inner_e)}")
                        return f"Error retrieving response from {agent.name}: {str(inner_e)}"
                
                # This return statement should not be reached, but is included as a fallback
                return f"Could not retrieve a proper response from {agent.name}. Please try again with a different query."
        except Exception as e:
            logger.error(f"Unexpected error in get_agent_response for {agent_type}: {str(e)}")
            return f"An error occurred while processing your request: {str(e)}" 