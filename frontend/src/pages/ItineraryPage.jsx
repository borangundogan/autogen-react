import { useState, useEffect, useMemo } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Container,
  Flex,
  Heading,
  Text,
  Button,
  Stack,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Image,
  Badge,
  Card,
  CardHeader,
  CardBody,
  useColorModeValue,
  Link,
  SimpleGrid,
  VStack,
  HStack,
  Circle,
  Spinner,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Icon
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import { travelApi } from '../services/api';
import { FaRegCalendarAlt, FaRegLightbulb, FaRegStar, FaRegGem, FaExternalLinkAlt } from 'react-icons/fa';
import { List, ListItem } from '@chakra-ui/react';

// Wrap Chakra components with motion
const MotionBox = motion(Box);

// Helper function to extract source name from URL
const extractSourceFromUrl = (url) => {
  if (!url || url === '#') return null;
  
  try {
    // Try to extract domain from URL
    const domain = new URL(url).hostname;
    // Remove www. if present and get the main domain name
    const source = domain.replace('www.', '').split('.')[0];
    // Capitalize first letter
    return source.charAt(0).toUpperCase() + source.slice(1);
  } catch (e) {
    // If URL parsing fails, try to extract something that looks like a domain
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/]+)/i);
    if (match && match[1]) {
      const source = match[1].split('.')[0];
      return source.charAt(0).toUpperCase() + source.slice(1);
    }
    return null;
  }
};

// Helper function to extract title from URL
const extractTitleFromUrl = (url) => {
  if (!url || url === '#') return null;
  
  try {
    // Try to extract title from URL path
    const pathname = new URL(url).pathname;
    // Remove slashes, replace hyphens/underscores with spaces, and get last segment
    let slug = pathname.split('/').filter(Boolean).pop() || '';
    let title = slug
      .replace(/[-_]/g, ' ')
      .replace(/\.html$|\.htm$|\.php$|\.asp$/i, '')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
      
    // Clean up title further
    title = title.replace(/\d+$/, '').trim(); // Remove trailing numbers
    
    return title || null;
  } catch (e) {
    return null;
  }
};

// Function to extract the first image URL from the image search agent response
const extractImageUrlFromResponse = (responseText) => {
  if (!responseText) return null;
  
  // The response now contains direct URLs, one per line
  const lines = responseText.split('\n');
  
  // Find the first non-empty line that looks like a URL
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine && (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://'))) {
      return trimmedLine;
    }
  }
  
  // Fallback to old format (markdown links) for backwards compatibility
  const linkPattern = /\[View Image\]\(([^)]+)\)/g;
  const matches = [...responseText.matchAll(linkPattern)];
  
  // Return the first valid URL found
  if (matches && matches.length > 0) {
    return matches[0][1]; // First capture group of the first match
  }
  
  return null;
};

// Function to extract multiple image URLs from the image search agent response
const extractImagesFromResponse = (responseText, destination) => {
  if (!responseText) return [];
  
  const images = [];
  
  // Split by lines and filter out non-URL content
  const lines = responseText.split('\n')
    .map(line => line.trim())
    .filter(line => 
      line && 
      (line.startsWith('http://') || line.startsWith('https://')) &&
      !line.includes('TASK_COMPLETE') && 
      !line.includes('ImageSearchAgent')
    );
  
  // Extract city name for better captions
  const cityName = destination?.split(',')[0] || 'city';
  
  // Process each URL
  lines.forEach((url, index) => {
    // Extract source from URL
    const source = extractSourceFromUrl(url) || "Travel Guide";
    
    images.push({
      url: url,
      caption: `Image ${index + 1} of ${cityName}`,
      source: source,
    });
  });
  
  return images;
};

// Function to parse sources from response text
const parseSourcesFromResponse = (text) => {
  try {
    if (!text) return [];
    
    const sources = [];
    
    // First look for a dedicated Sources section
    let sourcesSection = '';
    const sourcesSectionMatch = text.match(/sources?:?\s*\n([\s\S]*?)(?:\n\s*\n|\n#|\n\*\*|$)/i);
    
    if (sourcesSectionMatch && sourcesSectionMatch[1]) {
      sourcesSection = sourcesSectionMatch[1];
    }
    
    if (sourcesSection) {
      // Parse URLs in Markdown format [title](url)
      const markdownUrls = sourcesSection.match(/\[([^\]]+)\]\(([^)]+)\)/g);
      if (markdownUrls) {
        for (const markdownUrl of markdownUrls) {
          const titleMatch = markdownUrl.match(/\[([^\]]+)\]/);
          const urlMatch = markdownUrl.match(/\(([^)]+)\)/);
          
          if (titleMatch && urlMatch) {
            sources.push({
              title: titleMatch[1].trim(),
              url: urlMatch[1].trim(),
              source: extractSourceFromUrl(urlMatch[1].trim()) || 'Reference'
            });
          }
        }
      }
      
      // Parse plain URLs with or without titles
      const lines = sourcesSection.split('\n');
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Skip if already processed as Markdown or if empty
        if (!trimmedLine || /\[.+\]\(.+\)/.test(trimmedLine)) continue;
        
        // Check for URL patterns
        const urlMatches = trimmedLine.match(/(https?:\/\/[^\s]+)/g);
        if (urlMatches) {
          for (const url of urlMatches) {
            // Check if there's text before the URL that could be a title
            const titleMatch = trimmedLine.match(/^(.+?)(?=https?:\/\/)/);
            const title = titleMatch 
              ? titleMatch[1].replace(/[-:•*]/g, '').trim() 
              : extractTitleFromUrl(url) || `${extractSourceFromUrl(url) || 'Reference'} Resource`;
              
            // Only add if this exact URL isn't already in sources
            if (!sources.some(s => s.url === url)) {
              sources.push({
                title,
                url,
                source: extractSourceFromUrl(url) || 'Reference'
              });
            }
          }
        }
      }
    }
    
    // If we didn't find sources in a dedicated section, look for URLs throughout the text
    if (sources.length === 0) {
      const urlMatches = text.match(/(https?:\/\/[^\s]+)/g);
      if (urlMatches) {
        // Create a Set to track unique URLs
        const uniqueUrls = new Set();
        
        for (const url of urlMatches) {
          // Skip if this URL is already in our list
          if (uniqueUrls.has(url)) continue;
          uniqueUrls.add(url);
          
          // Use helper functions to extract information
          const source = extractSourceFromUrl(url) || 'Reference';
          const title = extractTitleFromUrl(url) || `${source} Resource`;
          
          sources.push({
            title,
            url,
            source
          });
        }
      }
    }
    
    return sources;
  } catch (error) {
    console.error("Error parsing sources:", error);
    return [];
  }
};

// Function to parse blog posts from search agent response
const parseBlogPostsFromResponse = (text) => {
  try {
    if (!text) return [];
    
    const blogPosts = [];
    
    // Look for sections that might contain blog posts or search results
    const lines = text.split('\n');
    let currentTitle = '';
    let currentContent = '';
    let currentUrl = '';
    let inBlogPost = false;
    
    // Parse line by line looking for blog post patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) {
        // If we were in a blog post and hit an empty line, it might be the end of the post
        if (inBlogPost && currentTitle && currentContent) {
          blogPosts.push({
            title: currentTitle,
            content: currentContent,
            url: currentUrl || '#',
            source: extractSourceFromUrl(currentUrl) || 'Travel Blog'
          });
          
          // Reset for next post
          currentTitle = '';
          currentContent = '';
          currentUrl = '';
          inBlogPost = false;
        }
        continue;
      }
      
      // Check if this line looks like a blog post title (usually shorter, might have formatting)
      if ((line.startsWith('#') || line.includes('**')) && line.length < 100) {
        // If we were already parsing a post, save it before starting new one
        if (inBlogPost && currentTitle && currentContent) {
          blogPosts.push({
            title: currentTitle,
            content: currentContent,
            url: currentUrl || '#',
            source: extractSourceFromUrl(currentUrl) || 'Travel Blog'
          });
        }
        
        // Start a new blog post
        currentTitle = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        currentContent = '';
        currentUrl = '';
        inBlogPost = true;
        
        // Check if the next line might be a URL
        if (i + 1 < lines.length && (lines[i + 1].includes('http') || lines[i + 1].includes('www'))) {
          currentUrl = lines[i + 1].trim();
          i++; // Skip the URL line in the next iteration
        }
      }
      // Check if this line looks like a URL by itself
      else if (line.startsWith('http') || line.startsWith('www')) {
        currentUrl = line;
      }
      // Otherwise, it's probably content for the current blog post
      else if (inBlogPost) {
        if (currentContent) {
          currentContent += '\n' + line;
        } else {
          currentContent = line;
        }
      }
      // If we're not in a blog post but the line looks like it could be a title
      else if (line.length < 100 && !line.startsWith('-') && !line.includes(':')) {
        currentTitle = line;
        currentContent = '';
        inBlogPost = true;
      }
    }
    
    // Don't forget to add the last blog post if we were parsing one
    if (inBlogPost && currentTitle && currentContent) {
      blogPosts.push({
        title: currentTitle,
        content: currentContent,
        url: currentUrl || '#',
        source: extractSourceFromUrl(currentUrl) || 'Travel Blog'
      });
    }
    
    // If we didn't find any blog posts with the structured approach,
    // try splitting the text into sections based on patterns
    if (blogPosts.length === 0) {
      // Look for paragraphs that could be blog posts
      const paragraphs = text.split('\n\n');
      for (let i = 0; i < paragraphs.length; i++) {
        const paragraph = paragraphs[i].trim();
        if (paragraph.length > 100) { // Only consider substantial paragraphs
          // Try to extract a title from the first line
          const lines = paragraph.split('\n');
          const potentialTitle = lines[0].replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
          const potentialContent = lines.slice(1).join('\n').trim();
          
          if (potentialTitle && potentialContent) {
            blogPosts.push({
              title: potentialTitle,
              content: potentialContent,
              url: '#',
              source: 'Travel Blog'
            });
          }
        }
      }
    }
    
    // If we still don't have enough blog posts, create dynamic default ones
    if (blogPosts.length < 5) {
      const destination = text.split(',')[0] || "this destination";
      const defaultTopics = [
        { title: `Top Attractions in ${destination}`, content: `Discover the most popular sights and attractions that ${destination} has to offer visitors.` },
        { title: `Local Cuisine Guide: What to Eat in ${destination}`, content: `A foodie's guide to the must-try local dishes and culinary experiences in ${destination}.` },
        { title: `${destination} Off the Beaten Path`, content: `Explore hidden gems and lesser-known spots that most tourists miss when visiting ${destination}.` },
        { title: `Best Time to Visit ${destination}`, content: `Learn about the seasonal considerations, weather patterns, and ideal times to plan your trip to ${destination}.` },
        { title: `Cultural Etiquette in ${destination}`, content: `Important customs, traditions, and etiquette tips to help you navigate the local culture respectfully.` }
      ];
      
      // Add as many default posts as needed to reach 5
      for (let i = 0; blogPosts.length < 5 && i < defaultTopics.length; i++) {
        if (!blogPosts.some(post => post.title.includes(defaultTopics[i].title))) {
          blogPosts.push({
            title: defaultTopics[i].title,
            content: defaultTopics[i].content,
            url: '#',
            source: 'Travel Guide'
          });
        }
      }
    }
    
    return blogPosts;
  } catch (err) {
    console.error('Error parsing blog posts from response:', err);
    return [];
  }
};

// Add this utility function before the ItineraryPage component
const getCityImages = (destination) => {
  // Extract the main city name from the destination string
  const cityName = destination?.toLowerCase().split(',')[0].trim();
  
  // Map of cities to their images
  const cityImageMap = {
    // Ankara images
    'ankara': [
      'https://images.unsplash.com/photo-1610116186859-e62f90a2a0be?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1589657068258-c9fa0b9b8770?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1584486272644-33cf7a3f3c5d?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1600598439875-31b01ce67fdb?q=80&w=1920&auto=format&fit=crop'
    ],
    // Munich images
    'munich': [
      'https://images.unsplash.com/photo-1595867818082-083862f3d630?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1570368294249-55bd560be0cf?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1565770100386-13c11ddeec5d?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1619428752198-72d4ed9c3eef?q=80&w=1920&auto=format&fit=crop'
    ],
    // Berlin images
    'berlin': [
      'https://images.unsplash.com/photo-1560969184-10fe8719e047?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1566404791232-af9fe8222000?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1528728329032-2972f65dfb3f?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1587330979470-3595ac045ab0?q=80&w=1920&auto=format&fit=crop'
    ],
    // Istanbul images
    'istanbul': [
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1527838832700-5059252407fa?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1604941620553-27aaeb6c6e74?q=80&w=1920&auto=format&fit=crop'
    ],
    // Baku images
    'baku': [
      'https://images.unsplash.com/photo-1580204614242-ae97d47bcd1f?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1593412323862-0c981e38fbb8?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1615971677499-5467cbab01c0?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1608924066819-3ae7e221ab9e?q=80&w=1920&auto=format&fit=crop'
    ],
    // New York images
    'new york': [
      'https://images.unsplash.com/photo-1490644658840-3f2e3f8c5625?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1500916434205-0c77489c6cf7?q=80&w=1920&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1531778272849-d1dd22444c06?q=80&w=1920&auto=format&fit=crop'
    ],
  };
  
  // Default images if city not found
  const defaultImages = [
    'https://images.unsplash.com/photo-1488646953014-85cb44e25828?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533105079780-92b9be482077?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?q=80&w=1920&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?q=80&w=1920&auto=format&fit=crop'
  ];
  
  // Return images for the city or default images
  return cityImageMap[cityName] || defaultImages;
};

// Add this function to extract image URLs from any text
const extractImageUrlsFromText = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  // Regular expression to match image URLs
  const imageUrlRegex = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp)([^\s]*)?)/gi;
  const matches = text.match(imageUrlRegex) || [];
  
  return matches.map(url => ({
    url: url.replace(/[,")]$/, ''), // Clean up any trailing characters
    source: extractSourceFromUrl(url) || 'Unknown Source'
  }));
};

function ItineraryPage() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [itinerary, setItinerary] = useState(null);
  
  // Fetch itinerary data when component mounts
  useEffect(() => {
    const fetchItinerary = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Check if ID starts with "temp-" - this would be a temporary itinerary
        // before backend processing completes
        if (id.startsWith('temp-')) {
          // If it's a temporary ID, show loading state and wait for real data
          console.log('Temporary itinerary ID detected, waiting for processing');
          setError('Your itinerary is still being generated. Please wait a moment and refresh the page.');
          setLoading(false);
        } else {
          // Fetch from API for real IDs
          console.log('Fetching itinerary with ID:', id);
          const response = await travelApi.getTravelPlan(id);
          console.log('Raw API response for itinerary:', response.data);
          
          // Process API response into the format expected by the UI
          const apiData = response.data;
          
          // Try to find image results in different possible locations
          const findImageResults = (data) => {
            // Check different possible locations where image results might be stored
            const possiblePaths = [
              data.image_results,
              data.imageResults,
              data.image_search_results,
              data.images,
              data.ImageSearchAgent
            ];
            
            // Also search in top-level properties for anything that looks like it contains image results
            for (const [key, value] of Object.entries(data)) {
              if (
                typeof value === 'string' && 
                (key.toLowerCase().includes('image') || value.includes('http')) &&
                !possiblePaths.includes(value)
              ) {
                possiblePaths.push(value);
              }
            }
            
            // Return the first non-empty result
            return possiblePaths.find(path => path && typeof path === 'string' && path.trim().length > 0) || '';
          };
          
          // Extract image results using our helper function
          const imageResults = findImageResults(apiData);
          console.log('Found image results:', imageResults);
          
          // Aggressively search for image URLs in all text fields of the API response
          const extractAllImagesFromResponse = (data) => {
            let allImages = [];
            
            // Check if there are actual image URLs in the "images" field
            if (data.images && typeof data.images === 'string' && 
                data.images !== "No response from ImageSearchAgent. Please try a different query.") {
              const lines = data.images.split('\n').filter(line => 
                line.trim() && 
                line.trim().startsWith('http') && 
                !line.includes('TASK_COMPLETE'));
              
              if (lines.length > 0) {
                allImages = lines.map(url => ({
                  url: url.trim(),
                  source: extractSourceFromUrl(url) || 'Image Search'
                }));
                console.log('Found images in images field:', allImages.length);
              }
            }
            
            // If we still don't have images, look in every string field of the response
            if (allImages.length === 0) {
              // Search recursively through all fields
              const searchObject = (obj, depth = 0) => {
                if (depth > 3) return []; // Limit recursion depth
                if (!obj || typeof obj !== 'object') return [];
                
                let results = [];
                for (const [key, value] of Object.entries(obj)) {
                  if (typeof value === 'string') {
                    // Extract image URLs from this text field
                    const foundUrls = extractImageUrlsFromText(value);
                    if (foundUrls.length > 0) {
                      console.log(`Found ${foundUrls.length} images in field "${key}"`);
                      results = [...results, ...foundUrls];
                    }
                  } else if (typeof value === 'object') {
                    // Recurse into nested objects
                    results = [...results, ...searchObject(value, depth + 1)];
                  }
                }
                return results;
              };
              
              allImages = searchObject(data);
              console.log('Found images by searching all fields:', allImages.length);
            }
            
            // Deduplicate based on URL
            const uniqueUrls = new Set();
            const uniqueImages = [];
            
            allImages.forEach(img => {
              if (!uniqueUrls.has(img.url)) {
                uniqueUrls.add(img.url);
                uniqueImages.push(img);
              }
            });
            
            return uniqueImages;
          };
          
          // Get all images from the response
          const allImages = extractAllImagesFromResponse(apiData);
          console.log('All extracted images:', allImages);
          
          // Transform the API data to match the UI format
          const formattedItinerary = {
            destination: apiData.destination,
            tripLength: apiData.trip_length,
            budget: apiData.budget || 'Budget information not provided',
            overview: apiData.itinerary.split('\n\n')[0] || 'No overview provided',
            interests: apiData.interests || [],
            // Parse the itinerary string to extract days and activities
            days: parseDaysFromItinerary(apiData.itinerary, apiData.trip_length),
            // Other sections from API
            dining: parseDiningFromResponse(apiData.food),
            transportation: parseTransportationFromResponse(apiData.attractions),
            tips: parseTipsFromResponse(apiData.accommodation),
            accommodations: parseAccommodationFromResponse(apiData.accommodation),
            // Add blog posts from the search agent results
            blogPosts: parseBlogPostsFromResponse(apiData.search_results || apiData.destination),
            // Add sources from the text
            sources: parseSourcesFromResponse(apiData.itinerary),
            // Add image URL from image search agent
            imageUrl: allImages.length > 0 ? allImages[0].url : null,
            // Add array of images from image search agent
            images: allImages.length > 0 ? allImages : [],
            // Store the raw image results text
            rawImageResults: imageResults || '',
            // Add insights from reviews agent
            insights: apiData.reviews || '',
            // Store the entire API response for debugging
            rawApiResponse: JSON.stringify(apiData, null, 2)
          };
          
          console.log('Formatted itinerary:', formattedItinerary);
          console.log('Raw image results stored in itinerary:', formattedItinerary.rawImageResults);
          console.log('Parsed images array:', formattedItinerary.images);
          
          setItinerary(formattedItinerary);
        }
      } catch (err) {
        console.error('Error fetching itinerary:', err);
        setError('Failed to load your itinerary. Please try again later.');
        // Instead of falling back to default data, just keep the error state
        setItinerary(null);
      } finally {
        setLoading(false);
      }
    };
    
    fetchItinerary();
  }, [id]);
  
  // Add this after the other useMemo hooks
  const cityImages = useMemo(() => getCityImages(itinerary?.destination), [itinerary?.destination]);
  
  // Helper functions to parse API response
  const parseDaysFromItinerary = (itineraryText, tripLength) => {
    try {
      // Parse the itinerary text to extract days and activities
      const days = [];
      
      // Try to identify day sections using Markdown headers
      const dayRegex = /## Day (\d+):(.*?)(?=## Day \d+:|$)/gs;
      let match;
      
      while ((match = dayRegex.exec(itineraryText)) !== null) {
        const dayNumber = parseInt(match[1]);
        const dayContent = match[2].trim();
        
        // Create a day object
        const day = {
          number: dayNumber,
          activities: []
        };
        
        // Parse morning, afternoon, evening sections
        const timeRegex = /### (Morning|Afternoon|Evening):(.*?)(?=### \w+:|$)/gs;
        let timeMatch;
        
        while ((timeMatch = timeRegex.exec(dayContent)) !== null) {
          const timeOfDay = timeMatch[1];
          const activityContent = timeMatch[2].trim();
          
          // Extract activities, meals, transport, etc.
          const activityLines = activityContent.split('\n').filter(line => line.trim().length > 0);
          
          for (const line of activityLines) {
            // Skip lines that don't contain actual activities
            if (!line.includes('**') && !line.includes('-')) continue;
            
            // Try to determine the type of activity
            let type = 'Activity';
            let typePrefix = '';
            
            if (line.toLowerCase().includes('lunch') || line.toLowerCase().includes('dinner') || 
                line.toLowerCase().includes('breakfast') || line.toLowerCase().includes('meal') ||
                line.toLowerCase().includes('restaurant') || line.toLowerCase().includes('café') ||
                line.toLowerCase().includes('food') || line.toLowerCase().includes('cuisine')) {
              type = 'Dining';
              
              if (line.toLowerCase().includes('breakfast')) {
                typePrefix = 'Breakfast: ';
              } else if (line.toLowerCase().includes('lunch')) {
                typePrefix = 'Lunch: ';
              } else if (line.toLowerCase().includes('dinner')) {
                typePrefix = 'Dinner: ';
              } else {
                typePrefix = 'Food: ';
              }
            } else if (line.toLowerCase().includes('transport') || line.toLowerCase().includes('subway') || 
                      line.toLowerCase().includes('walk') || line.toLowerCase().includes('taxi') ||
                      line.toLowerCase().includes('bus') || line.toLowerCase().includes('train')) {
              type = 'Transportation';
              typePrefix = 'Transport: ';
            } else if (line.toLowerCase().includes('cost') || line.toLowerCase().includes('price') || 
                      line.toLowerCase().includes('fee') || line.toLowerCase().includes('$') ||
                      line.toLowerCase().includes('budget') || line.toLowerCase().includes('euro')) {
              type = 'Cost';
              typePrefix = 'Cost: ';
            } else {
              typePrefix = 'Activity: ';
            }
            
            // Clean the description
            let description = line.replace(/\*\*/g, '').replace(/- /g, '').trim();
            
            // Prepend type prefix to make activities more clear
            if (!description.includes(typePrefix.trim())) {
              description = typePrefix + description;
            }
            
            // Add to activities
            day.activities.push({
              time: timeOfDay,
              type,
              description
            });
          }
        }
        
        // If no activities were parsed, create minimal placeholder activities
        if (day.activities.length === 0) {
          const timeOfDay = ["Morning", "Afternoon", "Evening"];
          timeOfDay.forEach(period => {
          day.activities.push({
              time: period,
            type: "Activity",
              description: `Explore ${itineraryText.split(',')[0]} in the ${period.toLowerCase()}`
            });
          });
        }
        
        days.push(day);
      }
      
      // If no days were parsed, create a minimal structure based on trip length
      if (days.length === 0) {
        for (let i = 1; i <= tripLength; i++) {
          days.push({
            number: i,
            activities: [
              {
                time: "Day",
                type: "Activity",
                description: "Explore local attractions"
              }
            ]
          });
        }
      }
      
      return days;
    } catch (err) {
      console.error('Error parsing days from itinerary:', err);
      // Create minimal days structure without static content
      const days = [];
      for (let i = 1; i <= tripLength; i++) {
        days.push({
          number: i,
          activities: [
            {
              time: "Day",
              type: "Activity",
              description: "Explore local attractions"
            }
          ]
        });
      }
      return days;
    }
  };
  
  const parseDiningFromResponse = (foodText) => {
    try {
      if (!foodText) return [];
      
      const dining = [];
      
      // Define the categories we want to extract
      const categories = [
        { name: "Must-Try Local Dishes", type: "Local Dish", pattern: /must-try|local dish|traditional dish/i },
        { name: "Restaurants", type: "Restaurant", pattern: /restaurant|high-end|mid-range|budget|dining/i },
        { name: "Food Markets & Culinary Districts", type: "Food Market", pattern: /market|bazaar|culinary district/i },
        { name: "Culinary Experiences", type: "Experience", pattern: /experience|tour|cooking class/i },
        { name: "Dining Etiquette", type: "Etiquette", pattern: /etiquette|tipping|custom|manner|bread|tea|coffee|drink|politeness|hospitality|respect|tableware|fork|knife|spoon|chopstick|table manner|dining rule|tradition/i }
      ];
      
      // Split the text into lines for processing
      const lines = foodText.split('\n');
      
      // Track the current category being processed
      let currentCategory = null;
      
      // Process line by line
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Check if this line is a section header
        const isHeader = line.startsWith('###') || 
                         line.startsWith('##') || 
                         (line.includes(':') && !line.startsWith('-'));
        
        if (isHeader) {
          // Find which category this header belongs to
          for (const category of categories) {
            if (category.pattern.test(line)) {
              currentCategory = category;
              break;
            }
          }
          continue;
        }
        
        // If we have a current category and this line contains an item (usually starts with - or **)
        if (currentCategory && (line.startsWith('-') || line.includes('**'))) {
          // Extract the name and description
          let name, description, type, cuisine = "Turkish"; // Default cuisine
          
          // Clean up the line
          const cleanLine = line.replace(/^\s*[-•*:]?\s*/, '').replace(/\*\*/g, '').trim();
          
          // Check if this is a restaurant category item (like High-End, Mid-Range, Budget)
          const restaurantCategoryPatterns = [
            'high-end', 'mid-range', 'budget', 'fine dining', 'luxury', 'upscale',
            'moderate', 'affordable', 'casual', 'low-cost', 'expensive'
          ];
          
          const isRestaurantCategory = restaurantCategoryPatterns.some(pattern => 
            cleanLine.toLowerCase().startsWith(pattern) ||
            cleanLine.toLowerCase().includes(`**${pattern}**`) ||
            cleanLine.toLowerCase().includes(`: ${pattern}`)
          );
          
          if (isRestaurantCategory) {
            // Override to ensure it's in the Restaurants category
            currentCategory = categories.find(cat => cat.name === "Restaurants") || currentCategory;
          }
          
          // Continue with existing parsing logic
          // Split the line into name and description parts
          if (cleanLine.includes(':')) {
            const parts = cleanLine.split(':');
            name = parts[0].trim();
            description = parts.slice(1).join(':').trim();
          } else if (cleanLine.includes(' - ')) {
            const parts = cleanLine.split(' - ');
            name = parts[0].trim();
            description = parts.slice(1).join(' - ').trim();
          } else {
            // If there's no clear separator, use the whole line as both name and description
            const parts = cleanLine.split(' ');
            if (parts.length > 2) {
              name = parts.slice(0, 2).join(' ');
              description = cleanLine;
            } else {
              name = cleanLine;
              description = cleanLine;
            }
          }
          
          // Check for specific dining etiquette keywords in the name to override categorization
          const etiquetteKeywords = ['tipping', 'bread', 'tea', 'coffee', 'politeness', 'respect', 'custom', 'tradition', 'etiquette'];
          const isEtiquetteItem = etiquetteKeywords.some(keyword => 
            name.toLowerCase().includes(keyword) || 
            description.toLowerCase().includes(keyword)
          );
          
          if (isEtiquetteItem) {
            // Override the current category to Dining Etiquette
            currentCategory = categories.find(cat => cat.name === "Dining Etiquette") || currentCategory;
          }
          
          // Determine cuisine type
          const cuisineMapping = {
            "Seafood": ["seafood"],
            "Turkish": ["kebab", "kofte", "turkish"],
            "Local cuisine": ["local"]
          };
          
          cuisine = "Other";
          for (const [cuisineType, keywords] of Object.entries(cuisineMapping)) {
            if (keywords.some(keyword => cleanLine.toLowerCase().includes(keyword))) {
              cuisine = cuisineType;
              break;
            }
          }
          
          // Determine the type based on category and content
          type = currentCategory.type;
          
          // For restaurants, try to determine the type based on content
          if (currentCategory.name === "Restaurants" || isRestaurantCategory) {
            // If the name itself is a restaurant category, use it as the type
            if (name.toLowerCase().includes('high-end') || 
                name.toLowerCase().includes('fine dining') || 
                name.toLowerCase().includes('upscale') || 
                name.toLowerCase().includes('luxury')) {
              type = "Fine Dining";
            } else if (name.toLowerCase().includes('mid-range') || 
                      name.toLowerCase().includes('moderate')) {
              type = "Mid-Range";
            } else if (name.toLowerCase().includes('budget') || 
                      name.toLowerCase().includes('affordable') ||
                      name.toLowerCase().includes('low-cost')) {
              type = "Budget";
            } else if (name.toLowerCase().includes('casual')) {
              type = "Casual Dining";
            }
            
            // Set Restaurant as the type if nothing more specific is found
            if (type === "Category" || type === "Etiquette") {
              type = "Restaurant";
            }
          }
          
          // Add the item to our results
        dining.push({
            name,
            type,
            cuisine,
            description,
            category: currentCategory.name
          });
        }
      }
      
      // Group results by category for better organization
      const groupedResults = [];
      
      // Add a special item for each category header
      for (const category of categories) {
        const itemsInCategory = dining.filter(item => item.category === category.name);
        
        if (itemsInCategory.length > 0) {
          // Add the category header as a special item
          groupedResults.push({
            name: category.name,
            type: "Category",
            cuisine: "",
            description: `${category.name} in ${itemsInCategory[0].cuisine}`,
            isCategory: true
          });
          
          // Add the items in this category
          groupedResults.push(...itemsInCategory);
        }
      }
      
      // If we didn't find any items, use defaults
      if (groupedResults.length === 0) {
        // Instead of static defaults, try to extract at least something from the raw text
        const textSample = foodText.split(/[.!?]/).filter(s => s.length > 15).slice(0, 4);
        
        if (textSample.length > 0) {
          // Create a basic structure with whatever we could extract
          return [
            {
              name: "Food & Dining",
              type: "Category",
              cuisine: "",
              description: "Dining options for your trip",
              isCategory: true
            },
            {
              name: "Local Cuisine",
              type: "Restaurant",
              cuisine: "Local cuisine",
              description: textSample[0].trim()
            }
          ];
        }
        
        // If no text to extract, return empty array
        return [];
      }
      
      return groupedResults;
    } catch (err) {
      console.error('Error parsing dining from response:', err);
      // Return empty array instead of static data
      return [];
    }
  };
  
  const parseTransportationFromResponse = (text) => {
    try {
      if (!text) return [];
      
      const transportation = [];
      
      // Look for transportation information in the text
      const transportRegex = /[Tt]ransport(?:ation)?|[Ss]ubway|[Tt]axi|[Bb]us|[Ww]alk/g;
      const transportLines = text.split('\n').filter(line => 
        transportRegex.test(line) && line.length > 10
      );
      
      // Add unique transportation options
      const addedOptions = new Set();
      
      for (const line of transportLines) {
        // Try to determine the type of transportation
        let type = 'Public transportation';
        
        if (line.toLowerCase().includes('taxi')) {
          type = 'Taxi';
        } else if (line.toLowerCase().includes('bus')) {
          type = 'Bus';
        } else if (line.toLowerCase().includes('subway') || line.toLowerCase().includes('metro')) {
          type = 'Subway/Metro';
        } else if (line.toLowerCase().includes('walk')) {
          type = 'Walking';
        } else if (line.toLowerCase().includes('bike') || line.toLowerCase().includes('cycling')) {
          type = 'Biking/Cycling';
        }
        
        // Skip if we've already added this type
        if (addedOptions.has(type)) continue;
        addedOptions.add(type);
        
        transportation.push({
          type,
          description: line.replace(/^[^a-zA-Z]+/, '').trim() // Remove leading non-alphabetic characters
        });
      }
      
      // If we couldn't find any, add a generic option
      if (transportation.length === 0) {
        // Instead of a hardcoded option, look for any transportation-related words
        const transportWords = ['transit', 'travel', 'commute', 'move', 'transport'];
        const transportMention = text.split('\n').find(line => 
          transportWords.some(word => line.toLowerCase().includes(word)) && line.length > 10
        );
        
        if (transportMention) {
        transportation.push({
            type: "Transportation",
            description: transportMention.trim()
        });
        }
      }
      
      return transportation;
    } catch (err) {
      console.error('Error parsing transportation from response:', err);
      return [];
    }
  };
  
  const parseTipsFromResponse = (text) => {
    try {
      if (!text) return [];
      
      // Define categories for organization
      const tipCategories = [
        { category: "Hotel Tips", icon: "🏨", tips: [] },
        { category: "Transportation Tips", icon: "🚕", tips: [] },
        { category: "Dining Tips", icon: "🍽️", tips: [] },
        { category: "Shopping Tips", icon: "🛍️", tips: [] },
        { category: "Cultural Tips", icon: "🏛️", tips: [] }
      ];
      
      // Extract tips from the text
          const lines = text.split('\n');
          
      // Look for lines containing tip information
      for (const line of lines) {
        // Skip empty lines
        if (!line.trim()) continue;
        
        // Extract potential tips (lines with keywords or formatting suggesting a tip)
        if (line.toLowerCase().includes('tip') || 
            line.toLowerCase().includes('advice') || 
            line.toLowerCase().includes('recommendation') ||
            line.toLowerCase().includes('note') ||
            line.toLowerCase().includes('insider') ||
            (line.includes('-') && line.length > 15) ||
            (line.includes('•') && line.length > 15)) {
          
          // Clean up the line
          let tipText = line.replace(/^\s*[-•*:]?\s*/, '').replace(/\*\*/g, '').trim();
          if (!tipText) continue;
          
          // Try to determine the category
          let category = "Cultural Tips"; // Default category
          
          if (tipText.toLowerCase().includes('hotel') || 
              tipText.toLowerCase().includes('stay') || 
              tipText.toLowerCase().includes('room') ||
              tipText.toLowerCase().includes('accommodation')) {
            category = "Hotel Tips";
          } else if (tipText.toLowerCase().includes('restaurant') || 
                     tipText.toLowerCase().includes('food') || 
                     tipText.toLowerCase().includes('eat') ||
                     tipText.toLowerCase().includes('meal') ||
                     tipText.toLowerCase().includes('dining') ||
                     tipText.toLowerCase().includes('breakfast') ||
                     tipText.toLowerCase().includes('lunch') ||
                     tipText.toLowerCase().includes('dinner')) {
            category = "Dining Tips";
          } else if (tipText.toLowerCase().includes('transport') || 
                     tipText.toLowerCase().includes('bus') || 
                     tipText.toLowerCase().includes('taxi') ||
                     tipText.toLowerCase().includes('metro') ||
                     tipText.toLowerCase().includes('train') ||
                     tipText.toLowerCase().includes('airport') ||
                     tipText.toLowerCase().includes('travel')) {
            category = "Transportation Tips";
          } else if (tipText.toLowerCase().includes('shop') || 
                     tipText.toLowerCase().includes('buy') || 
                     tipText.toLowerCase().includes('market') ||
                     tipText.toLowerCase().includes('souvenir') ||
                     tipText.toLowerCase().includes('price') ||
                     tipText.toLowerCase().includes('bargain')) {
            category = "Shopping Tips";
          }
          
          // Extract cost if present
          let cost = "Varies";
          const costMatch = tipText.match(/\$\d+(-\d+)?|\d+\s*(-\d+)?\s*(dollars|euros|USD|TRY|lira)/i);
          if (costMatch) {
            cost = costMatch[0];
          }
          
          // If the tip has a colon, it might have a title
          let title = "Travel Tip";
          let description = tipText;
          
          if (tipText.includes(':')) {
            const parts = tipText.split(':');
            title = parts[0].trim();
            description = parts.slice(1).join(':').trim();
          } else if (tipText.includes(' - ')) {
            const parts = tipText.split(' - ');
            title = parts[0].trim();
            description = parts.slice(1).join(' - ').trim();
          }
          
          // Find the appropriate category and add the tip
          const categoryObj = tipCategories.find(cat => cat.category === category);
          if (categoryObj) {
            // Check if this tip is a duplicate
            const isDuplicate = categoryObj.tips.some(existingTip => 
              existingTip.description.toLowerCase().includes(description.toLowerCase().substring(0, 20)) ||
              description.toLowerCase().includes(existingTip.description.toLowerCase().substring(0, 20))
          );
          
          if (!isDuplicate) {
              categoryObj.tips.push({
                title,
                description,
                cost
              });
            }
          }
        }
      }
      
      // Convert the categorized tips to the format expected by the UI
      const formattedTips = [];
      
      for (const category of tipCategories) {
        for (const tip of category.tips) {
          // Remove "Insider Tips" prefix from the description if present
          let cleanDescription = tip.description;
          if (cleanDescription.toLowerCase().startsWith("insider tips")) {
            cleanDescription = cleanDescription.replace(/^insider tips[:\s-]*/i, '');
          }
          
          formattedTips.push({
            category: `${category.icon} ${category.category}`,
            description: cleanDescription.startsWith(tip.title) ? cleanDescription : `${tip.title}: ${cleanDescription}`,
            cost: tip.cost
          });
        }
      }
      
      // If we couldn't extract any tips, add some defaults
      if (formattedTips.length === 0) {
        // Instead of static defaults, try to extract general information from the text
        let generalText = text.split('\n')
          .filter(line => line.length > 20 && !line.includes('#')) // Longer lines that aren't headings
          .slice(0, 2);
          
        if (generalText.length > 0) {
          // Create a single generic tip from extracted text
        formattedTips.push({
            category: "💡 Travel Tips",
            description: generalText[0].replace(/^\s*[-•*:]?\s*/, '').replace(/\*\*/g, '').trim(),
          cost: "Varies"
        });
        }
      }
      
      return formattedTips;
    } catch (err) {
      console.error('Error parsing tips from response:', err);
      return [];
    }
  };
  
  const parseAccommodationFromResponse = (accommodationText) => {
    try {
      if (!accommodationText) return [];
      
      // Update the patterns for Unique Stays to be more inclusive
      const categoryPatterns = [
        { name: "Luxury Accommodation", patterns: ["luxury", "premium"] },
        { name: "Boutique & Design Hotels", patterns: ["boutique", "design"] },
        { name: "Budget-Friendly Options & Hostels", patterns: ["budget", "hostel"] },
        { name: "Vacation Rentals & Apartments", patterns: ["vacation", "rental", "apartment"] }
      ];
      
      // Fix the section regex pattern to handle different heading formats
      const sectionRegex = /(?:#{2,3}|###)\s+(.*?)(?=(?:#{2,3}|###)|$)/gs;
      
      // Simple result array to hold the category cards
      const accommodations = [];
      
      // Match all heading sections (both ## and ### format)
        let match;
      let sectionsFound = new Set();
      
      while ((match = sectionRegex.exec(accommodationText)) !== null) {
        const sectionHeading = match[1].trim();
        let sectionContent = accommodationText.substring(match.index).trim();
        // Find the next section heading if it exists
        const nextSectionMatch = /#{2,3}\s+/.exec(sectionContent.substring(match[0].length));
        if (nextSectionMatch) {
          const endIndex = match[0].length + nextSectionMatch.index;
          sectionContent = sectionContent.substring(0, endIndex);
        }
        // Remove the heading from the content to get just the items
        sectionContent = sectionContent.replace(/^#{2,3}\s+.*$/m, "").trim();
        
        // Skip Insider Tips sections
        if (sectionHeading.toLowerCase().includes("insider tips") || 
            sectionHeading.toLowerCase().includes("tips") ||
            sectionHeading.includes("advice")) {
          continue;
        }
        
        // Find which category this section belongs to
        let categoryName = sectionHeading;
        for (const category of categoryPatterns) {
          if (category.patterns.some(pattern => sectionHeading.toLowerCase().includes(pattern))) {
            categoryName = category.name;
            sectionsFound.add(categoryName);
            break;
          }
        }
        
        // Filter out any Insider Tips content from the description
        sectionContent = removeInsiderTipsContent(sectionContent);
        
        // Add to results array with raw content
            accommodations.push({
          name: categoryName,
          type: "Accommodation Category",
          priceRange: "Varies",
          description: sectionContent,
          isCategory: true
        });
      }
      
      // Another approach: if no sections found, try to parse the whole text
      if (accommodations.length === 0) {
        // Remove any Insider Tips section from the full text
        const filteredContent = removeInsiderTipsContent(accommodationText);
            accommodations.push({
          name: "Accommodation Options",
          type: "Accommodation Category",
          priceRange: "Varies",
          description: filteredContent,
          isCategory: true
        });
      }
      
      return accommodations;
    } catch (err) {
      console.error('Error parsing accommodations from response:', err);
      
      // Instead of fixed accommodation categories, return empty array
      return [];
    }
  };
  
  // Helper function to remove Insider Tips content from text
  const removeInsiderTipsContent = (text) => {
    if (!text) return "";
    
    // Remove any lines containing "Insider Tips" or similar headings
    const lines = text.split('\n');
    let filteredLines = [];
    let insiderTipsSection = false;
    
    for (const line of lines) {
      // Check if line starts a tips section
      if (line.match(/Insider\s+Tips|Tips|Travel\s+Advice/i) && 
          (line.includes('-') || line.includes(':') || line.includes('–'))) {
        insiderTipsSection = true;
        continue;
      }
      
      // Check if we're starting a new section (ending the tips section)
      if (insiderTipsSection && line.match(/^\s*-\s*\*\*/)) {
        insiderTipsSection = false;
      }
      
      // Only add lines that aren't part of the insider tips section
      if (!insiderTipsSection) {
        filteredLines.push(line);
      }
    }
    
    return filteredLines.join('\n');
  };
  
  // Show loading state
  if (loading) {
    return (
      <Container maxW="container.xl" py={8} textAlign="center">
        <Spinner size="xl" color="brand.800" thickness="4px" speed="0.65s" />
        <Text mt={4} fontSize="lg">Loading your itinerary...</Text>
      </Container>
    );
  }
  
  // Show error state
  if (error && !itinerary) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Box mt={6} textAlign="center">
          <Button as={RouterLink} to="/questionnaire" colorScheme="brand">
            Return to Questionnaire
          </Button>
        </Box>
      </Container>
    );
  }
  
  // If we don't have an itinerary at this point, something went wrong
  if (!itinerary) {
    return (
      <Container maxW="container.xl" py={8}>
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>We couldn't load your itinerary. Please try again.</AlertDescription>
        </Alert>
        <Box mt={6} textAlign="center">
          <Button as={RouterLink} to="/questionnaire" colorScheme="brand">
            Return to Questionnaire
          </Button>
        </Box>
      </Container>
    );
  }
  
  return (
    <Container maxW="container.xl" py={8}>
      {/* Hero header */}
      <MotionBox
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        position="relative"
        h="300px"
        borderRadius="xl"
        overflow="hidden"
        mb={8}>
        <Image
          src={itinerary.images && itinerary.images.length > 0 
            ? itinerary.images[0].url 
            : "https://cdn.britannica.com/21/195821-050-7860049D/Baku-blend-Azerbaijan-skyscrapers-buildings.jpg"}
          alt={itinerary.destination}
          objectFit="cover"
          w="100%"
          h="100%"
          fallbackSrc="https://cdn.britannica.com/21/195821-050-7860049D/Baku-blend-Azerbaijan-skyscrapers-buildings.jpg"
        />
        <Box
          position="absolute"
          top={0}
          left={0}
          w="100%"
          h="100%"
          bg="linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(0,0,0,0.7))"
          display="flex"
          flexDirection="column"
          justifyContent="flex-end"
          p={8}>
          <Heading color="white" size="2xl" mb={2}>
            {itinerary.destination}
          </Heading>
          <Flex color="white">
            <Text mr={4}>
              {itinerary.tripLength} days
            </Text>
            <Text>
              {(() => {
                // Calculate daily cost from the breakdown
                const dailyAvg = (150 + 35 + 12 + 25); // Avg accommodations + dining + transport + activities
                
                // Determine budget category based on daily average cost
                if (dailyAvg > 300) return "Luxury";
                if (dailyAvg > 200) return "Upper Mid-Range";
                if (dailyAvg > 100) return "Mid-Range";
                if (dailyAvg > 50) return "Budget-Friendly";
                return "Economy";
              })()}
            </Text>
          </Flex>
        </Box>
      </MotionBox>

      {/* Tabs */}
      <Tabs isFitted variant="enclosed" colorScheme="brand" onChange={(index) => setActiveTab(index)}>
        <TabList mb="1em">
          <Tab>Overview</Tab>
          <Tab>Day by Day</Tab>
          <Tab>Accommodation</Tab>
          <Tab>Dining</Tab>
          <Tab>Tips</Tab>
          <Tab>Images</Tab>
          <Tab>Additional Info</Tab>
        </TabList>
        <TabPanels>
          {/* Overview Tab */}
          <TabPanel>
            <Stack spacing={8}>
              {/* Trip Summary Section */}
              <Box>
                <Heading size="lg" mb={4}>Trip Overview</Heading>
                <Card variant="outline" p={4} borderRadius="md">
                  <Flex direction={{base: "column", md: "row"}} gap={6} align="start">
                    <Box flex="2">
                      <Text fontSize="lg" color="gray.600" mb={4}>
                  {itinerary.overview}
                </Text>
                      
                      {/* Quick Stats */}
                      <SimpleGrid columns={{base: 1, sm: 2, md: 4}} spacing={4} mt={6}>
                        <Card bg="brand.50" p={3} borderRadius="md" boxShadow="sm">
                          <HStack spacing={2}>
                            <Box color="brand.600" fontSize="xl">📅</Box>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" fontSize="sm">Duration</Text>
                              <Text>{itinerary.tripLength} days</Text>
                            </VStack>
                          </HStack>
                        </Card>
                        
                        <Card bg="brand.50" p={3} borderRadius="md" boxShadow="sm">
                          <HStack spacing={2}>
                            <Box color="brand.600" fontSize="xl">💰</Box>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" fontSize="sm">Budget</Text>
                              <Text>
                                {(() => {
                                  // Calculate daily cost from the breakdown
                                  const dailyAvg = (150 + 35 + 12 + 25); // Avg accommodations + dining + transport + activities
                                  
                                  // Determine budget category based on daily average cost
                                  if (dailyAvg > 300) return "Luxury";
                                  if (dailyAvg > 200) return "Upper Mid-Range";
                                  if (dailyAvg > 100) return "Mid-Range";
                                  if (dailyAvg > 50) return "Budget-Friendly";
                                  return "Economy";
                                })()}
                              </Text>
                            </VStack>
                          </HStack>
                        </Card>
                        
                        <Card bg="brand.50" p={3} borderRadius="md" boxShadow="sm">
                          <HStack spacing={2}>
                            <Box color="brand.600" fontSize="xl">🏨</Box>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" fontSize="sm">Accommodations</Text>
                              <Text>{itinerary.accommodations.length} options</Text>
                            </VStack>
                          </HStack>
                        </Card>
                        
                        <Card bg="brand.50" p={3} borderRadius="md" boxShadow="sm">
                          <HStack spacing={2}>
                            <Box color="brand.600" fontSize="xl">🍽️</Box>
                            <VStack align="start" spacing={0}>
                              <Text fontWeight="bold" fontSize="sm">Dining</Text>
                              <Text>{itinerary.dining.length} recommendations</Text>
                            </VStack>
                          </HStack>
                        </Card>
                      </SimpleGrid>
                    </Box>
                    
                    {/* Budget Breakdown */}
                    <Box flex="1" w="100%" borderLeft={{base: "none", md: "1px solid"}} borderTop={{base: "1px solid", md: "none"}} borderColor="gray.200" pl={{base: 0, md: 6}} pt={{base: 4, md: 0}} mt={{base: 4, md: 0}}>
                      <Heading size="md" mb={4}>Budget Breakdown</Heading>
                      <VStack spacing={3} align="stretch">
                        {(() => {
                          // Parse budget information or determine budget category
                          let budgetLevel = 'mid-range';
                          let budgetMultiplier = 1.0;
                          
                          // Try to determine budget level from the itinerary budget
                          if (itinerary.budget) {
                            const budgetLower = itinerary.budget.toLowerCase();
                            if (budgetLower.includes('luxury') || budgetLower.includes('high-end') || budgetLower.includes('premium')) {
                              budgetLevel = 'luxury';
                              budgetMultiplier = 2.0;
                            } else if (budgetLower.includes('budget') || budgetLower.includes('economy') || budgetLower.includes('cheap')) {
                              budgetLevel = 'budget';
                              budgetMultiplier = 0.6;
                            } else if (budgetLower.includes('mid') || budgetLower.includes('moderate')) {
                              budgetLevel = 'mid-range';
                              budgetMultiplier = 1.0;
                            }
                          }
                          
                          // Base costs per category (mid-range baseline)
                          const baseAccommodation = 120;
                          const baseDining = 35;
                          const baseTransport = 15;
                          const baseActivities = 25;
                          
                          // Calculate costs based on budget level
                          const accommodationCost = Math.round(baseAccommodation * budgetMultiplier);
                          const diningCostLow = Math.round(baseDining * budgetMultiplier * 0.9);
                          const diningCostHigh = Math.round(baseDining * budgetMultiplier * 1.1);
                          const transportCostLow = Math.round(baseTransport * budgetMultiplier * 0.8);
                          const transportCostHigh = Math.round(baseTransport * budgetMultiplier * 1.2);
                          const activitiesCostLow = Math.round(baseActivities * budgetMultiplier * 0.8);
                          const activitiesCostHigh = Math.round(baseActivities * budgetMultiplier * 1.2);
                          
                          // Also factor in destination cost of living
                          let destinationMultiplier = 1.0;
                          const destination = itinerary.destination.toLowerCase();
                          if (destination.includes('new york') || destination.includes('tokyo') || 
                              destination.includes('london') || destination.includes('paris') || 
                              destination.includes('zurich') || destination.includes('singapore')) {
                            destinationMultiplier = 1.4; // Expensive cities
                          } else if (destination.includes('istanbul') || destination.includes('bangkok') || 
                                    destination.includes('mexico') || destination.includes('bali') ||
                                    destination.includes('prague') || destination.includes('budapest')) {
                            destinationMultiplier = 0.7; // Budget-friendly cities
                          }
                          
                          // Apply destination cost adjustment
                          const finalAccommodation = Math.round(accommodationCost * destinationMultiplier);
                          const finalDiningLow = Math.round(diningCostLow * destinationMultiplier);
                          const finalDiningHigh = Math.round(diningCostHigh * destinationMultiplier);
                          const finalTransportLow = Math.round(transportCostLow * destinationMultiplier);
                          const finalTransportHigh = Math.round(transportCostHigh * destinationMultiplier);
                          const finalActivitiesLow = Math.round(activitiesCostLow * destinationMultiplier);
                          const finalActivitiesHigh = Math.round(activitiesCostHigh * destinationMultiplier);
                          
                          // Calculate total cost range
                          const totalLow = Math.round((finalAccommodation + finalDiningLow + finalTransportLow + finalActivitiesLow) * itinerary.tripLength);
                          const totalHigh = Math.round((finalAccommodation + finalDiningHigh + finalTransportHigh + finalActivitiesHigh) * itinerary.tripLength);
                          
                          return (
                            <>
                              <HStack justify="space-between">
                                <Text>Accommodations</Text>
                                <Text fontWeight="bold">~${finalAccommodation}/night</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Dining</Text>
                                <Text fontWeight="bold">~${finalDiningLow}-${finalDiningHigh}/day</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Transportation</Text>
                                <Text fontWeight="bold">~${finalTransportLow}-${finalTransportHigh}/day</Text>
                              </HStack>
                              <HStack justify="space-between">
                                <Text>Activities</Text>
                                <Text fontWeight="bold">~${finalActivitiesLow}-${finalActivitiesHigh}/day</Text>
                              </HStack>
                              <Box pt={2} borderTop="1px dashed" borderColor="gray.200">
                                <HStack justify="space-between">
                                  <Text fontWeight="bold">Estimated Total</Text>
                                  <Text fontWeight="bold">${totalLow}-${totalHigh}</Text>
                                </HStack>
                              </Box>
                            </>
                          );
                        })()}
                      </VStack>
                    </Box>
                  </Flex>
                </Card>
              </Box>
              
              {/* Trip Highlights Section */}
              <Box>
                <Heading size="lg" mb={4}>Trip Highlights</Heading>
                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
                  {itinerary.days.slice(0, 3).flatMap((day, dayIndex) => 
                    day.activities
                      .filter(activity => activity.type === "Activity" || activity.type === "Place to visit")
                      .slice(0, 1)
                      .map((activity, index) => {
                        // Hesaplamayı son 3 resmi kullanacak şekilde değiştir
                        // Resim dizisinin boyutu en az 3 ise son 3 resim kullanılacak
                        const imagesLength = itinerary.images ? itinerary.images.length : 0;
                        let imageIndex;
                        
                        if (imagesLength >= 3) {
                          // Son 3 resmi kullan (sondan başa doğru)
                          imageIndex = imagesLength - 3 + dayIndex;
                        } else {
                          // Eğer 3'ten az resim varsa, mevcut resimleri kullan
                          imageIndex = dayIndex % Math.max(imagesLength, 1);
                        }
                        
                        const imageUrl = itinerary.images && imagesLength > 0 
                          ? itinerary.images[imageIndex].url 
                          : cityImages[dayIndex % cityImages.length];
                        
                        return (
                        <Card key={`highlight-${day.number}-${index}`} variant="outline" overflow="hidden" boxShadow="sm">
                          <Image 
                            h="140px" 
                            w="100%" 
                              src={imageUrl} 
                            alt={`${itinerary.destination} - Day ${day.number}`}
                            objectFit="cover"
                              fallbackSrc={cityImages[dayIndex % cityImages.length]} // Fallback to cityImages if Google image fails
                          />
                          <CardBody>
                            <Heading size="sm" mb={1}>Day {day.number} Highlight</Heading>
                            <Text>{activity.description.split(' - ')[0]}</Text>
                          </CardBody>
                        </Card>
                        );
                      })
                  )}
                </SimpleGrid>
              </Box>
              
              <Box>
                <Heading size="lg" mb={4}>Your Interests</Heading>
                <Card variant="outline" p={5} borderRadius="md">
                  <Flex flexWrap="wrap" gap={3}>
                  {itinerary.interests.map((interest, index) => (
                    <Badge 
                      key={index} 
                      colorScheme="brand" 
                        px={4} 
                      py={2} 
                      borderRadius="full"
                        fontSize="md">
                      {interest}
                    </Badge>
                  ))}
                </Flex>
                </Card>
              </Box>
              
              <Box>
                <Heading size="lg" mb={4}>Transportation</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {itinerary.transportation.map((item, index) => (
                    <Card key={index} variant="outline" boxShadow="sm">
                      <CardBody>
                        <HStack>
                          <Box p={3} bg="brand.50" borderRadius="md" mr={3}>
                            {item.type === "Walking" && <Box fontSize="xl">🚶</Box>}
                            {item.type === "Taxi" && <Box fontSize="xl">🚕</Box>}
                            {item.type === "Bus" && <Box fontSize="xl">🚌</Box>}
                            {item.type === "Subway/Metro" && <Box fontSize="xl">🚇</Box>}
                            {(item.type === "Public transportation" || !["Walking", "Taxi", "Bus", "Subway/Metro"].includes(item.type)) && <Box fontSize="xl">🚆</Box>}
                          </Box>
                          <VStack align="start" spacing={1}>
                            <Heading size="sm">{item.type}</Heading>
                            <Text fontSize="sm" color="gray.600">{item.description}</Text>
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
              
              {/* Travel Tips Preview */}
              <Box>
                <Heading size="lg" mb={4}>Essential Tips</Heading>
                <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                  {itinerary.tips.slice(0, 4).map((tip, index) => (
                    <Card key={index} variant="outline" boxShadow="sm">
                      <CardBody>
                        <HStack align="start">
                          <Text fontSize="xl" mr={2}>
                            {tip.category.includes("Hotel") ? "🏨" : 
                             tip.category.includes("Transport") ? "🚕" : 
                             tip.category.includes("Dining") ? "🍽️" : 
                             tip.category.includes("Shopping") ? "🛍️" : 
                             tip.category.includes("Cultural") ? "🏛️" : "💡"}
                          </Text>
                          <VStack align="start" spacing={0}>
                            <Text fontWeight="bold">{tip.category.replace(/🏨|🚕|🍽️|🛍️|🏛️|💡/g, '').trim()}</Text>
                            <Text>{tip.description}</Text>
                            {tip.cost && <Text fontSize="sm" color="gray.600" mt={1}>Estimated cost: {tip.cost}</Text>}
                          </VStack>
                        </HStack>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
            </Stack>
          </TabPanel>

          {/* Day by Day Tab */}
          <TabPanel>
            <Heading size="lg" mb={6}>Daily Itinerary</Heading>
            <Stack spacing={8}>
              {itinerary.days.map((day) => (
                <Card key={day.number} overflow="hidden" variant="outline">
                  <CardHeader 
                    bg="brand.800" 
                    color="white" 
                    py={4} 
                    px={6}
                    display="flex" 
                    alignItems="center">
                    <Circle 
                      size="36px" 
                      bg="white" 
                      color="brand.800" 
                      fontWeight="bold"
                      mr={4}>
                      {day.number}
                    </Circle>
                    <Heading size="md">Day {day.number}</Heading>
                  </CardHeader>
                  <CardBody>
                    <Stack spacing={4}>
                      {/* Group activities by time period */}
                      {(() => {
                        // Group activities by time
                        const timeGroups = {};
                        day.activities.forEach(activity => {
                          // Extract just the base time period (Morning, Afternoon, Evening)
                          const basePeriod = activity.time.split(' ')[0];
                          if (!timeGroups[basePeriod]) {
                            timeGroups[basePeriod] = [];
                          }
                          timeGroups[basePeriod].push(activity);
                        });
                        
                        // Render each time group
                        return Object.entries(timeGroups).map(([timePeriod, activities]) => (
                          <Box key={timePeriod} mb={6}>
                            <Text 
                              fontWeight="bold" 
                              color="brand.800" 
                              fontSize="lg"
                              borderBottom="2px solid"
                              borderColor="brand.200"
                              pb={1}
                              mb={3}>
                              {timePeriod}
                            </Text>
                            {activities.map((activity, activityIndex) => (
                              <HStack key={activityIndex} spacing={2} ml={4} mb={3} alignItems="flex-start">
                                <Box 
                                  w="3px" 
                                  h="full" 
                                  bg="brand.100" 
                                  flexShrink={0}
                                  alignSelf="stretch"
                                />
                                <Text color="gray.700">
                                  {activity.description}
                                </Text>
                              </HStack>
                            ))}
                          </Box>
                        ));
                      })()}
                    </Stack>
                  </CardBody>
                </Card>
              ))}
            </Stack>
          </TabPanel>

          {/* Accommodation Tab */}
          <TabPanel>
            <Heading size="lg" mb={6}>Recommended Accommodations</Heading>
            {itinerary.accommodations && itinerary.accommodations.length > 0 ? (
              <Stack spacing={8}>
                {itinerary.accommodations.map((category, catIndex) => (
                  <Box key={catIndex}>
                    <Heading size="md" mb={4} color="brand.700" borderBottom="2px solid" borderColor="brand.100" pb={2}>
                      {category.name}
                        </Heading>
                    
                    <Card variant="outline" boxShadow="sm">
                    <CardBody>
                        {/* Display the raw markdown content */}
                        <Box className="markdown-content" whiteSpace="pre-wrap">
                          {category.description}
                          </Box>
                    </CardBody>
                  </Card>
                  </Box>
                ))}
              </Stack>
            ) : (
              <Text fontSize="lg" color="gray.600">
                No specific accommodations have been recommended for this trip.
              </Text>
            )}
          </TabPanel>

          {/* Dining Tab */}
          <TabPanel>
            <Heading size="lg" mb={6}>Dining Recommendations</Heading>
            <Stack spacing={8}>
              {itinerary.dining.map((item, index) => (
                item.isCategory ? (
                  // Category header
                  <Box key={index}>
                    <Heading size="md" mb={4} color="brand.700" borderBottom="2px solid" borderColor="brand.100" pb={2}>
                      {item.name}
                    </Heading>
                  </Box>
                ) : (
                  // Regular item
                <Card key={index} variant="outline">
                  <CardBody>
                    <VStack align="flex-start" spacing={2}>
                      <Heading size="md">{item.name}</Heading>
                      <Badge colorScheme="brand">{item.type}</Badge>
                        {item.cuisine && (
                      <Text fontWeight="medium">
                        <strong>Specialty:</strong> {item.cuisine}
                      </Text>
                        )}
                      <Text color="gray.600">{item.description}</Text>
                    </VStack>
                  </CardBody>
                </Card>
                )
              ))}
            </Stack>
          </TabPanel>

          {/* Tips Tab */}
          <TabPanel>
            <Heading size="lg" mb={6}>Insider Tips</Heading>
            <Stack spacing={4}>
              {itinerary.tips.map((tip, index) => (
                <Card key={index} variant="outline">
                  <CardBody>
                    <HStack align="flex-start">
                      <Text fontSize="xl" mr={2}>
                        {tip.category.includes("Hotel") ? "🏨" : 
                         tip.category.includes("Transport") ? "🚕" : 
                         tip.category.includes("Dining") ? "🍽️" : 
                         tip.category.includes("Shopping") ? "🛍️" : 
                         tip.category.includes("Cultural") ? "🏛️" : "💡"}
                      </Text>
                      <VStack align="start" spacing={0}>
                        <Text fontWeight="bold">{tip.category.replace(/🏨|🚕|🍽️|🛍️|🏛️|💡/g, '').trim()}</Text>
                        <Text>{tip.description}</Text>
                        {tip.cost && <Text fontSize="sm" color="gray.600" mt={1}>Estimated cost: {tip.cost}</Text>}
                      </VStack>
                    </HStack>
                  </CardBody>
                </Card>
              ))}
            </Stack>
          </TabPanel>

          {/* Images Tab */}
          <TabPanel>
            <Heading size="lg" mb={6}>Destination Gallery</Heading>
            
            {itinerary.images && itinerary.images.length > 0 ? (
              <Box>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6} mb={8}>
                  {itinerary.images.map((image, index) => (
                    <Card key={index} overflow="hidden" variant="outline">
                      <Image 
                        src={image.url} 
                        alt={`${itinerary.destination} - Image ${index + 1}`}
                        h="220px"
                        w="100%"
                        objectFit="cover"
                        fallbackSrc={cityImages[index % cityImages.length]}
                      />
                      <CardBody p={3}>
                        <Text fontSize="sm" color="gray.600" mb={1}>
                          {itinerary.destination}{index === 0 ? ' - Featured Image' : ''}
                        </Text>
                        {image.source && (
                          <Text fontSize="xs" color="gray.500">
                            Source: {image.source}
                          </Text>
                        )}
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
                
                <Text fontSize="sm" color="gray.500" textAlign="center" mb={4}>
                  Images sourced through Google Search API
                </Text>
              </Box>
            ) : (
              <Box textAlign="center" py={8}>
                <Text fontSize="lg" color="gray.600" mb={6}>
                  No images available for this destination.
                </Text>
                <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                  {cityImages.map((imageUrl, index) => (
                    <Card key={index} overflow="hidden" variant="outline">
                      <Image 
                        src={imageUrl} 
                        alt={`${itinerary.destination} - Fallback Image ${index + 1}`}
                        h="220px"
                        w="100%"
                        objectFit="cover"
                      />
                      <CardBody p={3}>
                        <Text fontSize="sm" color="gray.600">
                          {itinerary.destination} - Fallback Image
                        </Text>
                      </CardBody>
                    </Card>
                  ))}
                </SimpleGrid>
              </Box>
            )}
            
            {/* Raw API Response */}
            <Accordion allowToggle mt={8}>
              <AccordionItem>
                <h2>
                  <AccordionButton>
                    <Box flex="1" textAlign="left" fontWeight="medium">
                      Raw API Response
                    </Box>
                    <AccordionIcon />
                  </AccordionButton>
                </h2>
                <AccordionPanel pb={4}>
                  <Box bg="gray.50" borderRadius="md">
                    <Box bg="gray.900" color="gray.100" p={4} borderRadius="md" maxH="300px" overflowY="auto" overflowX="auto">
                <Text fontFamily="monospace" fontSize="sm" whiteSpace="pre-wrap">
                  {itinerary.rawApiResponse || 'No API response data available'}
                </Text>
              </Box>
            </Box>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>
          </TabPanel>

          {/* Additional Info Tab */}
          <TabPanel>
            <Heading size="lg" mb={6}>Additional Information</Heading>
            {itinerary.blogPosts && itinerary.blogPosts.length > 0 ? (
              <Stack spacing={6}>
                <Text fontSize="lg" fontWeight="medium" color="gray.700">
                  Explore these helpful articles and blog posts about {itinerary.destination}:
                </Text>
                
                {/* Resource Links Section - Daha öne çıkarılmış tasarım */}
                {itinerary.insights && (() => {
                  // Tüm markdown linklerini çıkar: [başlık](url) formatındaki tüm linkleri bulur
                  const extractLinks = (text) => {
                    const links = [];
                    
                    // First try to parse as JSON if it appears to be JSON data
                    if (text && (text.includes('"title":') || text.includes('"url":'))) {
                      try {
                        // Check if the entire text is JSON
                        const jsonData = JSON.parse(text);
                        if (Array.isArray(jsonData)) {
                          return jsonData.map(item => ({
                            title: item.title || 'Link',
                            url: item.url || '#',
                            source: item.source || extractSourceFromUrl(item.url) || 'Unknown'
                          }));
                        }
                      } catch (e) {
                        // Not valid JSON, continue with regex extraction
                        console.log("Text wasn't valid JSON, continuing with regex extraction");
                      }
                    }
                    
                    // If not JSON or JSON parsing failed, try regular Markdown extraction
                    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                    let match;
                    
                    while ((match = linkRegex.exec(text)) !== null) {
                      links.push({
                        title: match[1],
                        url: match[2],
                        source: match[1].split(' - ').pop() || extractSourceFromUrl(match[2])
                      });
                    }
                    
                    return links;
                  };
                  
                  // insights içerisinden tüm linkleri çıkar
                  const allLinks = extractLinks(itinerary.insights);
                  
                  if (allLinks.length > 0) {
                    // Linkleri kategorilere ayır
                    const categorizeLink = (link) => {
                      const url = link.url.toLowerCase();
                      const title = link.title.toLowerCase();
                      
                      // Kategori belirleme mantığı - url ve başlıktaki anahtar kelimelere göre
                      if (title.includes('time') || title.includes('season') || title.includes('when') || 
                          title.includes('weather') || title.includes('month') || title.includes('spring') || 
                          title.includes('summer') || title.includes('winter') || title.includes('fall') ||
                          title.includes('autumn')) {
                        return 'bestTime';
                      } else if (title.includes('hidden') || title.includes('secret') || title.includes('gem') || 
                                title.includes('off the beaten') || title.includes('offbeat') || title.includes('locals') ||
                                title.includes('authentic') || title.includes('unique')) {
                        return 'hiddenGems';
                      } else if (title.includes('tip') || title.includes('guide') || title.includes('advice') || 
                                title.includes('know before') || title.includes('must know') || title.includes('passport') || 
                                title.includes('transport') || title.includes('travel') || title.includes('budget')) {
                        return 'travelTips';
                      } else if (title.includes('experience') || title.includes('cultural') || title.includes('food') || 
                                title.includes('museum') || title.includes('attraction') || title.includes('restaurant') || 
                                title.includes('visit') || title.includes('see') || title.includes('tour')) {
                        return 'localExperiences';
                      } else {
                        // Varsayılan kategori - belirlenemezse genel olarak Travel Tips'e atıyoruz
                        return 'travelTips';
                      }
                    };
                    
                    // Linkleri kategorilere ayır
                    const categorizedLinks = {
                      bestTime: [],
                      localExperiences: [],
                      hiddenGems: [],
                      travelTips: []
                    };
                    
                    allLinks.forEach(link => {
                      const category = categorizeLink(link);
                      categorizedLinks[category].push(link);
                    });
                    
                    // Kategorilere göre renkler ve ikonlar belirle
                    const categoryStyles = {
                      bestTime: { color: 'blue', icon: FaRegCalendarAlt },
                      localExperiences: { color: 'green', icon: FaRegLightbulb },
                      hiddenGems: { color: 'orange', icon: FaRegGem },
                      travelTips: { color: 'purple', icon: FaRegStar }
                    };
                    
                    // Tüm kategorileri oluştur (her biri için en az 1 link varsa göster)
                    return (
                <Box mt={8}>
                        <Heading as="h3" size="md" mb={5} color="gray.700" fontWeight="semibold" textAlign="center">
                          Top Resources for {itinerary.destination}
                        </Heading>
                        
                        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
                          {Object.entries(categorizedLinks).map(([category, links]) => {
                            // Kategori boşsa gösterme
                            if (links.length === 0) return null;
                            
                            const { color, icon } = categoryStyles[category];
                            const categoryNames = {
                              bestTime: "Best Time to Visit",
                              localExperiences: "Local Experiences",
                              hiddenGems: "Hidden Gems",
                              travelTips: "Travel Tips"
                            };
                            
                            return (
                              <Card 
                                key={category} 
                                p={4} 
                                shadow="sm" 
                                borderRadius="lg" 
                                borderLeftWidth="4px" 
                                borderLeftColor={`${color}.400`}
                              >
                                <VStack align="start" spacing={3}>
                                  <Flex w="100%" justify="space-between" align="center">
                                    <Heading as="h4" size="sm" color={`${color}.600`}>
                                      {categoryNames[category]}
                                    </Heading>
                                    <Icon as={icon} color={`${color}.400`} boxSize={5} />
                                  </Flex>
                                  
                                  {/* Kategori açıklaması - dinamik olarak insights'dan ilgili başlığı bul */}
                                  {(() => {
                                    const categoryRegex = new RegExp(`${categoryNames[category]}[\\s\\S]*?(?=###|$)`);
                                    const categorySection = itinerary.insights.match(categoryRegex);
                                    
                                    if (categorySection) {
                                      const bulletPoints = categorySection[0].match(/- [^\n]*/g);
                                      if (bulletPoints && bulletPoints.length > 0) {
                                        // Sadece ilk bullet point'i göster, diğerleri için link sunalım
                                        return (
                                          <Text color="gray.600" fontSize="sm" mb={2}>
                                            {bulletPoints[0].replace(/- /, '')}
                        </Text>
                                        );
                                      }
                                    }
                                    
                                    return null;
                                  })()}
                                  
                                  {/* Kategoriye ait linkler */}
                                  <VStack align="stretch" w="100%" spacing={2}>
                                    {links.map((link, idx) => (
                                <Link 
                                        key={idx}
                                        href={link.url}
                                  isExternal
                                        p={2}
                                  borderRadius="md"
                                        bg={`${color}.50`}
                                        color={`${color}.800`}
                                        fontSize="sm"
                                        fontWeight="medium"
                                        _hover={{ 
                                          bg: `${color}.100`, 
                                          textDecoration: "none"
                                        }}
                                  display="flex"
                                        justifyContent="space-between"
                                  alignItems="center"
                                >
                                        <Box overflow="hidden" textOverflow="ellipsis" whiteSpace="nowrap" mr={2}>
                                          {link.title.split(' - ')[0]}
                                        </Box>
                                        <Icon as={FaExternalLinkAlt} boxSize={3} />
                                </Link>
                                    ))}
                                  </VStack>
                                </VStack>
                              </Card>
                              );
                            })}
                          </SimpleGrid>
                      </Box>
                    );
                  }
                  
                  return null;
                })()}

                {/* Tüm kaynak linklerini direkt görüntüleyen bölüm */}
                {itinerary.insights && (() => {
                  // Tüm markdown linklerini çıkar
                  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
                  const links = [];
                  let match;
                  
                  // Debug için insights verisini konsola yazdır
                  console.log("Insights data:", itinerary.insights);
                  console.log("Insights data type:", typeof itinerary.insights);
                  
                  // insights içinde linkler varsa çıkar
                  if (itinerary.insights && typeof itinerary.insights === 'string') {
                    let insightsCopy = itinerary.insights;
                    // Debug için örnek bir link ekle
                    if (!insightsCopy.includes("[") || !insightsCopy.includes("]")) {
                      console.log("No markdown links found in insights data. Adding a sample link to the insights copy for testing");
                      insightsCopy += "\n\n[Sample Link](https://example.com)";
                    }
                    
                    console.log("Testing regex on insights copy");
                    while ((match = linkRegex.exec(insightsCopy)) !== null) {
                      console.log("Found link:", match[0], "Title:", match[1], "URL:", match[2]);
                      links.push({
                        title: match[1],
                        url: match[2]
                      });
                    }
                    console.log("Total links found:", links.length);
                  } else {
                    console.log("Insights data is either undefined or not a string");
                  }
                  
                  // Sorun giderme bilgisi göster (Kullanıcıya yardımcı olmak için)
                  const showDebugInfo = true; // Geliştirme sürecinde true, üretime alırken false yapılabilir
                  
                  // Linkleri göster (varsa)
                  if (links.length > 0) {
                    return (
                      <Box mt={8} borderWidth="1px" borderRadius="lg" overflow="hidden">
                        <Box bg="gray.50" p={4} borderBottomWidth="1px">
                          <Heading size="md" color="gray.700">
                            Useful Resources for {itinerary.destination}
                          </Heading>
                        </Box>
                        
                        <Box p={4}>
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            {links.map((link, idx) => (
                            <Link 
                                key={idx}
                                href={link.url}
                              isExternal
                              p={3}
                              borderWidth="1px"
                                borderRadius="md"
                              display="flex"
                              alignItems="center"
                                _hover={{
                                  bg: "gray.50",
                                  textDecoration: "none",
                                  borderColor: "brand.200"
                                }}
                              >
                                <Box 
                                  bg="brand.50" 
                                  p={2} 
                              borderRadius="md"
                                  color="brand.500" 
                                  fontSize="lg"
                                  mr={3}
                                >
                                  🔗
                                </Box>
                                <Box>
                                  <Text fontWeight="bold" fontSize="sm">{link.title}</Text>
                                  <Text fontSize="xs" color="gray.500" noOfLines={1}>{link.url}</Text>
                                </Box>
                            </Link>
                            ))}
                          </SimpleGrid>
                        </Box>
                      </Box>
                    );
                  }
                  
                  // Debug bilgisini göster (links.length === 0 ise)
                  if (showDebugInfo && links.length === 0) {
                    return (
                      <Box mt={8} p={4} bg="red.50" borderRadius="md" borderWidth="1px">
                        <Heading size="sm" color="red.700" mb={3}>
                          No Resource Links Found in Data
                        </Heading>
                        <Text fontSize="sm" mb={2}>
                          API'den gelen insights verisinde, Markdown formatında link bulunamadı. Linklerin [başlık](url) formatında olması gerekiyor.
                        </Text>
                        <Text fontSize="sm" fontFamily="mono" p={2} bg="white" borderRadius="md" mb={3}>
                          Örnek link formatı: [Tripadvisor](https://www.tripadvisor.com)
                        </Text>
                        <Text fontSize="sm">
                          Bu sorunu çözmek için, API yanıtında insights kısmına Markdown formatında linkler eklendiğinden emin olun.
                        </Text>
                      </Box>
                    );
                  }
                  
                  return null;
                })()}

                {/* Direct URL Cards - For JSON-formatted links when other methods don't work */}
                {(() => {
                  // Only show this component if we don't have other links showing
                  // Check if we have raw JSON data directly in the insights field
                  try {
                    // First check if we have sources array directly in the itinerary object
                    let jsonData = null;
                    
                    // Prioritize the sources array if it exists
                    if (itinerary.sources && Array.isArray(itinerary.sources) && itinerary.sources.length > 0) {
                      jsonData = itinerary.sources;
                      console.log("Using itinerary.sources array:", jsonData);
                    }
                    // Otherwise try to parse insights as JSON
                    else if (typeof itinerary.insights === 'string' && 
                        (itinerary.insights.includes('"title":') || itinerary.insights.includes('"url":'))) {
                      try {
                        jsonData = JSON.parse(itinerary.insights);
                        console.log("Successfully parsed insights as JSON:", jsonData);
                      } catch (e) {
                        console.log("Failed to parse insights as JSON");
                      }
                    }
                    // If insights isn't parseable JSON, check if rawApiResponse has the links
                    else if (itinerary.rawApiResponse) {
                      try {
                        const apiData = JSON.parse(itinerary.rawApiResponse);
                        if (apiData.reviews && typeof apiData.reviews === 'string' &&
                            (apiData.reviews.includes('"title":') || apiData.reviews.includes('"url":'))) {
                          jsonData = JSON.parse(apiData.reviews);
                          console.log("Successfully extracted links from rawApiResponse:", jsonData);
                        }
                      } catch (e) {
                        console.log("Failed to extract links from rawApiResponse");
                      }
                    }

                    if (Array.isArray(jsonData) && jsonData.length > 0) {
                      // Filter out image links - only keep review resources
                      const reviewResources = jsonData.filter(link => {
                        const url = link.url ? link.url.toLowerCase() : '';
                        const title = link.title ? link.title.toLowerCase() : '';
                        
                        // Check if it's clearly an image by extension or content
                        const isImage = url.endsWith('.jpg') || url.endsWith('.jpeg') || 
                                       url.endsWith('.png') || url.endsWith('.gif') || 
                                       url.endsWith('.webp') || url.endsWith('.svg') ||
                                       url.includes('/images/') || url.includes('/photos/') ||
                                       url.includes('shutterstock') || url.includes('thumb') ||
                                       title.endsWith('.jpg') || title.endsWith('.jpeg') || 
                                       title.endsWith('.png') || title.endsWith('.webp');
                        
                        // Return true only for non-image resources
                        return !isImage;
                      });
                      
                      // Function to clean up titles for better display
                      const cleanTitle = (title) => {
                        if (!title) return "Resource Link";
                        
                        // Remove file extensions
                        let cleanedTitle = title
                          .replace(/\.html\)?$/i, '')
                          .replace(/\.htm\)?$/i, '')
                          .replace(/\.webp$/i, '')
                          .replace(/\.jpg$/i, '')
                          .replace(/\.jpeg$/i, '')
                          .replace(/\.png$/i, '')
                          .replace(/\.gif$/i, '');
                        
                        // Remove trailing parentheses
                        cleanedTitle = cleanedTitle.replace(/\)+$/, '');
                        
                        // Handle empty titles after cleaning
                        if (!cleanedTitle.trim()) return "Resource Link";
                        
                        // Handle the case where title is just a closing parenthesis
                        if (cleanedTitle === ')') return "Resource Link";
                        
                        // Format the title nicely - convert from URL format to readable title
                        cleanedTitle = cleanedTitle
                          .replace(/_/g, ' ')
                          .replace(/-/g, ' ')
                          .replace(/([A-Z])/g, ' $1') // Add space before capital letters
                          .replace(/\s+/g, ' ')       // Remove multiple spaces
                          .trim();
                          
                        // Capitalize first letter of each word for a nicer display
                        return cleanedTitle
                          .split(' ')
                          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                          .join(' ');
                      };
                      
                      if (reviewResources.length === 0) {
                        return null; // Don't show the section if no review resources
                      }

                      return (
                        <Box mt={8}>
                          <Heading as="h3" size="md" mb={5} color="gray.700" fontWeight="semibold">
                            Useful Resources for {itinerary.destination}
                          </Heading>
                          
                          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
                            {reviewResources.map((link, idx) => {
                              // Determine icon and color based on source
                              let icon = "🔗";
                              let color = "blue.500";
                              let bgColor = "blue.50";
                              let source = link.source || "Resource";
                              
                              if (source.toLowerCase().includes("tripadvisor")) {
                                icon = "🧭";
                                color = "green.500";
                                bgColor = "green.50";
                              } else if (source.toLowerCase().includes("visit")) {
                                icon = "🌍";
                                color = "purple.500";
                                bgColor = "purple.50";
                              } else if (source.toLowerCase().includes("travel")) {
                                icon = "✈️";
                                color = "orange.500";
                                bgColor = "orange.50";
                              } else if (source.toLowerCase().includes("embassy")) {
                                icon = "🏛️";
                                color = "red.500";
                                bgColor = "red.50";
                              } else if (source.toLowerCase().includes("reddit")) {
                                icon = "💬";
                                color = "orange.500";
                                bgColor = "orange.50";
                              } else if (source.toLowerCase().includes("shutterstock")) {
                                icon = "📸";
                                color = "teal.500";
                                bgColor = "teal.50";
                              }
                              
                              return (
                            <Link 
                                  key={idx}
                                  href={link.url}
                              isExternal
                              p={3}
                              borderWidth="1px"
                                  borderRadius="md"
                                  borderColor={`${color.split('.')[0]}.200`}
                                  bg={bgColor}
                              display="flex"
                              alignItems="center"
                                  _hover={{
                                    transform: "translateY(-2px)",
                                    shadow: "md",
                                    textDecoration: "none"
                                  }}
                                  transition="all 0.2s"
                                >
                                  <Box 
                                    bg="white" 
                                    p={2} 
                              borderRadius="md"
                                    boxShadow="sm"
                                    fontSize="lg"
                                    mr={3}
                                  >
                                    {icon}
                                  </Box>
                                  <Box>
                                    <Text fontWeight="bold" fontSize="sm" noOfLines={1}>{cleanTitle(link.title)}</Text>
                                    <Text fontSize="xs" color="gray.500" noOfLines={1}>{source}</Text>
                                  </Box>
                            </Link>
                              );
                            })}
                          </SimpleGrid>
                </Box>
                      );
                    }
                  } catch (error) {
                    console.error("Error rendering direct URL cards:", error);
                  }
                  
                  return null;
                })()}
              </Stack>
            ) : (
            <Text fontSize="lg" color="gray.600">
              No additional information has been provided for this trip.
            </Text>
            )}
          </TabPanel>
        </TabPanels>
      </Tabs>

      <Box mt={10} textAlign="center">
        <Button
          as={RouterLink}
          to="/questionnaire"
          size="lg"
          colorScheme="brand"
          px={8}
          leftIcon={<Box as="span" fontSize="1.5em">✈️</Box>}>
          Create a New Itinerary
        </Button>
      </Box>
    </Container>
  );
}

export default ItineraryPage; 