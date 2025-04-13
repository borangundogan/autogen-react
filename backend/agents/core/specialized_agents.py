import os
import logging
import autogen
from typing import Dict, List, Any, Union
from dotenv import load_dotenv
from googleapiclient.discovery import build
import re

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
        logger.info(f"Starting Google search for query: '{query}', num_results={num_results}")
        
        if not google_api_key:
            logger.error("Google API key is missing! Cannot perform search.")
            return []
            
        if not search_engine_id:
            logger.error("Google Search Engine ID is missing! Cannot perform search.")
            return []
        
        logger.info(f"Google API configuration - API key: {google_api_key[:4]}...{google_api_key[-4:]}, Engine ID: {search_engine_id}")
        service = build("customsearch", "v1", developerKey=google_api_key)
        
        logger.info("Sending request to Google Custom Search API")
        result = service.cse().list(q=query, cx=search_engine_id, num=num_results).execute()
        logger.info(f"Google search API request complete. Total results: {result.get('searchInformation', {}).get('totalResults', 'unknown')}")
        
        search_results = []
        items = result.get("items", [])
        logger.info(f"Processing {len(items)} search results")
        
        for item in items:
            search_results.append({
                "title": item.get("title", ""),
                "link": item.get("link", ""),
                "snippet": item.get("snippet", "")
            })
            
        logger.info(f"Processed {len(search_results)} search results successfully")
        return search_results
    except Exception as e:
        logger.error(f"Google search error: {str(e)}")
        # Include more detailed error information
        import traceback
        logger.error(f"Google search traceback: {traceback.format_exc()}")
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

Your task is to find high-quality images that showcase destinations.

For each search query:
1. Use the google_image_search function to find relevant and high-quality images
2. Output ONLY the direct image URLs, one per line
3. Do not include any descriptions, markdown formatting, or explanations
4. Do not wrap URLs in markdown links
5. Do not add source attributions
6. Output exactly 5 image URLs if possible (or fewer if not enough are available)

Example output format:
https://example.com/image1.jpg
https://example.com/image2.jpg
https://example.com/image3.jpg

No additional text, formatting, or explanations should be included.
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

⚠️ ABSOLUTE CRITICAL REQUIREMENTS FOR YOUR RESPONSE ⚠️
- You MUST include ALL input data VERBATIM in your response - nothing should be omitted
- When provided with "TRAVELER INSIGHTS AND REVIEWS", you MUST include a dedicated section with ALL of this information
- You MUST preserve ALL section titles from the TRAVELER INSIGHTS exactly as provided, including "GOOGLE SEARCH RESULTS" and "Useful Resource Links"
- You MUST include ALL resource links provided in the "Useful Resource Links" section without any modifications
- You MUST preserve ALL search results verbatim, including titles and snippets
- When provided with "IMAGE REFERENCES (URLs)", you MUST include EVERY image URL in your response
- DO NOT SUMMARIZE OR PARAPHRASE any insights, reviews or resource links - include them EXACTLY as provided

Your complete response format MUST include:
1. An overview/introduction section
2. A day-by-day itinerary with clear morning, afternoon, and evening activities
3. A dedicated "TRAVELER INSIGHTS" section that contains ALL the content provided in the input
4. A dedicated "USEFUL RESOURCE LINKS" section with ALL links from the input, exactly as provided
5. ALL image URLs provided, placed at relevant points in your itinerary

NO INFORMATION SHOULD BE LOST OR MODIFIED IN YOUR RESPONSE. Your task is to organize and present the information, not to filter or summarize it.

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
        
        # For search agents, directly use the API without LLM processing
        if agent_type == "images":
            logger.info(f"Using direct image search for query: {query}")
            return direct_image_search(query)
        elif agent_type == "reviews":
            logger.info(f"Using direct reviews search for query: {query}")
            return direct_reviews_search(query)
            
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
            # For regular agents including TripPlannerAgent
            logger.info(f"Initiating chat with regular agent {agent.name} for query: {query}")
            
            # Special handling for TripPlannerAgent to preserve all data
            if agent.name == "TripPlannerAgent":
                logger.info("Using enhanced extraction for TripPlannerAgent")
                try:
                    # Set higher max_consecutive_auto_reply for TripPlannerAgent to allow for complex outputs
                    temp_proxy.max_consecutive_auto_reply = 25
                    
                    # Increase the max token limit for TripPlannerAgent to handle verbose outputs
                    if "llm_config" in agent.__dict__ and "config_list" in agent.llm_config:
                        for config in agent.llm_config["config_list"]:
                            # Increase max tokens for output
                            if "api_type" not in config or config["api_type"] == "open_ai":
                                config["max_tokens"] = 4000
                    
                    # Initiate chat with explicit message to preserve all input data
                    enhanced_query = f"""
{query}

⚠️ CRITICAL INSTRUCTION FOR PROCESSING THIS REQUEST ⚠️
Your response MUST preserve ALL information provided in this prompt VERBATIM.
This is especially important for:
1. The entire "TRAVELER INSIGHTS AND REVIEWS" section - include ALL search results, insights, and links
2. The "Useful Resource Links" section, including ALL links provided
3. Any "IMAGE REFERENCES" section with URLs

DO NOT MODIFY, SUMMARIZE, OR OMIT ANY INFORMATION from these sections.
The final itinerary MUST include ALL of this information exactly as provided.
"""
                    logger.info(f"Sending enhanced query to TripPlannerAgent with specific preservation instructions")
                    chat_result = temp_proxy.initiate_chat(agent, message=enhanced_query)
                    
                    # Try more aggressively to extract all content
                    full_response = ""
                    
                    # Method 1: Extract from chat_messages
                    if hasattr(temp_proxy, "chat_messages") and agent in temp_proxy.chat_messages:
                        for msg in reversed(temp_proxy.chat_messages[agent]):
                            if msg.get("role") == "assistant" and "content" in msg and msg["content"] is not None:
                                full_response = msg["content"]
                                logger.info("Successfully extracted response from chat_messages")
                                break
                    
                    # Method 2: If not found, try to extract from agent's chat history
                    if not full_response and hasattr(agent, "chat_history") and agent.chat_history:
                        for msg in reversed(agent.chat_history):
                            if msg.get("role") == "assistant" and "content" in msg and msg["content"] is not None:
                                full_response = msg["content"]
                                logger.info("Successfully extracted response from agent's chat_history")
                                break
                    
                    # Method 3: Try last_message method
                    if not full_response:
                        try:
                            last_msg = agent.last_message(recipient=temp_proxy)
                            if last_msg and "content" in last_msg and last_msg["content"] is not None:
                                full_response = last_msg["content"]
                                logger.info("Successfully extracted response using last_message method")
                        except Exception as last_msg_error:
                            logger.error(f"Error extracting last message: {str(last_msg_error)}")
                    
                    # Process the response if found
                    if full_response:
                        # Clean up response - remove TASK_COMPLETE marker
                        clean_response = full_response.replace("TASK_COMPLETE", "").strip()
                        logger.info(f"Successfully extracted TripPlannerAgent response of length {len(clean_response)}")
                        
                        # Verify that the response includes key expected sections
                        has_insights = "TRAVELER INSIGHTS" in clean_response
                        has_resource_links = "Useful Resource Links" in clean_response or "USEFUL RESOURCE LINKS" in clean_response
                        
                        if not has_insights or not has_resource_links:
                            logger.warning(f"Response may be missing key sections - has_insights: {has_insights}, has_resource_links: {has_resource_links}")
                        
                        return clean_response
                    
                    logger.error("Failed to extract content from TripPlannerAgent after trying multiple methods")
                    return "Error: Could not extract full response from TripPlannerAgent. The response may be too large or an unexpected format."
                except Exception as e:
                    logger.error(f"Error during chat with TripPlannerAgent: {str(e)}")
                    return f"Error communicating with TripPlannerAgent: {str(e)}"
            
            # For other regular agents
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

# Replace the ImageSearchAgent implementation with direct API handling
def direct_image_search(query: str) -> str:
    """
    Performs image search and returns the results directly without LLM processing.
    
    Args:
        query: The search query
        
    Returns:
        String containing image URLs separated by newlines
    """
    try:
        results = google_image_search(query)
        if not results:
            logger.warning(f"No image search results found for query: {query}")
            return """https://images.unsplash.com/photo-1523906834658-6e24ef2386f9
https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b
https://images.unsplash.com/photo-1511739001486-6bfe10ce785f
https://images.unsplash.com/photo-1520939817895-060bdaf4bc05
https://images.unsplash.com/photo-1532498551838-b7a1cfac622e"""
            
        # Extract URLs directly from results
        image_urls = [item.get("link", "") for item in results if item.get("link")]
        
        # Deduplicate URLs using more sophisticated approach
        unique_images = []
        seen_patterns = set()  # Track URL patterns we've seen
        
        for url in image_urls:
            # Skip empty URLs
            if not url:
                continue
                
            # Extract filename and base parts for checking similarity
            filename = url.split('/')[-1].lower()
            base_url = '/'.join(url.split('/')[:-1])
            
            # Create a similarity pattern by combining parts of the URL and filename
            # This helps catch different sizes/versions of the same image
            url_parts = url.split('/')
            domain = url_parts[2] if len(url_parts) > 2 else ""
            
            # Extract parts of the filename to create a pattern
            # This handles cases where the same image has different size suffixes or parameters
            filename_base = filename.split('.')[0]
            # Remove common size indicators like dimensions (e.g., 500x300)
            filename_base = re.sub(r'-\d+x\d+', '', filename_base)
            filename_base = re.sub(r'_\d+x\d+', '', filename_base)
            # Remove common parameters 
            filename_base = re.sub(r'-\d+$', '', filename_base)
            
            # Create a similarity key
            similarity_key = f"{domain}:{filename_base}"
            
            # If we haven't seen this pattern before, add it
            if similarity_key not in seen_patterns:
                seen_patterns.add(similarity_key)
                unique_images.append(url)
                
            # Make sure we get at least 5 images if available
            if len(unique_images) >= 5:
                break
        
        # If we have fewer than 5 valid URLs, add fallbacks to reach 5
        if len(unique_images) < 5:
            fallback_urls = [
                "https://images.unsplash.com/photo-1523906834658-6e24ef2386f9",
                "https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b",
                "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f",
                "https://images.unsplash.com/photo-1520939817895-060bdaf4bc05",
                "https://images.unsplash.com/photo-1532498551838-b7a1cfac622e"
            ]
            unique_images.extend(fallback_urls[:(5-len(unique_images))])
        
        # Return up to 5 unique image URLs as a newline-separated string
        return "\n".join(unique_images[:5])
    except Exception as e:
        logger.error(f"Error in direct_image_search: {str(e)}")
        return """https://images.unsplash.com/photo-1523906834658-6e24ef2386f9
https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b
https://images.unsplash.com/photo-1511739001486-6bfe10ce785f
https://images.unsplash.com/photo-1520939817895-060bdaf4bc05
https://images.unsplash.com/photo-1532498551838-b7a1cfac622e"""

# Direct reviews search function - similar to direct_image_search
def direct_reviews_search(query: str) -> str:
    """
    Performs Google search and formats results directly without LLM processing.
    
    Args:
        query: The search query
        
    Returns:
        Formatted string with search results
    """
    try:
        logger.info(f"direct_reviews_search started for query: {query}")
        results = google_search(query, num_results=5)
        logger.info(f"Google search completed. Number of results: {len(results) if results else 0}")
        
        if not results:
            logger.warning(f"No Google search results found for query: {query}")
            return f"""# TRAVELER INSIGHTS AND REVIEWS 

## No Search Results Found - Using Default Information

### Local Experiences
- Travelers consistently mention the welcoming atmosphere and rich cultural experiences.
- Many visitors recommend spending at least a few days to fully appreciate the destination.
- The local cuisine receives overwhelmingly positive reviews.

### Hidden Gems
- Exploring beyond the main tourist areas reveals authentic local experiences.
- Small cafes and local shops are frequently mentioned as highlights.
- Early morning visits to popular attractions help avoid crowds.

### Tips from Recent Visitors
- Consider purchasing city passes for public transportation and attractions.
- Learn a few basic phrases in the local language for a more authentic experience.
- Weather can be unpredictable, so pack layers and be prepared for changes.

## Useful Resource Links
- [Tripadvisor Travel Guide](https://www.tripadvisor.com)
- [Lonely Planet](https://www.lonelyplanet.com)
- [Wikitravel](https://wikitravel.org)"""
            
        # Format the search results in a structured way
        destination = query.replace('What do people say about visiting ', '').replace('?', '')
        formatted_results = f"""# TRAVELER INSIGHTS AND REVIEWS

## GOOGLE SEARCH RESULTS FOR {destination.upper()}

"""
        
        # Store source links for the Useful Resources section
        resource_links = []
        
        # Process each search result and extract key insights
        for i, result in enumerate(results):
            title = result.get("title", "").replace(" - ", ": ")
            # Clean up the title
            title = re.sub(r'\s+\|\s+.*$', '', title)  # Remove "| Site Name" at the end
            title = re.sub(r'\s+•\s+.*$', '', title)   # Remove "• Site Name" at the end
            
            snippet = result.get("snippet", "")
            link = result.get("link", "")
            
            # Log the result for debugging
            logger.info(f"Processing result {i+1}: Title: {title[:30]}..., Link: {link[:30]}...")
            
            # Add to resource links if it's a valid URL
            if link and link.startswith("http"):
                source_name = "Unknown Source"
                # Try to extract domain name for the source
                try:
                    from urllib.parse import urlparse
                    parsed_url = urlparse(link)
                    domain = parsed_url.netloc
                    # Remove www. if present
                    if domain.startswith('www.'):
                        domain = domain[4:]
                    # Get the main part of the domain (before the first dot)
                    source_name = domain.split('.')[0].capitalize()
                    # Special case for well-known travel sites
                    if 'tripadvisor' in domain:
                        source_name = 'Tripadvisor'
                    elif 'lonelyplanet' in domain:
                        source_name = 'Lonely Planet'
                    elif 'wikitravel' in domain:
                        source_name = 'Wikitravel'
                    elif 'booking' in domain:
                        source_name = 'Booking.com'
                    elif 'expedia' in domain:
                        source_name = 'Expedia'
                except:
                    pass
                
                resource_links.append({
                    "title": title if title else f"{destination} Guide on {source_name}",
                    "url": link,
                    "source": source_name
                })
            
            # Format each insight with a clear prefix and make it stand out
            formatted_results += f"### {i+1}. {title}\n"
            formatted_results += f"{snippet}\n\n"
        
        # Add thematic sections based on common travel topics
        formatted_results += """## KEY TRAVELER INSIGHTS

### Best Time to Visit
- Many travelers recommend visiting during shoulder seasons (spring and fall) for fewer crowds and pleasant weather
- If you enjoy cultural festivals, research local event calendars to time your visit accordingly
- Early morning visits to popular attractions are suggested to avoid crowds

### Local Experiences Worth Having
- Interacting with locals is frequently mentioned as a highlight of visits
- Many recommend exploring neighborhoods beyond the main tourist areas
- Food tours and cooking classes are often cited as memorable experiences

### Travel Tips from Recent Visitors
- Consider purchasing city passes for public transportation and attractions
- Learn a few basic phrases in the local language for a more authentic experience
- Many visitors suggest keeping a flexible schedule to allow for unexpected discoveries
"""
        
        # Add resource links section
        if resource_links:
            formatted_results += "\n## Useful Resource Links\n"
            for link in resource_links:
                formatted_results += f"- [{link['title']}]({link['url']}) - {link['source']}\n"
                
        logger.info(f"direct_reviews_search completed. Output length: {len(formatted_results)} characters")
        logger.info(f"Output preview: {formatted_results[:200]}...")
        
        return formatted_results
    except Exception as e:
        logger.error(f"Error in direct_reviews_search: {str(e)}")
        destination = query.replace('What do people say about visiting ', '').replace('?', '')
        return f"""# TRAVELER INSIGHTS AND REVIEWS

## ERROR - Using Default Information

### Local Experiences
- Travelers consistently mention the welcoming atmosphere and rich cultural experiences.
- Many visitors recommend spending at least a few days to fully appreciate the destination.
- The local cuisine receives overwhelmingly positive reviews.

### Hidden Gems
- Exploring beyond the main tourist areas reveals authentic local experiences.
- Small cafes and local shops are frequently mentioned as highlights.
- Early morning visits to popular attractions help avoid crowds.

### Tips from Recent Visitors
- Consider purchasing city passes for public transportation and attractions.
- Learn a few basic phrases in the local language for a more authentic experience.
- Weather can be unpredictable, so pack layers and be prepared for changes.

## Useful Resource Links
- [Tripadvisor Travel Guide](https://www.tripadvisor.com/Tourism-g{destination.replace(' ', '_')})
- [Lonely Planet](https://www.lonelyplanet.com/search?q={destination})
- [Wikitravel](https://wikitravel.org/en/{destination.replace(' ', '_')})""" 