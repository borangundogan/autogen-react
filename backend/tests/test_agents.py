import sys
import os
import pytest
from fastapi.testclient import TestClient
import json

# Add the parent directory to the path so we can import the main module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app
from agents.core.specialized_agents import AgentService, is_termination_msg

# Create test client
client = TestClient(app)

def test_health_check():
    """Test that the API health check endpoint is working."""
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_agent_service_initialization():
    """Test that the AgentService initializes correctly."""
    service = AgentService()
    assert service.agents is not None
    assert "attractions" in service.agents
    assert "food" in service.agents
    assert "accommodation" in service.agents
    assert "reviews" in service.agents
    assert "images" in service.agents
    assert "planner" in service.agents

def test_termination_message_detection():
    """Test that termination message detection works."""
    # Should detect termination
    assert is_termination_msg({"content": "Some content with TASK_COMPLETE at the end."})
    # Should not detect termination
    assert not is_termination_msg({"content": "Some content without the marker."})
    assert not is_termination_msg({})
    assert not is_termination_msg(None)

def test_query_agent_invalid_type():
    """Test that invalid agent types are rejected."""
    response = client.post(
        "/api/agents/query",
        json={"agent_type": "invalid_type", "query": "Test query"}
    )
    assert response.status_code == 400
    assert "Invalid agent type" in response.json()["detail"]

# Skip this test in CI environments or when running quick tests
@pytest.mark.skipif(os.environ.get("CI") == "true" or os.environ.get("SKIP_SLOW_TESTS") == "true",
                   reason="Skipping slow test in CI environment")
def test_basic_agent_query():
    """Test a basic agent query to the attractions agent."""
    # This is a more intensive test that actually calls the OpenAI API
    response = client.post(
        "/api/agents/query",
        json={"agent_type": "attractions", "query": "What are some attractions in Paris?"}
    )
    assert response.status_code == 200
    result = response.json()
    assert "response" in result
    assert len(result["response"]) > 100  # Should have a substantial response

# Skip this test in CI environments or when running quick tests
@pytest.mark.skipif(os.environ.get("CI") == "true" or os.environ.get("SKIP_SLOW_TESTS") == "true",
                   reason="Skipping slow test in CI environment")
def test_travel_plan_creation():
    """Test creating a basic travel plan."""
    # This is a more intensive test that actually calls the OpenAI API multiple times
    test_preferences = {
        "destination": "Tokyo",
        "trip_length": 3,
        "budget": "moderate",
        "interests": ["food", "culture"],
        "get_insights": False,
        "get_images": False
    }
    response = client.post(
        "/api/agents/travel-plan",
        json=test_preferences
    )
    assert response.status_code == 200
    result = response.json()
    assert result["destination"] == "Tokyo"
    assert result["trip_length"] == 3
    assert len(result["itinerary"]) > 100
    assert len(result["attractions"]) > 100
    assert len(result["food"]) > 100
    assert len(result["accommodation"]) > 100

if __name__ == "__main__":
    # Run the tests manually
    test_health_check()
    test_agent_service_initialization()
    test_termination_message_detection()
    test_query_agent_invalid_type()
    
    # Uncomment to run the slow tests manually
    # test_basic_agent_query()
    # test_travel_plan_creation()
    
    print("All tests passed!") 