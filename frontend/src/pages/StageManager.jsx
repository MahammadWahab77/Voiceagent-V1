import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Save, Plus, Trash, Edit } from 'lucide-react';

export default function StageManager() {
    const [stages, setStages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingStage, setEditingStage] = useState(null);

    useEffect(() => {
        fetchStages();
    }, []);

    const fetchStages = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('stage_configs').select('*').order('stage_number');
        if (!error) setStages(data || []);
        setLoading(false);
    };

    const handleSave = async (stage) => {
        const { id, ...updates } = stage;
        const { error } = await supabase.from('stage_configs').update(updates).eq('id', id);
        if (!error) {
            setEditingStage(null);
            fetchStages();
        } else {
            alert('Error saving stage: ' + error.message);
        }
    };

    return (
        <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Stage Configuration</h1>

            {loading ? <p>Loading...</p> : (
                <div className="space-y-4">
                    {stages.map(stage => (
                        <div key={stage.id} className="bg-white p-4 rounded shadow border border-gray-200">
                            {editingStage?.id === stage.id ? (
                                <div className="space-y-3">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs text-gray-500">Name</label>
                                            <input
                                                className="w-full border p-2 rounded"
                                                value={editingStage.name}
                                                onChange={e => setEditingStage({ ...editingStage, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-20">
                                            <label className="block text-xs text-gray-500">Stage #</label>
                                            <div className="p-2 bg-gray-100 rounded">{editingStage.stage_number}</div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-500">System Prompt</label>
                                        <textarea
                                            className="w-full border p-2 rounded h-32"
                                            value={editingStage.system_prompt}
                                            onChange={e => setEditingStage({ ...editingStage, system_prompt: e.target.value })}
                                        />
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <button onClick={() => setEditingStage(null)} className="px-4 py-2 text-gray-600">Cancel</button>
                                        <button onClick={() => handleSave(editingStage)} className="px-4 py-2 bg-indigo-600 text-white rounded flex items-center gap-2">
                                            <Save className="w-4 h-4" /> Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="bg-indigo-100 text-indigo-800 text-xs px-2 py-1 rounded-full">Stage {stage.stage_number}</span>
                                            <h3 className="font-bold text-lg">{stage.name}</h3>
                                        </div>
                                        <p className="text-gray-600 text-sm line-clamp-2">{stage.system_prompt}</p>
                                    </div>
                                    <button onClick={() => setEditingStage(stage)} className="text-gray-400 hover:text-indigo-600">
                                        <Edit className="w-5 h-5" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
