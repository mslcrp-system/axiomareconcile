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
  searchVoompQuery: string;
  setSearchVoompQuery: (query: string) => void;
  filteredVoompOrphans: any[];
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
  searchVoompQuery,
  setSearchVoompQuery,
  filteredVoompOrphans,
  searchPipeQuery,
  setSearchPipeQuery,
  searchedPipeRecords,
  confirmLink,
  formatBR
}: ManualReconciliationProps) => {
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] xl:h-[calc(100vh-150px)] bg-[#0D1117] rounded-[3rem] overflow-hidden border border-white/5 shadow-3xl">
      {/* 🚀 Sticky Global Header */}
      <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/[0.02] backdrop-blur-xl shrink-0">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-white font-display tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-500/10 rounded-xl flex items-center justify-center border border-primary-500/20">
              <RefreshCcw className="w-4 h-4 text-primary-400" />
            </div>
            Conciliação Manual
          </h2>
          <p className="text-xs text-gray-500 font-medium">Arquitetura de Torres para vinculação de precisão.</p>
        </div>
        <div className="flex items-center gap-4">
          {!user && (
            <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
              <LockIcon className="w-3.5 h-3.5" />
              Modo Visualização
            </div>
          )}
          <div className="bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10 flex flex-col items-center min-w-[110px]">
             <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.3em] mb-0.5">Pendentes</span>
             <span className="text-xl font-black text-white font-display tracking-tight">{manualOrphans?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* 🗼 The Twin Towers Grid */}
      <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-4 p-4 min-h-0 overflow-hidden bg-black/10">
        
        {/* 🏰 Left Tower: Voomp ORIGIN (Amber) */}
        <div className="flex flex-col bg-white/[0.01] rounded-[2rem] border border-orange-500/10 shadow-2xl h-full overflow-hidden relative group/voomp hover:border-orange-500/20 transition-all duration-700">
          {/* Tower Header */}
          <div className="p-4 bg-orange-500/5 border-b border-orange-500/10 flex items-center justify-between shrink-0">
            <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <div className="p-1.5 bg-orange-400/10 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              Origem (Voomp)
            </h3>
            <span className="text-[9px] font-black text-orange-400/60 uppercase tracking-widest">{(manualOrphans?.length || 0)} registros</span>
          </div>

          {/* Voomp Search */}
          <div className="px-4 py-3 border-b border-white/5 bg-white/[0.01] shrink-0">
            <div className="relative group/vsearch">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 transition-colors group-focus-within/vsearch:text-orange-400" />
              <input
                type="text"
                placeholder="Pesquisar nome ou CPF..."
                value={searchVoompQuery}
                onChange={(e) => setSearchVoompQuery(e.target.value)}
                className="w-full pl-11 pr-6 py-3 bg-black/40 border border-white/5 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-orange-500/40 transition-all placeholder:text-gray-700"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {manualOrphans?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 py-32">
                <CheckCircle2 className="w-14 h-14 mb-4" />
                <p className="font-black uppercase tracking-[0.5em] text-xs">Torre Limpa</p>
              </div>
            ) : filteredVoompOrphans?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center opacity-30 py-32 text-center">
                <Search className="w-12 h-12 mb-3 text-gray-600" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum resultado encontrado</p>
              </div>
            ) : (
              filteredVoompOrphans?.map((orphan) => (
                <div
                  key={`orphan-${orphan['ID Venda']}`}
                  onClick={() => setSelectedOrphan(orphan)}
                  className={cn(
                    "p-4 rounded-[1.5rem] border transition-all duration-300 cursor-pointer group relative overflow-hidden",
                    selectedOrphan?.['ID Venda'] === orphan['ID Venda']
                      ? "bg-orange-500/10 border-orange-500/40 shadow-[0_10px_30px_rgba(249,115,22,0.1)] ring-1 ring-orange-500/20 scale-[1.01]"
                      : "bg-white/[0.02] border-white/5 hover:border-orange-500/20 hover:bg-white/[0.04]"
                  )}
                >
                  <div className="flex justify-between items-center mb-2 relative z-10">
                    <span className="text-[10px] font-mono text-gray-500 font-bold bg-white/5 px-2 py-0.5 rounded-md">ID #{orphan['ID Venda']}</span>
                    {orphan['Recorrência atual'] && (
                      <span className="text-[9px] font-black text-orange-400/80 bg-orange-400/10 px-2 py-0.5 rounded-md uppercase tracking-widest">
                        REC. {orphan['Recorrência atual']}
                      </span>
                    )}
                  </div>
                  <p className="font-black text-sm text-white mb-0.5 group-hover:text-orange-400 transition-colors font-display tracking-tight uppercase leading-tight truncate">
                    {orphan['Nome do comprador']}
                  </p>
                  <p className="text-[10px] text-gray-500 mb-3 font-medium italic truncate">{orphan['Email do comprador']}</p>
                  
                  <div className="flex items-center justify-between relative z-10 pt-3 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-0.5">Faturamento</span>
                      <span className="text-base font-black text-white">R$ {formatBR(orphan['Faturamento total'])}</span>
                    </div>
                    <div className={cn(
                       "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300",
                       selectedOrphan?.['ID Venda'] === orphan['ID Venda'] ? "bg-orange-500 text-white shadow-lg" : "bg-white/5 text-gray-700"
                    )}>
                      <ArrowRightLeft className="w-4 h-4" />
                    </div>
                  </div>

                  {selectedOrphan?.['ID Venda'] === orphan['ID Venda'] && (
                    <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-orange-500 shadow-[3px_0_15px_rgba(249,115,22,0.6)]" />
                  )}
                </div>
              ))
            )}
            <div className="h-16" />
          </div>

          {/* Fixed Detail Footer Voomp */}
          {selectedOrphan && (
            <div className="flex-none p-3 bg-orange-500/5 border-t border-orange-500/10 animate-in slide-in-from-bottom-10">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-[#0D1117] p-2.5 rounded-xl border border-white/5 col-span-1">
                  <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest block mb-0.5">Produto</span>
                  <p className="text-[10px] font-black text-white leading-tight font-display uppercase truncate">{selectedOrphan['Nome do produto'] || 'Não identificado'}</p>
                </div>
                <div className="bg-[#0D1117] p-2.5 rounded-xl border border-white/5">
                  <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest block mb-0.5">Data</span>
                  <p className="text-[10px] font-mono font-black text-orange-400">{selectedOrphan['Data da venda'] || '-'}</p>
                </div>
                <div className="bg-[#0D1117] p-2.5 rounded-xl border border-white/5">
                  <span className="text-[7px] font-bold text-gray-600 uppercase tracking-widest block mb-0.5">Contrato</span>
                  <p className="text-[10px] font-black text-green-400 uppercase truncate">{selectedOrphan['Status de Contrato'] || '-'}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 🏰 Right Tower: PIPE DESTINATION (Blue) */}
        <div className="flex flex-col bg-white/[0.01] rounded-[2rem] border border-primary-500/10 shadow-2xl h-full overflow-hidden relative group/pipe hover:border-primary-500/20 transition-all duration-700">
          {/* Tower Header */}
          <div className="p-4 bg-primary-500/5 border-b border-primary-500/10 flex items-center justify-between shrink-0">
            <h3 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.4em] flex items-center gap-2">
              <div className="p-1.5 bg-primary-400/10 rounded-lg">
                <Search className="w-3.5 h-3.5" />
              </div>
              Destino (Pipe)
            </h3>
          </div>

          {/* Pipe Search */}
          <div className="px-4 py-3 border-b border-white/5 bg-white/[0.01] shrink-0">
            <div className="relative group/search">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 transition-colors group-focus-within/search:text-primary-400" />
              <input
                type="text"
                placeholder="Pesquisar ID do negócio ou nome..."
                value={searchPipeQuery}
                onChange={(e) => setSearchPipeQuery(e.target.value)}
                className="w-full pl-11 pr-6 py-3 bg-black/40 border border-white/5 rounded-2xl text-xs font-bold text-white focus:outline-none focus:border-primary-500/50 transition-all placeholder:text-gray-700"
              />
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {!selectedOrphan ? (
              <div className="h-full flex flex-col items-center justify-center opacity-10 py-32">
                <ArrowRightLeft className="w-16 h-16 mb-4 rotate-12" />
                <p className="font-black uppercase tracking-[0.4em] text-xs max-w-[200px] text-center">Aguardando Seleção de Origem</p>
              </div>
            ) : searchedPipeRecords?.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center py-32 text-center opacity-30">
                 <Search className="w-12 h-12 mb-3 text-gray-600" />
                 <p className="text-[10px] font-black uppercase tracking-[0.3em]">Nenhum negócio no Pipe encontrado</p>
              </div>
            ) : (
              searchedPipeRecords?.map((pipe) => (
                <div
                  key={`pipe-search-${pipe['Negócio - ID']}`}
                  className="p-4 bg-[#0D1117] rounded-[1.5rem] border border-white/5 hover:border-primary-500/40 hover:shadow-[0_10px_30px_rgba(59,130,246,0.08)] transition-all duration-300 group/item relative overflow-hidden"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono text-primary-400 font-black bg-primary-500/10 px-2 py-0.5 rounded-md">#ID {pipe['Negócio - ID']}</span>
                    <span className="text-[9px] text-gray-600 font-black uppercase tracking-widest">{pipe['Negócio - Ganho em']}</span>
                  </div>
                  <p className="font-black text-sm text-white font-display mb-0.5 tracking-tight uppercase group-hover/item:text-primary-400 transition-colors leading-tight truncate">
                    {pipe['Pessoa - Nome'] || pipe['Negócio - Proprietário']}
                  </p>
                  <p className="text-[10px] text-gray-600 italic font-medium mb-3">Responsável: {pipe['Negócio - Proprietário']}</p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black text-gray-700 uppercase tracking-widest mb-0.5">Valor PIPE</span>
                      <span className="text-base font-black text-primary-400">R$ {formatBR(pipe['Negócio - Valor do negócio'])}</span>
                    </div>
                    <button
                      onClick={() => confirmLink(pipe)}
                      disabled={!user || isProcessing}
                      className={cn(
                        "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all",
                        !user
                          ? "bg-white/5 text-gray-700 cursor-not-allowed border border-white/5"
                          : "bg-primary-600 text-white hover:bg-primary-500 shadow-lg hover:-translate-y-0.5 active:translate-y-0"
                      )}
                    >
                      {isProcessing ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : "Vincular"}
                    </button>
                  </div>
                </div>
              ))
            )}
            <div className="h-16" />
          </div>

          {/* Fixed Confirmation Footer Pipe */}
          {selectedOrphan && (
            <div className="flex-none p-3 bg-primary-500/5 border-t border-primary-500/10">
              <div className="bg-[#0D1117] p-3 rounded-xl border border-primary-500/30">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center justify-between text-[10px] p-2 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-gray-600 font-bold uppercase tracking-widest text-[7px]">ID Voomp</span>
                    <span className="font-black text-white font-mono">#{selectedOrphan['ID Venda']}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] p-2 bg-primary-500/5 rounded-lg border border-primary-500/10">
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
