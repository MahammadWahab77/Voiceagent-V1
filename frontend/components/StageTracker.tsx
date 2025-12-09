import React from 'react';
import { Stage } from '../types';
import { CheckCircle2, Circle, Radio, CloudOff } from 'lucide-react';

interface StageTrackerProps {
  stages: Stage[];
  className?: string;
  mobileView?: boolean;
  isOffline?: boolean;
}

const StageTracker: React.FC<StageTrackerProps> = ({ stages, className = "", mobileView = false, isOffline = false }) => {
  if (mobileView) {
    return (
      <div className={`w-full overflow-x-auto no-scrollbar py-2 px-4 transition-all duration-300 ${className} ${isOffline ? 'grayscale opacity-70' : ''}`}>
        <div className="flex items-center gap-3 min-w-max">
           {stages.map((stage) => (
            <div 
              key={stage.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
                stage.active 
                  ? 'bg-white/80 border-blue-200 shadow-sm' 
                  : stage.completed 
                    ? 'bg-white/40 border-green-100 opacity-80' 
                    : 'bg-white/20 border-white/40 opacity-50'
              }`}
            >
               {stage.completed ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : stage.active ? (
                  <Radio className={`w-3 h-3 text-blue-500 ${!isOffline && 'animate-pulse'}`} />
                ) : (
                  <Circle className="w-3 h-3 text-gray-400" />
                )}
                <span className={`text-xs font-medium whitespace-nowrap ${stage.active ? 'text-gray-800' : 'text-gray-500'}`}>
                  {stage.title}
                </span>
            </div>
           ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-xs p-6 bg-white/50 backdrop-blur-lg rounded-[24px] border border-white/60 shadow-sm transition-all duration-500 ${className} ${isOffline ? 'grayscale-[0.8] opacity-90 border-gray-200' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Progress</h3>
        {isOffline && <CloudOff className="w-4 h-4 text-gray-400" />}
      </div>
      
      <div className="space-y-4">
        {stages.map((stage) => (
          <div 
            key={stage.id} 
            className={`flex items-center gap-3 transition-colors duration-300 ${stage.active ? 'opacity-100' : 'opacity-50'}`}
          >
            <div className={`transition-transform duration-300 ${stage.active && !isOffline ? 'scale-110' : 'scale-100'}`}>
              {stage.completed ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : stage.active ? (
                <Radio className={`w-5 h-5 text-blue-500 ${!isOffline && 'animate-pulse'}`} />
              ) : (
                <Circle className="w-5 h-5 text-gray-300" />
              )}
            </div>
            <span 
              className={`text-sm font-medium ${stage.active ? 'text-gray-900' : 'text-gray-500'}`}
            >
              {stage.title}
            </span>
          </div>
        ))}
      </div>
      
      {/* Offline Reassurance Text */}
      <div className={`overflow-hidden transition-all duration-500 ${isOffline ? 'max-h-10 mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
         <p className="text-[10px] text-center font-medium text-amber-600 bg-amber-50 rounded-lg py-2 border border-amber-100">
            Progress saved. Waiting to reconnect...
         </p>
      </div>
    </div>
  );
};

export default StageTracker;