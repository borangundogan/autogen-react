import os
from dotenv import load_dotenv
from agents.core.specialized_agents import AgentFactory, google_search, print_agent_chat_history

# Load environment variables
load_dotenv()

def test_review_agent():
    """Test the review agent directly."""
    print("Creating review agent...")
    factory = AgentFactory()
    review_agent = factory.create_review_agent()
    
    print("Testing Google search function...")
    search_results = google_search("Athens tourist reviews", 3)
    print(f"Search results: {search_results}")
    
    print("\nTesting review agent...")
    
    # Create a simple user proxy for testing
    import autogen
    user_proxy = autogen.UserProxyAgent(
        name="TestUser",
        human_input_mode="NEVER",
        max_consecutive_auto_reply=10,
        is_termination_msg=lambda x: isinstance(x, dict) and x.get("content") and "TASK_COMPLETE" in x["content"],
        code_execution_config=False,
    )
    
    # Register the google_search function
    user_proxy.register_function({"google_search": google_search})
    
    print("Initiating chat with review agent...")
    
    try:
        chat_result = user_proxy.initiate_chat(
            review_agent,
            message="What do travelers say about visiting Athens, Greece? Find reviews and traveler opinions."
        )
        
        # Print chat history
        if chat_result:
            print("\nChat completed successfully!")
            print_agent_chat_history(review_agent)
        else:
            print("\nNo chat history returned.")
    except Exception as e:
        print(f"Error during chat: {str(e)}")
    
if __name__ == "__main__":
    test_review_agent() 