import { supabaseAdmin } from '../config/supabase.js';

// Simple Auth Middleware (Can be expanded)
const requireAuth = async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
        reply.code(401).send({ error: 'Unauthorized' });
        return;
    }
    request.user = user;
};

export default async function adminRoutes(fastify, options) {

    // STAGES
    fastify.get('/stages', { preHandler: requireAuth }, async (req, reply) => {
        const { data, error } = await supabaseAdmin.from('stage_configs').select('*').order('stage_number');
        if (error) return reply.code(500).send(error);
        return data;
    });

    fastify.put('/stages/:id', { preHandler: requireAuth }, async (req, reply) => {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin.from('stage_configs').update(req.body).eq('id', id).select();
        if (error) return reply.code(500).send(error);
        return data[0];
    });

    // GLOBAL CONFIG
    fastify.get('/global-config', { preHandler: requireAuth }, async (req, reply) => {
        const { data, error } = await supabaseAdmin.from('global_config').select('*').single();
        if (error) return reply.code(500).send(error);
        return data;
    });

    fastify.put('/global-config', { preHandler: requireAuth }, async (req, reply) => {
        // Assuming we update the 'main' config
        const { data, error } = await supabaseAdmin.from('global_config').update(req.body).eq('key', 'main').select();
        if (error) return reply.code(500).send(error);
        return data[0];
    });

    // DOCUMENTS (RAG)
    fastify.post('/documents', { preHandler: requireAuth }, async (req, reply) => {
        const { content, metadata } = req.body;
        // In a real app, we'd embed this here. 
        // For now, we assume the client or service handles embedding, OR we call ragService here.
        // Let's call ragService to embed it.

        try {
            // Dynamic import to avoid circular dependency issues if any, or just import at top.
            const { ragService } = await import('../services/ragService.js');
            const embedding = await ragService.embedText(content);

            const { data, error } = await supabaseAdmin.from('document_embeddings').insert({
                content,
                metadata,
                embedding
            }).select();

            if (error) throw error;
            return data[0];
        } catch (err) {
            return reply.code(500).send({ error: err.message });
        }
    });

    fastify.get('/analytics', { preHandler: requireAuth }, async (req, reply) => {
        const { data, error } = await supabaseAdmin.from('student_analytics').select('*');
        if (error) return reply.code(500).send(error);
        return data;
    });
}
