# Quality Management System (QMS) - ISO 13485 Compliance Platform

<div align="center">

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/your-org/qms-platform)
[![License](https://img.shields.io/badge/license-Commercial-green)](LICENSE)
[![ISO 13485](https://img.shields.io/badge/ISO-13485-Compliant-orange)](docs/iso13485-compliance.md)
[![21 CFR Part 11](https://img.shields.io/badge/21%20CFR%20Part%2011-Ready-purple)](docs/cfr-part11.md)

</div>

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Configuration](#configuration)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Compliance](#compliance)
- [Support](#support)

## Overview

This is a comprehensive Quality Management System (QMS) designed specifically for the medical device industry. Built on ISO 13485:2016 standards and compliant with 21 CFR Part 11 electronic records and signatures regulations.

### Key Capabilities

- **Document Control** - Complete lifecycle management of quality documents
- **CAPA Management** - Corrective and Preventive Action tracking
- **Audit Management** - Internal and external audit scheduling and tracking
- **Non-Conformance Management** - NCR processing and resolution
- **Training Records** - Employee competency and training management
- **Risk Management** - ISO 14971 compliant risk analysis
- **Electronic Signatures** - 21 CFR Part 11 compliant e-signatures
- **Audit Trail** - Immutable, tamper-proof activity logging

## Features

### Phase 1: Multi-Tenancy
- Organization-based data isolation
- Role-based access control (Admin, Manager, User, Viewer)
- Team invitation and management
- Organization switching

### Phase 2: Billing & Subscriptions
- Stripe integration for payments
- Multiple subscription tiers
- Usage-based billing
- Invoice history

### Phase 3: Core SaaS Features
- Real-time notifications
- White-labeling (custom branding)
- Global search (Cmd+K)
- Data import/export
- API access

### Phase 4: Compliance
- Audit trail with cryptographic hashing
- Electronic signatures
- Legal document management
- Compliance reporting
- ISO 13485 dashboard

### Phase 5: Quality Assurance
- Comprehensive test suite
- CI/CD pipelines
- Error monitoring (Sentry)
- Performance tracking

## Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | React 18, TypeScript, Vite |
| Styling | Tailwind CSS, shadcn/ui |
| State | React Context, React Query |
| Backend | Supabase (PostgreSQL, Auth, Storage, Edge Functions) |
| Payments | Stripe |
| Testing | Vitest, React Testing Library, Playwright |
| CI/CD | GitHub Actions |
| Monitoring | Sentry |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Stripe account (for payments)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/qms-platform.git
cd qms-platform

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
```

### Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe (optional)
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key

# Sentry (optional)
VITE_SENTRY_DSN=your_sentry_dsn

# App
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development
```

### Database Setup

```bash
# Run migrations
supabase db push

# Seed initial data (optional)
supabase db execute --file ./database/seed.sql
```

### Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view the application.

## Project Structure

```
├── .github/
│   └── workflows/         # CI/CD pipelines
├── database/
│   ├── migrations/        # Database migrations
│   └── seed.sql          # Initial data
├── e2e/                  # End-to-end tests
├── src/
│   ├── components/       # React components
│   │   ├── ui/           # Base UI components
│   │   ├── billing/      # Billing components
│   │   ├── compliance/   # Compliance components
│   │   └── ...
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom hooks
│   ├── lib/              # Utilities
│   ├── pages/            # Page components
│   ├── test/             # Unit tests
│   └── types/            # TypeScript types
├── .env.example
├── package.json
├── tsconfig.json
├── vite.config.ts
└── vitest.config.ts
```

## Configuration

### Supabase Setup

1. Create a new Supabase project
2. Run the migration scripts in `database/migrations/`
3. Configure Row Level Security (RLS) policies
4. Set up authentication providers

### Stripe Setup

1. Create a Stripe account
2. Configure webhook endpoints
3. Set up subscription products
4. Add Stripe keys to environment

### Sentry Setup

1. Create a Sentry project
2. Add DSN to environment
3. Configure error tracking

## Development

### Available Scripts

```bash
# Development
npm run dev              # Start development server
npm run build           # Build for production
npm run preview         # Preview production build

# Testing
npm run test            # Run unit tests
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with coverage
npm run test:e2e      # Run E2E tests
npm run test:e2e:ui   # Run E2E tests with UI

# Linting & Type Checking
npm run lint           # Run ESLint
npm run typecheck      # Run TypeScript check

# Utilities
npm run format         # Format code
```

### Code Style

- Follow ESLint rules
- Use TypeScript strict mode
- Write meaningful commit messages
- Add tests for new features

## Testing

### Unit Tests

```bash
# Run all unit tests
npm run test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### E2E Tests

```bash
# Install Playwright browsers
npx playwright install

# Run E2E tests
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

### Test Coverage Goals

- **Business Logic**: >85% coverage
- **Components**: >70% coverage
- **Overall**: >80% coverage

## Deployment

### Build for Production

```bash
npm run build
```

### Deployment Platforms

#### Vercel (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Netlify
```bash
# Build and deploy
npm run build
netlify deploy --prod --dir=dist
```

### Environment Configuration

| Environment | URL | Database |
|-------------|-----|----------|
| Development | localhost:5173 | Local |
| Staging | staging.example.com | Staging DB |
| Production | app.example.com | Production DB |

## Compliance

### ISO 13485:2016

This platform implements key ISO 13485:2016 requirements:
- Document control (Clause 4.2.3)
- Record control (Clause 4.2.4)
- Management responsibility (Clause 5.5)
- Resource management (Clause 6)
- Product realization (Clause 7)
- Measurement and analysis (Clause 8)

### 21 CFR Part 11

Electronic records and signatures compliance:
- Audit trail (immutable, timestamped)
- Electronic signatures (unique, linked to user)
- System access controls
- Validation documentation

### Data Security

- AES-256 encryption at rest
- TLS 1.3 in transit
- GDPR compliant data handling
- Regular security audits

## Support

### Documentation
- [User Manual](docs/user-manual.md)
- [API Documentation](docs/api.md)
- [Compliance Guide](docs/compliance.md)

### Troubleshooting
- Check [FAQ](docs/faq.md)
- Open an issue on GitHub
- Contact support@qms-platform.com

## License

Commercial License. All rights reserved.

---

<div align="center">

Built with ❤️ for Quality Excellence

</div>
