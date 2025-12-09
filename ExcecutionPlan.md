# System Implementation Prompt: Full-Stack RAG Application 
 
## Role and Context 
You are an expert full-stack developer specializing in building production-ready RAG (Retrieval-Augmented Generation) applications. You will build a complete system with the following characteristics: 
 
**Application Type**: Educational RAG chatbot with admin controls   
**User Groups**: (1) Students (no authentication), (2) Admins (authenticated)   
**Core Technology**: LangChain for RAG, Supabase for database and vectors, React frontend, Node.js backend ( fastif)
 
--- 
 
## Critical Requirements (Must Follow) 
 
### 1. Authentication Model 
- **Students**: NO authentication required. Use session-based tracking only 
- **Admins**: MUST have authentication using Supabase Auth 
- **Rule**: Never implement authentication for the student-facing chat interface 
 
### 2. Routing Structure 
- `/` and `/Main` → Student chat interface (public, no auth) 
- `/admin` → Admin dashboard (protected, requires auth) 
- `/admin/login` → Admin login page 
- `/api` → API health monitoring dashboard (protected, admin only) 
 
### 3. Database Requirements 
Use Supabase with PostgreSQL. Required tables: 
- `students` - Track sessions without authentication 
- `conversations` - Store all chat interactions with metrics 
- `admin_users` - Admin accounts linked to Supabase Auth 
- `stage_configs` - Stage-specific system prompts and validation rules 
- `global_config` - Global system prompt and RAG settings 
- `student_analytics` - Aggregated metrics per student 
- `document_embeddings` - Vector embeddings for RAG (requires pgvector extension) 
 
### 4. Stage-Based System Prompts 
Each conversation stage has: 
- A unique system prompt 
- Specific validation rules 
- Configurable by admins 
- Combined with global prompt at runtime 
 
**Prompt Combination Formula**: 
``` 
FINAL_PROMPT = global_system_prompt  
             + stage_system_prompt  
             + RAG_retrieved_context  
             + conversation_history  
             + user_message 
``` 
 
### 5. RAG Implementation with LangChain 
- Use LangChain's `SupabaseVectorStore` for vector storage 
- Use OpenAI embeddings (1536 dimensions) 
- Store embeddings in Supabase `document_embeddings` table 
- Retrieve top-k relevant chunks per query (k configurable by admin) 
- Enable pgvector extension in Supabase 
 
### 6. Analytics Tracking 
For each student, track and display in admin dashboard: 
- Average response time (milliseconds) 
- Total tokens used 
- Payment option selected 
- Session count 
- Last active timestamp 
- Stage progression 
 
### 7. Validation System 
Each stage must have configurable validation rules: 
- Required keywords/elements 
- Min/max response length 
- Forbidden words 
- Tone requirements 
- Format requirements 
- All configurable by admin through UI 
 
--- 
 
## Step-by-Step Implementation Guide 
 
### STEP 1: Database Setup 
Create a Supabase project and execute the following: 
 
```sql 
-- Enable pgvector for RAG 
CREATE EXTENSION IF NOT EXISTS vector; 
 
-- Students table (no auth) 
CREATE TABLE students ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  session_id TEXT UNIQUE NOT NULL, 
  created_at TIMESTAMPTZ DEFAULT NOW() 
); 
 
-- Conversations with metrics 
CREATE TABLE conversations ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  student_id UUID REFERENCES students(id) ON DELETE CASCADE, 
  stage INT NOT NULL, 
  message TEXT NOT NULL, 
  response TEXT, 
  tokens_used INT DEFAULT 0, 
  response_time_ms INT DEFAULT 0, 
  validation_passed BOOLEAN DEFAULT true, 
  created_at TIMESTAMPTZ DEFAULT NOW() 
); 
 
-- Admin users 
CREATE TABLE admin_users ( 
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, 
  email TEXT UNIQUE NOT NULL, 
  role TEXT DEFAULT 'admin', 
  created_at TIMESTAMPTZ DEFAULT NOW() 
); 
 
-- Stage configurations 
CREATE TABLE stage_configs ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  stage_number INT UNIQUE NOT NULL, 
  name TEXT NOT NULL, 
  system_prompt TEXT NOT NULL, 
  validation_rules JSONB DEFAULT '{}', 
  is_active BOOLEAN DEFAULT true, 
  created_at TIMESTAMPTZ DEFAULT NOW(), 
  updated_at TIMESTAMPTZ DEFAULT NOW(), 
  updated_by UUID REFERENCES admin_users(id) 
); 
 
-- Global configuration 
CREATE TABLE global_config ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  key TEXT UNIQUE NOT NULL, 
  global_system_prompt TEXT, 
  rag_top_k INT DEFAULT 3, 
  rag_similarity_threshold FLOAT DEFAULT 0.7, 
  updated_at TIMESTAMPTZ DEFAULT NOW(), 
  updated_by UUID REFERENCES admin_users(id) 
); 
 
-- Student analytics 
CREATE TABLE student_analytics ( 
  student_id UUID PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE, 
  total_sessions INT DEFAULT 0, 
  avg_response_time_ms FLOAT DEFAULT 0, 
  total_tokens_used BIGINT DEFAULT 0, 
  payment_option TEXT, 
  stages_completed INT[] DEFAULT ARRAY[]::INT[], 
  last_active TIMESTAMPTZ DEFAULT NOW() 
); 
 
-- Document embeddings for RAG 
CREATE TABLE document_embeddings ( 
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), 
  content TEXT NOT NULL, 
  embedding VECTOR(1536), 
  metadata JSONB DEFAULT '{}', 
  created_at TIMESTAMPTZ DEFAULT NOW() 
); 
 
-- Create indexes for performance 
CREATE INDEX idx_conversations_student ON conversations(student_id); 
CREATE INDEX idx_conversations_stage ON conversations(stage); 
CREATE INDEX idx_embeddings_vector ON document_embeddings USING ivfflat (embedding vector_cosine_ops); 
 
-- Insert default global config 
INSERT INTO global_config (key, global_system_prompt, rag_top_k)  
VALUES ('main', 'You are a helpful educational assistant.', 3); 
 
-- Insert sample stages 
INSERT INTO stage_configs (stage_number, name, system_prompt, validation_rules) VALUES 
(1, 'Introduction', 'Greet the student warmly and ask about their learning goals.',  
 '{"required_elements": ["greeting"], "min_length": 30, "tone": "friendly"}'), 
(2, 'Information Gathering', 'Ask detailed questions to understand student needs.',  
 '{"must_ask_question": true, "min_length": 50}'), 
(3, 'Recommendation', 'Provide personalized recommendations based on gathered information.',  
 '{"required_elements": ["recommendation"], "min_length": 100}'); 
``` 
 
**Row Level Security (RLS)**: Set up policies so admin_users can only modify their related records. 
 
--- 
 
### STEP 2: Backend Setup 
 
#### Environment Variables (.env) 
```env 
# Supabase 
SUPABASE_URL=your_project_url 
SUPABASE_ANON_KEY=your_anon_key 
SUPABASE_SERVICE_KEY=your_service_role_key 
 
# OpenAI 
OPENAI_API_KEY=your_openai_api_key 
 
# Server 
PORT=3001 
NODE_ENV=development 
 
# Admin 
ADMIN_JWT_SECRET=your_jwt_secret 
``` 
 
#### Project Structure 
``` 
backend/ 
├── src/ 
│   ├── config/ 
│   │   ├── supabase.js          # Supabase client setup 
│   │   └── langchain.js         # LangChain RAG setup 
│   ├── middleware/ 
│   │   ├── auth.js              # Admin authentication 
│   │   └── errorHandler.js      # Global error handling 
│   ├── services/ 
│   │   ├── ragService.js        # LangChain RAG logic 
│   │   ├── validationService.js # Response validation 
│   │   └── analyticsService.js  # Analytics tracking 
│   ├── routes/ 
│   │   ├── chat.js              # Student chat endpoints 
│   │   ├── admin.js             # Admin CRUD endpoints 
│   │   └── api-monitor.js       # API health checks 
│   └── server.js                # Express app 
└── package.json 
``` 
 
#### Core Backend Files 
 
**src/config/supabase.js** 
```javascript 
import { createClient } from '@supabase/supabase-js'; 
 
export const supabaseAdmin = createClient( 
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_KEY 
); 
 
export const supabaseClient = createClient( 
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_ANON_KEY 
); 
``` 
 
**src/services/ragService.js** - Must implement: 
```javascript 
class RAGService { 
  async initializeVectorStore() { 
    // Set up SupabaseVectorStore with OpenAI embeddings 
    // Use document_embeddings table 
  } 
 
  async addDocument(content, metadata) { 
    // 1. Split into chunks (use RecursiveCharacterTextSplitter) 
    // 2. Generate embeddings 
    // 3. Store in Supabase with metadata 
  } 
 
  async retrieveContext(query, topK = 3) { 
    // 1. Embed query with OpenAI 
    // 2. Search document_embeddings using cosine similarity 
    // 3. Return top K chunks 
  } 
 
  async generateResponse({ message, stage, sessionId }) { 
    // 1. Get global_config.global_system_prompt 
    // 2. Get stage_configs WHERE stage_number = stage 
    // 3. Retrieve RAG context: await this.retrieveContext(message) 
    // 4. Get last 5 conversations for this student 
    // 5. Combine all prompts: 
    //    const finalPrompt = ` 
    //      ${globalPrompt} 
    //       
    //      STAGE ${stage} - ${stageName}: 
    //      ${stagePrompt} 
    //       
    //      RELEVANT KNOWLEDGE: 
    //      ${ragContext} 
    //       
    //      RECENT CONVERSATION: 
    //      ${conversationHistory} 
    //       
    //      VALIDATION RULES: ${JSON.stringify(validationRules)} 
    //       
    //      STUDENT MESSAGE: ${message} 
    //    `; 
    // 6. Call OpenAI/LangChain with finalPrompt 
    // 7. Validate response with validationService 
    // 8. Track metrics (time, tokens) 
    // 9. Save to conversations table 
    // 10. Update student_analytics 
    // 11. Return response + validation status 
  } 
} 
``` 
 
**src/services/validationService.js** - Must implement: 
```javascript 
function validateResponse(response, rules) { 
  // Check min_length, max_length 
  // Check required_elements (keywords) 
  // Check forbidden_words 
  // Check must_ask_question (contains '?') 
  // Return { passed: boolean, failures: string[] } 
} 
``` 
 
**src/routes/chat.js** - Required endpoints: 
```javascript 
POST /api/chat 
Body: { sessionId: string, message: string, stage: number } 
Response: { response: string, validation: object, metrics: object } 
 
// Logic: 
// 1. Find or create student by sessionId 
// 2. Call ragService.generateResponse() 
// 3. Return AI response with validation results 
``` 
 
**src/routes/admin.js** - Required endpoints: 
```javascript 
// Auth 
POST /api/admin/login 
POST /api/admin/logout 
 
// Stages 
GET    /api/admin/stages 
GET    /api/admin/stages/:id 
POST   /api/admin/stages 
PUT    /api/admin/stages/:id 
DELETE /api/admin/stages/:id 
 
// Global Config 
GET    /api/admin/global-config 
PUT    /api/admin/global-config 
 
// Analytics 
GET    /api/admin/analytics          # All students 
GET    /api/admin/analytics/:id      # Single student 
 
// Documents 
GET    /api/admin/documents 
POST   /api/admin/documents          # Upload & embed 
DELETE /api/admin/documents/:id 
``` 
 
**src/routes/api-monitor.js** - Required endpoint: 
```javascript 
GET /api 
Response: { 
  status: "healthy", 
  timestamp: ISO8601, 
  services: { 
    database: { status, response_time_ms, last_query }, 
    rag_service: { status, response_time_ms, embeddings_count }, 
    supabase: { status, response_time_ms }, 
    langchain: { status, model, last_completion } 
  }, 
  endpoints: { 
    "/api/chat": { status, avg_response_ms }, 
    "/api/admin/*": { ... } 
  } 
} 
 
// Test each service and measure response times 
``` 
 
**src/middleware/auth.js** 
```javascript 
export async function requireAdmin(req, res, next) { 
  // 1. Extract token from Authorization header 
  // 2. Verify with supabase.auth.getUser(token) 
  // 3. Check if user exists in admin_users table 
  // 4. If valid, attach user to req and call next() 
  // 5. If invalid, return 401/403 
} 
``` 
 
--- 
 
### STEP 3: Frontend Setup 
 
#### Project Structure 
``` 
frontend/ 
├── src/ 
│   ├── components/ 
│   │   ├── student/ 
│   │   │   ├── ChatInterface.jsx 
│   │   │   ├── MessageBubble.jsx 
│   │   │   └── PaymentSelector.jsx 
│   │   └── admin/ 
│   │       ├── AdminLayout.jsx 
│   │       ├── StageManager.jsx 
│   │       ├── GlobalConfigEditor.jsx 
│   │       ├── AnalyticsDashboard.jsx 
│   │       ├── DocumentManager.jsx 
│   │       └── APIMonitor.jsx 
│   ├── pages/ 
│   │   ├── StudentChat.jsx 
│   │   ├── AdminLogin.jsx 
│   │   ├── AdminDashboard.jsx 
│   │   └── APIMonitorPage.jsx 
│   ├── contexts/ 
│   │   └── AuthContext.jsx 
│   ├── utils/ 
│   │   ├── api.js 
│   │   └── session.js 
│   ├── App.jsx 
│   └── main.jsx 
└── package.json 
``` 
 
#### Routing (App.jsx) 
```javascript 
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'; 
 
function ProtectedRoute({ children }) { 
  const { isAdmin } = useAuth(); 
  return isAdmin ? children : <Navigate to="/admin/login" />; 
} 
 
function App() { 
  return ( 
    <BrowserRouter> 
      <Routes> 
        {/* Public Student Routes - NO AUTH */} 
        <Route path="/" element={<StudentChat />} /> 
        <Route path="/chat" element={<StudentChat />} /> 
         
        {/* Admin Routes - REQUIRE AUTH */} 
        <Route path="/admin/login" element={<AdminLogin />} /> 
        <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}> 
          <Route index element={<AdminDashboard />} /> 
          <Route path="stages" element={<StageManager />} /> 
          <Route path="global-config" element={<GlobalConfigEditor />} /> 
          <Route path="analytics" element={<AnalyticsDashboard />} /> 
          <Route path="documents" element={<DocumentManager />} /> 
         
        {/* API Monitor - REQUIRE AUTH */} 
        <Route path="/api" element={<ProtectedRoute><APIMonitorPage /></ProtectedRoute>} /> 
      </Routes> 
    </BrowserRouter> 
  ); 
} 
``` 
 
#### Session Management (utils/session.js) 
```javascript 
export function getOrCreateSessionId() { 
  let sessionId = localStorage.getItem('student_session_id'); 
  if (!sessionId) { 
    sessionId = crypto.randomUUID(); 
    localStorage.setItem('student_session_id', sessionId); 
  } 
  return sessionId; 
} 
``` 
 
#### Student Chat Component Requirements 
**pages/StudentChat.jsx** must include: 
- No login/signup UI 
- Auto-generate session on first visit 
- Current stage indicator 
- Message input and send button 
- Payment option selector (dropdown: "Free", "Basic", "Premium") 
- Display chat history 
- Show response time for each message 
- Show validation status if failed 
 
#### Admin Components Requirements 
 
**components/admin/StageManager.jsx**: 
- List all stages in table format 
- Columns: Stage #, Name, System Prompt (truncated), Active Status, Actions 
- Edit modal for each stage: 
  - Stage number (read-only) 
  - Stage name (editable) 
  - System prompt (large textarea) 
  - Validation rules (JSON editor or form): 
    - min_length (number input) 
    - max_length (number input) 
    - required_elements (tags input) 
    - forbidden_words (tags input) 
    - must_ask_question (checkbox) 
    - tone (text input) 
  - Active toggle 
- Save button that calls PUT /api/admin/stages/:id 
- Add new stage button 
 
**components/admin/GlobalConfigEditor.jsx**: 
- Single page editor with: 
  - Global system prompt (large textarea) 
  - RAG settings: 
    - Top K results (number input) 
    - Similarity threshold (slider 0-1) 
  - Save button that calls PUT /api/admin/global-config 
 
**components/admin/AnalyticsDashboard.jsx**: 
- Summary cards: Total students, Avg response time, Total tokens 
- Student table with columns: 
  - Session ID 
  - Total sessions 
  - Avg response time (ms) 
  - Total tokens 
  - Payment option 
  - Last active 
  - Actions (view details button) 
- Detail view shows: 
  - All conversations for that student 
  - Stage progression graph 
  - Time spent per stage 
 
**components/admin/DocumentManager.jsx**: 
- Upload section: 
  - File input (accepts .txt, .pdf, .md) 
  - Upload button calls POST /api/admin/documents 
  - Shows progress during embedding 
- Document list: 
  - Table showing: ID, Content preview, Metadata, Created date, Actions 
  - Delete button per document 
  - Test retrieval button (shows what chunks would be retrieved for a test query) 
 
**components/admin/APIMonitor.jsx**: 
- Real-time status dashboard showing: 
  - Overall system status (green/yellow/red indicator) 
  - Service health cards: 
    - Database (status, response time, last query timestamp) 
    - RAG Service (status, response time, embeddings count) 
    - Supabase (status, response time) 
    - LangChain (status, model, last completion) 
  - Endpoint performance table: 
    - Endpoint path, Status, Avg response time, Last used 
  - Refresh button to re-fetch status 
  - Auto-refresh every 30 seconds 
 
--- 
 
### STEP 4: LangChain Integration Details 
 
**Required LangChain Packages**: 
```json 
{ 
  "@langchain/openai": "latest", 
  "@langchain/community": "latest", 
  "langchain": "latest" 
} 
``` 
 
**Vector Store Setup**: 
```javascript 
import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"; 
import { OpenAIEmbeddings } from "@langchain/openai"; 
 
const embeddings = new OpenAIEmbeddings({ 
  openAIApiKey: process.env.OPENAI_API_KEY, 
  modelName: "text-embedding-ada-002" 
}); 
 
const vectorStore = new SupabaseVectorStore(embeddings, { 
  client: supabaseAdmin, 
  tableName: "document_embeddings", 
  queryName: "match_documents" // Create this function in Supabase 
}); 
``` 
 
**Supabase Vector Search Function** (run in SQL editor): 
```sql 
CREATE OR REPLACE FUNCTION match_documents( 
  query_embedding VECTOR(1536), 
  match_threshold FLOAT, 
  match_count INT 
) 
RETURNS TABLE ( 
  id UUID, 
  content TEXT, 
  metadata JSONB, 
  similarity FLOAT 
) 
LANGUAGE SQL STABLE 
AS $$ 
  SELECT 
    id, 
    content, 
    metadata, 
    1 - (embedding <=> query_embedding) AS similarity 
  FROM document_embeddings 
  WHERE 1 - (embedding <=> query_embedding) > match_threshold 
  ORDER BY embedding <=> query_embedding 
  LIMIT match_count; 
$$; 
``` 
 
**Document Splitting**: 
```javascript 
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter"; 
 
const splitter = new RecursiveCharacterTextSplitter({ 
  chunkSize: 1000, 
  chunkOverlap: 200 
}); 
 
const chunks = await splitter.splitText(documentContent); 
``` 
 
--- 
 
### STEP 5: Testing Checklist 
 
Before considering implementation complete, verify: 
 
#### Backend Tests 
- [ ] POST /api/chat creates student if sessionId is new 
- [ ] POST /api/chat retrieves correct stage prompt from database 
- [ ] POST /api/chat retrieves correct global prompt 
- [ ] POST /api/chat performs RAG retrieval (at least 3 documents) 
- [ ] POST /api/chat combines all prompts correctly 
- [ ] Response validation works for all rule types 
- [ ] Conversations are logged with correct metrics 
- [ ] Analytics are updated after each conversation 
- [ ] Admin login works with Supabase Auth 
- [ ] Admin routes reject unauthenticated requests 
- [ ] All admin CRUD operations work for stages 
- [ ] Global config updates work 
- [ ] Document upload creates embeddings 
- [ ] GET /api returns accurate health status 
 
#### Frontend Tests 
- [ ] Student chat works without any login 
- [ ] Session persists across page refreshes 
- [ ] Payment option is tracked 
- [ ] Stage indicator updates 
- [ ] Admin login redirects to dashboard 
- [ ] Unauthorized users cannot access /admin routes 
- [ ] Stage editor saves changes correctly 
- [ ] Global config editor saves changes correctly 
- [ ] Analytics dashboard shows correct data 
- [ ] Document manager uploads and embeds files 
- [ ] API monitor displays real-time status 
 
#### Integration Tests 
- [ ] Full conversation flow from student message to AI response 
- [ ] Stage transitions work correctly 
- [ ] Admin changes to prompts affect next student conversation 
- [ ] RAG retrieval returns relevant context 
- [ ] Validation failures are logged and displayed 
- [ ] Analytics aggregate correctly over multiple sessions 
 
--- 
 
## Success Criteria 
 
The implementation is complete when: 
 
1. ✅ A student can visit the site and chat immediately without any signup 
2. ✅ Each message generates a response using: global prompt + stage prompt + RAG context 
3. ✅ Admins can login and access /admin routes 
4. ✅ Admins can edit both global and stage-specific prompts 
5. ✅ Admins can configure validation rules per stage 
6. ✅ Admins can view detailed analytics per student including avg time and payment option 
7. ✅ Admins can upload documents that enhance RAG responses 
8. ✅ /api endpoint shows health of all services 
9. ✅ All conversations are logged with response time and token usage 
10. ✅ Students are NOT required to authenticate at any point 
 
--- 
 
## Common Pitfalls to Avoid 
 
1. **DO NOT** implement authentication for students - use session IDs only 
2. **DO NOT** use localStorage or sessionStorage inside React artifacts - use state 
3. **DO NOT** forget to enable pgvector extension in Supabase 
4. **DO NOT** skip creating the match_documents function in Supabase 
5. **DO NOT** hardcode prompts - always load from database 
6. **DO NOT** forget to combine global + stage + RAG prompts 
7. **DO NOT** allow students to access /admin or /api routes 
8. **DO NOT** expose SUPABASE_SERVICE_KEY to frontend - only use SUPABASE_ANON_KEY 
9. **DO NOT** skip validation checks after generating responses 
10. **DO NOT** forget to track analytics after each conversation 
 
--- 
 
## Implementation Order (Recommended) 
 
1. Set up Supabase database and tables 
2. Create backend project structure and basic Express server 
3. Implement admin authentication middleware 
4. Build RAG service with LangChain + Supabase vectors 
5. Create student chat endpoint (POST /api/chat) 
6. Build validation service 
7. Create analytics tracking 
8. Build all admin CRUD endpoints 
9. Create API monitoring endpoint 
10. Build frontend routing structure 
11. Create student chat interface 
12. Build admin login page 
13. Create admin dashboard and all management pages 
14. Build API monitor page 
15. Test entire flow end-to-end 
16. Deploy and verify 
 
--- 
 
## Deployment Considerations 
 
- **Backend**: Deploy to Vercel, Railway, or Render 
- **Frontend**: Deploy to Vercel or Netlify 
- **Environment Variables**: Set all env vars in deployment platform 
- **CORS**: Configure CORS to allow frontend domain 
- **Rate Limiting**: Add rate limiting to API endpoints 
- **Logging**: Implement structured logging for debugging 
- **Error Handling**: Add global error handlers 
- **Monitoring**: Set up Sentry or similar for error tracking 
 
--- 
 
## Expected Output Format 
 
When complete, provide: 
 
1. **GitHub Repository** with clean commit history 
2. **README.md** with: 
   - Setup instructions 
   - Environment variables needed 
   - Database setup steps 
   - How to run locally 
   - API documentation 
3. **Live Demo URLs**: 
   - Student chat interface 
   - Admin dashboard 
   - API monitor 
4. **Admin Test Credentials** 
5. **Sample Documents** uploaded for RAG testing 
 
--- 
 
## Final Validation Questions 
 
Before submitting as complete, answer: 
 
1. Can a student chat without creating an account? (Must be YES) 
2. Are admins required to login? (Must be YES) 
3. Does each response use global + stage + RAG prompts? (Must be YES) 
4. Can admins edit prompts and see analytics? (Must be YES) 
5. Is the /api endpoint showing service health? (Must be YES) 
6. Are all conversations logged with metrics? (Must be YES) 
7. Is Supabase being used for vectors and database? (Must be YES) 
8. Is LangChain being used for RAG? (Must be YES) 
 
If all answers are YES, the implementation is complete.