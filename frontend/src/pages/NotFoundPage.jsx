import React from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';

const NotFoundContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  text-align: center;
  padding: 2rem;
`;

const Title = styled.h1`
  font-size: 6rem;
  margin-bottom: 1rem;
  color: #1a3b5d;
`;

const Message = styled.p`
  font-size: 1.5rem;
  margin-bottom: 2rem;
`;

const HomeButton = styled(Link)`
  padding: 1rem 2rem;
  background-color: #1a3b5d;
  color: white;
  text-decoration: none;
  border-radius: 4px;
  font-size: 1rem;
  transition: background-color 0.3s;

  &:hover {
    background-color: #0f2942;
  }
`;

function NotFoundPage() {
  return (
    <NotFoundContainer>
      <Title>404</Title>
      <Message>Sorry, the page you are looking for does not exist.</Message>
      <HomeButton to="/">Return to Home</HomeButton>
    </NotFoundContainer>
  );
}

export default NotFoundPage; 