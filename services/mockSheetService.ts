
import { Agendamento, DatabaseSchema, Periodo, Tecnico, TecnicoDisponivel, Usuario } from '../types';

const STORAGE_KEY = 'app_agendamento_sheet_data_v8'; // Version bumped to apply new password

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
    { nome: "Administrador", senha: "1234" },
    { nome: "Atendente 1", senha: "123" },
    { nome: "Atendente 2", senha: "123" },
    { nome: "Gerente", senha: "123" }
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
        nomeUsuario: 'Administrador'
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
        nomeUsuario: 'Atendente 1'
    }
  ]
};

export const getSheetData = (): DatabaseSchema => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
        const parsed = JSON.parse(data);
        
        // --- Migrações de Schema ---

        // Migração de Usuários (String -> Object)
        if (parsed.usuarios && parsed.usuarios.length > 0 && typeof parsed.usuarios[0] === 'string') {
            parsed.usuarios = parsed.usuarios.map((u: string) => ({ nome: u, senha: '123' }));
        }

        // Garante campos de sábado/domingo/feriado
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

        // Garante lista de feriados
        if (!parsed.feriados) {
            parsed.feriados = INITIAL_DATA.feriados;
        }

        if (!parsed.cidades) {
            parsed.cidades = INITIAL_DATA.cidades;
        }
        
        if (!parsed.usuarios) {
            parsed.usuarios = INITIAL_DATA.usuarios;
        }

        return parsed;
    } catch (e) {
        return INITIAL_DATA;
    }
  }
  return INITIAL_DATA;
};

export const saveSheetData = (data: DatabaseSchema) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const addAgendamento = (agendamento: Agendamento) => {
  const data = getSheetData();
  data.agendamentos.push(agendamento);
  saveSheetData(data);
};

export const getAvailableTechnicians = (cidade: string, dataStr: string, periodo: Periodo): TecnicoDisponivel[] => {
  const db = getSheetData();
  
  const dateObj = new Date(dataStr + 'T12:00:00');
  const dayOfWeek = dateObj.getDay();
  const isSaturday = dayOfWeek === 6;
  const isSunday = dayOfWeek === 0;
  const isHoliday = (db.feriados || []).includes(dataStr);

  const cityTechs = db.tecnicos.filter(t => 
    t.cidades && t.cidades.some(c => c.trim().toLowerCase() === cidade.trim().toLowerCase())
  );

  return cityTechs.map(tech => {
    let capacity = 0;
    let appointmentsCount = 0;

    if (isHoliday) {
        capacity = tech.capacidadeFeriado || 0;
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else if (isSaturday) {
        capacity = tech.capacidadeSabado || 0;
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else if (isSunday) {
        capacity = tech.capacidadeDomingo || 0;
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else {
        if (periodo === Periodo.MANHA) capacity = tech.capacidadeManha;
        else if (periodo === Periodo.TARDE) capacity = tech.capacidadeTarde;
        else if (periodo === Periodo.NOITE) capacity = tech.capacidadeNoite || 0;

        appointmentsCount = db.agendamentos.filter(a => 
            a.tecnicoId === tech.id && a.data === dataStr && a.periodo === periodo
        ).length;
    }
    
    const vagasRestantes = capacity - appointmentsCount;

    return {
      ...tech,
      vagasRestantes
    };
  }).filter(tech => tech.vagasRestantes > 0);
};

// Verifica quais períodos têm pelo menos um técnico disponível
export const getAvailablePeriods = (cidade: string, dataStr: string): Periodo[] => {
    if (!cidade || !dataStr) return [];
    
    // Lista fixa de todos os períodos possíveis
    const allPeriods = [Periodo.MANHA, Periodo.TARDE, Periodo.NOITE];
    
    // Filtra apenas os períodos onde getAvailableTechnicians retorna > 0
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

// Retorna apenas nomes para o Dropdown/Validação, abstraindo a senha
export const getUsuarios = (): string[] => {
    const db = getSheetData();
    return db.usuarios ? db.usuarios.map(u => u.nome) : [];
}