# Contributing to ISO 13485 QMS

Thank you for your interest in contributing to our Quality Management System.

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- PostgreSQL (for local development)
- Supabase CLI (optional)

### Local Development

1. Clone the repository
```bash
git clone https://github.com/your-org/qms-platform.git
cd qms-platform
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your Supabase credentials
```

4. Start development server
```bash
npm run dev
```

## Coding Standards

### TypeScript
- Use TypeScript for all new code
- Prefer interfaces over types for object shapes
- Use strict mode

### React
- Use functional components with hooks
- Follow React hooks rules
- Use meaningful component names

### Testing
- Aim for 80% code coverage
- Write tests for all new features
- Use descriptive test names

## Submitting Changes

1. Create a feature branch
2. Make your changes
3. Add tests
4. Submit a pull request

## Code Review Process

All submissions require review from at least one maintainer.
