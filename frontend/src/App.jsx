import { Box } from '@chakra-ui/react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
import HomePage from './pages/HomePage';
import QuestionnairePage from './pages/QuestionnairePage';
import LoadingPage from './pages/LoadingPage';
import LoadingPageRealTime from './pages/LoadingPageRealTime';
import ItineraryPage from './pages/ItineraryPage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import Navbar from './components/Navbar';
import Footer from './components/Footer';

function App() {
  return (
    <Router>
      <Box minH="100vh" display="flex" flexDirection="column">
        <Navbar />
        <Box flex="1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/questionnaire" element={<QuestionnairePage />} />
            <Route path="/loading" element={<LoadingPage />} />
            <Route path="/loading-realtime" element={<LoadingPageRealTime />} />
            <Route path="/itinerary/:id" element={<ItineraryPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Box>
        <Footer />
      </Box>
    </Router>
  );
}

export default App; 