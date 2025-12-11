import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function AdminDashboard() {
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeSessions: 0,
        avgResponseTime: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || ''}/api/admin/analytics`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Aggregate data on frontend for now (or backend could return summary)
                // Assuming data is array of student_analytics
                const totalStudents = data.length;
                const activeSessions = data.filter(s => new Date(s.last_active) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length;
                const avgResp = data.reduce((acc, curr) => acc + (curr.avg_response_time_ms || 0), 0) / (totalStudents || 1);

                setStats({
                    totalStudents,
                    activeSessions,
                    avgResponseTime: (avgResp / 1000).toFixed(2)
                });
            }
        } catch (error) {
            console.error("Failed to fetch analytics:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-6">Loading stats...</div>;

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Dashboard</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
                    <div className="text-gray-500 mb-2">Total Students</div>
                    <div className="text-3xl font-bold">{stats.totalStudents}</div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
                    <div className="text-gray-500 mb-2">Active Sessions (24h)</div>
                    <div className="text-3xl font-bold">{stats.activeSessions}</div>
                </div>

                <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500">
                    <div className="text-gray-500 mb-2">Avg. Response Time</div>
                    <div className="text-3xl font-bold">{stats.avgResponseTime}s</div>
                </div>
            </div>

            <div className="mt-8 bg-white p-6 rounded-lg shadow">
                <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
                <p className="text-gray-500">Real-time activity log coming soon.</p>
            </div>
        </div>
    );
}
