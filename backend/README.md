# Travel Planning Agent Backend

This is the backend for the Travel Planning Agent system, providing AI-powered travel recommendations through an API.

## Features

- AI-powered travel planning through specialized agents
- Expert recommendations for attractions, food, and accommodations
- Integration with search functionality for up-to-date information
- Comprehensive itinerary generation
- Review and insights synthesis 
- Image search capabilities

## Architecture

The system is built using:

- FastAPI for the API layer
- AutoGen for the agent framework
- OpenAI API for language model capabilities
- Google Custom Search API for web and image search

## Setup and Installation

### Prerequisites

- Python 3.8+
- OpenAI API key
- Google Custom Search API key and Search Engine ID (optional, for search-enabled agents)

### Environment Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   OPENAI_API_KEY=your_openai_api_key
   GOOGLE_API_KEY=your_google_api_key
   GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id
   BACKEND_PORT=8000
   BACKEND_HOST=0.0.0.0
   DEBUG=True
   ```

## Running the Application

Start the FastAPI server:

```bash
python main.py
```

Or using uvicorn directly:

```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

## API Endpoints

### Health Check
```
GET /api/health
```

### Travel Planning
```
POST /api/agents/travel-plan
Content-Type: application/json

{
  "destination": "Paris",
  "trip_length": 3,
  "budget": "moderate",
  "interests": ["art", "food", "history"],
  "get_insights": true,
  "get_images": true
}
```

### Agent Query
```
POST /api/agents/query
Content-Type: application/json

{
  "agent_type": "attractions",
  "query": "What are the best attractions in Tokyo?"
}
```

Valid agent types:
- `attractions`: Sightseeing and entertainment recommendations
- `food`: Restaurant and culinary experiences
- `accommodation`: Hotel and lodging options
- `reviews`: Traveler opinions and insights (uses Google search)
- `images`: Destination images (uses Google image search)
- `planner`: Creating itineraries

## Testing

Run the basic tests:

```bash
pytest tests/test_agents.py -v
```

For quick tests (skipping API calls):

```bash
SKIP_SLOW_TESTS=true pytest tests/test_agents.py -v
```

## Project Structure

- `agents/` - Agent system implementation
  - `core/` - Core agent components
    - `coordinator.py` - Central coordinator for agent interactions
    - `specialized_agents.py` - Specialized agent implementations
  - `support/` - Support modules for agents
  - `content/` - Content generation modules
- `routers/` - API endpoint routers
  - `agents.py` - Agent-related endpoints
- `tests/` - Test files
- `main.py` - Application entry point 