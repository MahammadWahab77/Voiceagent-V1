const https = require('https');

const API_URL = 'https://xcknwprqhsnmpuixpqch.supabase.co/rest/v1/';
const API_KEY = 'sb_secret_c75X85paMtLpNV_iq91kcw_oeQDB_Hn';

const options = {
    headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`
    }
};

const requiredTables = [
    'students',
    'conversations',
    'admin_users',
    'stage_configs',
    'global_config',
    'student_analytics',
    'document_embeddings'
];

https.get(API_URL, options, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        try {
            const schema = JSON.parse(data);
            const definitions = schema.definitions || {};
            const allTables = Object.keys(definitions);

            const irrelevantTables = allTables.filter(table => !requiredTables.includes(table));

            console.log('--- IRRELEVANT TABLES ---');
            if (irrelevantTables.length > 0) {
                irrelevantTables.forEach(t => console.log(t));
            } else {
                console.log('No irrelevant tables found.');
            }
        } catch (e) {
            console.error(e.message);
        }
    });

}).on('error', (e) => {
    console.error(e);
});
