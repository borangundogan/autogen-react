import { useState, useEffect } from 'react';
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
  HStack,
  Badge,
  Card,
  CardBody,
  CardHeader,
  Stack,
  Divider
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { travelApi } from '../services/api';
import { FaPlane, FaHotel, FaUtensils, FaMapMarkedAlt, FaSuitcase, FaImage, FaInfoCircle, FaGlobe } from 'react-icons/fa';

// Wrap Chakra components with motion
const MotionBox = motion(Box);
const MotionIcon = motion(Icon);
const MotionFlex = motion(Flex);

function LoadingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [overallProgress, setOverallProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Planning your perfect trip...');
  const { formData } = location.state || {};
  
  // Individual agent statuses
  const [agents, setAgents] = useState([
    { 
      id: 'attractions', 
      name: 'Attractions Agent', 
      icon: FaMapMarkedAlt, 
      status: 'Initializing...', 
      progress: 0, 
      isActive: true,
      color: 'blue.500',
      logs: []
    },
    { 
      id: 'accommodation', 
      name: 'Accommodation Agent', 
      icon: FaHotel, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'purple.500',
      logs: []
    },
    { 
      id: 'dining', 
      name: 'Dining Agent', 
      icon: FaUtensils, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'green.500',
      logs: []
    },
    { 
      id: 'transport', 
      name: 'Transport Agent', 
      icon: FaPlane, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'orange.500',
      logs: []
    },
    { 
      id: 'images', 
      name: 'Images Agent', 
      icon: FaImage, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'pink.500',
      logs: []
    },
    { 
      id: 'insights', 
      name: 'Insights Agent', 
      icon: FaInfoCircle, 
      status: 'Waiting to start...', 
      progress: 0, 
      isActive: false,
      color: 'teal.500',
      logs: []
    },
  ]);
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');

  // Start agents and submit preferences
  useEffect(() => {
    if (!formData) return;
    
    // Start the agents immediately
    let timer = setTimeout(() => {
      startAgents();
    }, 500);

    // Submit preferences to backend
    submitPreferences();
    
    return () => {
      clearTimeout(timer);
    };
  }, [formData]);

  // Simulate agent work and progression
  const startAgents = () => {
    // Attractions agent starts first
    updateAgent('attractions', {
      status: 'Searching for top attractions in ' + formData?.destination,
      isActive: true,
      logs: [`Researching must-see places in ${formData?.destination}`]
    });

    // Accommodation agent starts after 2 seconds
    setTimeout(() => {
      updateAgent('accommodation', {
        status: 'Finding the best hotels and accommodations',
        isActive: true,
        logs: [`Analyzing ${formData?.budget} options for stays`]
      });
    }, 2000);

    // Dining agent starts after 4 seconds
    setTimeout(() => {
      updateAgent('dining', {
        status: 'Discovering local cuisine and restaurants',
        isActive: true,
        logs: ['Searching for authentic local restaurants']
      });
    }, 4000);

    // Transport agent starts after 5 seconds
    setTimeout(() => {
      updateAgent('transport', {
        status: 'Planning transportation options',
        isActive: true,
        logs: ['Analyzing best ways to get around']
      });
    }, 5000);

    // Images agent starts after 6 seconds
    setTimeout(() => {
      updateAgent('images', {
        status: 'Gathering beautiful destination images',
        isActive: true,
        logs: ['Finding high-quality photos of attractions']
      });
    }, 6000);

    // Check if insights are required
    if (formData?.get_insights) {
      setTimeout(() => {
        updateAgent('insights', {
          status: 'Gathering local insights and tips',
          isActive: true,
          logs: ['Researching local customs and special events']
        });
      }, 7000);
    }

    // Start progress updates for each agent
    simulateAgentProgress();
  };

  const submitPreferences = async () => {
    try {
      // Submit to the backend but don't navigate immediately
      const response = await travelApi.submitPreferences(formData);
      console.log('API Response:', response);
      
      // Store the itinerary ID for later navigation
      if (response.data && response.data.id) {
        localStorage.setItem('itineraryId', response.data.id);
      }
    } catch (error) {
      console.error('Error submitting preferences:', error);
      
      // Still continue with the simulation even if API call fails
      // We'll use a temporary ID later if needed
    }
  };

  // Update a specific agent's state
  const updateAgent = (agentId, updateData) => {
    setAgents(prevAgents => 
      prevAgents.map(agent => 
        agent.id === agentId 
          ? { ...agent, ...updateData } 
          : agent
      )
    );
  };

  // Simulate progress updates for all active agents
  const simulateAgentProgress = () => {
    const interval = setInterval(() => {
      setAgents(prevAgents => {
        const newAgents = prevAgents.map(agent => {
          if (!agent.isActive) return agent;
          
          // Random progress increment
          const increment = Math.random() * 5;
          const newProgress = Math.min(agent.progress + increment, 100);
          
          // Generate a new log message at certain progress points
          let newLogs = [...agent.logs];
          if (agent.progress < 20 && newProgress >= 20) {
            newLogs.push(getRandomLogMessage(agent.id, 20));
          } else if (agent.progress < 50 && newProgress >= 50) {
            newLogs.push(getRandomLogMessage(agent.id, 50));
          } else if (agent.progress < 75 && newProgress >= 75) {
            newLogs.push(getRandomLogMessage(agent.id, 75));
          } else if (agent.progress < 95 && newProgress >= 95) {
            newLogs.push(`Finalizing ${agent.id} recommendations...`);
          }
          
          // Mark as complete when reaching 100%
          const isComplete = newProgress >= 100;
          const newStatus = isComplete 
            ? `Completed ${agent.id} research` 
            : agent.status;
          
          return {
            ...agent,
            progress: newProgress,
            logs: newLogs,
            status: newStatus,
            isActive: !isComplete
          };
        });
        
        // Calculate overall progress as average of all agents
        const activeAgentCount = newAgents.filter(a => a.progress > 0).length;
        const totalProgress = newAgents.reduce((sum, agent) => sum + agent.progress, 0);
        const newOverallProgress = activeAgentCount > 0 
          ? totalProgress / activeAgentCount 
          : 0;
        
        setOverallProgress(newOverallProgress);
        
        // Check if all agents are complete
        const allComplete = newAgents.every(agent => 
          agent.progress >= 100 || !agent.isActive && agent.progress === 0
        );
        
        if (allComplete) {
          clearInterval(interval);
          navigateToItinerary();
        }
        
        return newAgents;
      });
    }, 500);
    
    return () => clearInterval(interval);
  };

  // Get a random contextual log message for an agent
  const getRandomLogMessage = (agentId, progressStage) => {
    const destination = formData?.destination || 'your destination';
    
    const messagesByAgentAndStage = {
      attractions: {
        20: [
          `Analyzing top-rated attractions in ${destination}`,
          `Searching for hidden gems in ${destination}`,
          `Reading reviews for popular sites in ${destination}`
        ],
        50: [
          `Organizing attractions by location`,
          `Calculating visit durations for each site`,
          `Prioritizing must-see locations`
        ],
        75: [
          `Creating optimal route between attractions`,
          `Adding descriptions for each location`,
          `Factoring in ${formData?.interests?.join(', ')} interests`
        ]
      },
      accommodation: {
        20: [
          `Searching for ${formData?.budget} hotels in ${destination}`,
          `Analyzing accommodation ratings and reviews`,
          `Checking availability for your dates`
        ],
        50: [
          `Comparing amenities across options`,
          `Finding accommodations near attractions`,
          `Evaluating price-to-quality ratios`
        ],
        75: [
          `Selecting best options based on your preferences`,
          `Adding detailed information about facilities`,
          `Checking for special deals and packages`
        ]
      },
      dining: {
        20: [
          `Discovering local cuisine specialties in ${destination}`,
          `Finding highly-rated restaurants`,
          `Searching for authentic food experiences`
        ],
        50: [
          `Analyzing menu options and price ranges`,
          `Matching restaurants to your budget preferences`,
          `Finding dining options near attractions`
        ],
        75: [
          `Selecting restaurants with the best local dishes`,
          `Adding cuisine details and specialties`,
          `Creating a diverse selection of dining options`
        ]
      },
      transport: {
        20: [
          `Researching public transport in ${destination}`,
          `Finding airport transfer options`,
          `Analyzing rental car availability`
        ],
        50: [
          `Comparing costs of different transport methods`,
          `Finding most efficient routes between locations`,
          `Checking schedules for buses and trains`
        ],
        75: [
          `Creating transport recommendations for each day`,
          `Adding ticket purchasing information`,
          `Planning the most convenient travel routes`
        ]
      },
      images: {
        20: [
          `Searching for stunning photos of ${destination}`,
          `Finding images of recommended attractions`,
          `Gathering photos of local landmarks`
        ],
        50: [
          `Selecting high-quality images`,
          `Processing images for your itinerary`,
          `Finding photos that showcase local culture`
        ],
        75: [
          `Organizing images by location`,
          `Finalizing image selection`,
          `Adding captions and descriptions`
        ]
      },
      insights: {
        20: [
          `Researching local customs in ${destination}`,
          `Finding information about upcoming events`,
          `Gathering travel tips from locals`
        ],
        50: [
          `Analyzing weather patterns for your dates`,
          `Researching health and safety information`,
          `Finding useful phrases in the local language`
        ],
        75: [
          `Compiling insider tips for each location`,
          `Adding cultural context for your visit`,
          `Finalizing practical advice for travelers`
        ]
      }
    };
    
    // Get messages for this agent and stage
    const messages = messagesByAgentAndStage[agentId]?.[progressStage] || [
      `Working on ${agentId} information...`,
      `Processing ${agentId} data...`,
      `Analyzing ${agentId} options...`
    ];
    
    // Return a random message from the list
    return messages[Math.floor(Math.random() * messages.length)];
  };

  // Navigate to the itinerary page when complete
  const navigateToItinerary = () => {
    // Small delay to ensure all animations complete
    setTimeout(() => {
      const itineraryId = localStorage.getItem('itineraryId');
      if (itineraryId) {
        navigate(`/itinerary/${itineraryId}`);
      } else {
        // Use a temporary ID if no real ID is available
        navigate(`/itinerary/temp-${Date.now()}`);
      }
    }, 1000);
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
                
                <Text color="gray.600" fontSize="sm">
                  {formData?.destination && `Creating your perfect trip to ${formData.destination}`}
                </Text>
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
                          color={agent.color}
                          animate={agent.isActive ? {
                            scale: [1, 1.2, 1],
                            transition: { duration: 1.5, repeat: Infinity }
                          } : {}}
                        />
                        <Text fontWeight="bold">{agent.name}</Text>
                      </Flex>
                      
                      <Badge 
                        colorScheme={
                          agent.progress >= 100 ? "green" : 
                          agent.isActive ? "blue" : "gray"
                        }
                      >
                        {agent.progress >= 100 ? "Complete" : 
                         agent.isActive ? "Active" : "Waiting"}
                      </Badge>
                    </Flex>
                    
                    <Text fontSize="sm" color="gray.600" mb={3}>{agent.status}</Text>
                    
                    <Progress 
                      value={agent.progress} 
                      size="sm" 
                      colorScheme={agent.progress >= 100 ? "green" : "blue"} 
                      borderRadius="full"
                      isAnimated
                    />
                  </Box>
                  
                  {agent.logs.length > 0 && (
                    <>
                      <Divider />
                      <Box bg={useColorModeValue('gray.50', 'gray.700')} p={3} maxH="100px" overflowY="auto">
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
                                {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}:
                              </Text>
                              {log}
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

export default LoadingPage; 