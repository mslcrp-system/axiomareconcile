import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const TabButton = React.memo(({ active, onClick, label }: { active: boolean, onClick: () => void, label: string }) => {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "px-5 py-3 rounded-2xl text-[10px] font-black transition-all duration-500 font-display uppercase tracking-[0.15em] relative overflow-hidden whitespace-nowrap max-w-[200px] truncate",
        active 
          ? "bg-primary-600 text-white shadow-[0_0_25px_rgba(59,130,246,0.4)] scale-105 z-10" 
          : "text-gray-600 hover:text-gray-400 hover:bg-white/[0.03] border border-transparent hover:border-white/5"
      )}
    >
      {label}
    </button>
  );
});

export const Th = React.memo(({ children }: { children: React.ReactNode }) => {
  return (
    <th className="px-6 py-5 text-xs font-black text-gray-400 uppercase tracking-[0.2em] border-b border-white/5 bg-white/[0.01]">
      {children}
    </th>
  );
});

export const Td = React.memo(({ children, className, title }: { children: React.ReactNode, className?: string, title?: string }) => {
  return (
    <td className={cn("px-6 py-4 text-sm text-gray-300 border-b border-white/5", className)} title={title}>
      {children}
    </td>
  );
});

export const StatusBadge = React.memo(({ status }: { status: string }) => {
  if (!status) return <span className="text-gray-300">-</span>;
  
  const isOk = status === 'OK';
  const isPendente = status === 'PENDENTE';
  const isOrfa = status === 'ÓRFÃ';
  
  return (
    <span className={cn(
      "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border flex items-center gap-1.5 w-fit",
      isOk ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]" : 
      isPendente ? "bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]" : 
      isOrfa ? "bg-orange-500/10 text-orange-400 border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]" :
      "bg-white/5 text-gray-400 border-white/10"
    )}>
      <div className={cn(
        "w-1.5 h-1.5 rounded-full",
        isOk ? "bg-green-400 animate-pulse" : 
        isPendente ? "bg-red-400 animate-pulse" : 
        isOrfa ? "bg-orange-400 animate-pulse" :
        "bg-gray-400"
      )} />
      {status}
    </span>
  );
});
