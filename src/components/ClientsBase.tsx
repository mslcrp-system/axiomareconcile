import React from 'react';
import { Search, AlertCircle, ArrowRightLeft, User, Mail, Database } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { StatusBadge } from './UI/Common';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ClientsBaseProps {
  user: any;
  clientes: any[];
  clienteSearchTerm: string;
  setClienteSearchTerm: (term: string) => void;
  selectedCliente: any;
  selectCliente: (cliente: any) => void;
  clienteDeals: any[];
  clienteSales: any[];
  formatBR: (val: any) => string;
}

export const ClientsBase = React.memo(({
  user,
  clientes,
  clienteSearchTerm,
  setClienteSearchTerm,
  selectedCliente,
  selectCliente,
  clienteDeals,
  clienteSales,
  formatBR
}: ClientsBaseProps) => {
  return (
    <div className="p-10 bg-[#0D1117]/50 rounded-[3rem] border border-white/5 shadow-2xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary-600/10 rounded-2xl flex items-center justify-center border border-primary-500/20">
            <User className="w-6 h-6 text-primary-400" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white font-display tracking-tight">Base Master de Clientes</h3>
            <p className="text-sm text-gray-500 font-medium">Ecossistema consolidado de negociações e vendas.</p>
          </div>
        </div>
        {!user && (
          <div className="flex items-center gap-3 px-5 py-2.5 bg-orange-500/10 text-orange-400 rounded-2xl border border-orange-500/20 text-[10px] font-black uppercase tracking-widest animate-in fade-in slide-in-from-right-4">
            <AlertCircle className="w-4 h-4" />
            Visualização Protegida
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-1 flex flex-col">
          <div className="bg-white/[0.02] p-8 rounded-[2.5rem] border border-white/5 flex flex-col h-full shadow-inner">
            <h3 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-6">Diretório Central</h3>
            
            <div className="relative mb-8">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 transition-colors group-focus-within:text-primary-400" />
              <input 
                type="text" 
                placeholder="Nome ou Identificador..."
                value={clienteSearchTerm}
                onChange={(e) => setClienteSearchTerm(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white/[0.03] border border-white/5 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-primary-500/50 focus:bg-white/[0.05] transition-all"
              />
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-3 custom-scrollbar">
              {clientes
                .filter(c => 
                  c.nome.toLowerCase().includes(clienteSearchTerm.toLowerCase()) || 
                  c.cpf_cnpj.includes(clienteSearchTerm)
                )
                .map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => selectCliente(cliente)}
                    className={cn(
                      "w-full text-left p-5 rounded-[1.5rem] transition-all duration-300 border relative overflow-hidden group",
                      selectedCliente?.id === cliente.id 
                        ? "bg-primary-500/10 border-primary-500/30 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                    )}
                  >
                    <p className="font-black text-sm text-white group-hover:text-primary-400 transition-colors truncate font-display tracking-tight">{cliente.nome}</p>
                    <p className="text-[10px] text-gray-500 font-mono font-bold mt-1 tracking-widest">{cliente.cpf_cnpj}</p>
                    {selectedCliente?.id === cliente.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-500 rounded-r-full shadow-[0_0_15px_rgba(59,130,246,1)]" />
                    )}
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          {selectedCliente ? (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="bg-white/[0.02] p-10 rounded-[3rem] border border-white/5 relative overflow-hidden">
                {/* Decorative Glow */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-500/10 blur-[100px] rounded-full" />
                
                <div className="flex items-center justify-between mb-10 relative z-10">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-primary-600 to-purple-600 rounded-[2rem] flex items-center justify-center text-3xl font-black text-white shadow-2xl">
                      {selectedCliente.nome[0]}
                    </div>
                    <div>
                      <h2 className="text-4xl font-black text-white font-display tracking-tighter leading-none mb-2">{selectedCliente.nome}</h2>
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-2 text-xs font-bold text-gray-500 font-mono tracking-widest bg-white/[0.03] px-3 py-1 rounded-lg border border-white/5">
                          ID {selectedCliente.cpf_cnpj}
                        </span>
                        <span className="flex items-center gap-2 text-xs font-bold text-primary-400">
                          <Mail className="w-3 h-3" />
                          {selectedCliente.email}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 relative z-10">
                  <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-primary-500/10 flex items-center justify-between group hover:border-primary-500/30 transition-all">
                    <div>
                      <p className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em] mb-2">Deals PIPE</p>
                      <p className="text-4xl font-black text-white font-display">{clienteDeals.length}</p>
                    </div>
                    <Database className="w-10 h-10 text-primary-500/10 group-hover:text-primary-500/20 transition-colors" />
                  </div>
                  <div className="p-8 bg-white/[0.03] rounded-[2rem] border border-purple-500/10 flex items-center justify-between group hover:border-purple-500/30 transition-all">
                    <div>
                      <p className="text-[10px] font-black text-purple-400 uppercase tracking-[0.3em] mb-2">Vendas Voomp</p>
                      <p className="text-4xl font-black text-white font-display">{clienteSales.length}</p>
                    </div>
                    <ArrowRightLeft className="w-10 h-10 text-purple-500/10 group-hover:text-purple-500/20 transition-colors" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between mb-4 px-4">
                  <h4 className="text-xs font-black text-gray-500 uppercase tracking-[0.3em]">Timeline de Transações</h4>
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {clienteSales.map((sale, i) => (
                    <div key={i} className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-all group">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
                          <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-[10px] font-mono font-bold text-gray-500 tracking-tighter mb-1">REF {sale['ID Venda']}</p>
                          <p className="text-sm font-bold text-white font-display tracking-tight">{sale['Nome do produto']}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-black text-white font-display mb-2 tracking-tight">R$ {formatBR(sale['Faturamento total'])}</p>
                        <StatusBadge status="OK" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-20 bg-white/[0.01] rounded-[3rem] border border-dashed border-white/10">
              <div className="w-16 h-16 bg-white/[0.03] rounded-full flex items-center justify-center mb-6 shadow-2xl">
                <Search className="w-8 h-8 text-gray-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-400 font-display">Selecione um Terminal</h3>
              <p className="text-gray-400 max-w-xs mx-auto mt-4 font-medium leading-relaxed italic">Busque no diretório ao lado para projetar o histórico consolidado de negociações.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
