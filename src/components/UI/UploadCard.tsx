import React from 'react';
import { Upload, FileCheck, CheckCircle2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface UploadCardProps {
  id: string;
  title: string;
  subtitle: string;
  files: File[] | File | null;
  onUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  multiple?: boolean;
}

export const UploadCard = React.memo(({ id, title, subtitle, files, onUpload, multiple = false }: UploadCardProps) => {
  const fileList = Array.isArray(files) ? files : (files ? [files] : []);
  const hasFiles = fileList.length > 0;

  return (
    <div className="glass-card p-10 rounded-[2.5rem] flex flex-col items-center text-center group transition-all duration-500 relative overflow-hidden">
      {/* Background Decorative Glow */}
      <div className={cn(
        "absolute -top-10 -right-10 w-32 h-32 blur-[80px] opacity-10 transition-opacity duration-700",
        hasFiles ? "bg-green-500" : "bg-primary-500 group-hover:opacity-20"
      )} />

      <div className={cn(
        "w-20 h-20 rounded-3xl flex items-center justify-center mb-8 transition-all duration-500 relative z-10",
        hasFiles 
          ? "bg-green-500/10 text-green-400 shadow-[0_0_30px_rgba(34,197,94,0.15)] scale-110" 
          : "bg-white/5 text-gray-500 group-hover:scale-110 group-hover:text-primary-400 group-hover:bg-primary-500/10"
      )}>
        {hasFiles ? <FileCheck className="w-10 h-10" /> : <Upload className="w-10 h-10" />}
      </div>

      <h3 className="font-display font-bold text-xl text-white mb-2 relative z-10">{title}</h3>
      <p className="text-sm text-gray-500 mb-8 max-w-[200px] font-medium relative z-10">{subtitle}</p>
      
      <label 
        htmlFor={id}
        className={cn(
          "cursor-pointer px-8 py-3 rounded-2xl text-sm font-bold transition-all shadow-xl relative z-10 font-display uppercase tracking-widest",
          hasFiles 
            ? "bg-white/10 text-white hover:bg-white/20 border border-white/10" 
            : "bg-primary-600 text-white hover:bg-primary-500 shadow-primary-900/20 hover:shadow-primary-500/40"
        )}
      >
        {hasFiles ? (multiple ? 'Adicionar Arquivos' : 'Trocar Arquivo') : 'Selecionar CSV'}
        <input 
          id={id}
          type="file" 
          accept=".csv" 
          multiple={multiple}
          className="hidden" 
          onChange={onUpload} 
        />
      </label>
      
      {hasFiles && (
        <div className="mt-8 w-full max-h-32 overflow-y-auto px-4 space-y-2 relative z-10 custom-scrollbar">
          {fileList.map((f, i) => (
            <div key={i} className="flex items-center gap-2 justify-center bg-green-500/5 py-2 px-3 rounded-xl border border-green-500/10">
              <CheckCircle2 className="w-3 h-3 text-green-400 shrink-0" />
              <p className="text-[10px] text-green-400 font-bold truncate">
                {f.name}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});
