
export enum Periodo {
  MANHA = 'Manhã (08:00 às 12:00)',
  TARDE = 'Tarde (13:00 às 17:00)',
  NOITE = 'Especial (18:00)'
}

export type StatusExecucao = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Não Finalizado';

export type UserProfile = 'admin' | 'user';

export interface UsuarioPermissoes {
  agendamento: boolean;
  dashboard: boolean;
  planilha: boolean;
}

export interface Tecnico {
  id: string;
  nome: string;
  cidades: string[]; 
  capacidadeManha: number;
  capacidadeTarde: number;
  capacidadeNoite: number;
  
  // Capacidades Especiais (Total do dia, independente do período)
  capacidadeSabado: number;
  capacidadeDomingo: number;
  capacidadeFeriado: number;
}

export interface Agendamento {
  id: string;
  cliente: string;
  telefone: string;
  cidade: string;
  data: string; // YYYY-MM-DD
  periodo: Periodo;
  tecnicoId: string;
  tecnicoNome: string;
  atividade: string;
  status: 'Confirmado' | 'Pendente' | 'Encerrado';
  observacaoIA?: string;
  
  nomeUsuario: string;

  statusExecucao: StatusExecucao;
  motivoNaoConclusao?: string;

  // Novos campos para Pré-Agendamento
  tipo: 'PADRAO' | 'PRE_AGENDAMENTO';
  criadoEm: string; // ISO Timestamp da criação
}

export interface Usuario {
  nome: string;
  senha: string;
  perfil: UserProfile;
  permissoes: UsuarioPermissoes; // Controle granular de acesso
}

export interface LogEntry {
  id: string;
  timestamp: string;
  usuario: string;
  acao: string;
  detalhes: string;
}

// Representing the "Tabs" of the spreadsheet
export interface DatabaseSchema {
  tecnicos: Tecnico[];
  agendamentos: Agendamento[];
  atividades: string[];
  cidades: string[]; 
  usuarios: Usuario[]; 
  feriados: string[]; // Lista de datas YYYY-MM-DD que são feriados
  logs: LogEntry[]; // Histórico de auditoria
  apiToken?: string; // Token para acesso via API externa
}

export interface TecnicoDisponivel extends Tecnico {
  vagasRestantes: number;
}
