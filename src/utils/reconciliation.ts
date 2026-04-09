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
  'Match_Score'?: string;
  'Match_Confiança'?: number;
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
export const cleanCPF = (cpf: string) => {
  if (!cpf) return '';
  const numOnly = String(cpf).replace(/\D/g, '');
  if (numOnly.length < 11) return '';
  if (/^(\d)\1+$/.test(numOnly)) return ''; // ignora '00000000000', '11111111111', etc
  return numOnly;
};
// Normaliza telefone para os últimos 11 dígitos (DDD + número BR)
// Pipe: '+55 (31) 86568412' → '5531986568412' → últimos 11: '31986568412'
// Voomp: '5531986568412' → últimos 11: '31986568412'
export const cleanPhone = (phone: string): string => {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  if (digits.length < 8) return ''; // muito curto para ser válido
  return digits.slice(-11); // compara sempre pelo DDD+número (11 últimos dígitos)
};
export const normalizeName = (name: any): string => {
  if (!name || typeof name !== 'string') return '';
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
};

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
export const VOOMP_NAME_FIELDS = ['Nome do comprador', 'Nome', 'Comprador'];
export const VOOMP_PHONE_FIELDS = ['Número de telefone', 'Telefone do comprador', 'Telefone', 'Celular', 'Fone'];

export const PIPE_ID_FIELDS = ['Negócio - ID', 'ID Negócio', 'ID', 'Deal ID'];
export const PIPE_CPF_FIELDS = ['Pessoa - CPF', 'CPF', 'Pessoa CPF', 'CPF/CNPJ', 'Documento'];
export const PIPE_EMAIL_FIELDS = ['Pessoa - E-mail', 'Email', 'Pessoa Email', 'E-mail'];
export const PIPE_NAME_FIELDS = ['Pessoa - Nome', 'Nome do contato', 'Nome'];
export const PIPE_PHONE_FIELDS = ['Pessoa - Telefone', 'Telefone', 'Celular', 'Fone'];

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

// ─── Helper interno: Recorrência ≥ 2 → venda recorrente ────────────────────
const VOOMP_RECURRENCE_FIELDS_INTERNAL = ['Recorrência atual', 'Recorrência'];
function isRecurring(record: VoompRecord): boolean {
  const val = String(getField(record, VOOMP_RECURRENCE_FIELDS_INTERNAL) ?? '').trim();
  const num = parseInt((val.match(/^(\d+)/) ?? [])[1] ?? '', 10);
  return !isNaN(num) && num >= 2;
}

export function reconcile(
  pipeData: PipeRecord[], 
  voompData: VoompRecord[],
  permanentMappings: Map<string, string> = new Map()
): { 
  commercialReport: CommercialReportRecord[], 
  financialReport: FinancialReportRecord[]
} {
  // 1. Prepare Lookup Maps for Voomp (for PIPE Anchor)
  // ⚠️  Recorrentes (Recorrência ≥ 2) NÃO entram nos mapas de cruzamento.
  //     Só aparecem no financialReport como 'Venda Recorrente'.
  const voompByCPF = new Map<string, VoompRecord[]>();
  const voompByEmail = new Map<string, VoompRecord[]>();
  const voompByName = new Map<string, VoompRecord[]>();
  const voompByPhone = new Map<string, VoompRecord[]>();
  
  const permanentVoompByPipeId = new Map<string, VoompRecord>();

  voompData.forEach(record => {
    // Recorrentes ficam apenas no relatório de recorrência — não participam do cruzamento
    if (isRecurring(record)) return;

    const cpf = cleanCPF(getField(record, VOOMP_CPF_FIELDS));
    const email = cleanEmail(getField(record, VOOMP_EMAIL_FIELDS));
    const name = normalizeName(getField(record, VOOMP_NAME_FIELDS));
    const phone = cleanPhone(getField(record, VOOMP_PHONE_FIELDS));
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
    if (name) {
      const existing = voompByName.get(name) || [];
      existing.push(record);
      voompByName.set(name, existing);
    }
    if (phone) {
      const existing = voompByPhone.get(phone) || [];
      existing.push(record);
      voompByPhone.set(phone, existing);
    }
    
    if (idVenda) {
      for (const [vId, pId] of permanentMappings.entries()) {
        if (vId === idVenda) {
          permanentVoompByPipeId.set(pId, record);
        }
      }
    }
  });

  const usedVoompIds = new Set<string>();
  const usedVoompRefs = new Set<VoompRecord>();

  // Prioridade de status da venda Voomp:
  // 1. Pago (venda confirmada)
  // 2. Reembolsado (foi transacionado, requer escrituração)
  // 3. Chargeback (contestação, requer escrituração)
  // 4. Qualquer outro status (Cancelado, Pendente, etc.)
  const VOOMP_STATUS_FIELDS = ['Status da Venda', 'Status', 'Situação', 'Situação da Venda'];
  const getStatusPriority = (record: VoompRecord): number => {
    const status = String(getField(record, VOOMP_STATUS_FIELDS) || '').toLowerCase().trim();
    if (status.includes('pago') || status === 'paid') return 3;
    if (status.includes('reembolsado') || status.includes('refund')) return 2;
    if (status.includes('chargeback')) return 1;
    return 0; // Cancelado, Pendente, Expirado, etc.
  };

  // Helper to find best Voomp candidate:
  // Critério 1 (primário): Status da venda (Pago > Reembolsado > Chargeback > outros)
  // Critério 2 (desempate): Valor mais próximo ao do Pipe
  const findBestVoompCandidate = (candidates: VoompRecord[], targetValue: number): VoompRecord | undefined => {
    let bestCandidate: VoompRecord | undefined;
    let bestStatusPriority = -1;
    let minDiff = Infinity;
    for (const c of candidates) {
      const id = getField(c, VOOMP_ID_FIELDS);
      const isUsed = id ? usedVoompIds.has(id) : usedVoompRefs.has(c);
      if (!isUsed) {
        const statusPrio = getStatusPriority(c);
        const vValue = parseBR(getField(c, ['Faturamento total', 'Faturamento', 'Valor Total', 'Valor Pago']));
        const diff = Math.abs(targetValue - vValue);
        // Aceita o candidato se tiver status melhor, ou mesmo status com valor mais próximo
        if (
          statusPrio > bestStatusPriority ||
          (statusPrio === bestStatusPriority && diff < minDiff)
        ) {
          bestStatusPriority = statusPrio;
          minDiff = diff;
          bestCandidate = c;
        }
      }
    }
    return bestCandidate;
  };

  // 2. Prepare Lookup Maps for PIPE (for Voomp Anchor)
  const pipeByCPF = new Map<string, PipeRecord[]>();
  const pipeByEmail = new Map<string, PipeRecord[]>();
  const pipeByName = new Map<string, PipeRecord[]>();
  const pipeByPhone = new Map<string, PipeRecord[]>();
  const pipeById = new Map<string, PipeRecord>();
  
  pipeData.forEach(record => {
    const cpf = cleanCPF(getField(record, PIPE_CPF_FIELDS));
    const email = cleanEmail(getField(record, PIPE_EMAIL_FIELDS));
    const name = normalizeName(getField(record, PIPE_NAME_FIELDS));
    const phone = cleanPhone(getField(record, PIPE_PHONE_FIELDS));
    const id = getField(record, PIPE_ID_FIELDS);

    if (cpf) {
      const existing = pipeByCPF.get(cpf) || [];
      existing.push(record);
      pipeByCPF.set(cpf, existing);
    }
    if (email) {
      const existing = pipeByEmail.get(email) || [];
      existing.push(record);
      pipeByEmail.set(email, existing);
    }
    if (name) {
      const existing = pipeByName.get(name) || [];
      existing.push(record);
      pipeByName.set(name, existing);
    }
    if (phone) {
      const existing = pipeByPhone.get(phone) || [];
      existing.push(record);
      pipeByPhone.set(phone, existing);
    }
    if (id) pipeById.set(id, record);
  });

  // Helper simétrico: melhor candidato Pipe por tie-breaker de valor
  const findBestPipeCandidate = (candidates: PipeRecord[], targetValue: number): PipeRecord | undefined => {
    let best: PipeRecord | undefined;
    let minDiff = Infinity;
    for (const c of candidates) {
      const pValue = parseBR(getField(c, ['Negócio - Valor do negócio', 'Valor']));
      const diff = Math.abs(targetValue - pValue);
      if (diff < minDiff) { minDiff = diff; best = c; }
    }
    return best;
  };

  // 3. Entrega 1: Relatório Comercial Completo (Âncora PIPE)
  const commercialReport = pipeData.map(pipeRecord => {
    const pipeCPF = cleanCPF(getField(pipeRecord, PIPE_CPF_FIELDS));
    const pipeEmail = cleanEmail(getField(pipeRecord, PIPE_EMAIL_FIELDS));
    const pipeName = normalizeName(getField(pipeRecord, PIPE_NAME_FIELDS));
    const pipeId = getField(pipeRecord, PIPE_ID_FIELDS);
    const pipeValue = parseBR(getField(pipeRecord, ['Negócio - Valor do negócio', 'Valor']));

    let match: VoompRecord | undefined;
    let matchScore = '';
    let matchConf = 0;
    
    // Priority 1: Permanent Mapping
    if (pipeId && permanentVoompByPipeId.has(pipeId)) {
      match = permanentVoompByPipeId.get(pipeId);
      if (match) {
        matchScore = 'Mapeamento Manual';
        matchConf = 100;
      }
    } 
    
    // Priority 2: CPF
    if (!match && pipeCPF && voompByCPF.has(pipeCPF)) {
      match = findBestVoompCandidate(voompByCPF.get(pipeCPF) || [], pipeValue);
      if (match) {
        matchScore = 'CPF';
        matchConf = 95;
      }
    } 
    
    // Priority 3: Email
    if (!match && pipeEmail && voompByEmail.has(pipeEmail)) {
      match = findBestVoompCandidate(voompByEmail.get(pipeEmail) || [], pipeValue);
      if (match) {
        matchScore = 'E-mail';
        matchConf = 80;
      }
    }

    // Priority 4: Nome
    if (!match && pipeName && voompByName.has(pipeName)) {
      match = findBestVoompCandidate(voompByName.get(pipeName) || [], pipeValue);
      if (match) {
        matchScore = 'Nome';
        matchConf = 60;
      }
    }

    // Priority 5: Telefone (último fallback)
    const pipePhone = cleanPhone(getField(pipeRecord, PIPE_PHONE_FIELDS));
    if (!match && pipePhone && voompByPhone.has(pipePhone)) {
      match = findBestVoompCandidate(voompByPhone.get(pipePhone) || [], pipeValue);
      if (match) {
        matchScore = 'Telefone';
        matchConf = 40;
      }
    }

    if (match) {
      const id = getField(match, VOOMP_ID_FIELDS);
      if (id) usedVoompIds.add(id);
      else usedVoompRefs.add(match);
    } else {
      matchScore = 'Sem Match';
      matchConf = 0;
    }

    const voompTotal = parseBR(getField(match, ['Faturamento total', 'Faturamento', 'Valor Total']));
    const divergence = pipeValue - voompTotal;

    return {
      ...pipeRecord,
      ...(match || {}),
      'Divergência_Valor': divergence,
      'Pendente_Financeiro': match ? 'NÃO' : 'SIM',
      'Comissão (Numérica)': match ? extractNumericCommission(getCommissionFromRecord(match)) : 0,
      'isPermanent': !!match,
      'Match_Score': matchScore,
      'Match_Confiança': matchConf
    } as CommercialReportRecord;
  });

  // 4. Entrega 2: Relatório Financeiro (Âncora Voomp)
  const financialReport = voompData.map(voompRecord => {
    const vCPF = cleanCPF(getField(voompRecord, VOOMP_CPF_FIELDS));
    const vEmail = cleanEmail(getField(voompRecord, VOOMP_EMAIL_FIELDS));
    const vName = normalizeName(getField(voompRecord, VOOMP_NAME_FIELDS));
    const vPhone = cleanPhone(getField(voompRecord, VOOMP_PHONE_FIELDS));
    const vId = getField(voompRecord, VOOMP_ID_FIELDS);
    const vValue = parseBR(getField(voompRecord, ['Faturamento total', 'Faturamento', 'Valor Total', 'Valor Pago']));

    let pMatch: PipeRecord | undefined;
    
    // Prioridade 1: Mapeamento Manual
    const mappedPipeId = vId ? permanentMappings.get(vId) : undefined;
    if (mappedPipeId && pipeById.has(mappedPipeId)) {
      pMatch = pipeById.get(mappedPipeId);
    }
    
    // Prioridade 2: CPF — com tie-breaker por valor
    if (!pMatch && vCPF && pipeByCPF.has(vCPF)) {
      pMatch = findBestPipeCandidate(pipeByCPF.get(vCPF) || [], vValue);
    }
    // Prioridade 3: E-mail — com tie-breaker por valor
    if (!pMatch && vEmail && pipeByEmail.has(vEmail)) {
      pMatch = findBestPipeCandidate(pipeByEmail.get(vEmail) || [], vValue);
    }
    // Prioridade 4: Nome — com tie-breaker por valor
    if (!pMatch && vName && pipeByName.has(vName)) {
      pMatch = findBestPipeCandidate(pipeByName.get(vName) || [], vValue);
    }
    // Prioridade 5: Telefone — com tie-breaker por valor
    if (!pMatch && vPhone && pipeByPhone.has(vPhone)) {
      pMatch = findBestPipeCandidate(pipeByPhone.get(vPhone) || [], vValue);
    }

    const wasMatchedInCommercial = vId ? usedVoompIds.has(vId) : usedVoompRefs.has(voompRecord);
    
    const recurrVal = String(getField(voompRecord, ['Recorrência atual', 'Recorrência']) || '').trim();
    const recurrMatch = recurrVal.match(/^(\d+)/);
    const recurrNum = recurrMatch ? parseInt(recurrMatch[1]) : NaN;
    
    let tipoVenda: 'Nova Venda' | 'Venda Recorrente' = 'Nova Venda';
    if (!isNaN(recurrNum) && recurrNum >= 2) {
      tipoVenda = 'Venda Recorrente';
    } else if (recurrVal === '' || recurrNum === 1) {
      tipoVenda = 'Nova Venda';
    }

    // Option C: Recurrences >= 2 do not need a Pipe match, they are NEVER strictly "Orphans"
    const isOrphan = !wasMatchedInCommercial && tipoVenda !== 'Venda Recorrente';

    const pValue = pMatch ? parseBR(getField(pMatch, ['Negócio - Valor do negócio', 'Valor'])) : 0;
    const divergence = pMatch ? pValue - vValue : 0;

    // Determina como o match foi feito para exibir no relatório
    let matchScore = 'Sem Match';
    if (pMatch) {
      if (mappedPipeId) matchScore = 'Mapeamento Manual';
      else if (vCPF && pipeByCPF.has(vCPF)) matchScore = 'CPF';
      else if (vEmail && pipeByEmail.has(vEmail)) matchScore = 'E-mail';
      else if (vName && pipeByName.has(vName)) matchScore = 'Nome';
      else if (vPhone && pipeByPhone.has(vPhone)) matchScore = 'Telefone';
      else matchScore = 'Match Indireto';
    }

    return {
      ...voompRecord,
      ...(pMatch || {}),
      'Negócio - ID': pMatch ? getField(pMatch, PIPE_ID_FIELDS) : '',
      'Proprietário': pMatch ? getField(pMatch, ['Negócio - Proprietário', 'Proprietário']) : '',
      'Status': pMatch ? getField(pMatch, ['Negócio - Status', 'Status']) : '',
      'Divergência_Valor': pMatch ? divergence : 0,
      'Pendente_Financeiro': pMatch ? 'NÃO' : 'SIM',
      'Match_Score': matchScore,
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
