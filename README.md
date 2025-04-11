# Travel Planning Agent System

An AI-powered travel planning system built with the Autogen framework that creates personalized travel itineraries based on user preferences.

## Overview

This project implements a multi-agent travel planning system that helps users create detailed, personalized travel itineraries. By leveraging specialized AI agents and the Google Web Search API, the system generates comprehensive travel plans that include accommodations, dining options, activities, transportation, and additional travel tips.

## Technology Stack

- **Frontend**: React.js for building a responsive and interactive user interface
- **Backend**: Python FastAPI for efficient and type-safe API endpoints
- **Agent Framework**: Autogen for implementing the multi-agent system
- **APIs**: Google Web Search API for retrieving up-to-date travel information

## Features

- **Multi-Agent Architecture**: Utilizes specialized agents for different aspects of travel planning
- **Personalized Recommendations**: Creates itineraries based on user preferences, budget, and interests
- **Real-Time Information**: Retrieves up-to-date information about destinations using Google Web Search API
- **Comprehensive Planning**: Provides detailed day-by-day itineraries with activities, dining, and transportation
- **User-Friendly Interface**: Simple questionnaire process to collect user preferences

## System Architecture

### Core Agents
- **Coordinator Agent**: Central hub that orchestrates communication between all agents
- **Profile Analysis Agent**: Processes user questionnaire responses to create preference profiles
- **Itinerary Planning Agent**: Builds overall trip structure and timeline

### Content Agents
- **Accommodation Agent**: Recommends lodging options matching budget and preferences
- **Dining Agent**: Suggests restaurants, cafes, and food experiences
- **Transportation Agent**: Provides transit recommendations between locations
- **Activities Agent**: Identifies sightseeing attractions and daytime activities
- **Entertainment Agent**: Focuses on evening/nightlife options
- **Cultural Agent**: Specializes in local customs, etiquette, and authentic experiences

### Support Agents
- **Budget Management Agent**: Tracks costs and optimizes spending across categories
- **Image Agent**: Sources relevant destination imagery for the interface
- **Real-time Data Agent**: Gathers current information including weather, events, and advisories
- **Local Expert Agent**: Provides insider tips and hidden gems

## Getting Started

### Prerequisites
- Python 3.8+
- Anaconda or Miniconda
- Node.js and npm
- Google Web Search API key

### Environment Setup

1. Clone the repository
```bash
git clone <repository-url>
cd second_project
```

2. Create and activate the conda environment
```bash
conda create -n appliedai python=3.10
conda activate appliedai
```

3. Install backend dependencies
```bash
pip install -r requirements.txt
```

4. Install frontend dependencies
```bash
cd frontend
npm install
```

5. Set up API keys
```bash
cp .env.example .env
# Edit .env file to add your API keys
```

### Usage

1. Start the backend server
```bash
# In the project root, with appliedai environment activated
cd backend
uvicorn main:app --reload
```

2. Start the frontend development server
```bash
# In another terminal
cd frontend
npm start
```

3. Follow the onboarding questionnaire to provide your travel preferences:
   - Destination
   - Trip duration
   - Budget
   - Activity interests
   - Additional information needs

4. Review your personalized travel itinerary with:
   - Day-by-day schedule
   - Accommodation recommendations
   - Dining options
   - Transportation tips
   - Additional information

## Project Structure

```
travel-planning-agent/
├── frontend/              # React frontend application
│   ├── public/            # Static files
│   ├── src/               # React source files
│   │   ├── components/    # UI components
│   │   ├── pages/         # Page components
│   │   └── services/      # API services
│   └── package.json       # Frontend dependencies
├── backend/               # FastAPI backend application
│   ├── agents/            # Agent implementations
│   │   ├── coordinator.py # Main orchestration agent
│   │   ├── content/       # Content generation agents
│   │   └── support/       # Enhancement agents
│   ├── routers/           # API route definitions 
│   ├── services/          # Business logic services
│   ├── main.py            # FastAPI application
│   └── config.py          # Configuration management
├── config/                # Configuration files
├── data/                  # Data storage and templates
├── .env                   # Environment variables (API keys)
├── requirements.txt       # Python dependencies
└── README.md              # Project documentation
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 