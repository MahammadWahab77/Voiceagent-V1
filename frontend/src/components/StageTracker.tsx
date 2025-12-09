import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { Stage } from '../types';

interface StageTrackerProps {
    stages: Stage[];
    mobileView?: boolean;
    isOffline?: boolean;
}

export function StageTracker({ stages, mobileView = false, isOffline = false }: StageTrackerProps) {
    if (mobileView) {
        return (
            <div className={`flex w-full overflow-x-auto gap-4 p-4 no-scrollbar items-center ${isOffline ? 'grayscale opacity-50' : ''}`}>
                {stages.map((stage) => (
                    <div
                        key={stage.id}
                        className={`
              flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap border text-sm font-medium transition-all
              ${stage.active
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg'
                                : stage.completed
                                    ? 'bg-green-50 border-green-200 text-green-700'
                                    : 'bg-white border-slate-200 text-slate-500'}
            `}
                    >
                        {stage.completed ? (
                            <CheckCircle2 className="w-4 h-4" />
                        ) : stage.active ? (
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                        ) : (
                            <Circle className="w-4 h-4" />
                        )}
                        {stage.title}
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className={`glass-panel rounded-2xl p-6 h-fit transition-all duration-500 ${isOffline ? 'grayscale opacity-50' : ''}`}>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-6">
                Onboarding Process
            </h3>
            <div className="space-y-6 relative">
                {/* Vertical Line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-[2px] bg-slate-100 -z-10" />

                {stages.map((stage) => (
                    <div key={stage.id} className="group flex items-start gap-4">
                        <div className={`
              mt-0.5 relative z-10 rounded-full border-2 transition-all duration-300
              ${stage.active
                                ? 'w-6 h-6 border-blue-600 bg-white flex items-center justify-center shadow-[0_0_0_4px_rgba(37,99,235,0.1)]'
                                : stage.completed
                                    ? 'w-6 h-6 border-green-500 bg-green-500 text-white'
                                    : 'w-6 h-6 border-slate-200 bg-white'}
            `}>
                            {stage.completed && <CheckCircle2 className="w-4 h-4" />}
                            {stage.active && <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />}
                        </div>

                        <div className="flex-1 -mt-1">
                            <p className={`font-semibold text-sm transition-colors ${stage.active ? 'text-slate-900' :
                                stage.completed ? 'text-slate-700' : 'text-slate-400'
                                }`}>
                                {stage.title}
                            </p>
                            {stage.active && (
                                <div className="flex items-center gap-1.5 mt-1 text-xs text-blue-600 font-medium">
                                    <Clock className="w-3 h-3" />
                                    <span>In Progress...</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
