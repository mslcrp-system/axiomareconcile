import React from 'react';
import { motion } from 'motion/react';
import { Database } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Td, StatusBadge } from './UI/Common';
import { formatBR } from '../utils/reconciliation';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReportTableRowProps {
  row: any;
  activeTab: string;
  idx: number;
}

export const ReportTableRow = React.memo(({ row, activeTab, idx }: ReportTableRowProps) => {
  const isPermanent = row.isPermanent;
  const isCfoOk = activeTab === 'commercial' && row.Pendente_Financeiro === 'NÃO';

  return (
    <motion.tr 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: Math.min(idx * 0.01, 0.3) }}
      className={cn(
        "transition-colors group border-b border-white/[0.03]",
        isPermanent ? "bg-green-500/[0.03] hover:bg-green-500/[0.06]" : 
        isCfoOk ? "bg-blue-500/[0.03] hover:bg-blue-500/[0.06]" :
        "hover:bg-white/[0.03]"
      )}
    >
      {activeTab === 'commercial' ? (
        <>
          <Td className="font-mono text-primary-400 font-bold">
            <div className="flex items-center gap-2">
              {row['Negócio - ID']}
              {isPermanent && (
                <Database className="w-3 h-3 text-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
              )}
            </div>
          </Td>
          <Td className="font-semibold text-white max-w-[220px]" title={row['Pessoa - Nome'] || '-'}>
            <span className="truncate block">{row['Pessoa - Nome'] || '-'}</span>
          </Td>
          <Td className="text-xs text-gray-500 italic">{row['Negócio - Proprietário']}</Td>
          <Td className="font-bold text-white">R$ {formatBR(row['Negócio - Valor do negócio'])}</Td>
          <Td className="text-gray-300">{row['Faturamento total'] ? `R$ ${formatBR(row['Faturamento total'])}` : '-'}</Td>
          <Td>
            <span className={cn(
              "font-bold",
              Number(row['Divergência_Valor']) !== 0 ? "text-red-400" : "text-green-400"
            )}>
              R$ {formatBR(row['Divergência_Valor'])}
            </span>
          </Td>
          <Td className="text-xs text-gray-500">R$ {formatBR(row['Comissão (Numérica)'])}</Td>
          <Td><StatusBadge status={row['Pendente_Financeiro'] === 'SIM' ? 'PENDENTE' : 'OK'} /></Td>
          <Td className="text-xs text-gray-400 font-mono tracking-tighter">{row['Status_Liquidez'] || '-'}</Td>
        </>
      ) : activeTab === 'financial' ? (
        <>
          <Td className="font-mono text-gray-500">
            <div className="flex items-center gap-2">
              {row['ID Venda']}
              {isPermanent && (
                <Database className="w-3 h-3 text-green-400 shadow-[0_0_8px_rgba(74,222,128,0.4)]" />
              )}
            </div>
          </Td>
          <Td>
            <div className="flex flex-col">
              <span className="font-semibold text-white">{row['Nome do comprador']}</span>
              <span className="text-[10px] text-gray-500 font-mono">{row['Email do comprador']}</span>
            </div>
          </Td>
          <Td className="font-bold text-white">R$ {formatBR(row['Faturamento total'])}</Td>
          <Td className="text-xs text-gray-300">{row['Recorrência atual']}</Td>
          <Td className="text-xs text-gray-500 font-mono">R$ {formatBR(row['Comissão (Numérica)'])}</Td>
          <Td className="font-mono text-primary-400 font-bold">{row['Negócio - ID'] || '-'}</Td>
          <Td className="text-gray-400">{row['Proprietário'] || '-'}</Td>
          <Td>
            <span className={cn(
              "px-2 py-1 rounded-lg text-[10px] font-bold border",
              row['Tipo de Venda'] === 'Venda Recorrente' 
                ? "bg-white/5 text-gray-400 border-white/5" 
                : "bg-primary-500/10 text-primary-400 border-primary-500/20"
            )}>
              {row['Tipo de Venda']}
            </span>
          </Td>
          <Td>
            <div className="flex items-center gap-2">
              <StatusBadge status={row['Venda_Orfã'] === 'SIM' ? 'ÓRFÃ' : 'OK'} />
              {row['Venda_Orfã'] === 'SIM' && (
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse" title="Dado Órfão" />
              )}
            </div>
          </Td>
          <Td className="text-[10px] text-gray-500 max-w-[120px] truncate italic font-medium" title={row['Arquivo_Origem']}>{row['Arquivo_Origem'] || '-'}</Td>
        </>
      ) : activeTab === 'recurrence' ? (
        <>
          <Td className="font-mono text-gray-500">{row['ID Venda']}</Td>
          <Td>
            <div className="flex flex-col">
              <span className="font-semibold text-white">{row['Nome do comprador']}</span>
              <span className="text-[10px] text-gray-500 font-mono">{row['CPF/CNPJ']}</span>
            </div>
          </Td>
          <Td className="font-bold text-white">R$ {formatBR(row['Faturamento total'])}</Td>
          <Td className="text-xs text-gray-300">{row['Recorrência atual']}</Td>
          <Td className="text-xs text-gray-500 font-mono">R$ {formatBR(row['Comissão (Numérica)'])}</Td>
          <Td>
            <span className="px-2 py-1 rounded-lg text-[10px] font-bold border bg-white/5 text-gray-400 border-white/5">
              {row['Tipo de Venda']}
            </span>
          </Td>
          <Td><StatusBadge status="RECORRENTE" /></Td>
        </>
      ) : (
        <>
          <Td className="font-mono text-gray-500">{row['ID Venda']}</Td>
          <Td>
            <div className="flex flex-col">
              <span className="font-semibold text-white">{row['Nome do comprador']}</span>
              <span className="text-[10px] text-gray-500 font-mono">{row['CPF/CNPJ']}</span>
            </div>
          </Td>
          <Td className="font-bold text-white">R$ {formatBR(row['Faturamento total'])}</Td>
          <Td className="text-xs text-gray-300">{row['Recorrência atual']}</Td>
          <Td className="text-xs text-gray-500 font-mono">R$ {formatBR(row['Comissão (Numérica)'])}</Td>
          <Td>
            <span className={cn(
              "px-2 py-1 rounded-lg text-[10px] font-bold border",
              row['Tipo de Venda'] === 'Venda Recorrente' 
                ? "bg-white/5 text-gray-400 border-white/5" 
                : "bg-primary-500/10 text-primary-400 border-primary-500/20"
            )}>
              {row['Tipo de Venda']}
            </span>
          </Td>
          <Td><StatusBadge status={row['Venda_Orfã'] === 'SIM' ? 'ÓRFÃ' : 'OK'} /></Td>
        </>
      )}
    </motion.tr>
  );
});
