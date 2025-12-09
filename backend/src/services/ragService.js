import { supabaseAdmin } from '../config/supabase.js';

export const ragService = {
    async embedText(text) {
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            const model = 'text-embedding-004';
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${apiKey}`;

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: {
                        parts: [{ text: text }]
                    }
                })
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Gemini API Error: ${err}`);
            }

            const data = await response.json();
            // Expected format: { embedding: { values: [...] } }
            if (data.embedding && data.embedding.values) {
                return data.embedding.values;
            } else {
                throw new Error("Invalid response from Gemini Embedding API");
            }
        } catch (error) {
            console.error("Embedding Error:", error);
            throw error;
        }
    },

    async retrieveContext(query, stage = null) {
        try {
            const embedding = await this.embedText(query);

            const { data, error } = await supabaseAdmin.rpc('match_documents', {
                query_embedding: embedding,
                match_threshold: 0.5,
                match_count: 15 // Increase count to allow for filtering
            });

            if (error) {
                console.error("Supabase Match Error:", error);
                return "";
            }

            // data is Array<{ content: string, metadata: object }>
            // Filter: Keep if global (no stage in metadata) OR matching specific stage
            const filteredData = data.filter(doc => {
                const docStage = doc.metadata?.stage;
                // If doc has no stage defined, it's global -> Keep
                // If doc has stage, it must match requested stage -> Keep
                // If requested stage is null/undefined, we only keep global docs
                if (!docStage) return true;
                return stage && parseInt(docStage) === parseInt(stage);
            });

            // Take top 3 after filtering
            const topResults = filteredData.slice(0, 3);

            return topResults.map(doc => doc.content).join("\n\n");
        } catch (error) {
            console.error("RAG Retrieval Error:", error);
            return "";
        }
    }
};
