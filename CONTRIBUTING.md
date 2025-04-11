# Contributing to Travel Itinerary Planner

Thank you for considering contributing to our Travel Itinerary Planner! This document outlines the process and guidelines for contributing to this project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## How Can I Contribute?

### Reporting Bugs

- Check if the bug has already been reported in the Issues section
- Use the bug report template to create a new issue
- Include detailed steps to reproduce the bug
- Include screenshots if applicable
- Describe what you expected to happen and what actually happened

### Suggesting Features

- Check if the feature has already been suggested in the Issues section
- Use the feature request template to create a new issue
- Describe the feature in detail and why it would be valuable

### Pull Requests

1. Fork the repository
2. Create a new branch (`git checkout -b feature/your-feature-name`)
3. Make your changes
4. Run tests to ensure your changes don't break existing functionality
5. Commit your changes (`git commit -m 'Add some feature'`)
6. Push to your branch (`git push origin feature/your-feature-name`)
7. Create a Pull Request

## Development Setup

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Coding Style

- For Python code, follow PEP 8 guidelines
- For JavaScript/React code, follow the ESLint configuration
- Write meaningful commit messages

## Testing

- Write tests for new features
- Ensure all tests pass before submitting a pull request

## Documentation

- Update the README.md if necessary
- Comment your code where appropriate
- Update API documentation if you modify endpoints

Thank you for your contributions! 