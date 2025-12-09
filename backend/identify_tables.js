const fs = require('fs');

const requiredTables = [
    'students',
    'conversations',
    'admin_users',
    'stage_configs',
    'global_config',
    'student_analytics',
    'document_embeddings'
];

try {
    const rawData = fs.readFileSync('tables_utf8.json', 'utf8');
    const schema = JSON.parse(rawData);

    // In PostgREST, tables are usually definitions
    const definitions = schema.definitions || {};
    const allTables = Object.keys(definitions);

    const irrelevantTables = allTables.filter(table => !requiredTables.includes(table));

    console.log('--- IRRELEVANT TABLES ---');
    irrelevantTables.forEach(t => console.log(t));

} catch (error) {
    console.error('Error parsing JSON:', error);
}
