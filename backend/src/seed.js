import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// We need to re-initialize here or import. Let's try to import first, but 
// sometimes config files depend on process.env which might need 'dotenv/config' called first.
// To be safe and simple, I will re-create the client here if I can read envs, 
// OR simpler: just import the config file which likely just exports the client.
// Based on previous reads, backend/src/config/supabase.js likely creates it.
// Let's assume standard structure.

// Reading supabase.js to confirm export if needed, but I'll trust my plan.
// Actually, let's just peek at supabase.js to be 100% sure of the export name.
import { supabaseAdmin } from './config/supabase.js';

async function seed() {
    console.log('🌱 Seeding mock data...');

    // 1. Create a mock student
    // We'll add a random suffix to make it unique-ish if run multiple times
    const randomId = Math.floor(Math.random() * 1000);
    const mockStudent = {
        name: `Test User ${randomId}`,
        mobileNumber: `555000${randomId}`,
        current_stage: 2,
        // created_at is automatic usually, but can be passed
    };

    // Note: 'students' table might expect specific columns. 
    // Based on previous code: name, mobileNumber, current_stage.

    // We use .select() to get the ID back
    const { data: student, error: studentError } = await supabaseAdmin
        .from('students')
        .insert(mockStudent)
        .select()
        .single();

    if (studentError) {
        console.error('❌ Error creating student:', JSON.stringify(studentError, null, 2));
        // Try to list tables to debug
        const { data: tables, error: tableError } = await supabaseAdmin.from('students').select('*').limit(1);
        if (tableError) console.error('Table check error:', JSON.stringify(tableError, null, 2));

        process.exit(1);
    }
    console.log(`✅ Created Student: ${student.name} (${student.id})`);

    // 2. conversations
    const conversations = [
        {
            student_id: student.id,
            stage: 1,
            message: 'Hello, is this the NxtWave course?',
            response: 'Hello! Yes, this is Maya from NxtWave. I can help you with course details.',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() // 1 day ago
        },
        {
            student_id: student.id,
            stage: 1,
            message: 'What is the price?',
            response: 'The course fee is currently discounted. Are you looking for the full stack program?',
            created_at: new Date(Date.now() - 1000 * 60 * 60 * 23).toISOString()
        },
        {
            student_id: student.id,
            stage: 2,
            message: 'Yes, full stack.',
            response: 'Great choice! It covers frontend, backend, and databases. We have EMI options too.',
            created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 mins ago
        }
    ];

    const { error: convError } = await supabaseAdmin
        .from('conversations')
        .insert(conversations);

    if (convError) console.error('❌ Error adding conversations:', convError);
    else console.log('✅ Added 3 mock conversations');

    // 3. insights
    const insights = [
        {
            student_id: student.id,
            insight_type: 'interest',
            sentiment: 'positive',
            summary: 'User confirmed interest in Full Stack Development.',
            stage: 1
        },
        {
            student_id: student.id,
            insight_type: 'question',
            sentiment: 'neutral',
            summary: 'User asked about pricing options.',
            stage: 1
        }
    ];

    const { error: insightError } = await supabaseAdmin
        .from('interaction_insights')
        .insert(insights);

    if (insightError) console.error('❌ Error adding insights:', insightError);
    else console.log('✅ Added 2 mock insights');

    // 4. analytics
    const analytics = {
        student_id: student.id,
        total_sessions: 2,
        last_active: new Date().toISOString()
    };

    const { error: analyticsError } = await supabaseAdmin
        .from('student_analytics')
        .insert(analytics);

    if (analyticsError) console.error('❌ Error adding analytics:', analyticsError);
    else console.log('✅ Added student analytics');

    console.log('✨ Seed complete! Refresh your Admin Panel to see "Test User ' + randomId + '"');
}

seed().catch(err => console.error(err));
