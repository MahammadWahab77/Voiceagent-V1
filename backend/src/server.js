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

// Global Request Logger (Acts as a proxy monitor)
fastify.addHook('preHandler', async (request, reply) => {
    const { method, url, body, query } = request;
    console.log(`\n🔍 [API PROXY] ${method} ${url}`);
    if (Object.keys(query).length) console.log('   Query:', JSON.stringify(query));
    if (body) console.log('   Body:', JSON.stringify(body));
});

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

// API Documentation/List
fastify.get('/api/routes', async (request, reply) => {
    reply.type('text/html');
    return `
    <html>
        <head>
            <title>API List</title>
            <style>
                body { font-family: monospace; padding: 2rem; background: #f0f0f0; }
                .card { background: white; padding: 1.5rem; margin-bottom: 1rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
                .method { font-weight: bold; color: #fff; padding: 0.25rem 0.5rem; border-radius: 4px; display: inline-block; width: 60px; text-align: center; }
                .get { background: #61affe; }
                .post { background: #49cc90; }
                .put { background: #fca130; }
                .delete { background: #f93e3e; }
                .auth { color: #f93e3e; font-size: 0.8rem; border: 1px solid #f93e3e; padding: 2px 6px; border-radius: 4px; margin-left: 10px; }
            </style>
        </head>
        <body>
            <h1>Available Endpoints</h1>
            
            <div class="card">
                <h3>Public</h3>
                <div><span class="method get">GET</span> <span>/api</span> - Health Check</div>
                <br>
                <div><span class="method get">WS</span> <span>/ws/chat</span> - WebSocket Chat Endpoint</div>
            </div>

            <div class="card">
                <h3>Admin (Requires Auth Token)</h3>
                <div><span class="method get">GET</span> <span>/api/admin/users</span> - List all students <span class="auth">Auth</span></div>
                <br>
                <div><span class="method get">GET</span> <span>/api/admin/users/:id</span> - Student Details <span class="auth">Auth</span></div>
                <br>
                <div><span class="method get">GET</span> <span>/api/admin/users/:id/conversations</span> - Student Transcripts <span class="auth">Auth</span></div>
                <br>
                <div><span class="method get">GET</span> <span>/api/admin/users/:id/insights</span> - Student Insights <span class="auth">Auth</span></div>
                <br>
                <div><span class="method get">GET</span> <span>/api/admin/stages</span> - List Stages <span class="auth">Auth</span></div>
                <br>
                <div><span class="method get">GET</span> <span>/api/admin/global-config</span> - Get System Config <span class="auth">Auth</span></div>
            </div>
            
            <p><strong>Note:</strong> Check your server terminal to see real-time logs of requests.</p>
        </body>
    </html>
    `;
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
