# Maya Voice Agent Onboarding

## Overview
A full-stack voice AI application for interactive onboarding experiences. It features a React frontend and a Fastify Node.js backend, leveraging Google's Gemini AI for voice capabilities and Supabase for data management.

## Project Structure
```
├── backend/           # Node.js Fastify Server (port 3001)
│   ├── src/           # Source code
│   │   ├── config/    # Configuration (Supabase)
│   │   ├── routes/    # API routes (admin endpoints)
│   │   ├── services/  # Business logic (Gemini, RAG, validation)
│   │   └── server.js  # Main entry point
│   └── scripts/       # Utility scripts
├── frontend/          # React + Vite Client (port 5000)
│   ├── src/           # Components, pages, hooks
│   │   ├── components/# React components
│   │   ├── pages/     # Page components (Admin, Student)
│   │   ├── hooks/     # Custom hooks (useGeminiLive)
│   │   └── lib/       # Libraries (Supabase client)
│   └── public/        # Static assets
└── replit.md          # This file
```

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, React Router DOM, Lucide Icons, Tailwind CSS
- **Backend**: Node.js, Fastify, WebSockets, dotenv
- **AI**: Google Gemini AI (@google/genai)
- **Database**: Supabase (external)

## Running the Application
The application runs with a single workflow that starts both frontend and backend:
- Frontend: http://localhost:5000 (proxies API and WebSocket requests to backend)
- Backend: http://localhost:3001 (internal)

The Vite dev server proxies:
- `/api/*` requests to the backend
- `/ws/*` WebSocket connections to the backend

## Environment Variables

### Frontend (.env)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### Backend (.env)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key
- `GEMINI_API_KEY` - Google Gemini API key
- `PORT` - Server port (default: 3001)

## Key Features
- Interactive voice agent powered by Google Gemini AI
- Real-time WebSocket communication
- Admin dashboard for user management
- Stage-based onboarding workflow
- RAG (Retrieval Augmented Generation) knowledge base

## API Endpoints
- `GET /api` - Health check
- `WS /ws/chat` - WebSocket for voice chat
- `GET /api/admin/*` - Admin endpoints (requires auth)

## Recent Changes
- December 2024: Configured for Replit environment
  - Updated Vite to use port 5000 with allowed hosts
  - Added proxy configuration for backend API/WebSocket
  - Updated frontend to use relative URLs for API calls
  - Backend bound to localhost:3001
