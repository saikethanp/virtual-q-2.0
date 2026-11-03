import React, { useState } from 'react';
import { MapPin, Clock, Users, ArrowRight, Heart } from 'lucide-react';
import { Business } from '../types';

interface BusinessCardProps {
  business: Business;
  waitingCount?: number;
  estWaitMinutes?: number;
  onSelect: (business: Business) => void;
}

export const BusinessCard: React.FC<BusinessCardProps> = ({
  business,
  waitingCount = 0,
  estWaitMinutes = 0,
  onSelect,
}) => {
  const [liked, setLiked] = useState(false);

  // Fallback image handling
  const defaultBanner = '/assets/aistudio/Warm_Virtual-Q_Business_Discovery_6cffc5a7.png';
  const bannerSrc = business.banner_url || defaultBanner;

  return (
    <div 
      onClick={() => onSelect(business)}
      className="group bg-white rounded-3xl border border-[#EFECE6] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.02)] hover:shadow-[0_10px_30px_rgba(61,32,16,0.06)] hover:border-[#E0D8CE] transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Banner Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-[#FAF8F5]">
        <img
          src={bannerSrc}
          alt={business.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = defaultBanner;
          }}
        />

        {/* Favorite Heart Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setLiked(!liked);
          }}
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/40 transition-colors focus:outline-none"
          title="Save to favorites"
        >
          <Heart className={`w-4 h-4 transition-colors ${liked ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
      </div>

      {/* Content Area */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Category kicker */}
          <span className="text-xs font-medium text-[#8F7D70] tracking-wide">
            {business.category === 'Restaurants' ? 'Restaurant' : business.category === 'Services' ? 'Service' : business.category}
          </span>

          {/* Title */}
          <h3 className="text-lg font-bold text-[#171412] mt-1 group-hover:text-[#3D2010] transition-colors leading-snug line-clamp-1">
            {business.name}
          </h3>

          {/* Location */}
          <div className="flex items-center gap-1.5 text-xs text-[#766B63] mt-2 line-clamp-1">
            <MapPin className="w-3.5 h-3.5 text-[#9E948C] shrink-0" />
            <span className="truncate">{business.location}</span>
          </div>
        </div>

        {/* Bottom Status & Metrics Strip */}
        <div className="mt-5 pt-3.5 border-t border-[#F5F2EC] flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs font-medium text-[#766B63]">
            {/* Open / Closed */}
            <div className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${business.is_open ? 'bg-emerald-500 ring-2 ring-emerald-500/20' : 'bg-stone-300'}`} />
              <span className={business.is_open ? 'text-emerald-700 font-semibold' : 'text-stone-400'}>
                {business.is_open ? 'Open' : 'Closed'}
              </span>
            </div>

            {/* Waiting Time */}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#A3968A]" />
              <span className="tabular-nums">{estWaitMinutes} min</span>
            </div>

            {/* People Waiting */}
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#A3968A]" />
              <span className="tabular-nums">{waitingCount}</span>
            </div>
          </div>

          {/* Forward Arrow */}
          <div className="w-8 h-8 rounded-full bg-[#FAF8F5] border border-[#EBE6DF] flex items-center justify-center text-[#3D2010] group-hover:bg-[#3D2010] group-hover:text-white transition-all">
            <ArrowRight className="w-4 h-4" />
          </div>
        </div>
      </div>
    </div>
  );
};
