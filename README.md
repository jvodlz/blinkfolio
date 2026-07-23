# blinkfolio

Where portfolio meets play

## Project Overview

- **Welcome Page:** Typing animations with playable character navigation
- **Main Page:** Portfolio content with interactive platformer game where content boxes serve as platforms
- **Game Mechanics:** Mario-style brick interactions, character movement, knockout system

## Tech Stack

### Frontend
- React 19 + TypeScript 5
- Vite 8 (build tool)
- Phaser.js 3.90+ (game engine)
- React Router 7 (navigation)

### Backend
- Fastify 5 + TypeScript 6
- PostgreSQL via Supabase (game event counters)
- Valkey via Render (brick cooldown state + rate limiting) - Redis-compatible fork
- Zod 4 (input validation)
- Pino (structured logging)

### DevOps
- GitHub Actions (CI/CD)
- Vercel (frontend hosting)
- Render (backend hosting)
- UptimeRobot (keep-alive monitor)

## Getting Started

### Prerequisites
- Node.js 24+
- Docker

### Installation
```bash
# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

Open http://localhost:5173

```bash
# Start local Valkey instance (First time only)
docker run -d --name blinkfolio-redis -p 6379:6379 valkey/valkey:8-alpine

# Start local Valkey instance (Every other time: start existing container)
docker start blinkfolio-redis

# Install backend dependencies
cd backend
npm install

# Start backend development server
npm run dev
```

API runs on http://localhost:3001

## Environment Variables

See `backend/.env.example` for required variables.

## Assets

All game assets are CC0 licensed (public domain).

- **Character:** 32×32px sprite sheets (6 frames per animation)
- **Items:** 16×16px and 32×32px sprites
- **Tiles:** 16×16px brick sprites

## Development Approach

- **TDD (Test-Driven Development):** Tests written before implementation for React components and pure logic functions, and backend route handlers and schemas
- **Smoke tests:** Lightweight post-deploy checks against the live backend
- **Manual testing:** Phaser gameplay and game mechanics, verified on real devices for touch-specific behaviour
- **Security-first:** Helmet, CORS allowlist, rate limiting, Zod input validation, structured logging

