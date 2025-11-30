
export enum Periodo {
  MANHA = 'Manhã (08:00 às 12:00)',
  TARDE = 'Tarde (13:00 às 17:00)',
  NOITE = 'Especial (18:00)'
}

export type StatusExecucao = 'Pendente' | 'Em Andamento' | 'Concluído' | 'Não Finalizado';

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
}

export interface Usuario {
  nome: string;
  senha: string;
}

// Representing the "Tabs" of the spreadsheet
export interface DatabaseSchema {
  tecnicos: Tecnico[];
  agendamentos: Agendamento[];
  atividades: string[];
  cidades: string[]; 
  usuarios: Usuario[]; // Changed from string[] to Usuario[]
  feriados: string[]; // Lista de datas YYYY-MM-DD que são feriados
}

export interface TecnicoDisponivel extends Tecnico {
  vagasRestantes: number;
}
