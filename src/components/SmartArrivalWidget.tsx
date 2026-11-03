import React, { useState } from 'react';
import { Navigation, Clock, AlertTriangle, CheckCircle, Car } from 'lucide-react';
import { useQueue } from '../contexts/QueueContext';

export const SmartArrivalWidget: React.FC = () => {
  const { activeQueue, arrivalInfo, updateTravelDuration } = useQueue();
  const [editingTravel, setEditingTravel] = useState(false);
  const [minutesInput, setMinutesInput] = useState<number>(activeQueue?.travel_time_minutes || 10);

  if (!activeQueue) return null;

  const handleSaveTravelTime = (e: React.FormEvent) => {
    e.preventDefault();
    updateTravelDuration(Number(minutesInput));
    setEditingTravel(false);
  };

  return (
    <div className={`p-5 rounded-3xl border transition-all ${
      arrivalInfo.isApproaching 
        ? 'bg-amber-50/80 border-amber-200 shadow-[0_4px_20px_rgba(245,158,11,0.08)]' 
        : 'bg-[#FAF8F5] border-[#EFECE6]'
    }`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
            arrivalInfo.isApproaching ? 'bg-amber-500 text-white animate-bounce' : 'bg-[#3D2010] text-white'
          }`}>
            <Navigation className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#766B63]">
              Smart Arrival Assistant
            </h4>
            <p className="text-sm font-bold text-[#171412]">
              {arrivalInfo.arrivalStatusText}
            </p>
          </div>
        </div>

        {/* Departure Pill */}
        <span className={`text-xs px-3 py-1 rounded-full font-bold tabular-nums ${
          arrivalInfo.isApproaching 
            ? 'bg-amber-200 text-amber-900 ring-2 ring-amber-300' 
            : 'bg-white border border-[#E0D8CE] text-[#3D2010]'
        }`}>
          {arrivalInfo.recommendedDepartureText}
        </span>
      </div>

      <p className="text-xs text-[#766B63] leading-relaxed mb-4">
        Virtual-Q monitors queue velocity and alerts you when to leave your location so you step in right as your token is called.
      </p>

      {/* Travel Time Configuration */}
      <div className="pt-3 border-t border-[#EAE4DC] flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[#766B63]">
          <Car className="w-4 h-4 text-[#A3968A]" />
          <span>Your Travel Time:</span>
          <strong className="text-[#171412] font-semibold">{activeQueue.travel_time_minutes || 0} mins</strong>
        </div>

        {editingTravel ? (
          <form onSubmit={handleSaveTravelTime} className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              max="120"
              value={minutesInput}
              onChange={(e) => setMinutesInput(Number(e.target.value))}
              className="w-16 px-2 py-1 bg-white border border-[#D9D1C7] rounded-lg text-xs text-[#171412] focus:outline-none focus:ring-1 focus:ring-[#3D2010]"
              autoFocus
            />
            <button
              type="submit"
              className="px-2.5 py-1 bg-[#3D2010] text-white rounded-lg text-xs font-medium cursor-pointer"
            >
              Set
            </button>
            <button
              type="button"
              onClick={() => setEditingTravel(false)}
              className="text-[#766B63] hover:text-[#171412] text-xs"
            >
              Cancel
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => {
              setMinutesInput(activeQueue.travel_time_minutes || 10);
              setEditingTravel(true);
            }}
            className="text-[#3D2010] hover:underline font-semibold cursor-pointer"
          >
            Adjust duration
          </button>
        )}
      </div>
    </div>
  );
};
