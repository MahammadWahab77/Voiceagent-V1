# Maya Voice Agent Onboarding

A full-stack voice AI application designed for interactive onboarding experiences ("Maya"). This project consists of a React frontend and a Fastify Node.js backend, leveraging Google's Gemini AI for voice capabilities and Supabase for data management.

## 🚀 Features

- **Interactive Voice Agent**: Powered by Google Gemini AI.
- **Real-time Communication**: WebSocket integration for low-latency voice and data exchange.
- **Modern Frontend**: Built with React, Vite, and Lucide Icons.
- **Backend API**: Fastify server handling WebSocket connections and business logic.
- **Database**: Supabase integration for persistent storage.

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Vanilla CSS / CSS Modules (Assumed)
- **Routing**: React Router DOM
- **Icons**: Lucide React

### Backend
- **Runtime**: Node.js
- **Server Framework**: Fastify
- **WebSockets**: `ws` & `@fastify/websocket`
- **AI**: Google GenAI SDK (`@google/genai`)
- **Database SDK**: Supabase JS

## 📂 Project Structure

```bash
├── backend/         # Node.js Fastify Server
│   ├── src/         # Source code
│   └── scripts/     # Utility scripts (testing, etc.)
├── frontend/        # React + Vite Client
│   ├── src/         # Components, pages, hooks
│   └── public/      # Static assets
└── README.md        # Project documentation
```

## ⚡ Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v16+ recommended)
- [npm](https://www.npmjs.com/) or yarn
- Supabase account and project
- Google Cloud Project with Gemini API enabled

### 1. Backend Setup

Navigate to the backend directory and install dependencies:

```bash
cd backend
npm install
```

**Environment Variables:**
Create a `.env` file in the `backend/` directory with the following keys (adjust as necessary for your specific configuration):

```env
GOOGLE_API_KEY=your_google_api_key
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
PORT=3000
```

Start the backend server:

```bash
npm start
```
*The server will typically run on `http://localhost:3000`*

### 2. Frontend Setup

Open a new terminal, navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

**Environment Variables:**
Create a `.env` file in the `frontend/` directory:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Start the frontend development server:

```bash
npm run dev
```
*The application should be accessible at `http://localhost:5173`*

## 🧪 Running Tests

To run the integration tests for the backend (if available):

```bash
cd backend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request
