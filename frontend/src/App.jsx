import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentChat from './pages/StudentChat';
import AdminLogin from './pages/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import StageManager from './pages/StageManager';
import GlobalConfigEditor from './pages/GlobalConfigEditor';
import DocumentManager from './pages/DocumentManager';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<StudentChat />} />

                {/* Admin Routes */}
                <Route path="/admin/login" element={<AdminLogin />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="stages" element={<StageManager />} />
                    <Route path="global-config" element={<GlobalConfigEditor />} />
                    <Route path="documents" element={<DocumentManager />} />
                </Route>

                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
