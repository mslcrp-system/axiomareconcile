import React from 'react';
import { AlertCircle, CheckCircle2, Search, ArrowRightLeft, RefreshCcw, Lock as LockIcon } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { User } from '@supabase/supabase-js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ManualReconciliationProps {
  user: User | null;
  isProcessing: boolean;
  manualOrphans: any[];
  selectedOrphan: any;
  setSelectedOrphan: (orphan: any) => void;
  searchPipeQuery: string;
  setSearchPipeQuery: (query: string) => void;
  searchedPipeRecords: any[];
  confirmLink: (pipe: any) => void;
  formatBR: (val: any) => string;
}

export const ManualReconciliation = React.memo(({
  user,
  isProcessing,
  manualOrphans,
  selectedOrphan,
  setSelectedOrphan,
  searchPipeQuery,
  setSearchPipeQuery,
  searchedPipeRecords,
  confirmLink,
  formatBR
}: ManualReconciliationProps) => {
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] xl:h-[calc(100vh-150px)] bg-[#0D1117] rounded-[3rem] overflow-hidden border border-white/5 shadow-3xl">
      {/* 🚀 Sticky Global Header */}
      <div className="p-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-8 bg-white/[0.02] backdrop-blur-xl shrink-0">
        <div className="space-y-1">
          <h2 className="text-3xl font-black text-white font-display tracking-tight flex items-center gap-4">
            <div className="w-10 h-10 bg-primary-500/10 rounded-2xl flex items-center justify-center border border-primary-500/20">
              <RefreshCcw className="w-5 h-5 text-primary-400" />
            </div>
            Conciliação Manual
          </h2>
          <p className="text-sm text-gray-500 font-medium">Arquitetura de Torres para vinculação de precisão.</p>
        </div>
        <div className="flex items-center gap-6">
          {!user && (
            <div className="flex items-center gap-3 px-6 py-3 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 text-xs font-black uppercase tracking-widest animate-pulse">
              <LockIcon className="w-4 h-4" />
              Modo Visualização
            </div>
          )}
          <div className="bg-white/5 px-8 py-3 rounded-2xl border border-white/10 flex flex-col items-center min-w-[140px]">
             <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em] mb-1">Pendentes</span>
             <span className="text-2xl font-black text-white font-display tracking-tight">{manualOrphans.length}</span>
          </div>
        </div>
      </div>

      {/* 🗼 The Twin Towers Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 p-6 min-h-0 overflow-hidden bg-black/10">
        
        {/* 🏰 Left Tower: Voomp ORIGIN (Amber) */}
        <div className="flex flex-col bg-white/[0.01] rounded-[2.5rem] border border-orange-500/10 shadow-2xl h-full overflow-hidden relative group/voomp hover:border-orange-500/20 transition-all duration-700">
          <div className="p-5 bg-orange-500/5 border-b border-orange-500/10 flex items-center justify-between shrink-0">
            <h3 className="text-[11px] font-black text-orange-400 uppercase tracking-[0.4em] flex items-center gap-3">
              <div className="p-2 bg-orange-400/10 rounded-xl">
                <AlertCircle className="w-4 h-4" />
              </div>
              Origem (Voomp)
            </h3>
            <span className="text-[10px] font-black text-orange-400/60 uppercase tracking-widest">{manualOrphans.length} registros</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {manualOrphans.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-40">
                <CheckCircle2 className="w-16 h-16 mb-6" />
                <p className="font-black uppercase tracking-[0.5em] text-sm">Torre Limpa</p>
              </div>
            ) : (
              manualOrphans.map((orphan, idx) => (
                <div 
                key={`orphan-${orphan['ID Venda']}`}
                  onClick={() => setSelectedOrphan(orphan)}
                  className={cn(
                    "p-7 rounded-[2rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden",
                    selectedOrphan?.['ID Venda'] === orphan['ID Venda']
                      ? "bg-orange-500/10 border-orange-500/40 shadow-[0_20px_40px_rgba(249,115,22,0.1)] ring-1 ring-orange-500/20 scale-[1.02]"
                      : "bg-white/[0.02] border-white/5 hover:border-orange-500/20 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex justify-between items-start mb-5 relative z-10">
                    <span className="text-[11px] font-mono text-gray-500 font-bold bg-white/5 px-3 py-1 rounded-lg">ID #{orphan['ID Venda']}</span>
                    {orphan['Recorrência atual'] && (
                      <span className="text-[10px] font-black text-orange-400/80 bg-orange-400/10 px-3 py-1 rounded-lg uppercase tracking-widest">
                        REC. {orphan['Recorrência atual']}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-xl text-white mb-1 group-hover:text-orange-400 transition-colors font-display tracking-tight uppercase">
                    {orphan['Nome do comprador']}
                  </p>
                  <p className="text-xs text-gray-500 mb-6 font-medium italic truncate">{orphan['Email do comprador']}</p>
                  
                  <div className="flex items-center justify-between relative z-10 pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-1">Faturamento</span>
                      <span className="text-2xl font-black text-white">R$ {formatBR(orphan['Faturamento total'])}</span>
                    </div>
                    <div className={cn(
                       "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500",
                       selectedOrphan?.['ID Venda'] === orphan['ID Venda'] ? "bg-orange-500 text-white shadow-lg" : "bg-white/5 text-gray-700"
                    )}>
                      <ArrowRightLeft className="w-5 h-5" />
                    </div>
                  </div>

                  {selectedOrphan?.['ID Venda'] === orphan['ID Venda'] && (
                    <div className="absolute left-0 top-0 bottom-0 w-2 bg-orange-500 shadow-[4px_0_20px_rgba(249,115,22,0.6)]" />
                  )}
                </div>
              ))
            )}
            <div className="h-20" />
          </div>

          {/* Fixed Detail Footer Voomp: Horizontal UX */}
          {selectedOrphan && (
            <div className="flex-none p-4 bg-orange-500/5 border-t border-orange-500/10 animate-in slide-in-from-bottom-10">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-[#0D1117] p-3 rounded-xl border border-white/5 col-span-1">
                  <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Produto</span>
                  <p className="text-[10px] font-black text-white leading-tight font-display uppercase truncate">{selectedOrphan['Nome do produto'] || 'Não identificado'}</p>
                </div>
                <div className="bg-[#0D1117] p-3 rounded-xl border border-white/5">
                  <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Data</span>
                  <p className="text-[10px] font-mono font-black text-orange-400">{selectedOrphan['Data da venda'] || '-'}</p>
                </div>
                <div className="bg-[#0D1117] p-3 rounded-xl border border-white/5">
                  <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest block mb-1">Contrato</span>
                  <p className="text-[10px] font-black text-green-400 uppercase truncate">{selectedOrphan['Status de Contrato'] || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🏰 Right Tower: PIPE DESTINATION (Blue) */}
        <div className="flex flex-col bg-white/[0.01] rounded-[2.5rem] border border-primary-500/10 shadow-2xl h-full overflow-hidden relative group/pipe hover:border-primary-500/20 transition-all duration-700">
          <div className="p-5 bg-primary-500/5 border-b border-primary-500/10 flex items-center justify-between shrink-0">
            <h3 className="text-[11px] font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-3">
              <div className="p-2 bg-primary-400/10 rounded-xl">
                <Search className="w-4 h-4" />
              </div>
              Destino (Pipe)
            </h3>
          </div>

          <div className="p-5 border-b border-white/5 bg-white/[0.01] shrink-0">
            <div className="relative group/search">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-600 transition-colors group-focus-within/search:text-primary-400" />
              <input 
                type="text"
                placeholder="Pesquisar ID do negócio ou nome..."
                value={searchPipeQuery}
                onChange={(e) => setSearchPipeQuery(e.target.value)}
                className="w-full pl-16 pr-8 py-5 bg-black/40 border border-white/5 rounded-[2rem] text-sm font-black text-white focus:outline-none focus:border-primary-500/50 transition-all placeholder:text-gray-700 font-display"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {!selectedOrphan ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10 py-40">
                <ArrowRightLeft className="w-20 h-20 mb-6 rotate-12" />
                <p className="font-black uppercase tracking-[0.4em] text-xs max-w-[200px] text-center">Aguardando Seleção de Origem</p>
              </div>
            ) : searchedPipeRecords.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-40 text-center opacity-30">
                 <Search className="w-16 h-16 mb-4 text-gray-600" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum negócio no Pipe encontrado</p>
              </div>
            ) : (
              searchedPipeRecords.map((pipe, idx) => (
                <div 
                  key={`pipe-search-${pipe['Negócio - ID']}`}
                  className="p-7 bg-[#0D1117] rounded-[2.5rem] border border-white/5 hover:border-primary-500/40 hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)] transition-all duration-500 group/item relative overflow-hidden"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[11px] font-mono text-primary-400 font-black bg-primary-500/10 px-3 py-1 rounded-lg">#ID {pipe['Negócio - ID']}</span>
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{pipe['Negócio - Ganho em']}</span>
                  </div>
                  <p className="font-black text-xl text-white font-display mb-1 tracking-tight uppercase group-hover/item:text-primary-400 transition-colors leading-tight">
                    {pipe['Pessoa - Nome'] || pipe['Negócio - Proprietário']}
                  </p>
                  <p className="text-[11px] text-gray-600 italic font-medium mb-6">Responsável: {pipe['Negócio - Proprietário']}</p>
                  
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-gray-700 uppercase tracking-widest mb-1">Valor PIPE</span>
                      <span className="text-2xl font-black text-primary-400">R$ {formatBR(pipe['Negócio - Valor do negócio'])}</span>
                    </div>
                    <button 
                      onClick={() => confirmLink(pipe)}
                      disabled={!user || isProcessing}
                      className={cn(
                        "px-8 py-4 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        !user 
                          ? "bg-white/5 text-gray-700 cursor-not-allowed border border-white/5" 
                          : "bg-primary-600 text-white hover:bg-primary-500 shadow-xl hover:-translate-y-1 active:translate-y-0"
                      )}
                    >
                      {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : "Vincular"}
                    </button>
                  </div>
                </div>
              ))
            )}
            <div className="h-20" />
          </div>

          {/* Fixed Confirmation Footer Pipe: Minimalist UX */}
          {selectedOrphan && (
            <div className="flex-none p-4 bg-primary-500/5 border-t border-primary-500/10">
              <div className="bg-[#0D1117] p-3.5 rounded-2xl border border-primary-500/30">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between text-[11px] p-2.5 bg-white/5 rounded-xl border border-white/5">
                    <span className="text-gray-600 font-bold uppercase tracking-widest text-[7px]">ID Voomp</span>
                    <span className="font-black text-white font-mono">#{selectedOrphan['ID Venda']}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] p-2.5 bg-primary-500/5 rounded-xl border border-primary-500/10">
                    <span className="text-primary-400/80 font-bold uppercase tracking-widest text-[7px]">ID Pipe</span>
                    <span className="font-black text-primary-400 font-mono">#{searchedPipeRecords[0]?.['Negócio - ID'] || '...'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
