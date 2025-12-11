import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { ArrowLeft, MessageSquare, Activity, Calendar, Phone, User as UserIcon } from 'lucide-react';

export default function UserDetail() {
    const { userId } = useParams();
    const [user, setUser] = useState(null);
    const [analytics, setAnalytics] = useState(null);
    const [conversations, setConversations] = useState([]);
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('transcripts'); // 'transcripts' or 'insights'

    useEffect(() => {
        if (userId) {
            fetchUserDetails();
        }
    }, [userId]);

    const fetchUserDetails = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            const headers = { 'Authorization': `Bearer ${token}` };
            const baseUrl = import.meta.env.VITE_BACKEND_URL || '';

            // Fetch User & Analytics
            const userRes = await fetch(`${baseUrl}/api/admin/users/${userId}`, { headers });
            if (userRes.ok) {
                const data = await userRes.json();
                setUser(data.student);
                setAnalytics(data.analytics);
            }

            // Fetch Conversations
            const convRes = await fetch(`${baseUrl}/api/admin/users/${userId}/conversations`, { headers });
            if (convRes.ok) setConversations(await convRes.json());

            // Fetch Insights
            const insightRes = await fetch(`${baseUrl}/api/admin/users/${userId}/insights`, { headers });
            if (insightRes.ok) setInsights(await insightRes.json());

        } catch (error) {
            console.error('Error fetching details:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading details...</div>;
    if (!user) return <div className="p-8 text-center text-red-500">User not found</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/admin/users" className="p-2 hover:bg-slate-100 rounded-full transition text-slate-500">
                    <ArrowLeft className="w-5 h-5" />
                </Link>
                <h1 className="text-2xl font-bold text-slate-900">User Details</h1>
            </div>

            {/* Profile Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center shrink-0">
                    <UserIcon className="w-10 h-10" />
                </div>
                <div className="flex-1 space-y-1">
                    <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
                    <div className="flex items-center gap-4 text-slate-500 text-sm">
                        <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {user.mobile_number}</span>
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="text-center px-4 py-2 bg-blue-50 rounded-lg">
                        <div className="text-xs text-blue-600 font-semibold uppercase tracking-wider">Stage</div>
                        <div className="text-2xl font-bold text-blue-700">{user.current_stage || 1}</div>
                    </div>
                    {analytics && (
                        <div className="text-center px-4 py-2 bg-purple-50 rounded-lg">
                            <div className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Sessions</div>
                            <div className="text-2xl font-bold text-purple-700">{analytics.total_sessions || 0}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('transcripts')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'transcripts'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Transcripts ({conversations.length})
                </button>
                <button
                    onClick={() => setActiveTab('insights')}
                    className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === 'insights'
                        ? 'border-indigo-600 text-indigo-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                        }`}
                >
                    Identified Insights ({insights.length})
                </button>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[400px]">
                {activeTab === 'transcripts' && (
                    <div className="divide-y divide-slate-50">
                        {conversations.length === 0 && (
                            <div className="p-8 text-center text-slate-400">No conversation history available.</div>
                        )}
                        {conversations.map((conv, idx) => (
                            <div key={conv.id || idx} className="p-4 hover:bg-slate-50 transition">
                                <div className="flex items-start gap-4">
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-1">
                                        <MessageSquare className="w-4 h-4 text-slate-400" />
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-semibold text-slate-400 uppercase">Stage {conv.stage}</span>
                                            <span className="text-xs text-slate-400">{new Date(conv.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="bg-blue-50 text-blue-900 px-4 py-2 rounded-lg rounded-tl-none inline-block">
                                            <span className="font-bold text-xs text-blue-400 block mb-1">USER</span>
                                            {conv.message}
                                        </div>
                                        <div className="block"></div> {/* Break line */}
                                        <div className="bg-slate-50 text-slate-700 px-4 py-2 rounded-lg rounded-tr-none inline-block border border-slate-200">
                                            <span className="font-bold text-xs text-slate-400 block mb-1">AGENT</span>
                                            {conv.response}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'insights' && (
                    <div className="divide-y divide-slate-50">
                        {insights.length === 0 && (
                            <div className="p-8 text-center text-slate-400">No business insights recorded yet.</div>
                        )}
                        {insights.map((insight, idx) => (
                            <div key={insight.id || idx} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                                    ${insight.sentiment === 'positive' ? 'bg-green-100 text-green-600' :
                                        insight.sentiment === 'negative' ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                    <Activity className="w-5 h-5" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="font-medium text-slate-900">{insight.summary}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium capitalize">
                                            {insight.insight_type}
                                        </span>
                                        <span className="text-xs text-slate-400">
                                            Stage {insight.stage} • {new Date(insight.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
