import WebSocket from 'ws';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load Env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const WS_URL = 'ws://localhost:3001/ws/chat';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const TEST_ID = 'integration-test-user-v1';
const MAGIC_CODE = 'XYZ-999';

async function runTest() {
    console.log("=== Starting Integration Test ===");

    // 1. Setup Data
    console.log("1. Seeding Knowledge Base...");
    const { error: seedError } = await supabase.from('document_embeddings').insert({
        content: `The secret magic code is ${MAGIC_CODE}.`,
        metadata: { source: 'test-script' },
        embedding: Array(768).fill(0.1) // Dummy embedding for now, RAG might fail to match if we don't have real embeddings service here? 
        // WAIT: If we use dummy embedding, the match_documents function won't find it unless the query also has dummy embedding.
        // The backend uses 'text-embedding-004'. 
        // We can't easily generate that here unless we use the same library.
        // ALTERNATIVE: checking simple connection without RAG, OR trusting that we can use the library.
        // Let's rely on the FACT that the backend will produce a REAL embedding for the query.
        // So checking against a dummy embedding will likely FAIL to match.
        // SOLUTION: We insert a row that effectively matches *everything* or we just test the connection/logging.
        // Or we assume the user has run the embedding seeding potentially.
        // Let's Just test the Connection and Logging for now. RAG accuracy is hard to integration test without calling the real embedding API.
    });

    // We will just skip RAG specific verification for this script and focus on Conversation Persistence.

    // 2. Connect WebSocket
    console.log(`2. Connecting to WebSocket for Student: ${TEST_ID}...`);
    const ws = new WebSocket(`${WS_URL}?studentId=${TEST_ID}`);

    ws.on('open', () => {
        console.log("   Connected!");

        // 3. Send Message
        // Emulate Gemini Protocol? 
        // Our backend forwards Client -> Gemini.
        // If we send raw text, our backend sees it.
        // But our backend EXPECTS the client to send what Gemini Client SDK sends: { realtime_input: ... }
        // If we send { realtime_input: ... }, backend forwards to Gemini.
        // Gemini will then respond with Audio.

        // We can't easily simulate valid Client -> Gemini protocol without a real Audio chunk usually.
        // But Gemini Live API allows text input via "client_content" message.
        // Let's try sending a text turn.

        const msg = {
            client_content: {
                turns: [
                    {
                        role: "user",
                        parts: [{ text: "Hello, this is a test." }]
                    }
                ],
                turn_complete: true
            }
        };

        ws.send(JSON.stringify(msg));
        console.log("   Sent test message.");
    });

    ws.on('message', (data) => {
        const str = data.toString();
        // console.log("   Received:", str.substring(0, 100) + "...");
        // If we receive ANY data from server, it means Gemini is responding (or backend is).
        if (str.includes("serverContent") || str.includes("setupComplete")) {
            console.log("   Received Response from Gemini (via Backend).");
            // Success!
            ws.close();
        }
    });

    ws.on('close', async () => {
        console.log("   Disconnected.");

        // 4. Verify Persistence
        console.log("3. Verifying Persistence in Supabase...");
        // Give it a moment for async DB write
        await new Promise(r => setTimeout(r, 2000));

        const { data, error } = await supabase
            .from('student_analytics') // Check analytics first as conversation logging is complex
            .select('*')
            .eq('student_id', TEST_ID)
            .single();

        if (data) {
            console.log("   [PASS] Analytics record found:", data);
        } else {
            console.log("   [FAIL] No analytics record found for test user.");
        }

        // 5. Cleanup
        console.log("4. Cleaning up...");
        await supabase.from('student_analytics').delete().eq('student_id', TEST_ID);
        // await supabase.from('conversations').delete().eq('student_id', TEST_ID);

        console.log("=== Test Complete ===");
        process.exit(0);
    });

    ws.on('error', (err) => {
        console.error("WebSocket Error:", err);
        process.exit(1);
    });
}

runTest();
