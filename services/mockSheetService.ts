
import { Agendamento, DatabaseSchema, Periodo, Tecnico, TecnicoDisponivel, Usuario, LogEntry } from '../types';

const STORAGE_KEY = 'app_agendamento_sheet_data_v9'; 

const getTodayString = () => new Date().toISOString().split('T')[0];

const INITIAL_DATA: DatabaseSchema = {
  tecnicos: [
    { 
      id: '1', 
      nome: 'João Silva', 
      cidades: ['São Paulo', 'Guarulhos', 'Osasco', 'São Bernardo do Campo', 'Santo André'], 
      capacidadeManha: 2, 
      capacidadeTarde: 2, 
      capacidadeNoite: 1,
      capacidadeSabado: 3,
      capacidadeDomingo: 0,
      capacidadeFeriado: 1
    },
    { 
      id: '2', 
      nome: 'Maria Santos', 
      cidades: ['Rio de Janeiro', 'Niterói', 'Duque de Caxias', 'Nova Iguaçu', 'São Gonçalo'], 
      capacidadeManha: 2, 
      capacidadeTarde: 2, 
      capacidadeNoite: 1,
      capacidadeSabado: 3,
      capacidadeDomingo: 1,
      capacidadeFeriado: 1
    },
    { 
      id: '3', 
      nome: 'Carlos Oliveira', 
      cidades: ['São Paulo', 'Campinas', 'Jundiaí', 'Sorocaba', 'Santos'], 
      capacidadeManha: 2, 
      capacidadeTarde: 2, 
      capacidadeNoite: 1,
      capacidadeSabado: 3,
      capacidadeDomingo: 0,
      capacidadeFeriado: 1
    },
    { 
      id: '4', 
      nome: 'Ana Costa', 
      cidades: ['Belo Horizonte', 'Contagem', 'Betim', 'Nova Lima', 'Sabará'], 
      capacidadeManha: 2, 
      capacidadeTarde: 2, 
      capacidadeNoite: 1,
      capacidadeSabado: 3,
      capacidadeDomingo: 0,
      capacidadeFeriado: 1
    },
    { 
      id: '5', 
      nome: 'Pedro Alvares', 
      cidades: ['Curitiba', 'São José dos Pinhais', 'Pinhais', 'Colombo', 'Araucária'], 
      capacidadeManha: 2, 
      capacidadeTarde: 2, 
      capacidadeNoite: 1,
      capacidadeSabado: 3,
      capacidadeDomingo: 0,
      capacidadeFeriado: 1
    },
  ],
  atividades: [
    "Suporte",
    "Troca de cômodo",
    "Troca de equipamento",
    "Retirada de equipamento",
    "Instalação Nova"
  ],
  cidades: [
    "São Paulo", "Guarulhos", "Osasco", "São Bernardo do Campo", "Santo André",
    "Rio de Janeiro", "Niterói", "Duque de Caxias", "Nova Iguaçu", "São Gonçalo",
    "Belo Horizonte", "Contagem", "Betim",
    "Curitiba", "São José dos Pinhais",
    "Campinas", "Jundiaí", "Sorocaba", "Santos"
  ],
  usuarios: [
    { nome: "Administrador", senha: "1234", perfil: "admin" },
    { nome: "Atendente 1", senha: "123", perfil: "user" },
    { nome: "Atendente 2", senha: "123", perfil: "user" },
    { nome: "Gerente", senha: "123", perfil: "admin" }
  ],
  feriados: [
      "2025-12-25", // Natal
      "2025-01-01", // Ano Novo
      "2025-05-01"  // Dia do Trabalho
  ],
  agendamentos: [
    {
        id: 'mock-1',
        cliente: 'Roberto Souza',
        telefone: '11999999999',
        cidade: 'São Paulo',
        data: getTodayString(),
        periodo: Periodo.MANHA,
        tecnicoId: '1',
        tecnicoNome: 'João Silva',
        atividade: 'Suporte',
        status: 'Confirmado',
        statusExecucao: 'Concluído',
        nomeUsuario: 'Administrador',
        tipo: 'PADRAO',
        criadoEm: new Date().toISOString()
    },
    {
        id: 'mock-2',
        cliente: 'Ana Paula',
        telefone: '11988888888',
        cidade: 'Guarulhos',
        data: getTodayString(),
        periodo: Periodo.TARDE,
        tecnicoId: '1',
        tecnicoNome: 'João Silva',
        atividade: 'Troca de Equipamento',
        status: 'Confirmado',
        statusExecucao: 'Não Finalizado',
        motivoNaoConclusao: 'Equipamento em falta',
        nomeUsuario: 'Atendente 1',
        tipo: 'PADRAO',
        criadoEm: new Date().toISOString()
    }
  ],
  logs: [],
  apiToken: ""
};

export const getSheetData = (): DatabaseSchema => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
        const parsed = JSON.parse(data);
        
        // --- Migrações de Schema ---
        if (parsed.usuarios && parsed.usuarios.length > 0 && typeof parsed.usuarios[0] === 'string') {
            parsed.usuarios = parsed.usuarios.map((u: string) => ({ nome: u, senha: '123', perfil: 'user' }));
        }
        // Migração de perfil
        if (parsed.usuarios && parsed.usuarios.length > 0 && typeof parsed.usuarios[0] === 'object' && !parsed.usuarios[0].perfil) {
             parsed.usuarios = parsed.usuarios.map((u: any) => ({ ...u, perfil: u.nome === 'Administrador' ? 'admin' : 'user' }));
        }

        if (parsed.tecnicos.length > 0) {
            if (typeof parsed.tecnicos[0].capacidadeSabado === 'undefined') {
                 parsed.tecnicos = parsed.tecnicos.map((t: any) => ({
                     ...t,
                     capacidadeSabado: 3,
                     capacidadeDomingo: 0,
                     capacidadeFeriado: 1
                 }));
            }
        }
        if (!parsed.feriados) parsed.feriados = INITIAL_DATA.feriados;
        if (!parsed.cidades) parsed.cidades = INITIAL_DATA.cidades;
        if (!parsed.usuarios) parsed.usuarios = INITIAL_DATA.usuarios;
        if (!parsed.logs) parsed.logs = [];
        
        // Garantir campo apiToken
        if (typeof parsed.apiToken === 'undefined') parsed.apiToken = "";

        // Migração para incluir 'tipo' e 'criadoEm'
        parsed.agendamentos = parsed.agendamentos.map((ag: any) => ({
            ...ag,
            tipo: ag.tipo || 'PADRAO',
            criadoEm: ag.criadoEm || new Date().toISOString()
        }));

        return parsed;
    } catch (e) {
        return INITIAL_DATA;
    }
  }
  return INITIAL_DATA;
};

export const saveSheetData = (data: DatabaseSchema) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  // Dispara evento para avisar outros componentes que os dados mudaram
  window.dispatchEvent(new Event('localDataChanged'));
};

export const addLog = (usuario: string, acao: string, detalhes: string) => {
    const data = getSheetData();
    const newLog: LogEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        usuario,
        acao,
        detalhes
    };
    // Mantém apenas os últimos 500 logs para não pesar
    const updatedLogs = [newLog, ...(data.logs || [])].slice(0, 500);
    data.logs = updatedLogs;
    saveSheetData(data);
};

// Nova função para atualizar tudo (usado pelo sync da nuvem)
export const setFullData = (data: DatabaseSchema) => {
    saveSheetData(data);
};

export const addAgendamento = (agendamento: Agendamento) => {
  const data = getSheetData();
  data.agendamentos.push(agendamento);
  saveSheetData(data);
};

// Remove agendamentos especificos (usado na expiracao manual ou edicao)
export const removeAgendamento = (id: string) => {
    const data = getSheetData();
    data.agendamentos = data.agendamentos.filter(a => a.id !== id);
    saveSheetData(data);
};

// Função em lote para verificar e remover expirados
export const expirePreBookings = (): Agendamento[] => {
    const data = getSheetData();
    const now = Date.now();
    const active: Agendamento[] = [];
    const expired: Agendamento[] = [];
    
    // Limite de 30 minutos em milissegundos
    const EXPIRATION_LIMIT = 30 * 60 * 1000; 

    data.agendamentos.forEach(ag => {
        if (ag.tipo === 'PRE_AGENDAMENTO') {
            // Se não tiver data de criação ou data inválida, expira imediatamente para limpar
            if (!ag.criadoEm) {
                 expired.push(ag);
                 return;
            }
            
            const created = new Date(ag.criadoEm).getTime();
            if (isNaN(created)) {
                expired.push(ag);
                return;
            }

            if ((now - created) >= EXPIRATION_LIMIT) {
                expired.push(ag);
                return; // Não adiciona na lista active
            }
        }
        active.push(ag);
    });

    // Se houve remoções, salva o novo estado
    if (expired.length > 0) {
        data.agendamentos = active;
        // Log sistema
        addLog('Sistema', 'Expiração Automática', `Removeu ${expired.length} pré-agendamentos expirados.`);
        saveSheetData(data);
    }

    return expired;
};

// Confirma um pré-agendamento transformando em padrão
export const confirmarPreAgendamento = (id: string) => {
    const data = getSheetData();
    const index = data.agendamentos.findIndex(a => a.id === id);
    if (index !== -1) {
        data.agendamentos[index].tipo = 'PADRAO';
        saveSheetData(data);
        return true;
    }
    return false;
};

export const getAvailableTechnicians = (cidade: string, dataStr: string, periodo: Periodo): TecnicoDisponivel[] => {
  const db = getSheetData();
  
  // Parse seguro da data para garantir o dia da semana correto (Local Time)
  const [year, month, day] = dataStr.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
  
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isHoliday = (db.feriados || []).includes(dataStr);

  const cityTechs = db.tecnicos.filter(t => 
    t.cidades && t.cidades.some(c => c.trim().toLowerCase() === cidade.trim().toLowerCase())
  );

  return cityTechs.map(tech => {
    let capacity = 0;
    let appointmentsCount = 0;

    // Lógica de Prioridade: Feriado > Sábado > Domingo > Dia Útil
    if (isHoliday) {
        // Capacidade TOTAL do dia
        capacity = Number(tech.capacidadeFeriado ?? 0);
        // Conta agendamentos de TODO o dia, independente do período
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else if (isSaturday) {
        // Capacidade TOTAL do dia
        capacity = Number(tech.capacidadeSabado ?? 0);
        // Conta agendamentos de TODO o dia, independente do período
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else if (isSunday) {
        // Capacidade TOTAL do dia
        capacity = Number(tech.capacidadeDomingo ?? 0);
        // Conta agendamentos de TODO o dia, independente do período
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else {
        // Dia Útil: Capacidade por Período
        if (periodo === Periodo.MANHA) capacity = Number(tech.capacidadeManha);
        else if (periodo === Periodo.TARDE) capacity = Number(tech.capacidadeTarde);
        else if (periodo === Periodo.NOITE) capacity = Number(tech.capacidadeNoite ?? 0);

        appointmentsCount = db.agendamentos.filter(a => 
            a.tecnicoId === tech.id && a.data === dataStr && a.periodo === periodo
        ).length;
    }
    
    const vagasRestantes = Math.max(0, capacity - appointmentsCount);

    return {
      ...tech,
      vagasRestantes
    };
  }).filter(tech => tech.vagasRestantes > 0);
};

export const getAvailablePeriods = (cidade: string, dataStr: string): Periodo[] => {
    if (!cidade || !dataStr) return [];
    const allPeriods = [Periodo.MANHA, Periodo.TARDE, Periodo.NOITE];
    return allPeriods.filter(p => {
        const techs = getAvailableTechnicians(cidade, dataStr, p);
        return techs.length > 0;
    });
};

export const getUniqueCities = (): string[] => {
  const db = getSheetData();
  return db.cidades || [];
};

export const getAtividades = (): string[] => {
  const db = getSheetData();
  return db.atividades || [];
};

export const getUsuarios = (): string[] => {
    const db = getSheetData();
    return db.usuarios ? db.usuarios.map(u => u.nome) : [];
}
