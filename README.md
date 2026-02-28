# blinkfolio

Where portfolio meets play

## Project Overview

- **Welcome Page:** Typing animations with playable character navigation
- **Main Page:** Portfolio content with interactive platformer game where content boxes serve as platforms
- **Game Mechanics:** Mario-style brick interactions, character movement, knockout system

## Tech Stack

### Frontend
- React 19 + TypeScript
- Vite (build tool)
- Phaser.js 3.90+ (game engine)
- React Router (navigation)

### Backend *(Phase 2)*
- Node.js + Express + TypeScript
- PostgreSQL (Supabase)
- Redis (Render)

### DevOps
- GitHub Actions (CI/CD)
- Vercel (frontend hosting)
- Render (backend hosting)

## Getting Started

### Prerequisites
- Node.js 24+

### Installation
```bash
# Install frontend dependencies
cd frontend
npm install

# Start development server
npm run dev
```

Open http://localhost:5173

## Assets

All game assets are CC0 licensed (public domain).

- **Character:** 32×32px sprite sheets (6 frames per animation)
- **Items:** 16×16px and 32×32px sprites
- **Tiles:** 16×16px brick sprites

## Development Approach

- **TDD (Test-Driven Development):** Tests written before implementation
- **Security-first:** Best practices for authentication, input validation, and data protection
