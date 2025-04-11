import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { travelApi } from '../services/api';

const QuestionnaireContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
`;

const Header = styled.div`
  margin-bottom: 2rem;
  text-align: center;
`;

const Title = styled.h1`
  font-size: 2.5rem;
  margin-bottom: 1rem;
`;

const Subtitle = styled.p`
  font-size: 1.2rem;
  color: #666;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  margin: 2rem 0;
`;

const Progress = styled.div`
  height: 100%;
  border-radius: 4px;
  background-color: #1a3b5d;
  width: ${props => props.value}%;
  transition: width 0.3s ease;
`;

const StepContainer = styled.div`
  margin-bottom: 2rem;
`;

const QuestionTitle = styled.h2`
  font-size: 1.5rem;
  margin-bottom: 1rem;
`;

const InputContainer = styled.div`
  margin-bottom: 1.5rem;
`;

const TextInput = styled.input`
  width: 100%;
  padding: 1rem;
  font-size: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  &:focus {
    outline: none;
    border-color: #1a3b5d;
  }
`;

const RadioOption = styled.div`
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    border-color: #1a3b5d;
  }
  
  ${props => props.selected && `
    border-color: #1a3b5d;
    background-color: rgba(26, 59, 93, 0.1);
  `}
`;

const RadioButton = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${props => props.selected ? '#1a3b5d' : '#ddd'};
  margin-right: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &::after {
    content: '';
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background-color: #1a3b5d;
    display: ${props => props.selected ? 'block' : 'none'};
  }
`;

const OptionLabel = styled.span`
  font-size: 1rem;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 2rem;
`;

const Button = styled.button`
  padding: 1rem 2rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  transition: background-color 0.3s;
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const BackButton = styled(Button)`
  background-color: #e0e0e0;
  color: #333;
  
  &:hover:not(:disabled) {
    background-color: #d0d0d0;
  }
`;

const NextButton = styled(Button)`
  background-color: #1a3b5d;
  color: white;
  
  &:hover:not(:disabled) {
    background-color: #0f2942;
  }
`;

function QuestionnairePage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    destination: '',
    trip_length: '',
    budget: '',
    interests: [],
    additionalInfo: [],
    get_insights: false,
    get_images: false
  });
  
  // Questions and options for the questionnaire
  const steps = [
    {
      title: 'Where would you like to travel?',
      type: 'text',
      field: 'destination'
    },
    {
      title: 'How long will your trip be?',
      type: 'radio',
      field: 'tripLength',
      options: [
        { value: 'weekend', label: 'Weekend getaway (1-3 days)' },
        { value: 'short', label: 'Short trip (4-6 days)' },
        { value: 'week', label: 'Week-long vacation (7-10 days)' },
        { value: 'extended', label: 'Extended journey (11+ days)' }
      ]
    },
    {
      title: 'What is your approximate budget per person?',
      type: 'radio',
      field: 'budget',
      options: [
        { value: 'budget', label: 'Budget ($0-$1000)' },
        { value: 'moderate', label: 'Moderate ($1000-$3000)' },
        { value: 'luxury', label: 'Luxury ($3000-$10000)' },
        { value: 'ultra', label: 'Ultra-luxury ($10000+)' }
      ]
    },
    {
      title: 'What activities are you interested in?',
      type: 'checkbox',
      field: 'interests',
      options: [
        { value: 'beach', label: 'Beach & Water Sports' },
        { value: 'culture', label: 'Cultural Exploration' },
        { value: 'food', label: 'Food & Cuisine' },
        { value: 'hiking', label: 'Hiking & Nature' },
        { value: 'shopping', label: 'Shopping' },
        { value: 'nightlife', label: 'Nightlife' },
        { value: 'art', label: 'Art & Museums' },
        { value: 'adventure', label: 'Adventure Sports' }
      ]
    },
    {
      title: 'Would you like additional information about your vacation?',
      type: 'checkbox',
      field: 'additionalInfo',
      options: [
        { value: 'festivals', label: 'Local festivals & events' },
        { value: 'covid', label: 'COVID-19 travel restrictions' },
        { value: 'transport', label: 'Transportation options' },
        { value: 'family', label: 'Family-friendly tips' },
        { value: 'insurance', label: 'Travel insurance' },
        { value: 'visa', label: 'Visa requirements' },
        { value: 'customs', label: 'Local customs & etiquette' },
        { value: 'weather', label: 'Weather forecasts' }
      ]
    }
  ];
  
  // Calculate progress percentage
  const progress = ((currentStep + 1) / steps.length) * 100;
  
  // Check if current step is valid to proceed
  const isStepValid = () => {
    const step = steps[currentStep];
    const value = formData[step.field];
    
    if (step.type === 'text') {
      return value.trim() !== '';
    } else if (step.type === 'radio') {
      return value !== '';
    } else if (step.type === 'checkbox') {
      return value.length > 0;
    }
    
    return false;
  };
  
  // Handle text input change
  const handleTextChange = (e) => {
    setFormData({
      ...formData,
      [steps[currentStep].field]: e.target.value
    });
  };
  
  // Handle radio selection
  const handleRadioSelect = (value) => {
    setFormData({
      ...formData,
      [steps[currentStep].field]: value
    });
  };
  
  // Handle checkbox toggle
  const handleCheckboxToggle = (value) => {
    const field = steps[currentStep].field;
    const currentValues = formData[field];
    
    if (currentValues.includes(value)) {
      setFormData({
        ...formData,
        [field]: currentValues.filter(item => item !== value)
      });
    } else {
      setFormData({
        ...formData,
        [field]: [...currentValues, value]
      });
    }
  };
  
  // Go to previous step
  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  // Go to next step or submit form
  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      try {
        // Start loading
        setIsSubmitting(true);
        
        // Prepare data for backend format
        const backendData = {
          destination: formData.destination,
          trip_length: getTripLengthValue(formData.tripLength),
          budget: formData.budget,
          interests: formData.interests,
          get_insights: formData.additionalInfo.includes('festivals') || 
                         formData.additionalInfo.includes('customs') || 
                         formData.additionalInfo.includes('covid'),
          get_images: true
        };
        
        console.log('Submitting to backend:', backendData);
        
        // Call backend API
        const response = await travelApi.submitPreferences(backendData);
        console.log('API Response:', response);
        
        // Navigate to the generated itinerary
        if (response.data && response.data.id) {
          navigate(`/itinerary/${response.data.id}`);
        } else {
          // If no ID is returned, use a temporary one based on timestamp
          navigate(`/itinerary/temp-${Date.now()}`);
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error creating your itinerary. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };
  
  // Helper function to convert trip length text to numeric value
  const getTripLengthValue = (tripLength) => {
    switch(tripLength) {
      case 'weekend': return 3;
      case 'short': return 5;
      case 'week': return 7;
      case 'extended': return 14;
      default: return 5;
    }
  };
  
  // Render input based on step type
  const renderStepInput = () => {
    const step = steps[currentStep];
    
    switch (step.type) {
      case 'text':
        return (
          <InputContainer>
            <TextInput
              type="text"
              value={formData[step.field]}
              onChange={handleTextChange}
              placeholder={`Type your ${step.field}`}
            />
          </InputContainer>
        );
        
      case 'radio':
        return (
          <InputContainer>
            {step.options.map(option => (
              <RadioOption
                key={option.value}
                selected={formData[step.field] === option.value}
                onClick={() => handleRadioSelect(option.value)}
              >
                <RadioButton selected={formData[step.field] === option.value} />
                <OptionLabel>{option.label}</OptionLabel>
              </RadioOption>
            ))}
          </InputContainer>
        );
        
      case 'checkbox':
        return (
          <InputContainer>
            {step.options.map(option => (
              <RadioOption
                key={option.value}
                selected={formData[step.field].includes(option.value)}
                onClick={() => handleCheckboxToggle(option.value)}
              >
                <RadioButton selected={formData[step.field].includes(option.value)} />
                <OptionLabel>{option.label}</OptionLabel>
              </RadioOption>
            ))}
          </InputContainer>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <QuestionnaireContainer>
      <Header>
        <Title>Plan Your Perfect Trip</Title>
        <Subtitle>Tell us about your travel preferences</Subtitle>
        <ProgressBar>
          <Progress value={progress} />
        </ProgressBar>
      </Header>
      
      <StepContainer>
        <QuestionTitle>{steps[currentStep].title}</QuestionTitle>
        {renderStepInput()}
      </StepContainer>
      
      <ButtonContainer>
        <BackButton
          disabled={currentStep === 0 || isSubmitting}
          onClick={handleBack}
        >
          Back
        </BackButton>
        <NextButton
          disabled={!isStepValid() || isSubmitting}
          onClick={handleNext}
        >
          {isSubmitting 
            ? 'Creating Itinerary...' 
            : currentStep === steps.length - 1 
              ? 'Create Itinerary' 
              : 'Next'}
        </NextButton>
      </ButtonContainer>
    </QuestionnaireContainer>
  );
}

export default QuestionnairePage; 