import { useNavigate } from 'react-router-dom';
import {
  Box,
  Heading,
  Container,
  Text,
  Button,
  Stack,
  Icon,
  useColorModeValue,
  createIcon,
  Flex,
  SimpleGrid,
  Image,
  VStack,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

// Wrap Chakra components with motion
const MotionBox = motion(Box);
const MotionFlex = motion(Flex);
const MotionText = motion(Text);

export default function HomePage() {
  const navigate = useNavigate();

  const handleStartPlanning = () => {
    navigate('/questionnaire');
  };

  return (
    <Box>
      {/* Hero Section */}
      <Container maxW={'7xl'}>
        <Stack
          align={'center'}
          spacing={{ base: 8, md: 10 }}
          py={{ base: 20, md: 28 }}
          direction={{ base: 'column', md: 'row' }}>
          <Stack flex={1} spacing={{ base: 5, md: 10 }}>
            <MotionBox
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}>
              <Heading
                lineHeight={1.1}
                fontWeight={600}
                fontSize={{ base: '3xl', sm: '4xl', lg: '6xl' }}>
                <Text
                  as={'span'}
                  position={'relative'}
                  _after={{
                    content: "''",
                    width: 'full',
                    height: '30%',
                    position: 'absolute',
                    bottom: 1,
                    left: 0,
                    bg: 'brand.400',
                    zIndex: -1,
                  }}>
                  Plan your journey
                </Text>
                <br />
                <Text as={'span'} color={'brand.800'}>
                  with AI assistance
                </Text>
              </Heading>
              <MotionText
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                color={'gray.500'}
                maxW={'3xl'}
                fontSize={'xl'}
                mt={5}>
                Create personalized travel itineraries tailored to your preferences,
                budget, and interests. Our AI-powered system finds the perfect
                destinations and experiences just for you.
              </MotionText>
            </MotionBox>
            <Stack
              spacing={{ base: 4, sm: 6 }}
              direction={{ base: 'column', sm: 'row' }}>
              <MotionBox
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}>
                <Button
                  rounded={'full'}
                  size={'lg'}
                  fontWeight={'normal'}
                  px={6}
                  bg={'brand.800'}
                  color={'white'}
                  _hover={{ bg: 'brand.600' }}
                  onClick={handleStartPlanning}>
                  Start Planning
                </Button>
              </MotionBox>
              <MotionBox
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7, duration: 0.5 }}>
                <Button
                  rounded={'full'}
                  size={'lg'}
                  fontWeight={'normal'}
                  px={6}
                  leftIcon={<PlayIcon h={4} w={4} color={'gray.300'} />}>
                  How It Works
                </Button>
              </MotionBox>
            </Stack>
          </Stack>
          <MotionFlex
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            flex={1}
            justify={'center'}
            align={'center'}
            position={'relative'}
            w={'full'}>
            <Blob
              w={'150%'}
              h={'150%'}
              position={'absolute'}
              top={'-20%'}
              left={0}
              zIndex={-1}
              color={useColorModeValue('brand.100', 'brand.400')}
            />
            <Box
              position={'relative'}
              height={'400px'}
              rounded={'2xl'}
              boxShadow={'2xl'}
              width={'full'}
              overflow={'hidden'}>
              <Image
                alt={'Hero Image'}
                fit={'cover'}
                align={'center'}
                w={'100%'}
                h={'100%'}
                src={'https://images.unsplash.com/photo-1530521954074-e64f6810b32d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80'}
              />
            </Box>
          </MotionFlex>
        </Stack>
      </Container>

      {/* Features Section */}
      <Box bg={useColorModeValue('gray.50', 'gray.900')} py={20}>
        <Container maxW={'7xl'}>
          <Heading
            textAlign={'center'}
            fontSize={'4xl'}
            py={10}
            fontWeight={'bold'}>
            Plan smarter, travel better
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} mt={10}>
            <FeatureCard
              title={'Personalized itineraries'}
              text={'Tailored recommendations based on your preferences and travel style.'}
              delay={0.1}
              icon={
                'https://images.unsplash.com/photo-1507608616759-54f48f0af0ee?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80'
              }
            />
            <FeatureCard
              title={'Budget optimization'}
              text={'Optimize your spending while maximizing experiences and comfort.'}
              delay={0.3}
              icon={
                'https://images.unsplash.com/photo-1565073182887-6bcefbe225b1?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=870&q=80'
              }
            />
            <FeatureCard
              title={'Hidden gems'}
              text={'Discover local favorites and off-the-beaten-path attractions.'}
              delay={0.5}
              icon={
                'https://images.unsplash.com/photo-1526495124232-a04e1849168c?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=387&q=80'
              }
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* How It Works Section */}
      <Box py={20}>
        <Container maxW={'7xl'}>
          <Heading
            textAlign={'center'}
            fontSize={'4xl'}
            py={10}
            fontWeight={'bold'}>
            How It Works
          </Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={10} mt={10}>
            <HowItWorksCard
              number="01"
              title="Share your preferences"
              description="Tell us about your travel style, budget, interests, and preferences."
              delay={0.1}
            />
            <HowItWorksCard
              number="02"
              title="AI creates your plan"
              description="Our AI analyzes thousands of options to create your perfect itinerary."
              delay={0.3}
            />
            <HowItWorksCard
              number="03"
              title="Enjoy your trip"
              description="Use your personalized itinerary to experience the perfect vacation."
              delay={0.5}
            />
          </SimpleGrid>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box bg={'brand.800'} color={'white'} py={16}>
        <Container maxW={'7xl'}>
          <Stack
            direction={{ base: 'column', md: 'row' }}
            spacing={4}
            align={'center'}
            justify={'center'}>
            <Stack flex={1} spacing={4} textAlign={{ base: 'center', md: 'left' }}>
              <Heading
                fontWeight={600}
                fontSize={{ base: '3xl', sm: '4xl', md: '5xl' }}
                lineHeight={'110%'}>
                Ready to start planning <br />
                <Text as={'span'} color={'brand.100'}>
                  your dream vacation?
                </Text>
              </Heading>
              <Text fontSize={'xl'} maxW={'lg'}>
                Experience the power of AI travel planning and create your perfect
                itinerary in minutes. No more hours of research.
              </Text>
            </Stack>
            <MotionBox
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              flex={1}
              justify={'center'}
              align={'center'}
              position={'relative'}
              w={'full'}>
              <Button
                rounded={'full'}
                size={'lg'}
                fontWeight={'bold'}
                px={8}
                bg={'white'}
                color={'brand.800'}
                _hover={{ bg: 'gray.200' }}
                onClick={handleStartPlanning}>
                Start Planning Now
              </Button>
            </MotionBox>
          </Stack>
        </Container>
      </Box>
    </Box>
  );
}

// Feature Card Component
function FeatureCard({ title, text, icon, delay }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      viewport={{ once: true }}>
      <VStack
        bg={useColorModeValue('white', 'gray.800')}
        boxShadow={'lg'}
        rounded={'xl'}
        p={6}
        textAlign={'center'}
        pos={'relative'}
        height={'full'}>
        <Box
          rounded={'xl'}
          mt={-12}
          pos={'relative'}
          height={'180px'}
          width={'100%'}
          overflow={'hidden'}>
          <Image
            alt={title}
            src={icon}
            objectFit={'cover'}
            h="100%"
            w="100%"
            rounded={'xl'}
          />
        </Box>
        <Heading fontSize={'2xl'} fontFamily={'body'} fontWeight={500} mt={4}>
          {title}
        </Heading>
        <Text fontSize={'md'} color={'gray.500'} mt={2}>
          {text}
        </Text>
      </VStack>
    </MotionBox>
  );
}

// How It Works Card Component
function HowItWorksCard({ number, title, description, delay }) {
  return (
    <MotionBox
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      viewport={{ once: true }}>
      <Stack
        bg={useColorModeValue('white', 'gray.700')}
        boxShadow={'md'}
        rounded={'xl'}
        p={8}
        textAlign={'center'}
        pos={'relative'}
        height={'full'}>
        <Box
          w={16}
          h={16}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
          bg={'brand.800'}
          color={'white'}
          rounded={'full'}
          mx={'auto'}
          mb={4}>
          <Text fontSize={'2xl'} fontWeight={'bold'}>
            {number}
          </Text>
        </Box>
        <Heading fontSize={'xl'} fontFamily={'body'} fontWeight={500}>
          {title}
        </Heading>
        <Text fontSize={'md'} color={'gray.500'}>
          {description}
        </Text>
      </Stack>
    </MotionBox>
  );
}

const PlayIcon = createIcon({
  displayName: 'PlayIcon',
  viewBox: '0 0 58 58',
  d: 'M28.9999 0.562988C13.3196 0.562988 0.562378 13.3202 0.562378 29.0005C0.562378 44.6808 13.3196 57.438 28.9999 57.438C44.6801 57.438 57.4374 44.6808 57.4374 29.0005C57.4374 13.3202 44.6801 0.562988 28.9999 0.562988ZM39.2223 30.272L23.5749 39.7247C23.3506 39.8591 23.0946 39.9314 22.8332 39.9342C22.5717 39.9369 22.3142 39.8701 22.0871 39.7406C21.86 39.611 21.6715 39.4234 21.5408 39.1969C21.4102 38.9705 21.3421 38.7133 21.3436 38.4519V19.5491C21.3421 19.2877 21.4102 19.0305 21.5408 18.8041C21.6715 18.5776 21.86 18.3899 22.0871 18.2604C22.3142 18.1308 22.5717 18.064 22.8332 18.0668C23.0946 18.0696 23.3506 18.1419 23.5749 18.2763L39.2223 27.729C39.4404 27.8619 39.6207 28.0486 39.7458 28.2713C39.8709 28.494 39.9366 28.7451 39.9366 29.0005C39.9366 29.2559 39.8709 29.507 39.7458 29.7297C39.6207 29.9523 39.4404 30.1391 39.2223 30.272Z',
});

export const Blob = (props) => {
  return (
    <Icon
      width={'100%'}
      viewBox="0 0 578 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M239.184 439.443c-55.13-5.419-110.241-21.365-151.074-58.767C42.307 338.722-7.478 282.729.938 221.217c8.433-61.644 78.896-91.048 126.871-130.712 34.337-28.388 70.198-51.348 112.004-66.78C282.34 8.024 325.382-3.369 370.518.904c54.019 5.115 112.774 10.886 150.881 49.482 39.916 40.427 49.421 100.753 53.385 157.402 4.13 59.015 11.255 128.44-30.444 170.44-41.383 41.683-111.6 19.106-169.213 30.663-46.68 9.364-88.56 35.21-135.943 30.551z"
        fill="currentColor"
      />
    </Icon>
  );
}; 