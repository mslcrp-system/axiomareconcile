import React, { useState, useMemo, useEffect, Component, ErrorInfo, ReactNode, lazy, Suspense } from 'react';
import Papa from 'papaparse';
import { 
  reconcile, 
  parseCSV, 
  toCSV, 
  formatBR,
  parseBR,
  getField,
  cleanCPF,
  cleanEmail,
  consolidateVoompFiles,
  PipeRecord, 
  VoompRecord, 
  CommercialReportRecord,
  FinancialReportRecord,
  PIPE_ID_FIELDS,
  PIPE_CPF_FIELDS,
  PIPE_EMAIL_FIELDS,
  VOOMP_ID_FIELDS,
  VOOMP_CPF_FIELDS,
  VOOMP_EMAIL_FIELDS
} from './utils/reconciliation';
import { 
  PIPE_SAMPLE_CSV, 
  VOOMP_SAMPLE_CSV 
} from './constants';

import { 
  Upload, 
  FileCheck, 
  AlertCircle, 
  Download, 
  Table as TableIcon, 
  CheckCircle2,
  Filter,
  Search,
  RefreshCcw,
  Database,
  BarChart3,
  DollarSign,
  FileText,
  ArrowRightLeft,
  Save,
  History,
  LogOut,
  LogIn,
  Trash2,
  Eye,
  UserPlus,
  Lock as LockIcon
} from 'lucide-react';
import { StatCard } from './components/UI/StatCard';
import { UploadCard } from './components/UI/UploadCard';
import { TabButton, Th, Td, StatusBadge } from './components/UI/Common';
const ManualReconciliation = lazy(() => import('./components/ManualReconciliation').then(m => ({ default: m.ManualReconciliation })));
const ClientsBase = lazy(() => import('./components/ClientsBase').then(m => ({ default: m.ClientsBase })));
import { ReportTableRow } from './components/ReportTableRow';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
  }
}

function handleSupabaseError(error: any, operationType: OperationType, path: string | null) {
  const errInfo: SupabaseErrorInfo = {
    error: error?.message || String(error),
    authInfo: {
      userId: '', // Will be populated if needed, but Supabase doesn't have a sync currentUser like Firebase
      email: '',
    },
    operationType,
    path
  }
  console.error('Supabase Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = 'Ocorreu um erro inesperado.';
      try {
        const parsedError = JSON.parse(this.state.error?.message || '');
        if (parsedError.error) {
          errorMessage = `Erro no banco de dados: ${parsedError.error}`;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ops! Algo deu errado</h1>
            <p className="text-gray-600 mb-6">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

type TabType = 'commercial' | 'financial' | 'recurrence' | 'history' | 'manual' | 'users' | 'clients';

interface AuthorizedUser {
  id: string;
  email: string;
  org_id: string;
  role: 'admin' | 'user';
  name: string;
}

interface SavedReport {
  id: string;
  name: string;
  user_email: string;
  timestamp: string;
  stats: {
    totalPipe: number;
    matched: number;
    orphans: number;
    totalDivergence: number;
  };
  commercialData?: string;
  financialData?: string;
  gapData: string;
  pipeRaw?: string;
  voompRaw?: string;
  hasChunks?: boolean;
}

interface Cliente {
  id: string;
  nome: string;
  cpf_cnpj: string;
  email?: string;
  telefone?: string;
  org_id: string;
}

interface PermanentMapping {
  id: string;
  id_venda: string;
  negocio_id: string;
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [orgId, setOrgId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [pipeFile, setPipeFile] = useState<File | null>(null);
  const [voompFiles, setVoompFiles] = useState<File[]>([]);
  const [pipeRawData, setPipeRawData] = useState<PipeRecord[]>([]);
  const [voompRawData, setVoompRawData] = useState<VoompRecord[]>([]);
  const [commercialData, setCommercialData] = useState<CommercialReportRecord[]>([]);
  const [financialData, setFinancialData] = useState<FinancialReportRecord[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('commercial');
  const [searchTerm, setSearchTerm] = useState('');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [reportName, setReportName] = useState('');
  const [permanentMappings, setPermanentMappings] = useState<PermanentMapping[]>([]);
  const [selectedOrphan, setSelectedOrphan] = useState<FinancialReportRecord | null>(null);
  const [searchVoompQuery, setSearchVoompQuery] = useState('');
  const [searchPipeQuery, setSearchPipeQuery] = useState('');
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [authorizedUsers, setAuthorizedUsers] = useState<AuthorizedUser[]>([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'user'>('user');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [clienteSearchTerm, setClienteSearchTerm] = useState('');
  const [clienteDeals, setClienteDeals] = useState<PipeRecord[]>([]);
  const [clienteSales, setClienteSales] = useState<VoompRecord[]>([]);

  useEffect(() => {
    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleUserChange(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleUserChange(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleUserChange = async (user: User | null) => {
    setUser(user);
    if (user) {
      try {
        const userEmail = user.email?.toLowerCase();
        if (!userEmail) {
          setIsAuthorized(false);
          setIsAuthReady(true);
          return;
        }

        const { data: userData, error } = await supabase
          .from('pvpds_authorized_users')
          .select('*')
          .eq('email', userEmail)
          .single();
        
        if (userData && !error) {
          setIsAuthorized(true);
          setOrgId(userData.org_id);
          setUserRole(userData.role);
        } else {
          // Check for hardcoded super admins to bootstrap
          const superAdminsEnv = (import.meta as any).env?.VITE_SUPER_ADMINS || '';
          const superAdmins = superAdminsEnv.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean);
          if (superAdmins.includes(userEmail)) {
            setIsAuthorized(true);
            setOrgId('axioma_consultoria'); // Definição de empresa única conforme solicitado
            setUserRole('admin');
            
            // Bootstrap
            await supabase.from('pvpds_authorized_users').upsert({
              email: userEmail,
              org_id: 'axioma_consultoria',
              role: 'admin',
              name: user.user_metadata?.full_name || 'Admin'
            });
          } else {
            setIsAuthorized(false);
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
        setIsAuthorized(false);
      }
    } else {
      setIsAuthorized(null);
      setOrgId('');
      setUserRole('');
    }
    setIsAuthReady(true);
  };

  useEffect(() => {
    if (!user || !isAuthorized || !orgId) {
      setSavedReports([]);
      setPermanentMappings([]);
      return;
    }

    // Initial fetch for Reports
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase
          .from('pvpds_reconciliation_reports')
          .select('*')
          .eq('org_id', orgId)
          .order('timestamp', { ascending: false });
        if (error) throw error;
        setSavedReports(data as SavedReport[]);
      } catch (err) {
        console.error('Erro ao buscar relatórios:', err);
      }
    };

    // Initial fetch for Mappings
    const fetchMappings = async () => {
      try {
        const { data, error } = await supabase
          .from('pvpds_de_para_permanente')
          .select('*')
          .eq('org_id', orgId);
        if (error) throw error;
        setPermanentMappings(data as PermanentMapping[]);
      } catch (err) {
        console.error('Erro ao buscar mapeamentos:', err);
      }
    };

    fetchReports();
    fetchMappings();

    // Supabase Realtime Subscriptions
    // Reports: only INSERT to avoid re-fetch on every internal reconciliation update
    const reportsChannel = supabase.channel('reports-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pvpds_reconciliation_reports', filter: `org_id=eq.${orgId}` }, fetchReports)
      .subscribe();

    const mappingsChannel = supabase.channel('mappings-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pvpds_de_para_permanente', filter: `org_id=eq.${orgId}` }, fetchMappings)
      .subscribe();

    return () => {
      supabase.removeChannel(reportsChannel);
      supabase.removeChannel(mappingsChannel);
    };
  }, [user, isAuthorized, orgId]);

  useEffect(() => {
    if (!user || userRole !== 'admin' || !orgId) {
      setAuthorizedUsers([]);
      return;
    }

    const fetchUsers = async () => {
      try {
        const { data, error } = await supabase
          .from('pvpds_authorized_users')
          .select('*')
          .eq('org_id', orgId);
        if (error) throw error;
        setAuthorizedUsers(data as AuthorizedUser[]);
      } catch (err) {
        console.warn('Aviso: Falha temporária ao buscar lista de usuários.');
      }
    };

    fetchUsers();

    const usersChannel = supabase.channel('users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pvpds_authorized_users', filter: `org_id=eq.${orgId}` }, fetchUsers)
      .subscribe();

    return () => {
      supabase.removeChannel(usersChannel);
    };
  }, [user, userRole, orgId]);

  useEffect(() => {
    if (!user || !isAuthorized || !orgId) {
      setClientes([]);
      return;
    }

    const fetchClientes = async () => {
      try {
        const { data, error } = await supabase
          .from('pvpds_clientes')
          .select('*')
          .eq('org_id', orgId);
        if (error) throw error;
        setClientes(data as Cliente[]);
      } catch (err) {
        console.warn('Aviso: Falha temporária ao buscar lista de clientes.');
      }
    };

    fetchClientes();

    const clientesChannel = supabase.channel('clientes-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pvpds_clientes', filter: `org_id=eq.${orgId}` }, fetchClientes)
      .subscribe();

    return () => {
      supabase.removeChannel(clientesChannel);
    };
  }, [user, isAuthorized, orgId]);

  const selectCliente = async (cliente: Cliente) => {
    setSelectedCliente(cliente);
    setIsProcessing(true);
    try {
      // Fetch all deals for this client
      const { data: deals, error: dealsErr } = await supabase
        .from('pvpds_deals_pipe')
        .select('data')
        .eq('org_id', orgId)
        .eq('cpf_cnpj', cliente.cpf_cnpj);
      
      if (dealsErr) throw dealsErr;
      setClienteDeals(deals.map(d => d.data as PipeRecord));

      // Fetch all sales for this client
      const { data: sales, error: salesErr } = await supabase
        .from('pvpds_vendas_voomp')
        .select('data')
        .eq('org_id', orgId)
        .eq('cpf_cnpj', cliente.cpf_cnpj);
      
      if (salesErr) throw salesErr;
      setClienteSales(sales.map(s => s.data as VoompRecord));
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setIsProcessing(false);
    }
  };
  const addUser = async () => {
    if (!newUserEmail || !orgId) return;
    try {
      const { error } = await supabase.from('pvpds_authorized_users').upsert({
        email: newUserEmail.toLowerCase(),
        org_id: orgId,
        role: newUserRole,
        name: newUserEmail.split('@')[0]
      });

      if (error) throw error;

      setNewUserEmail('');
      setNotification({ message: 'Usuário autorizado com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error adding user:', error);
      setNotification({ message: 'Erro ao autorizar usuário.', type: 'error' });
    }
  };

  const removeUser = async (email: string) => {
    if (email === user?.email) {
      setNotification({ message: 'Você não pode remover a si mesmo.', type: 'error' });
      return;
    }
    try {
      const { error } = await supabase.from('pvpds_authorized_users').delete().eq('email', email);
      if (error) throw error;

      setNotification({ message: 'Usuário removido com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error removing user:', error);
      setNotification({ message: 'Erro ao remover usuário.', type: 'error' });
    }
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput || !passwordInput) {
      setNotification({ message: 'Preencha e-mail e senha.', type: 'error' });
      return;
    }
    
    setIsProcessing(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput.toLowerCase(),
        password: passwordInput,
      });
      if (error) throw error;
      
      setNotification({ message: 'Login realizado com sucesso!', type: 'success' });
      setEmailInput('');
      setPasswordInput('');
    } catch (error: any) {
      console.error('Login error:', error);
      setNotification({ message: error.message || 'Erro ao fazer login.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setCommercialData([]);
      setFinancialData([]);
      setPipeRawData([]);
      setVoompRawData([]);
      setVoompFiles([]);
      setCurrentReportId(null);
      setActiveTab('commercial');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const sanitizeObject = (obj: any) => {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };

  const saveReport = async () => {
    if (!user || !orgId || commercialData.length === 0) return;
    
    setIsSaving(true);
    try {
      const orphans = financialData.filter(r => r.Venda_Orfã === 'SIM');
      const stats = {
        totalPipe: commercialData.length,
        matched: commercialData.filter(r => r.Pendente_Financeiro === 'NÃO').length,
        orphans: orphans.length,
        totalDivergence: commercialData.reduce((acc, r) => acc + (typeof r.Divergência_Valor === 'number' ? r.Divergência_Valor : parseFloat(String(r.Divergência_Valor)) || 0), 0)
      };

      // Fix #6: Check payload size before inserting to avoid silent failures on large bases
      const payloadSize = new Blob([JSON.stringify({
        commercial_data: commercialData,
        financial_data: financialData,
        pipe_raw: pipeRawData,
        voomp_raw: voompRawData
      })]).size;
      const MAX_PAYLOAD_BYTES = 1_500_000; // 1.5MB safe limit

      const reportMetadata = {
        user_id: user.id,
        user_email: user.email,
        org_id: orgId,
        name: reportName || `Auditoria ${new Date().toLocaleDateString()}`,
        timestamp: new Date().toISOString(),
        stats,
        gap_data: '',
        // If payload too large, omit raw data to save only metadata + reports
        commercial_data: payloadSize <= MAX_PAYLOAD_BYTES ? commercialData : commercialData.slice(0, 500),
        financial_data: payloadSize <= MAX_PAYLOAD_BYTES ? financialData : financialData.slice(0, 500),
        pipe_raw: payloadSize <= MAX_PAYLOAD_BYTES ? pipeRawData : [],
        voomp_raw: payloadSize <= MAX_PAYLOAD_BYTES ? voompRawData : [],
        hasChunks: payloadSize > MAX_PAYLOAD_BYTES
      };

      if (payloadSize > MAX_PAYLOAD_BYTES) {
        setNotification({ message: `⚠️ Base grande (${(payloadSize/1024).toFixed(0)}KB): salvando relatório resumido. Dados brutos preservados localmente.`, type: 'success' });
        setTimeout(() => setNotification(null), 6000);
      }

      let reportId = currentReportId;
      if (!reportId) {
        const { data, error } = await supabase
          .from('pvpds_reconciliation_reports')
          .insert(reportMetadata)
          .select()
          .single();
        
        if (error) handleSupabaseError(error, OperationType.CREATE, 'reconciliation_reports');
        if (data) reportId = data.id;
      } else {
        const { error } = await supabase
          .from('pvpds_reconciliation_reports')
          .update(reportMetadata)
          .eq('id', reportId);
        
        if (error) handleSupabaseError(error, OperationType.UPDATE, `reconciliation_reports/${reportId}`);
      }

      if (reportId) {
        setCurrentReportId(reportId);
        
        // Master Data Persistence: Clientes, Deals, Vendas
        const processedCPFs = new Set<string>();
        const clientsToUpsert: any[] = [];
        const dealsToUpsert: any[] = [];
        const salesToUpsert: any[] = [];

        // Process PIPE Data for Master Data
        pipeRawData.forEach(deal => {
          const cpf = cleanCPF(getField(deal, ['Pessoa - CPF', 'CPF']));
          const nome = getField(deal, ['Pessoa - Nome', 'Nome']);
          if (cpf && !processedCPFs.has(cpf)) {
            clientsToUpsert.push({
              cpf_cnpj: cpf,
              nome: nome || 'Desconhecido',
              org_id: orgId,
              email: getField(deal, ['Pessoa - E-mail', 'Email']) || '',
              timestamp: new Date().toISOString()
            });
            processedCPFs.add(cpf);
          }
          
          const dealId = getField(deal, ['Negócio - ID', 'ID']);
          if (dealId) {
            dealsToUpsert.push({
              id: dealId,
              data: deal,
              cpf_cnpj: cpf,
              org_id: orgId,
              timestamp: new Date().toISOString()
            });
          }
        });

        // Process Voomp Data for Master Data
        voompRawData.forEach(venda => {
          const cpf = cleanCPF(getField(venda, ['CPF/CNPJ', 'CPF']));
          const nome = getField(venda, ['Nome do comprador', 'Nome']);
          if (cpf && !processedCPFs.has(cpf)) {
            clientsToUpsert.push({
              cpf_cnpj: cpf,
              nome: nome || 'Desconhecido',
              org_id: orgId,
              email: getField(venda, ['Email do comprador', 'Email']) || '',
              timestamp: new Date().toISOString()
            });
            processedCPFs.add(cpf);
          }

          const vendaId = getField(venda, ['ID Venda', 'ID']);
          if (vendaId) {
            salesToUpsert.push({
              id: vendaId,
              data: venda,
              cpf_cnpj: cpf,
              org_id: orgId,
              timestamp: new Date().toISOString()
            });
          }
        });

        // Batch Upserts in Supabase
        if (clientsToUpsert.length > 0) {
          await supabase.from('pvpds_clientes').upsert(clientsToUpsert, { onConflict: 'cpf_cnpj' });
        }
        if (dealsToUpsert.length > 0) {
          await supabase.from('pvpds_deals_pipe').upsert(dealsToUpsert, { onConflict: 'id' });
        }
        if (salesToUpsert.length > 0) {
          await supabase.from('pvpds_vendas_voomp').upsert(salesToUpsert, { onConflict: 'id' });
        }
      }

      setReportName('');
      setNotification({ message: 'Relatório salvo com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error saving report:', error);
      setNotification({ message: 'Erro ao salvar relatório.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const loadReport = async (report: any) => {
    setIsProcessing(true);
    try {
      setCommercialData(report.commercial_data || []);
      setFinancialData(report.financial_data || []);
      setPipeRawData(report.pipe_raw || []);
      setVoompRawData(report.voomp_raw || []);
      
      setCurrentReportId(report.id);
      setActiveTab('commercial');
      setNotification({ message: 'Relatório carregado com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error loading report:', error);
      setNotification({ message: 'Erro ao carregar relatório.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteReport = async (id: string) => {
    try {
      const { error } = await supabase.from('pvpds_reconciliation_reports').delete().eq('id', id);
      if (error) throw error;
      
      setNotification({ message: 'Relatório excluído com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error deleting report:', error);
      setNotification({ message: 'Erro ao excluir relatório.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const [notification, setNotification] = useState<{ message: string, type: 'error' | 'success' } | null>(null);

  const savePermanentMapping = async (idVenda: string, negocioId: string) => {
    if (!user || !orgId) return;
    const { error } = await supabase.from('pvpds_de_para_permanente').upsert({
      id_venda: idVenda,
      negocio_id: negocioId,
      org_id: orgId,
      user_id: user.id,
      timestamp: new Date().toISOString()
    }, { onConflict: 'id_venda' }); // Garante que não haverá conflito 409 por ID de venda duplicado
    if (error) throw error;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'pipe' | 'voomp') => {
    const files = e.target.files;
    if (files && files.length > 0) {
      if (type === 'pipe') {
        setPipeFile(files[0]);
      } else {
        // For Voomp, we append to the existing files
        setVoompFiles(prev => [...prev, ...Array.from(files)]);
      }
    }
  };

  const readFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = (e) => reject(new Error(`Falha ao ler o arquivo "${file.name}". Verifique se é um CSV válido.`));
      reader.readAsText(file);
    });
  };

  const runReconciliation = async () => {
    if (!pipeFile || voompFiles.length === 0) return;

    setIsProcessing(true);
    try {
      const pipeText = await readFile(pipeFile);
      const pipeData = parseCSV<PipeRecord>(pipeText);

      const voompFilesData = await Promise.all(voompFiles.map((file) => {
        return new Promise<{ name: string, data: VoompRecord[] }>((resolve) => {
          Papa.parse<VoompRecord>(file, {
            header: true,
            skipEmptyLines: 'greedy',
            transformHeader: (header) => header.trim(),
            complete: (results) => {
              console.log(`Parsed ${results.data.length} records from ${file.name}`);
              resolve({
                name: file.name,
                data: results.data
              });
            }
          });
        });
      }));

      const voompData = consolidateVoompFiles(voompFilesData);
      console.log(`Consolidated into ${voompData.length} unique Voomp records`);

      setPipeRawData(pipeData);
      setVoompRawData(voompData);
      setCurrentReportId(null);

      const mappingMap = new Map<string, string>(permanentMappings.map(m => [m.id_venda, m.negocio_id]));
      const { commercialReport, financialReport } = reconcile(pipeData, voompData, mappingMap);
      
      setCommercialData(commercialReport);
      setFinancialData(financialReport);
      setActiveTab('commercial');
    } catch (error) {
      console.error('Error during reconciliation:', error);
      setNotification({ message: 'Erro ao processar arquivos. Verifique se são CSVs válidos.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  const useSampleData = () => {
    setIsProcessing(true);
    setTimeout(() => {
      const pipeData = parseCSV<PipeRecord>(PIPE_SAMPLE_CSV);
      const voompData = parseCSV<VoompRecord>(VOOMP_SAMPLE_CSV);

      setPipeRawData(pipeData);
      setVoompRawData(voompData);
      setCurrentReportId(null);

      const mappingMap = new Map<string, string>(permanentMappings.map(m => [m.id_venda, m.negocio_id]));
      const { commercialReport, financialReport } = reconcile(pipeData, voompData, mappingMap);
      
      setCommercialData(commercialReport);
      setFinancialData(financialReport);
      setActiveTab('commercial');
      setIsProcessing(false);
    }, 500);
  };

  const downloadCSV = () => {
    let data: any[] = [];
    let filename = '';

    if (activeTab === 'commercial') {
      data = commercialData;
      filename = 'relatorio_comercial_pipe.csv';
    } else if (activeTab === 'financial') {
      data = financialData;
      filename = 'relatorio_financeiro_voomp.csv';
    } else if (activeTab === 'recurrence') {
      data = financialData.filter(r => r.Venda_Orfã === 'SIM' && r['Tipo de Venda'] === 'Venda Recorrente');
      filename = 'historico_recorrencia.csv';
    }

    if (data.length === 0) return;

    const csv = toCSV(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = useMemo(() => {
    // Early return for non-table tabs to avoid unnecessary computation
    if (activeTab === 'manual' || activeTab === 'clients' || activeTab === 'history' || activeTab === 'users') {
      return [];
    }

    const data = activeTab === 'commercial' ? commercialData :
                 activeTab === 'financial' ? financialData :
                 activeTab === 'recurrence' ? financialData.filter(r => r.Venda_Orfã === 'SIM' && r['Tipo de Venda'] === 'Venda Recorrente') : [];

    if (!searchTerm) return data;

    return data.filter((row: any) =>
      Object.values(row).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [activeTab, commercialData, financialData, searchTerm]);

  const manualOrphans = useMemo(() => {
    return financialData.filter(r => r.Venda_Orfã === 'SIM' && r['Tipo de Venda'] === 'Nova Venda');
  }, [financialData]);

  const filteredVoompOrphans = useMemo(() => {
    if (!searchVoompQuery) return manualOrphans;
    const q = searchVoompQuery.toLowerCase();
    return manualOrphans.filter(r =>
      (r['Nome do comprador'] || '').toLowerCase().includes(q) ||
      (r['Email do comprador'] || '').toLowerCase().includes(q) ||
      (r['CPF/CNPJ'] || '').includes(searchVoompQuery) ||
      (r['ID Venda'] || '').toString().includes(searchVoompQuery)
    );
  }, [manualOrphans, searchVoompQuery]);

  const stats = useMemo(() => {
    if (commercialData.length === 0) return null;
    const orphans = financialData.filter(r => r.Venda_Orfã === 'SIM');
    const newOrphans = orphans.filter(r => r['Tipo de Venda'] === 'Nova Venda');
    return {
      totalPipe: commercialData.length,
      totalVoomp: voompRawData.length,
      matched: commercialData.filter(r => r.Pendente_Financeiro === 'NÃO').length,
      orphans: orphans.length,
      newOrphans: newOrphans.length,
      totalDivergence: commercialData.reduce((acc, r) => acc + (typeof r.Divergência_Valor === 'number' ? r.Divergência_Valor : parseFloat(String(r.Divergência_Valor)) || 0), 0)
    };
  }, [commercialData, financialData, voompRawData]);

  const searchedPipeRecords = useMemo(() => {
    if (!searchPipeQuery) return [];
    return pipeRawData.filter(r =>
      (r['Negócio - ID'] || '').toLowerCase().includes(searchPipeQuery.toLowerCase()) ||
      (r['Pessoa - Nome'] && r['Pessoa - Nome'].toLowerCase().includes(searchPipeQuery.toLowerCase())) ||
      (r['Negócio - Proprietário'] || '').toLowerCase().includes(searchPipeQuery.toLowerCase())
    ).slice(0, 10);
  }, [pipeRawData, searchPipeQuery]);

  const confirmLink = async (pipeRecord: PipeRecord) => {
    if (!user || !orgId || !selectedOrphan) return;

    const idVenda = selectedOrphan['ID Venda'];
    const negocioId = pipeRecord['Negócio - ID'];

    setIsProcessing(true);
    try {
      // 1. Build the mapping map immediately with the new pair (no stale closure)
      const mappingMap = new Map<string, string>(permanentMappings.map(m => [m.id_venda, m.negocio_id]));
      mappingMap.set(idVenda, negocioId);

      // 2. Re-run reconciliation and update UI immediately (optimistic update)
      const { commercialReport, financialReport } = reconcile(pipeRawData, voompRawData, mappingMap);
      setCommercialData(commercialReport);
      setFinancialData(financialReport);

      // 3. Clear selection and search fields right away so the user sees instant feedback
      setSelectedOrphan(null);
      setSearchPipeQuery('');
      setSearchVoompQuery('');

      // 4. Persist to Supabase in background
      await savePermanentMapping(idVenda, negocioId);

      // 5. If a saved report exists, update its data as well
      if (currentReportId) {
        const stats = {
          totalPipe: commercialReport.length,
          matched: commercialReport.filter(r => r.Pendente_Financeiro === 'NÃO').length,
          orphans: financialReport.filter(r => r.Venda_Orfã === 'SIM').length,
          totalDivergence: commercialReport.reduce((acc, r) => acc + (typeof r.Divergência_Valor === 'number' ? r.Divergência_Valor : parseFloat(String(r.Divergência_Valor)) || 0), 0)
        };
        await supabase.from('pvpds_reconciliation_reports').update({
          stats,
          commercial_data: commercialReport,
          financial_data: financialReport
        }).eq('id', currentReportId);
      }

      setNotification({ message: 'Vínculo confirmado e salvo com sucesso!', type: 'success' });
      setTimeout(() => setNotification(null), 3000);
    } catch (error) {
      console.error('Error confirming link:', error);
      setNotification({ message: 'Erro ao confirmar vínculo.', type: 'error' });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen text-primary-200 overflow-x-hidden relative">
      <div className="bg-mesh" />
      
      {notification && (
        <div className={cn(
          "fixed bottom-8 right-8 px-6 py-4 rounded-2xl shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-4 transition-all duration-500",
          notification.type === 'error' ? "bg-red-500/20 text-red-200 border border-red-500/30 backdrop-blur-md" : "bg-green-500/20 text-green-200 border border-green-500/30 backdrop-blur-md"
        )}>
          <p className="font-bold text-sm tracking-tight">{notification.message}</p>
        </div>
      )}

      {/* Header */}
      <header className="glass-header sticky top-0 px-6 py-4 z-50 w-full overflow-hidden">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-600 rounded-2xl flex items-center justify-center shadow-[0_0_25px_rgba(59,130,246,0.5)] group transition-transform hover:rotate-6">
              <ArrowRightLeft className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tighter text-white font-display leading-none">
                PVP <span className="text-primary-400">RECONCILE</span>
              </h1>
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-gray-500 mt-0.5">Auditoria Inteligente</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {user ? (
              <div className="flex items-center gap-4 bg-white/5 pl-4 pr-1 py-1 rounded-2xl border border-white/5">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">Operador</span>
                  <span className="text-xs font-bold text-white truncate max-w-[150px]">{user.user_metadata?.full_name || user.email}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-400 flex items-center justify-center transition-all group"
                  title="Sair do Sistema"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:scale-110" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleLogin} className="flex items-center gap-2">
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 focus-within:border-primary-500/50 transition-all shadow-inner">
                  <input 
                    type="email" 
                    placeholder="E-mail"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="px-4 py-2 bg-transparent text-white text-xs font-medium w-40 outline-none placeholder:text-gray-600"
                  />
                  <div className="w-[1px] h-4 bg-white/10" />
                  <input 
                    type="password" 
                    placeholder="Senha"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    className="px-4 py-2 bg-transparent text-white text-xs font-medium w-40 outline-none placeholder:text-gray-600"
                  />
                  <button 
                    type="submit"
                    disabled={isProcessing}
                    className="flex items-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold hover:bg-primary-500 transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] disabled:opacity-50"
                  >
                    {isProcessing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
                    Acessar
                  </button>
                </div>
              </form>
            )}

            {commercialData.length > 0 && (
              <button 
                onClick={() => {
                  setCommercialData([]);
                  setFinancialData([]);
                  setPipeFile(null);
                  setVoompFiles([]);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-gray-500 hover:text-red-400 transition-all uppercase tracking-widest border border-white/5 hover:border-red-400/20 rounded-xl bg-white/5 hover:bg-red-400/5"
              >
                <RefreshCcw className="w-3 h-3" />
                Limpar
              </button>
            )}
            
            <div className="flex items-center gap-3 bg-green-500/5 px-4 py-2 rounded-xl border border-green-500/10 shadow-[0_0_15px_rgba(34,197,94,0.05)]">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400/80">Live</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1800px] mx-auto px-6 py-10 relative z-10 w-full">
        {!isAuthReady ? (
          <div className="flex items-center justify-center py-40">
            <RefreshCcw className="w-12 h-12 animate-spin text-primary-500 opacity-20" />
          </div>
        ) : user && isAuthorized === false ? (
          <div className="max-w-md mx-auto text-center py-20 glass-card rounded-[3rem] p-12">
            <div className="w-24 h-24 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-8 border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
              <AlertCircle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-3xl font-black text-white mb-4 font-display">Acesso Restrito</h2>
            <p className="text-gray-500 mb-10 font-medium">
              Sua conta ainda não possui as permissões necessárias para acessar este portal. Solicite ao administrador da Axioma.
            </p>
            <button 
              onClick={handleLogout}
              className="w-full px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-bold transition-all border border-white/5 uppercase tracking-widest text-xs"
            >
              Encerrar Sessão
            </button>
          </div>
        ) : commercialData.length === 0 ? (
          <div className="max-w-4xl mx-auto py-10">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-black text-white mb-6 font-display tracking-tight leading-[1.1]">
                Consolidação de <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-purple-400">Auditoria Financeira</span>
              </h2>
              <p className="text-gray-500 text-lg font-medium max-w-xl mx-auto">
                Suba as bases do <span className="text-white">PIPE</span> e da <span className="text-white">Voomp</span> para validar a verdade financeira do seu negócio.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              <UploadCard 
                id="pipe-upload"
                title="Base PIPE (Comercial)"
                subtitle="Relatório de negócios com ID, CPF e E-mail para cruzamento."
                files={pipeFile}
                onUpload={(e) => handleFileUpload(e, 'pipe')}
              />
              <UploadCard 
                id="voomp-upload"
                title="Base Voomp (Financeiro)"
                subtitle="Consolidado de vendas com faturamento e recorrência."
                files={voompFiles}
                onUpload={(e) => handleFileUpload(e, 'voomp')}
                multiple={true}
              />
            </div>

            <div className="glass-card p-12 rounded-[3rem] flex flex-col items-center">
              <div className="flex flex-col gap-6 w-full max-w-md">
                <button
                  onClick={runReconciliation}
                  disabled={!pipeFile || voompFiles.length === 0 || isProcessing}
                  className={cn(
                    "w-full py-5 rounded-[2rem] font-bold text-xl flex items-center justify-center gap-4 transition-all duration-500 shadow-2xl relative overflow-hidden group",
                    pipeFile && voompFiles.length > 0 && !isProcessing
                      ? "bg-primary-600 text-white hover:bg-primary-500 shadow-primary-500/20 active:scale-95"
                      : "bg-white/5 text-gray-600 cursor-not-allowed grayscale"
                  )}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite]" />
                  {isProcessing ? (
                    <>
                      <RefreshCcw className="w-6 h-6 animate-spin" />
                      Auditoria em curso...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-6 h-6 transition-transform group-hover:scale-125" />
                      Gerar Relatórios de Auditoria
                    </>
                  )}
                </button>

                <button
                  onClick={useSampleData}
                  disabled={isProcessing}
                  className="w-full py-4 rounded-2xl font-bold text-gray-500 border border-white/5 bg-white/5 hover:bg-white/10 hover:text-gray-300 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                >
                  <Database className="w-4 h-4" />
                  Carregar Dados de Demonstração
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
              <StatCard 
                title="Total PIPE" 
                value={stats?.totalPipe} 
                icon={<FileText className="w-5 h-5 text-blue-600" />}
                color="blue"
              />
              <StatCard 
                title="Total Voomp" 
                value={stats?.totalVoomp} 
                icon={<Database className="w-5 h-5 text-purple-600" />}
                color="purple"
              />
              <StatCard 
                title="Conciliados" 
                value={stats?.matched} 
                icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
                color="green"
              />
              <StatCard 
                title="Vendas Órfãs" 
                value={stats?.orphans} 
                icon={<AlertCircle className="w-5 h-5 text-orange-600" />}
                color="orange"
              />
              <StatCard 
                title="Novas Vendas Pendentes" 
                value={stats?.newOrphans} 
                icon={<UserPlus className="w-5 h-5 text-blue-600" />}
                color="blue"
              />
              <StatCard 
                title="Divergência Total" 
                value={`R$ ${formatBR(stats?.totalDivergence)}`} 
                icon={<DollarSign className="w-5 h-5 text-purple-600" />}
                color="purple"
              />
            </div>

            {/* Main Content Area */}
            <div className="bg-white/[0.02] backdrop-blur-3xl rounded-[40px] border border-white/5 shadow-2xl relative z-10 transition-all duration-1000 w-full overflow-hidden">
              {/* Toolbar */}
              <div className="p-10 border-b border-white/5 flex flex-col 2xl:flex-row 2xl:items-center justify-between gap-10 bg-white/[0.01]">
                <div className="flex p-2 bg-white/[0.03] rounded-[2rem] w-full 2xl:w-fit border border-white/5 shadow-inner overflow-x-auto no-scrollbar scroll-smooth">
                  <div className="flex shrink-0">
                  <TabButton 
                    active={activeTab === 'commercial'} 
                    onClick={() => setActiveTab('commercial')}
                    label="Relatório Comercial (PIPE)"
                  />
                  <TabButton 
                    active={activeTab === 'financial'} 
                    onClick={() => setActiveTab('financial')}
                    label="Relatório Financeiro (Voomp)"
                  />
                  <TabButton 
                    active={activeTab === 'recurrence'} 
                    onClick={() => setActiveTab('recurrence')}
                    label="Histórico de Recorrência"
                  />
                  <TabButton 
                    active={activeTab === 'manual'} 
                    onClick={() => setActiveTab('manual')}
                    label="Conciliação Manual"
                  />
                  <TabButton 
                    active={activeTab === 'clients'} 
                    onClick={() => setActiveTab('clients')}
                    label="Base de Clientes"
                  />
                  {user && (
                    <>
                      <TabButton 
                        active={activeTab === 'history'} 
                        onClick={() => setActiveTab('history')}
                        label="Histórico"
                      />
                      {userRole === 'admin' && (
                        <TabButton 
                          active={activeTab === 'users'} 
                          onClick={() => setActiveTab('users')}
                          label="Usuários"
                        />
                      )}
                    </>
                  )}
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-wrap 2xl:flex-nowrap shrink-0 pr-4">
                  {activeTab !== 'history' && (
                    <>
                      {user && commercialData.length > 0 && (
                        <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 focus-within:border-primary-500/30 transition-all shrink-0">
                          <input 
                            type="text"
                            placeholder="Nome do relatório..."
                            value={reportName}
                            onChange={(e) => setReportName(e.target.value)}
                            className="px-4 py-2.5 bg-transparent text-white text-xs font-bold w-48 outline-none placeholder:text-gray-600"
                          />
                          <button 
                            onClick={saveReport}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-6 py-2.5 bg-green-500/10 text-green-400 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-green-500/20 transition-all border border-green-500/20 disabled:opacity-30 disabled:grayscale group"
                          >
                            <Save className={cn("w-4 h-4 transition-transform group-hover:scale-110", isSaving && "animate-pulse")} />
                            {isSaving ? 'Gravando...' : 'Salvar Relatório'}
                          </button>
                        </div>
                      )}
                      
                      <div className="relative group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 transition-colors group-focus-within:text-primary-400" />
                        <input 
                          type="text"
                          placeholder="Pesquisa global..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-14 pr-10 py-3.5 bg-white/[0.03] border border-white/5 rounded-2xl text-sm font-bold text-white focus:outline-none focus:border-primary-500/30 focus:bg-white/[0.05] w-64 2xl:w-80 transition-all"
                        />
                      </div>

                      <button 
                        onClick={downloadCSV}
                        className="flex items-center gap-3 px-6 py-3.5 bg-white/[0.05] text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white/[0.1] transition-all border border-white/10 group"
                      >
                        <Download className="w-4 h-4 text-primary-400 group-hover:translate-y-0.5 transition-transform" />
                        Exportar CSV
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-[600px]">
                {activeTab === 'users' ? (
                  <div className="p-8">
                    <div className="max-w-2xl mx-auto">
                      <div className="flex items-center justify-between mb-8">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Gerenciar Acessos</h3>
                          <p className="text-sm text-gray-500">Controle quem pode acessar os relatórios da sua organização.</p>
                        </div>
                        <div className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Org ID</p>
                          <p className="text-sm font-bold text-blue-900">{orgId}</p>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
                        <h4 className="text-sm font-bold mb-4">Adicionar Novo Usuário</h4>
                        <div className="flex gap-3">
                          <input 
                            type="email"
                            placeholder="email@exemplo.com"
                            value={newUserEmail}
                            onChange={(e) => setNewUserEmail(e.target.value)}
                            className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                          />
                          <select 
                            value={newUserRole}
                            onChange={(e) => setNewUserRole(e.target.value as 'admin' | 'user')}
                            className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                          >
                            <option value="user">Usuário</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button 
                            onClick={addUser}
                            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                          >
                            Autorizar
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {authorizedUsers.map((u) => (
                          <div key={u.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-blue-100 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 font-bold">
                                {u.name[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{u.email}</p>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{u.role}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => removeUser(u.email)}
                              className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                              title="Remover Acesso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'history' ? (
                  <div className="p-0">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-white/5 text-[10px] uppercase tracking-[0.2em] font-black text-gray-500 border-b border-white/5">
                          <th className="px-6 py-4">Data / Hora</th>
                          <th className="px-6 py-4">Usuário</th>
                          <th className="px-6 py-4">Nome do Relatório</th>
                          <th className="px-6 py-4">Estatísticas</th>
                          <th className="px-6 py-4 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {savedReports.map((report) => (
                          <tr key={report.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 text-sm">
                              {new Date(report.timestamp).toLocaleString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium">
                              {report.user_email}
                            </td>
                            <td className="px-6 py-4 text-sm">
                              {report.name}
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg">
                                Match: {report.stats.matched}/{report.stats.totalPipe}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              <button 
                                onClick={() => loadReport(report)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                title="Carregar Dados"
                              >
                                <RefreshCcw className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => deleteReport(report.id)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {savedReports.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-20 text-center text-gray-400 italic">Nenhum relatório salvo encontrado.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : activeTab === 'clients' ? (
                  <Suspense fallback={<div className="p-20 text-center animate-pulse">Carregando Base de Clientes...</div>}>
                    <ClientsBase 
                      user={user}
                      clientes={clientes}
                      clienteSearchTerm={clienteSearchTerm}
                      setClienteSearchTerm={setClienteSearchTerm}
                      selectedCliente={selectedCliente}
                      selectCliente={selectCliente}
                      clienteDeals={clienteDeals}
                      clienteSales={clienteSales}
                      formatBR={formatBR}
                    />
                  </Suspense>
                  ) : activeTab === 'manual' ? (
                  <Suspense fallback={<div className="p-20 text-center animate-pulse">Carregando Concilição Manual...</div>}>
                    <ManualReconciliation 
                      user={user}
                      isProcessing={isProcessing}
                      manualOrphans={manualOrphans}
                      selectedOrphan={selectedOrphan}
                      setSelectedOrphan={setSelectedOrphan}
                      searchVoompQuery={searchVoompQuery}
                      setSearchVoompQuery={setSearchVoompQuery}
                      filteredVoompOrphans={filteredVoompOrphans}
                      searchPipeQuery={searchPipeQuery}
                      setSearchPipeQuery={setSearchPipeQuery}
                      searchedPipeRecords={searchedPipeRecords}
                      confirmLink={confirmLink}
                      formatBR={formatBR}
                    />
                  </Suspense>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 glass-header shadow-[0_4px_30px_rgba(0,0,0,0.3)]">
                      <tr className="text-[10px] uppercase tracking-widest text-gray-400 font-bold border-b border-gray-100">
                        {activeTab === 'commercial' ? (
                          <>
                            <Th>Negócio ID</Th>
                            <Th>Cliente</Th>
                            <Th>Proprietário</Th>
                            <Th>Valor PIPE</Th>
                            <Th>Faturamento Voomp</Th>
                            <Th>Divergência</Th>
                            <Th>Comissão (Num)</Th>
                            <Th>Pendente Financeiro</Th>
                            <Th>Liquidez</Th>
                          </>
                        ) : activeTab === 'financial' ? (
                          <>
                            <Th>ID Venda</Th>
                            <Th>Comprador</Th>
                            <Th>Faturamento</Th>
                            <Th>Recorrência Atual</Th>
                            <Th>Comissão (Num)</Th>
                            <Th>Negócio ID</Th>
                            <Th>Proprietário</Th>
                            <Th>Tipo de Venda</Th>
                            <Th>Venda Órfã</Th>
                            <Th>Origem</Th>
                          </>
                        ) : activeTab === 'recurrence' ? (
                          <>
                            <Th>ID Venda</Th>
                            <Th>Comprador</Th>
                            <Th>Faturamento</Th>
                            <Th>Recorrência Atual</Th>
                            <Th>Comissão (Num)</Th>
                            <Th>Tipo de Venda</Th>
                            <Th>Status</Th>
                          </>
                        ) : (
                          <>
                            <Th>ID Venda</Th>
                            <Th>Comprador</Th>
                            <Th>Faturamento</Th>
                            <Th>Recorrência Atual</Th>
                            <Th>Comissão (Num)</Th>
                            <Th>Tipo de Venda</Th>
                            <Th>Venda Órfã</Th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <AnimatePresence mode="popLayout">
                        {filteredData.map((row: any, idx) => (
                          <ReportTableRow key={`${activeTab}-${idx}`} row={row} activeTab={activeTab} idx={idx} />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                )}
                {/* Empty State logic (Table Tabs Only) */}
                {activeTab !== 'history' && activeTab !== 'manual' && activeTab !== 'clients' && filteredData.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                    <Filter className="w-12 h-12 mb-4 opacity-20" />
                    <p>Nenhum registro encontrado para esta busca.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Audit Rules Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 mb-20 relative z-10 w-full">
              <div className="glass-card p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-green-500/20 transition-all">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-green-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <h4 className="text-[10px] font-black text-green-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <CheckCircle2 className="w-4 h-4" />
                  Regra de Ouro
                </h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                  Cruzamento prioritário por CPF, seguido por E-mail. Normalização de caracteres especiais e minúsculas aplicada antes do match.
                </p>
              </div>
              <div className="glass-card p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-primary-500/20 transition-all">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <h4 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <DollarSign className="w-4 h-4" />
                  CFO Check
                </h4>
                <p className="text-sm text-gray-500 font-medium leading-relaxed italic">
                  Divergência calculada como (Valor PIPE - Faturamento Voomp). Status de Liquidez reflete a data de liberação do saldo.
                </p>
              </div>
              <div className="glass-card p-10 rounded-[2.5rem] border border-white/5 relative overflow-hidden group hover:border-orange-500/20 transition-all">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-orange-500/5 blur-2xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                <h4 className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-3">
                  <AlertCircle className="w-4 h-4" />
                  Gap Diagnosis
                </h4>
                <p className="text-xs text-gray-500 leading-relaxed">
                  Vendas órfãs com Recorrência {'>'} 1 são marcadas como "Antigas". Recorrência = 1 exige validação de processo manual.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

