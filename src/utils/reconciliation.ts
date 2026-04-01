import Papa from 'papaparse';

export interface PipeRecord {
  'Negócio - Valor do negócio': string;
  'Negócio - Status': string;
  'Negócio - Ganho em': string;
  'Negócio - Proprietário': string;
  'Pessoa - ID': string;
  'Negócio - ID': string;
  'Pessoa - CPF': string;
  'Pessoa - E-mail': string;
  [key: string]: string;
}

export interface VoompRecord {
  'ID Venda': string;
  'CPF/CNPJ': string;
  'Email do comprador': string;
  'Faturamento total': string;
  'Recorrência atual': string;
  'Valor comissão co-produtor': string;
  'Arquivo_Origem'?: string;
  [key: string]: string | undefined;
}

export interface CommercialReportRecord extends PipeRecord {
  'Divergência_Valor': number;
  'Pendente_Financeiro': string;
  [key: string]: any;
}

export interface FinancialReportRecord extends VoompRecord {
  'Negócio - ID': string;
  'Proprietário': string;
  'Status': string;
  'Venda_Orfã': string;
  'Tipo de Venda': 'Nova Venda' | 'Venda Recorrente';
  'Comissão (Numérica)': number;
  [key: string]: any;
}

export const cleanEmail = (email: string) => email?.toLowerCase().trim() || '';
export const cleanCPF = (cpf: string) => cpf?.replace(/\D/g, '') || '';

export const parseBR = (val: any): number => {
  if (val === undefined || val === null) return 0;
  let clean = String(val).trim();
  
  // Remove currency symbols and spaces
  clean = clean.replace(/[R$\s]/g, '');
  
  if (!clean) return 0;
  
  // If it has a comma, it's definitely BR format (or at least uses comma for decimal)
  if (clean.includes(',')) {
    return parseFloat(clean.replace(/\./g, '').replace(',', '.'));
  }
  
  // If it has no comma but has a dot, we need to guess if it's a decimal or thousands
  if (clean.includes('.')) {
    const parts = clean.split('.');
    // If there are multiple dots, it's definitely thousands separators
    if (parts.length > 2) {
      return parseFloat(clean.replace(/\./g, ''));
    }
    // If there's only one dot:
    // If it's followed by exactly 3 digits, it's likely a thousands separator (BR format)
    if (parts[1].length === 3) {
      return parseFloat(clean.replace(/\./g, ''));
    }
    // Otherwise (1, 2, 4+ digits), treat as decimal separator (US format)
    return parseFloat(clean);
  }
  
  const res = parseFloat(clean);
  return isNaN(res) ? 0 : res;
};

export const formatBR = (val: number | string | undefined): string => {
  if (val === undefined || val === null || val === '') return '-';
  const num = typeof val === 'number' ? val : parseBR(String(val));
  if (isNaN(num)) return String(val);
  
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
};

export const VOOMP_ID_FIELDS = ['ID Venda', 'ID_Venda', 'Venda ID', 'ID', 'Venda', 'Código Venda', 'Código', 'ID da Venda'];
export const VOOMP_CPF_FIELDS = ['CPF/CNPJ', 'CPF', 'CNPJ', 'CPF Comprador', 'CNPJ Comprador', 'Documento', 'Documento do Comprador'];
export const VOOMP_EMAIL_FIELDS = ['Email do comprador', 'Email', 'E-mail', 'Email Comprador', 'E-mail do Comprador'];

export const PIPE_ID_FIELDS = ['Negócio - ID', 'ID Negócio', 'ID', 'Deal ID'];
export const PIPE_CPF_FIELDS = ['Pessoa - CPF', 'CPF', 'Pessoa CPF', 'CPF/CNPJ', 'Documento'];
export const PIPE_EMAIL_FIELDS = ['Pessoa - E-mail', 'Email', 'Pessoa Email', 'E-mail'];

export const extractNumericCommission = (val: any): number => {
  if (typeof val === 'number') return val;
  if (val === undefined || val === null) return 0;
  const str = String(val).trim();
  if (!str || str === '-') return 0;
  
  // Extract the numeric part (handles "Label: 48.16", "R$ 48,16", etc.)
  // Improved regex to better capture numbers with decimals and thousands separators
  const matches = str.match(/[-+]?[\d.,]+/g);
  if (matches && matches.length > 0) {
    // Look for the last match that contains at least one digit
    for (let i = matches.length - 1; i >= 0; i--) {
      const match = matches[i];
      if (/\d/.test(match)) {
        const parsed = parseBR(match);
        if (!isNaN(parsed)) return parsed;
      }
    }
  }
  
  return 0;
};

const getCommissionFromRecord = (record: any): any => {
  if (!record) return undefined;
  const primaryField = 'Valor comissão co-produtor';
  if (record[primaryField] !== undefined && record[primaryField] !== '') return record[primaryField];
  
  // Fallback: search for any field containing "comissão" (case-insensitive)
  const keys = Object.keys(record);
  const commissionKey = keys.find(k => k.toLowerCase().includes('comissão') && !k.includes('(Numérica)'));
  return commissionKey ? record[commissionKey] : undefined;
};

export function reconcile(
  pipeData: PipeRecord[], 
  voompData: VoompRecord[],
  permanentMappings: Map<string, string> = new Map()
): { 
  commercialReport: CommercialReportRecord[], 
  financialReport: FinancialReportRecord[]
} {
  // 1. Prepare Lookup Maps for Voomp (for PIPE Anchor)
  const voompByCPF = new Map<string, VoompRecord[]>();
  const voompByEmail = new Map<string, VoompRecord[]>();
  
  const permanentVoompByPipeId = new Map<string, VoompRecord>();

  voompData.forEach(record => {
    const cpf = cleanCPF(getField(record, VOOMP_CPF_FIELDS));
    const email = cleanEmail(getField(record, VOOMP_EMAIL_FIELDS));
    const idVenda = getField(record, VOOMP_ID_FIELDS);

    if (cpf) {
      const existing = voompByCPF.get(cpf) || [];
      existing.push(record);
      voompByCPF.set(cpf, existing);
    }
    if (email) {
      const existing = voompByEmail.get(email) || [];
      existing.push(record);
      voompByEmail.set(email, existing);
    }
    
    if (idVenda) {
      for (const [vId, pId] of permanentMappings.entries()) {
        if (vId === idVenda) {
          permanentVoompByPipeId.set(pId, record);
        }
      }
    }
  });

  // Track used Voomp records to avoid double-matching the same sale to different Pipe deals
  const usedVoompIds = new Set<string>();
  // For records without ID, we use their object reference or a generated key
  const usedVoompRefs = new Set<VoompRecord>();

  // 2. Prepare Lookup Maps for PIPE (for Voomp Anchor)
  const pipeByCPF = new Map<string, PipeRecord>();
  const pipeByEmail = new Map<string, PipeRecord>();
  const pipeById = new Map<string, PipeRecord>();
  
  pipeData.forEach(record => {
    const cpf = cleanCPF(getField(record, PIPE_CPF_FIELDS));
    const email = cleanEmail(getField(record, PIPE_EMAIL_FIELDS));
    const id = getField(record, PIPE_ID_FIELDS);

    if (cpf && !pipeByCPF.has(cpf)) pipeByCPF.set(cpf, record);
    if (email && !pipeByEmail.has(email)) pipeByEmail.set(email, record);
    if (id) pipeById.set(id, record);
  });

  // 3. Entrega 1: Relatório Comercial Completo (Âncora PIPE)
  const commercialReport = pipeData.map(pipeRecord => {
    const pipeCPF = cleanCPF(getField(pipeRecord, PIPE_CPF_FIELDS));
    const pipeEmail = cleanEmail(getField(pipeRecord, PIPE_EMAIL_FIELDS));
    const pipeId = getField(pipeRecord, PIPE_ID_FIELDS);

    let match: VoompRecord | undefined;
    
    // Priority 1: Permanent Mapping
    if (pipeId && permanentVoompByPipeId.has(pipeId)) {
      const potentialMatch = permanentVoompByPipeId.get(pipeId);
      if (potentialMatch) {
        match = potentialMatch;
      }
    } 
    
    // Priority 2: CPF (Match and Consume)
    if (!match && pipeCPF && voompByCPF.has(pipeCPF)) {
      const candidates = voompByCPF.get(pipeCPF) || [];
      // Find the first unused candidate
      match = candidates.find(c => {
        const id = getField(c, VOOMP_ID_FIELDS);
        return id ? !usedVoompIds.has(id) : !usedVoompRefs.has(c);
      });
    } 
    
    // Priority 3: Email (Match and Consume)
    if (!match && pipeEmail && voompByEmail.has(pipeEmail)) {
      const candidates = voompByEmail.get(pipeEmail) || [];
      match = candidates.find(c => {
        const id = getField(c, VOOMP_ID_FIELDS);
        return id ? !usedVoompIds.has(id) : !usedVoompRefs.has(c);
      });
    }

    if (match) {
      const id = getField(match, VOOMP_ID_FIELDS);
      if (id) usedVoompIds.add(id);
      else usedVoompRefs.add(match);
    }

    const pipeValue = parseBR(getField(pipeRecord, ['Negócio - Valor do negócio', 'Valor']));
    const voompTotal = parseBR(getField(match, ['Faturamento total', 'Faturamento', 'Valor Total']));
    const divergence = pipeValue - voompTotal;

    return {
      ...pipeRecord,
      ...(match || {}),
      'Divergência_Valor': divergence,
      'Pendente_Financeiro': match ? 'NÃO' : 'SIM',
      'Comissão (Numérica)': match ? extractNumericCommission(getCommissionFromRecord(match)) : 0,
      'isPermanent': !!match
    } as CommercialReportRecord;
  });

  // 4. Entrega 2: Relatório Financeiro (Âncora Voomp)
  const financialReport = voompData.map(voompRecord => {
    const vCPF = cleanCPF(getField(voompRecord, VOOMP_CPF_FIELDS));
    const vEmail = cleanEmail(getField(voompRecord, VOOMP_EMAIL_FIELDS));
    const vId = getField(voompRecord, VOOMP_ID_FIELDS);

    let pMatch: PipeRecord | undefined;
    
    const mappedPipeId = vId ? permanentMappings.get(vId) : undefined;
    if (mappedPipeId && pipeById.has(mappedPipeId)) {
      pMatch = pipeById.get(mappedPipeId);
    }
    else if (vCPF && pipeByCPF.has(vCPF)) {
      pMatch = pipeByCPF.get(vCPF);
    } 
    else if (vEmail && pipeByEmail.has(vEmail)) {
      pMatch = pipeByEmail.get(vEmail);
    }

    // Check if this Voomp record was actually matched in the commercial report
    // This ensures consistency between the two reports
    const wasMatchedInCommercial = vId ? usedVoompIds.has(vId) : usedVoompRefs.has(voompRecord);
    const isOrphan = !wasMatchedInCommercial;
    
    // Logic for "Tipo de Venda"
    const recurrVal = String(getField(voompRecord, ['Recorrência atual', 'Recorrência']) || '').trim();
    // Try to extract the first number (e.g., "1" from "1/12")
    const recurrMatch = recurrVal.match(/^(\d+)/);
    const recurrNum = recurrMatch ? parseInt(recurrMatch[1]) : NaN;
    
    let tipoVenda: 'Nova Venda' | 'Venda Recorrente' = 'Nova Venda';
    if (!isNaN(recurrNum) && recurrNum >= 2) {
      tipoVenda = 'Venda Recorrente';
    } else if (recurrVal === '' || recurrNum === 1) {
      tipoVenda = 'Nova Venda';
    }

    return {
      ...voompRecord,
      'Negócio - ID': pMatch ? getField(pMatch, PIPE_ID_FIELDS) : '',
      'Proprietário': pMatch ? getField(pMatch, ['Negócio - Proprietário', 'Proprietário']) : '',
      'Status': pMatch ? getField(pMatch, ['Negócio - Status', 'Status']) : '',
      'Venda_Orfã': isOrphan ? 'SIM' : 'NÃO',
      'Tipo de Venda': tipoVenda,
      'Comissão (Numérica)': extractNumericCommission(getCommissionFromRecord(voompRecord)),
      'isPermanent': !isOrphan
    } as FinancialReportRecord;
  });

  return { commercialReport, financialReport };
}

export function parseCSV<T>(csvText: string, delimiter?: string): T[] {
  const result = Papa.parse<T>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    delimiter: delimiter || "", // Empty string tells Papa to auto-detect
    transformHeader: (header) => header.trim()
  });
  return result.data;
}

/**
 * Helper to find a value in a record by checking multiple possible field names
 */
export function getField(record: any, possibleNames: string[]): any {
  if (!record) return undefined;
  for (const name of possibleNames) {
    if (record[name] !== undefined && record[name] !== null && record[name] !== '') {
      return record[name];
    }
  }
  // Fallback: case-insensitive search
  const keys = Object.keys(record);
  for (const name of possibleNames) {
    const lowerName = name.toLowerCase();
    const foundKey = keys.find(k => k.toLowerCase() === lowerName);
    if (foundKey && record[foundKey] !== undefined && record[foundKey] !== null && record[foundKey] !== '') {
      return record[foundKey];
    }
  }
  return undefined;
}

export function toCSV(data: any[]): string {
  if (!data || data.length === 0) return '';
  
  // Collect all unique keys from all objects to ensure no columns are lost
  // This is crucial when merging files with slightly different structures
  const allKeys = new Set<string>();
  data.forEach(obj => {
    if (obj && typeof obj === 'object') {
      Object.keys(obj).forEach(key => allKeys.add(key));
    }
  });
  
  return Papa.unparse({
    fields: Array.from(allKeys),
    data: data
  });
}

export function consolidateVoompFiles(filesData: { name: string, data: VoompRecord[] }[]): VoompRecord[] {
  const consolidatedMap = new Map<string, VoompRecord>();
  let fallbackCounter = 0;

  filesData.forEach(file => {
    file.data.forEach(record => {
      const idVenda = getField(record, VOOMP_ID_FIELDS);
      const cpf = cleanCPF(getField(record, VOOMP_CPF_FIELDS));
      const valor = parseBR(getField(record, ['Faturamento total', 'Faturamento', 'Valor Total', 'Valor Pago']));
      
      // Add origin tracking
      const recordWithOrigin = {
        ...record,
        'Arquivo_Origem': file.name
      };

      if (idVenda) {
        // Deduplication: we use a more specific key to avoid accidental collisions between different accounts
        // that might use the same ID sequence. If ID + CPF + Value match, it's likely the same sale.
        const dedupeKey = `${idVenda}-${cpf}-${valor}`;
        if (!consolidatedMap.has(dedupeKey)) {
          consolidatedMap.set(dedupeKey, recordWithOrigin);
        }
      } else {
        // If no ID is found, we keep the record anyway to avoid losing data
        consolidatedMap.set(`no-id-${file.name}-${fallbackCounter++}`, recordWithOrigin);
      }
    });
  });

  return Array.from(consolidatedMap.values());
}
