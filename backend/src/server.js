import 'dotenv/config'; // Loads .env immediately
import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import cors from '@fastify/cors';
import { GeminiLiveService } from './services/geminiService.js';
import adminRoutes from './routes/admin.js';

const fastify = Fastify({ logger: true });

// Register plugins
fastify.register(cors, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
});
fastify.register(websocket);

// Register Routes
fastify.register(async function (fastify) {
    // In @fastify/websocket v11, handler receives (socket, request) directly
    fastify.get('/ws/chat', { websocket: true }, (socket, req) => {
        console.log('Client connected to /ws/chat');

        // Extract studentId from query params
        const { studentId } = req.query;

        // Initialize Gemini Service for this connection
        const geminiService = new GeminiLiveService(socket, { studentId });

        // Connect with proper error handling
        geminiService.connect().catch(err => {
            console.error('❌ Failed to connect to Gemini:', err.message);
            if (socket.readyState === 1) { // WebSocket.OPEN
                socket.close(1011, 'Internal server error');
            }
        });
    });
});

fastify.register(adminRoutes, { prefix: '/api/admin' });

// Health Check
fastify.get('/api', async (request, reply) => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
    try {
        const port = process.env.PORT || 3001;
        await fastify.listen({ port, host: '0.0.0.0' });
        console.log(`Server listening on port ${port}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
