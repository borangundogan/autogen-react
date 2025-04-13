import requests
import json
import time
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_review_agent_api():
    """Test the review agent API endpoint directly."""
    print("Testing review agent API endpoint...")
    
    # API endpoint
    url = "http://localhost:8000/api/agents/query"
    
    # Request payload
    payload = {
        "agent_type": "reviews",
        "query": "Find reviews and traveler opinions about Athens, Greece"
    }
    
    # Make the request
    try:
        response = requests.post(url, json=payload)
        
        # Print the response
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # If the response is not successful, return
        if response.status_code != 200:
            print("Request failed!")
            return
        
        # Parse the response JSON
        response_json = response.json()
        print(f"\nFormatted response: {json.dumps(response_json, indent=2)}")
        
    except Exception as e:
        print(f"Error making request: {str(e)}")

def test_direct_interaction_with_review_agent():
    """
    Test direct interaction with the review agent using the agent service.
    This bypasses the API and directly calls the agent service.
    """
    print("\nTesting direct interaction with the review agent...")
    
    # Import agent service
    from agents.core.specialized_agents import AgentService
    
    # Create an instance of the agent service
    agent_service = AgentService()
    
    # Test the review agent
    response = agent_service.get_agent_response("reviews", "Find reviews and traveler opinions about Athens, Greece")
    
    # Print the response
    print(f"Response from agent service: {response}")

def test_review_agent_with_modified_agent_service():
    """
    Create a modified version of the agent service that forces the use of a different approach
    for handling the review agent.
    """
    print("\nTesting review agent with modified agent service...")
    
    import autogen
    from agents.core.specialized_agents import AgentFactory, google_search
    
    # Create a review agent
    factory = AgentFactory()
    review_agent = factory.create_review_agent()
    
    # Create a user proxy
    user_proxy = autogen.UserProxyAgent(
        name="TempProxy",
        human_input_mode="NEVER",
        max_consecutive_auto_reply=10,
        is_termination_msg=lambda x: isinstance(x, dict) and x.get("content") and "TASK_COMPLETE" in x["content"],
        code_execution_config=False,
    )
    
    # Register the google_search function
    user_proxy.register_function({"google_search": google_search})
    
    print("Initiating chat with review agent...")
    
    # Initiate a chat
    chat_result = user_proxy.initiate_chat(
        review_agent,
        message="Find reviews and traveler opinions about Athens, Greece"
    )
    
    # Print the result
    if chat_result:
        print(f"Chat result type: {type(chat_result)}")
        print(f"Chat result length: {len(chat_result)}")
        
        # Print all messages in the chat for debugging
        print("\nAll messages in chat:")
        for i, msg in enumerate(chat_result):
            print(f"\nMessage {i}:")
            print(f"  Type: {type(msg)}")
            if isinstance(msg, dict):
                for key, value in msg.items():
                    if key == "content" and value:
                        print(f"  {key}: {value[:100]}..." if len(value) > 100 else f"  {key}: {value}")
                    else:
                        print(f"  {key}: {value}")
        
        # Extract the content from the last message
        last_message = None
        for msg in reversed(chat_result):
            if msg.get("role") == "assistant" and msg.get("content"):
                last_message = msg["content"]
                break
                
        if last_message:
            print(f"\nLast message from agent: {last_message[:200]}..." if len(last_message) > 200 else f"\nLast message from agent: {last_message}")
        else:
            print("\nNo content found in last message")
    else:
        print("No chat result")
    
if __name__ == "__main__":
    # Test the API
    test_review_agent_api()
    
    # Test direct interaction
    test_direct_interaction_with_review_agent()
    
    # Test with modified agent service
    test_review_agent_with_modified_agent_service() 