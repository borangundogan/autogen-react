import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  VStack,
  Heading,
  Text,
  Progress,
  Flex,
  useColorModeValue,
  Icon,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Stack,
  Divider,
  Button,
  Tooltip
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { travelApi } from '../services/api';
import { FaPlane, FaHotel, FaUtensils, FaMapMarkedAlt, FaImage, FaInfoCircle, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';

// Wrap Chakra components with motion
const MotionBox = motion(Box);
const MotionIcon = motion(Icon);
const MotionFlex = motion(Flex);

function LoadingPageRealTime() {
  const navigate = useNavigate();
  const location = useLocation();
  const [overallProgress, setOverallProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Planning your perfect trip...');
  const { formData } = location.state || {};
  const [itineraryId, setItineraryId] = useState(null);
  const [error, setError] = useState(null);
  
  // Polling state
  const pollingRef = useRef(null);
  const [pollCount, setPollCount] = useState(0);
  
  // Individual agent statuses
  const [agents, setAgents] = useState([
    { 
      id: 'attractions', 
      name: 'Attractions Agent', 
      icon: FaMapMarkedAlt, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'blue.500',
      logs: [],
      error: null
    },
    { 
      id: 'accommodation', 
      name: 'Accommodation Agent', 
      icon: FaHotel, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'purple.500',
      logs: [],
      error: null
    },
    { 
      id: 'dining', 
      name: 'Dining Agent', 
      icon: FaUtensils, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'green.500',
      logs: [],
      error: null
    },
    { 
      id: 'transport', 
      name: 'Transport Agent', 
      icon: FaPlane, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'orange.500',
      logs: [],
      error: null
    },
    { 
      id: 'images', 
      name: 'Images Agent', 
      icon: FaImage, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'pink.500',
      logs: [],
      error: null
    },
    { 
      id: 'insights', 
      name: 'Insights Agent', 
      icon: FaInfoCircle, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'teal.500',
      logs: [],
      error: null
    },
  ]);
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Start the process when the component loads
  useEffect(() => {
    if (!formData) return;
    
    // Submit preferences to backend and start the agents
    startItineraryGeneration();
    
    // Clean up when component unmounts
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [formData]);

  // Submit form data and start the generation process
  const startItineraryGeneration = async () => {
    try {
      setStatusMessage(`Starting agents for your ${formData.destination} trip...`);
      
      // Submit preferences to the backend
      const response = await travelApi.submitPreferences(formData);
      console.log('API Response:', response);
      
      if (response.data && response.data.id) {
        setItineraryId(response.data.id);
        
        // Start polling for agent status
        startPolling(response.data.id);
      } else {
        throw new Error('No itinerary ID returned from API');
      }
    } catch (error) {
      console.error('Error starting itinerary generation:', error);
      setError('Failed to start trip planning. Please try again.');
    }
  };

  // Set up polling to check agent status
  const startPolling = (id) => {
    // Check immediately first
    checkAgentStatus(id);
    
    // Then set up interval for regular checks
    pollingRef.current = setInterval(() => {
      checkAgentStatus(id);
      setPollCount(prev => prev + 1);
    }, 2000); // Poll every 2 seconds
  };

  // Check status of all agents
  const checkAgentStatus = async (id) => {
    try {
      const response = await travelApi.getItineraryStatus(id);
      
      if (response.data) {
        updateAgentsFromResponse(response.data);
        
        // Check if all done
        if (response.data.completed) {
          clearInterval(pollingRef.current);
          navigateToItinerary(id);
        }
      }
    } catch (error) {
      console.error('Error checking agent status:', error);
      
      // If we've polled more than 100 times (about 3 minutes) with errors, navigate anyway
      if (pollCount > 90) {
        clearInterval(pollingRef.current);
        navigateToItinerary(id);
      }
    }
  };

  // Process the response from the status API
  const updateAgentsFromResponse = (data) => {
    // Check overall status
    setOverallProgress(data.overall_progress || 0);
    
    if (data.status_message) {
      setStatusMessage(data.status_message);
    }
    
    // Update individual agents
    const newAgents = [...agents];
    
    // Map API agent data to our agent objects
    if (data.agents) {
      Object.entries(data.agents).forEach(([agentId, agentData]) => {
        const agentIndex = newAgents.findIndex(a => a.id === agentId);
        
        if (agentIndex !== -1) {
          const currentLogs = newAgents[agentIndex].logs;
          
          // Extract new logs (ones we don't already have)
          const existingLogTexts = new Set(currentLogs.map(log => log.text));
          const newLogs = (agentData.logs || [])
            .filter(log => !existingLogTexts.has(log.text))
            .map(log => ({
              timestamp: log.timestamp || new Date().toISOString(),
              text: log.text
            }));
          
          // Update agent with latest data
          newAgents[agentIndex] = {
            ...newAgents[agentIndex],
            status: agentData.status || newAgents[agentIndex].status,
            progress: agentData.progress || newAgents[agentIndex].progress,
            isActive: agentData.is_active || false,
            logs: [...currentLogs, ...newLogs],
            error: agentData.error || null
          };
        }
      });
    }
    
    setAgents(newAgents);
  };

  // Navigate to the generated itinerary
  const navigateToItinerary = (id) => {
    // Small delay to ensure all UI updates are complete
    setTimeout(() => {
      navigate(`/itinerary/${id}`);
    }, 1000);
  };

  // Force navigation for slow or stuck processes
  const handleForceNavigate = () => {
    if (itineraryId) {
      clearInterval(pollingRef.current);
      navigateToItinerary(itineraryId);
    } else {
      // If we don't have an ID yet, create a temp one
      navigateToItinerary(`temp-${Date.now()}`);
    }
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    } catch (e) {
      return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', second:'2-digit'});
    }
  };

  return (
    <Box bg={bgColor} minH="90vh" py={6}>
      <Container maxW="container.lg">
        <VStack spacing={6} align="center" justify="center">
          <MotionBox 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            textAlign="center" 
            mb={4}
          >
            <Heading mb={2} size="xl">Creating Your Dream Vacation</Heading>
            <Text fontSize="xl" color="gray.600">{statusMessage}</Text>
            
            {error && (
              <Text color="red.500" mt={2}>
                <Icon as={FaExclamationTriangle} mr={2} />
                {error}
              </Text>
            )}
          </MotionBox>
          
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            width="100%"
            maxW="700px"
          >
            <Card bg={cardBg} mb={4} boxShadow="md" borderRadius="lg">
              <CardHeader pb={2}>
                <Flex justify="space-between" align="center">
                  <Heading size="md">Overall Progress</Heading>
                  <Text fontWeight="bold">{Math.round(overallProgress)}%</Text>
                </Flex>
              </CardHeader>
              <CardBody pt={0}>
                <Progress 
                  value={overallProgress} 
                  size="md" 
                  colorScheme="blue" 
                  borderRadius="md"
                  mb={2}
                  isAnimated
                />
                
                <Flex justify="space-between" align="center">
                  <Text color="gray.600" fontSize="sm">
                    {formData?.destination && `Creating your perfect trip to ${formData.destination}`}
                  </Text>
                  
                  {pollCount > 45 && (
                    <Tooltip label="If it's taking too long, you can skip to the results">
                      <Button 
                        size="xs" 
                        colorScheme="blue" 
                        variant="outline"
                        rightIcon={<FaCheckCircle />}
                        onClick={handleForceNavigate}
                      >
                        View Results Now
                      </Button>
                    </Tooltip>
                  )}
                </Flex>
              </CardBody>
            </Card>
            
            <Stack spacing={4} width="100%">
              {agents.map((agent, index) => (
                <MotionFlex
                  key={agent.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1, duration: 0.5 }}
                  direction="column"
                  bg={cardBg}
                  borderRadius="lg"
                  overflow="hidden"
                  boxShadow="md"
                  opacity={agent.progress > 0 || agent.isActive ? 1 : 0.6}
                >
                  <Box p={4}>
                    <Flex justify="space-between" align="center" mb={2}>
                      <Flex align="center">
                        <MotionIcon
                          as={agent.icon}
                          boxSize={6}
                          mr={3}
                          color={agent.error ? "red.500" : agent.color}
                          animate={agent.isActive ? {
                            scale: [1, 1.2, 1],
                            transition: { duration: 1.5, repeat: Infinity }
                          } : {}}
                        />
                        <Box>
                          <Text fontWeight="bold">{agent.name}</Text>
                          {agent.error && (
                            <Text fontSize="xs" color="red.500">{agent.error}</Text>
                          )}
                        </Box>
                      </Flex>
                      
                      <Badge 
                        colorScheme={
                          agent.error ? "red" :
                          agent.progress >= 100 ? "green" : 
                          agent.isActive ? "blue" : "gray"
                        }
                      >
                        {agent.error ? "Error" :
                         agent.progress >= 100 ? "Complete" : 
                         agent.isActive ? "Active" : "Waiting"}
                      </Badge>
                    </Flex>
                    
                    <Text fontSize="sm" color="gray.600" mb={3}>{agent.status}</Text>
                    
                    <Progress 
                      value={agent.progress} 
                      size="sm" 
                      colorScheme={
                        agent.error ? "red" :
                        agent.progress >= 100 ? "green" : "blue"
                      } 
                      borderRadius="full"
                      isAnimated
                    />
                  </Box>
                  
                  {agent.logs.length > 0 && (
                    <>
                      <Divider />
                      <Box bg={useColorModeValue('gray.50', 'gray.700')} p={3} maxH="120px" overflowY="auto">
                        <VStack align="stretch" spacing={1}>
                          {agent.logs.map((log, i) => (
                            <MotionBox
                              key={i}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                              fontSize="xs"
                              color="gray.600"
                            >
                              <Text as="span" fontWeight="bold" mr={1}>
                                {formatTimestamp(log.timestamp)}:
                              </Text>
                              {log.text}
                            </MotionBox>
                          ))}
                        </VStack>
                      </Box>
                    </>
                  )}
                </MotionFlex>
              ))}
            </Stack>
          </MotionBox>

          {formData?.destination && (
            <MotionBox
              textAlign="center"
              mt={4}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              <Text fontSize="sm" color="gray.500">
                Creating a {getTripLengthText(formData.trip_length)} experience in {formData.destination}
              </Text>
              <Text fontSize="xs" color="gray.400" mt={1}>
                Our agents are gathering real-time information to craft your perfect itinerary
              </Text>
            </MotionBox>
          )}
        </VStack>
      </Container>
    </Box>
  );
}

// Helper function to convert trip length number to readable text
function getTripLengthText(tripLength) {
  if (!tripLength) return "";
  
  if (tripLength <= 3) return "weekend getaway";
  if (tripLength <= 6) return "short trip";
  if (tripLength <= 10) return "week-long vacation";
  return "extended journey";
}

export default LoadingPageRealTime; 