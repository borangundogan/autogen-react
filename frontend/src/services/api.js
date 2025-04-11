import axios from 'axios';

// Create axios instance with base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// API endpoints for travel planning
export const travelApi = {
  // Submit travel preferences to create a plan
  submitPreferences: (preferences) => api.post('/agents/travel-plan', preferences),
  
  // Get a travel plan by ID
  getTravelPlan: (id) => api.get(`/agents/travel-plan/${id}`),
  
  // Query a specific agent
  queryAgent: (agentType, query) => api.post('/agents/query', { agent_type: agentType, query }),
  
  // Get all travel plans for a user (if auth is implemented)
  getUserPlans: () => api.get('/travel-plans/user'),
};

// Authentication endpoints (if implemented)
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  refreshToken: () => api.post('/auth/refresh'),
  logout: () => api.post('/auth/logout'),
};

// Default export
export default api; 