import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Save, Plus, Trash, Edit, CheckCircle, Wrench } from 'lucide-react';

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

    const updateValidationRules = (rules) => {
        setEditingStage({ ...editingStage, validation_rules: rules });
    };

    const addQuestion = () => {
        const currentRules = editingStage.validation_rules || {};
        const questions = currentRules.questions || [];
        updateValidationRules({ ...currentRules, questions: [...questions, ""] });
    };

    const updateQuestion = (index, value) => {
        const currentRules = editingStage.validation_rules || {};
        const questions = [...(currentRules.questions || [])];
        questions[index] = value;
        updateValidationRules({ ...currentRules, questions });
    };

    const removeQuestion = (index) => {
        const currentRules = editingStage.validation_rules || {};
        const questions = (currentRules.questions || []).filter((_, i) => i !== index);
        updateValidationRules({ ...currentRules, questions });
    };

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Stage Configuration</h1>

            {loading ? <div className="flex justify-center p-8"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div></div> : (
                <div className="space-y-6">
                    {stages.map(stage => (
                        <div key={stage.id} className={`bg-white rounded-xl shadow-sm border transition-all ${editingStage?.id === stage.id ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-md' : 'border-gray-200 hover:border-indigo-200'}`}>
                            {editingStage?.id === stage.id ? (
                                <div className="p-6 space-y-6">
                                    <div className="flex gap-6">
                                        <div className="flex-1">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stage Name</label>
                                            <input
                                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-medium"
                                                value={editingStage.name}
                                                onChange={e => setEditingStage({ ...editingStage, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Stage #</label>
                                            <div className="p-3 bg-gray-50 rounded-lg text-center font-bold text-gray-700">{editingStage.stage_number}</div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">System Prompt</label>
                                        <textarea
                                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all h-32 text-sm leading-relaxed"
                                            value={editingStage.system_prompt}
                                            onChange={e => setEditingStage({ ...editingStage, system_prompt: e.target.value })}
                                        />
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Validation Questions (Required to pass)</label>
                                        <div className="space-y-3">
                                            {(editingStage.validation_rules?.questions || []).map((q, i) => (
                                                <div key={i} className="flex gap-2">
                                                    <input
                                                        className="flex-1 border border-gray-300 p-2 rounded focus:ring-2 focus:ring-indigo-500 text-sm"
                                                        value={q}
                                                        onChange={e => updateQuestion(i, e.target.value)}
                                                        placeholder={`Question ${i + 1}`}
                                                    />
                                                    <button onClick={() => removeQuestion(i)} className="p-2 text-red-500 hover:bg-red-50 rounded"><Trash className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            <button onClick={addQuestion} className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                                                <Plus className="w-4 h-4" /> Add Question
                                            </button>
                                        </div>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-2">
                                        <button onClick={() => setEditingStage(null)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
                                        <button onClick={() => handleSave(editingStage)} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm transition-all flex items-center gap-2">
                                            <Save className="w-4 h-4" /> Save Changes
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-5 flex items-start justify-between group">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm">
                                                {stage.stage_number}
                                            </span>
                                            <h3 className="font-bold text-gray-900 text-lg">{stage.name}</h3>
                                        </div>
                                        <p className="text-gray-500 text-sm line-clamp-2 pl-11 mb-3">{stage.system_prompt}</p>

                                        {stage.validation_rules?.questions?.length > 0 && (
                                            <div className="pl-11 flex flex-wrap gap-2">
                                                {stage.validation_rules.questions.map((q, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 text-xs rounded border border-green-100">
                                                        <CheckCircle className="w-3 h-3" /> {q.substring(0, 30)}{q.length > 30 ? '...' : ''}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <button onClick={() => setEditingStage(stage)} className="text-gray-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition-all opacity-0 group-hover:opacity-100">
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
