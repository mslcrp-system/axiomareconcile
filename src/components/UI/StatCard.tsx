import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StatCardProps {
  title: string;
  value: any;
  icon: React.ReactNode;
  color: string;
}

export const StatCard = React.memo(({ title, value, icon, color }: StatCardProps) => {
  return (
    <div className="glass-card p-6 rounded-[2rem] relative overflow-hidden group flex items-center gap-5">
      <div className={cn(
        "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shrink-0",
        color === 'blue' ? "bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]" :
        color === 'purple' ? "bg-purple-500/10 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]" :
        color === 'green' ? "bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]" :
        color === 'orange' ? "bg-orange-500/10 text-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.2)]" :
        "bg-white/5 text-gray-400"
      )}>
        {icon}
      </div>
      
      <div className="relative z-10">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-1 font-display">
          {title}
        </p>
        <h3 className="text-2xl font-bold text-white tracking-tight font-display">{value ?? '-'}</h3>
      </div>
      
      {/* Subtle Glow Background */}
      <div className={cn(
        "absolute -right-4 -bottom-4 w-24 h-24 blur-[60px] opacity-20 transition-opacity group-hover:opacity-40",
        color === 'blue' ? "bg-blue-500" :
        color === 'purple' ? "bg-purple-500" :
        color === 'green' ? "bg-green-500" :
        color === 'orange' ? "bg-orange-500" :
        "bg-white"
      )} />
    </div>
  );
});
