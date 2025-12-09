import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Plus, Trash, FileText } from 'lucide-react';

export default function DocumentManager() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newContent, setNewContent] = useState('');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('document_embeddings').select('id, content, created_at').order('created_at', { ascending: false });
        if (!error) setDocuments(data || []);
        setLoading(false);
    };

    const handleUpload = async () => {
        if (!newContent.trim()) return;
        setUploading(true);

        // We need to call our backend API to handle embedding securel
        // Since supabase-js client key is ANON, we can't easily auto-embed on client securely without exposing OpenAI key
        // So we use the backend endpoint

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Not authenticated");

            const res = await fetch('http://localhost:3001/api/admin/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    content: newContent,
                    metadata: { source: 'admin-upload' }
                })
            });

            if (!res.ok) throw new Error("Upload failed");

            setNewContent('');
            fetchDocuments();
        } catch (err) {
            alert("Error uploading: " + err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure?")) return;
        const { error } = await supabase.from('document_embeddings').delete().eq('id', id);
        if (!error) fetchDocuments();
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Knowledge Base (RAG)</h1>

            <div className="bg-white p-6 rounded shadow mb-8">
                <h2 className="text-lg font-semibold mb-4">Add New Knowledge</h2>
                <textarea
                    className="w-full border p-3 rounded h-32 mb-4"
                    placeholder="Paste text content here to be embedded..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                />
                <button
                    onClick={handleUpload}
                    disabled={uploading || !newContent.trim()}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                >
                    {uploading ? "Embedding..." : <><Plus className="w-4 h-4" /> Add to Knowledge Base</>}
                </button>
            </div>

            <div className="bg-white rounded shadow border border-gray-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="text-left p-4 text-gray-500 font-medium text-sm">Content Preview</th>
                            <th className="text-left p-4 text-gray-500 font-medium text-sm">Created At</th>
                            <th className="text-right p-4 text-gray-500 font-medium text-sm">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="3" className="p-4 text-center">Loading...</td></tr>
                        ) : documents.length === 0 ? (
                            <tr><td colSpan="3" className="p-4 text-center text-gray-500">No documents found.</td></tr>
                        ) : (
                            documents.map(doc => (
                                <tr key={doc.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                            <FileText className="w-5 h-5 text-gray-400" />
                                            <span className="line-clamp-1 max-w-md text-gray-700">{doc.content}</span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(doc.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="p-4 text-right">
                                        <button onClick={() => handleDelete(doc.id)} className="text-red-500 hover:text-red-700 p-1">
                                            <Trash className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
