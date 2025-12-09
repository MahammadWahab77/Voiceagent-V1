import WebSocket from 'ws';
import { ragService } from './ragService.js';
import { supabaseAdmin } from '../config/supabase.js';

export class GeminiLiveService {
    constructor(clientWs, config) {
        this.clientWs = clientWs;
        this.config = config; // Expected to contain { studentId }
        this.geminiWs = null;
        this.isConnected = false;
        this.model = "models/gemini-2.0-flash-exp";
        this.host = "generativelanguage.googleapis.com";
        this.url = `wss://${this.host}/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${process.env.GEMINI_API_KEY}`;
        this.startTime = Date.now();
    }

    connect() {
        console.log('Attempting to connect to Gemini with URL:', this.url.substring(0, 100) + '...');
        this.geminiWs = new WebSocket(this.url);

        this.geminiWs.on('open', () => {
            console.log('✅ Connected to Gemini Live API');
            this.isConnected = true;
            this.sendInitialSetup();
        });

        this.geminiWs.on('message', async (data) => {
            try {
                const response = JSON.parse(data.toString());
                console.log('📩 Gemini message:', JSON.stringify(response).substring(0, 200));
                await this.handleGeminiMessage(response);
            } catch (error) {
                console.error('❌ Error parsing Gemini message:', error);
            }
        });

        this.geminiWs.on('close', (code, reason) => {
            console.log('🔴 Gemini connection closed. Code:', code, 'Reason:', reason?.toString());
            this.isConnected = false;
            // Safely close client WebSocket if still open
            if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
                this.clientWs.close();
            }
            this.finalizeSession();
        });

        this.geminiWs.on('error', (error) => {
            console.error('❌ Gemini connection error:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            // Safely close client WebSocket if still open
            if (this.clientWs && this.clientWs.readyState === WebSocket.OPEN) {
                this.clientWs.close();
            }
        });

        // Handle messages from the client (Browser)
        this.clientWs.on('message', (data) => {
            if (this.isConnected) {
                try {
                    const parsed = JSON.parse(data.toString());

                    // If client sends text input (if we add text support later) log it
                    if (parsed.realtime_input) {
                        // Log input logic could go here if we extract text/audio metadata
                    }

                    this.geminiWs.send(JSON.stringify(parsed));
                } catch (e) {
                    console.warn("Client sent non-JSON data, ignoring.");
                }
            }
        });

        this.clientWs.on('close', () => {
            if (this.geminiWs) this.geminiWs.close();
        });
    }

    sendInitialSetup() {
        const setupMessage = {
            setup: {
                model: this.model,
                tools: [
                    {
                        function_declarations: [
                            {
                                name: "retrieve_knowledge",
                                description: "Retrieve knowledge from the database to answer student questions.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        query: {
                                            type: "STRING",
                                            description: "The search query to find relevant information."
                                        }
                                    },
                                    required: ["query"]
                                }
                            }
                        ]
                    }
                ],
                generation_config: {
                    response_modalities: ["AUDIO"]
                }
            }
        };
        this.geminiWs.send(JSON.stringify(setupMessage));
    }

    async handleGeminiMessage(message) {
        // 1. Tool Call
        if (message.toolCall) {
            const functionCalls = message.toolCall.functionCalls;
            if (functionCalls) {
                for (const call of functionCalls) {
                    if (call.name === 'retrieve_knowledge') {
                        const query = call.args.query;
                        console.log(`Tool Call: Retrieve Knowledge for "${query}"`);

                        const context = await ragService.retrieveContext(query);

                        // Log RAG usage
                        await this.logConversation({
                            message: `[RAG Query]: ${query}`,
                            response: `[RAG Context]: ${context.substring(0, 100)}...`,
                            stage: 0 // Default stage for now
                        });

                        const toolResponse = {
                            tool_response: {
                                function_responses: [
                                    {
                                        name: "retrieve_knowledge",
                                        id: call.id,
                                        response: { result: context }
                                    }
                                ]
                            }
                        };
                        this.geminiWs.send(JSON.stringify(toolResponse));
                    }
                }
            }
        }

        // 2. Audio/Text Content
        if (message.serverContent) {
            // Forward to client
            this.clientWs.send(JSON.stringify(message));

            // Basic logging of model turn
            // Note: Real logging of audio content is hard, so we just log specific text/json events or just presence of turn
            // Ensure we don't spam DB with every chunk
            if (message.serverContent.modelTurn && message.serverContent.turnComplete) {
                // Turn complete - good place to log connection health/stats
            }
        }
    }

    async logConversation({ message, response, stage }) {
        if (!this.config.studentId) return;

        const { error } = await supabaseAdmin.from('conversations').insert({
            student_id: this.config.studentId,
            stage: stage || 1,
            message: message,
            response: response,
            tokens_used: 0, // Gemini API doesn't always send usage in stream easily yet
            response_time_ms: 0
        });

        if (error) console.error("Error logging conversation:", error);
    }

    async finalizeSession() {
        try {
            if (!this.config.studentId) {
                console.log('⚠️ No studentId, skipping session finalization');
                return;
            }

            console.log('📊 Finalizing session for student:', this.config.studentId);

            // Update analytics
            const sessionDuration = Date.now() - this.startTime;

            const { data, error } = await supabaseAdmin.rpc('increment_analytics', {
                p_student_id: this.config.studentId,
                p_duration: sessionDuration
            });
            // Note: need to implement this RPC or just do a raw update

            // Simple raw update fallback
            const { data: analytics } = await supabaseAdmin
                .from('student_analytics')
                .select('total_sessions')
                .eq('student_id', this.config.studentId)
                .single();

            if (analytics) {
                await supabaseAdmin.from('student_analytics').update({
                    total_sessions: analytics.total_sessions + 1,
                    last_active: new Date().toISOString()
                }).eq('student_id', this.config.studentId);
                console.log('✅ Analytics updated successfully');
            } else {
                await supabaseAdmin.from('student_analytics').insert({
                    student_id: this.config.studentId,
                    total_sessions: 1,
                    last_active: new Date().toISOString()
                });
                console.log('✅ Analytics created successfully');
            }
        } catch (error) {
            console.error('❌ Error in finalizeSession:', error.message);
            // Don't throw - just log the error
        }
    }
}
