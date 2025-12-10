import WebSocket from 'ws';
import { ragService } from './ragService.js';
import { validationService } from './validationService.js';
import { cache } from '../utils/cache.js';
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

    async connect() {
        console.log('Attempting to connect to Gemini with URL:', this.url.substring(0, 100) + '...');

        // Load Stage Context First
        await this.fetchStageContext();

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

    async fetchStageContext() {
        try {
            console.log("Fetching stage context for student:", this.config.studentId);

            // CACHE CHECKS
            const cacheKeyGlobal = 'global_config:main';
            let globalConfig = await cache.get(cacheKeyGlobal);

            if (!globalConfig) {
                const { data } = await supabaseAdmin
                    .from('global_config')
                    .select('global_system_prompt')
                    .eq('key', 'main')
                    .single();
                globalConfig = data;
                if (globalConfig) await cache.set(cacheKeyGlobal, globalConfig, 3600); // 1 hour
            }

            let currentStage = 1;
            if (this.config.studentId) {
                // We don't cache student current stage heavily as it changes often, 
                // but we could cache it with short TTL if needed. For now verify from DB to be safe on state.
                const { data: student } = await supabaseAdmin
                    .from('students')
                    .select('current_stage')
                    .eq('id', this.config.studentId)
                    .single();
                currentStage = student?.current_stage || 1;
            }

            const cacheKeyStage = `stage_config:${currentStage}`;
            let stageConfig = await cache.get(cacheKeyStage);

            if (!stageConfig) {
                const { data } = await supabaseAdmin
                    .from('stage_configs')
                    .select('*')
                    .eq('stage_number', currentStage)
                    .single();
                stageConfig = data;
                if (stageConfig) await cache.set(cacheKeyStage, stageConfig, 3600); // 1 hour
            }

            this.currentStageData = stageConfig;

            // 4. Combine Prompts
            const globalPrompt = globalConfig?.global_system_prompt || "You are a helpful assistant.";
            const stagePrompt = stageConfig?.system_prompt || "Greet the student.";

            this.systemInstruction = `${globalPrompt}\n\nCURRENT STAGE (${stageConfig?.name || 'Intro'}):\n${stagePrompt}\n\nOnce the student has satisfied all these points, you MUST call the "complete_stage" tool to advance them to the next stage. Do not just say you are moving on, you must call the tool.`;
            console.log("System Instruction Prepared");

        } catch (error) {
            console.error("Error fetching stage context:", error);
            this.systemInstruction = "You are a helpful assistant.";
            this.currentStageData = { stage_number: 1 };
        }
    }

    sendInitialSetup() {
        const systemInstruction = this.systemInstruction || "You are a helpful assistant.";

        const setupMessage = {
            setup: {
                model: this.model,
                system_instruction: { parts: [{ text: systemInstruction }] },
                tools: [
                    {
                        function_declarations: [
                            {
                                name: "retrieve_knowledge",
                                description: "Retrieve knowledge from the database to answer student questions.",
                                parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "The search query to find relevant information." } }, required: ["query"] }
                            },
                            {
                                name: "complete_stage",
                                description: "Call this function ONLY when the student has satisfied all validation questions for the current stage and is ready to move to the next stage.",
                                parameters: { type: "OBJECT", properties: { summary: { type: "STRING", description: "A brief summary of what the student agreed to or answered in this stage." } }, required: ["summary"] }
                            },
                            {
                                name: "handlePaymentSelection",
                                description: "Trigger human handoff when user selects Full Payment or Credit Card options.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        method: {
                                            type: "STRING",
                                            description: "The payment method selected (e.g. 'Full Payment', 'Credit Card')"
                                        }
                                    },
                                    required: ["method"]
                                }
                            },
                            {
                                name: "update_stage",
                                description: "Move the student to a specific stage number. Use this to navigate forwards or backwards between conversation stages.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        stage_number: { type: "NUMBER", description: "The stage number to move to (1-based)" },
                                        reason: { type: "STRING", description: "Brief reason for the stage change" }
                                    },
                                    required: ["stage_number"]
                                }
                            },
                            {
                                name: "trigger_handoff",
                                description: "Escalate the conversation to a human agent. Call this when the student needs human assistance or requests to speak with a person.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        reason: { type: "STRING", description: "Why the handoff is being triggered (e.g., 'User requested human agent', 'Complex payment query')" }
                                    },
                                    required: ["reason"]
                                }
                            },
                            {
                                name: "log_interaction",
                                description: "Log key business data points from the conversation such as user preferences, hesitations, or decisions.",
                                parameters: {
                                    type: "OBJECT",
                                    properties: {
                                        sentiment: { type: "STRING", description: "User sentiment: 'positive', 'neutral', 'negative', or 'hesitant'" },
                                        summary: { type: "STRING", description: "Key insight or data point (e.g., 'User prefers 0% EMI', 'User is hesitant about CIBIL')" },
                                        category: { type: "STRING", description: "Category: 'preference', 'objection', 'decision', 'question'" }
                                    },
                                    required: ["sentiment", "summary"]
                                }
                            }
                        ]
                    }
                ],
                generation_config: { response_modalities: ["AUDIO"] }
            }
        };
        if (this.geminiWs && this.geminiWs.readyState === WebSocket.OPEN) {
            this.geminiWs.send(JSON.stringify(setupMessage));
        } else {
            console.error("Gemini WS not open, cannot send setup");
        }
    }

    async handleGeminiMessage(message) {
        if (message.toolCall) {
            const functionCalls = message.toolCall.functionCalls;
            if (functionCalls) {
                for (const call of functionCalls) {
                    if (call.name === 'retrieve_knowledge') {
                        const query = call.args.query;
                        console.log(`Tool Call: Retrieve Knowledge for "${query}"`);

                        const currentStage = this.currentStageData?.stage_number;
                        const context = await ragService.retrieveContext(query, currentStage);

                        this.geminiWs.send(JSON.stringify({ tool_response: { function_responses: [{ name: "retrieve_knowledge", id: call.id, response: { result: context } }] } }));
                    }
                    if (call.name === 'complete_stage') {
                        console.log(`Tool Call: Stage Completed! Summary: ${call.args.summary} `);
                        const success = await this.handleStageCompletion(call.args.summary);
                        const resultMsg = success ? "Stage marked as complete." : "Stage completion failed: Summary did not meet validation criteria.";
                        this.geminiWs.send(JSON.stringify({ tool_response: { function_responses: [{ name: "complete_stage", id: call.id, response: { result: resultMsg } }] } }));
                    }
                    if (call.name === 'handlePaymentSelection') {
                        console.log(`Tool Call: Handoff for ${call.args.method}`);
                        if (this.clientWs.readyState === WebSocket.OPEN) {
                            this.clientWs.send(JSON.stringify({ type: "HANDOFF_INITIATED", method: call.args.method }));
                        }
                        this.geminiWs.send(JSON.stringify({ tool_response: { function_responses: [{ name: "handlePaymentSelection", id: call.id, response: { result: "Handoff Initiated" } }] } }));
                    }
                    if (call.name === 'update_stage') {
                        console.log(`Tool Call: Update Stage to ${call.args.stage_number}`);
                        const result = await this.handleUpdateStage(call.args.stage_number, call.args.reason);
                        this.geminiWs.send(JSON.stringify({ tool_response: { function_responses: [{ name: "update_stage", id: call.id, response: { result } }] } }));
                    }
                    if (call.name === 'trigger_handoff') {
                        console.log(`Tool Call: Trigger Handoff - ${call.args.reason}`);
                        const result = await this.handleTriggerHandoff(call.args.reason);
                        this.geminiWs.send(JSON.stringify({ tool_response: { function_responses: [{ name: "trigger_handoff", id: call.id, response: { result } }] } }));
                    }
                    if (call.name === 'log_interaction') {
                        console.log(`Tool Call: Log Interaction - [${call.args.sentiment}] ${call.args.summary}`);
                        const result = await this.handleLogInteraction(call.args.sentiment, call.args.summary, call.args.category);
                        this.geminiWs.send(JSON.stringify({ tool_response: { function_responses: [{ name: "log_interaction", id: call.id, response: { result } }] } }));
                    }
                }
            }
        }
        if (message.serverContent) {
            // Optional: Message Validation (Logging for now)
            if (message.serverContent.modelTurn && message.serverContent.modelTurn.parts) {
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.text) {
                        const isValid = validationService.validateResponse(part.text, this.currentStageData);
                        if (!isValid) console.warn("⚠️ AI Response failed validation:", part.text);
                    }
                }
            }
            this.clientWs.send(JSON.stringify(message));
        }
    }

    async handleStageCompletion(summary) {
        if (!this.config.studentId || !this.currentStageData) return false;

        // Validation
        if (!validationService.validateStageCompletion(summary, this.currentStageData)) {
            console.warn("❌ Stage completion validation failed for summary:", summary);
            return false;
        }

        const currentStageNum = this.currentStageData.stage_number;
        const nextStageNum = currentStageNum + 1;
        console.log(`Moving student ${this.config.studentId} to Stage ${nextStageNum} `);
        await supabaseAdmin.from('students').update({ current_stage: nextStageNum }).eq('id', this.config.studentId);
        if (this.clientWs.readyState === WebSocket.OPEN) {
            this.clientWs.send(JSON.stringify({ type: "STAGE_UPDATE", newStage: nextStageNum, stageName: "Next Stage" }));
        }
        await this.logConversation({ message: "SYSTEM: Stage Completed", response: summary, stage: currentStageNum });
        return true;
    }

    // Handle update_stage tool call - move to any specific stage
    async handleUpdateStage(stageNumber, reason) {
        if (!this.config.studentId) return { success: false, error: "No student ID" };

        // Validate stage exists
        const { data: stage, error: stageError } = await supabaseAdmin
            .from('stage_configs')
            .select('stage_number, name')
            .eq('stage_number', stageNumber)
            .single();

        if (stageError || !stage) {
            console.warn(`❌ Stage ${stageNumber} not found`);
            return { success: false, error: `Stage ${stageNumber} not found` };
        }

        // Update student's current stage
        await supabaseAdmin
            .from('students')
            .update({ current_stage: stageNumber })
            .eq('id', this.config.studentId);

        console.log(`📍 Moved student ${this.config.studentId} to Stage ${stageNumber} (${stage.name})`);

        // Notify frontend
        if (this.clientWs.readyState === WebSocket.OPEN) {
            this.clientWs.send(JSON.stringify({
                type: "STAGE_UPDATE",
                newStage: stageNumber,
                stageName: stage.name,
                reason: reason || "Stage navigation"
            }));
        }

        // Reload stage context for the agent
        await this.fetchStageContext();

        return { success: true, newStage: stageNumber, stageName: stage.name };
    }

    // Handle trigger_handoff tool call - escalate to human agent
    async handleTriggerHandoff(reason) {
        console.log(`🤝 Handoff triggered: ${reason}`);

        // Log handoff event to interaction_insights
        try {
            await supabaseAdmin.from('interaction_insights').insert({
                student_id: this.config.studentId,
                insight_type: 'handoff',
                sentiment: 'neutral',
                summary: reason,
                stage: this.currentStageData?.stage_number || 1
            });
        } catch (err) {
            // Table might not exist yet, log but don't fail
            console.warn('Could not log handoff insight:', err.message);
        }

        // Notify frontend
        if (this.clientWs.readyState === WebSocket.OPEN) {
            this.clientWs.send(JSON.stringify({
                type: "HANDOFF_INITIATED",
                reason
            }));
        }

        return { success: true, message: "Handoff initiated" };
    }

    // Handle log_interaction tool call - log business insights
    async handleLogInteraction(sentiment, summary, category) {
        if (!this.config.studentId) return { success: false, error: "No student ID" };

        try {
            await supabaseAdmin.from('interaction_insights').insert({
                student_id: this.config.studentId,
                insight_type: category || 'general',
                sentiment: sentiment,
                summary: summary,
                stage: this.currentStageData?.stage_number || 1
            });

            console.log(`📊 Logged insight: [${sentiment}] ${summary}`);
            return { success: true };
        } catch (err) {
            // Table might not exist yet, log but don't fail
            console.warn('Could not log interaction insight:', err.message);
            return { success: false, error: err.message };
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
