import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import { QueryClient, QueryClientProvider } from 'react-query'
import App from './App.jsx'
import './index.css'

// Create a custom theme
const theme = extendTheme({
  colors: {
    brand: {
      50: '#e6f1f9',
      100: '#c8ddf0',
      200: '#a7c8e6',
      300: '#83b1dc',
      400: '#629ad3',
      500: '#4282c9',
      600: '#3968a1',
      700: '#2d4d78',
      800: '#1a3b5d', // Primary brand color
      900: '#0f2942',
    },
  },
  fonts: {
    heading: "'Poppins', sans-serif",
    body: "'Inter', sans-serif",
  },
  components: {
    Button: {
      defaultProps: {
        colorScheme: 'brand',
      },
    },
  },
});

// Create a client for React Query
const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider theme={theme}>
        <App />
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>,
) 