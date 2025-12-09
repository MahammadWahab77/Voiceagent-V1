import { useState, useEffect } from 'react';
import { Outlet, Navigate, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LayoutDashboard, FileText, Settings, LogOut, Users, Globe } from 'lucide-react';

export default function AdminLayout() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/admin/login');
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center">Loading...</div>;
    }

    if (!session) {
        return <Navigate to="/admin/login" replace />;
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-64 bg-indigo-800 text-white flex flex-col">
                <div className="p-6 font-bold text-xl border-b border-indigo-700">
                    Maya Admin
                </div>
                <nav className="flex-1 p-4 space-y-2">
                    <Link to="/admin" className="flex items-center space-x-3 px-4 py-3 bg-indigo-700 rounded-lg hover:bg-indigo-600 transition">
                        <LayoutDashboard className="w-5 h-5" />
                        <span>Dashboard</span>
                    </Link>
                    <Link to="/admin/stages" className="flex items-center space-x-3 px-4 py-3 hover:bg-indigo-700 rounded-lg transition">
                        <Settings className="w-5 h-5" />
                        <span>Stage Config</span>
                    </Link>
                    <Link to="/admin/global-config" className="flex items-center space-x-3 px-4 py-3 hover:bg-indigo-700 rounded-lg transition">
                        <Globe className="w-5 h-5" />
                        <span>Global Config</span>
                    </Link>
                    <Link to="/admin/documents" className="flex items-center space-x-3 px-4 py-3 hover:bg-indigo-700 rounded-lg transition">
                        <FileText className="w-5 h-5" />
                        <span>Documents (RAG)</span>
                    </Link>
                    {/* Add Analytics Link later */}
                </nav>
                <div className="p-4 border-t border-indigo-700">
                    <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 px-4 py-2 w-full text-indigo-200 hover:text-white transition"
                    >
                        <LogOut className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                <div className="p-8">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
