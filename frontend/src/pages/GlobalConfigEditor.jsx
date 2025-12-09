import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function GlobalConfigEditor() {
    const [config, setConfig] = useState({
        global_system_prompt: '',
        rag_top_k: 3,
        rag_similarity_threshold: 0.7
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: string }

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('http://localhost:3001/api/admin/global-config', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data) {
                    setConfig({
                        global_system_prompt: data.global_system_prompt || '',
                        rag_top_k: data.rag_top_k || 3,
                        rag_similarity_threshold: data.rag_similarity_threshold || 0.7
                    });
                }
            } else {
                throw new Error('Failed to fetch config');
            }
        } catch (error) {
            console.error('Error fetching global config:', error);
            setMessage({ type: 'error', text: 'Failed to load configuration.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('http://localhost:3001/api/admin/global-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(config)
            });

            if (response.ok) {
                setMessage({ type: 'success', text: 'Configuration saved successfully!' });
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            console.error('Error saving global config:', error);
            setMessage({ type: 'error', text: 'Failed to save configuration.' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">Loading configuration...</div>;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Global Configuration</h1>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg mb-6 flex items-center space-x-2 ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Global System Prompt
                    </label>
                    <p className="text-sm text-gray-500 mb-2">
                        This instruction is included in every conversation turn. Use it to define the agent's core persona and behavior.
                    </p>
                    <textarea
                        value={config.global_system_prompt}
                        onChange={(e) => setConfig({ ...config, global_system_prompt: e.target.value })}
                        className="w-full h-64 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono text-sm"
                        placeholder="You are a helpful assistant..."
                    />
                </div>

                <div className="border-t border-gray-200 pt-6">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">RAG Configuration</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Top K Results ({config.rag_top_k})
                            </label>
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={config.rag_top_k}
                                onChange={(e) => setConfig({ ...config, rag_top_k: parseInt(e.target.value) })}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Number of document chunks to retrieve for context.
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Similarity Threshold ({config.rag_similarity_threshold})
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                value={config.rag_similarity_threshold}
                                onChange={(e) => setConfig({ ...config, rag_similarity_threshold: parseFloat(e.target.value) })}
                                className="w-full"
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Minimum similarity score required for relevance.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
