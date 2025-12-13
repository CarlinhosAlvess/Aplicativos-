
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
    "Instalação Nova",
    "Verificação de Interferência"
  ],
  cidades: [
    "São Paulo", "Guarulhos", "Osasco", "São Bernardo do Campo", "Santo André",
    "Rio de Janeiro", "Niterói", "Duque de Caxias", "Nova Iguaçu", "São Gonçalo",
    "Belo Horizonte", "Contagem", "Betim",
    "Curitiba", "São José dos Pinhais",
    "Campinas", "Jundiaí", "Sorocaba", "Santos"
  ],
  usuarios: [
    { 
        nome: "Administrador", 
        senha: "1234", 
        perfil: "admin",
        permissoes: { agendamento: true, dashboard: true, planilha: true }
    },
    { 
        nome: "Atendente 1", 
        senha: "123", 
        perfil: "user",
        permissoes: { agendamento: true, dashboard: true, planilha: false }
    },
    { 
        nome: "Atendente 2", 
        senha: "123", 
        perfil: "user",
        permissoes: { agendamento: true, dashboard: true, planilha: false }
    },
    { 
        nome: "Gerente", 
        senha: "123", 
        perfil: "admin",
        permissoes: { agendamento: true, dashboard: true, planilha: true }
    }
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
        data: '2024-01-01', // Data passada
        periodo: Periodo.MANHA,
        tecnicoId: '1',
        tecnicoNome: 'João Silva',
        atividade: 'Suporte',
        status: 'Confirmado',
        statusExecucao: 'Concluído',
        nomeUsuario: 'Administrador',
        tipo: 'PADRAO',
        criadoEm: new Date().toISOString(),
        observacao: 'Cliente pediu para ligar 30min antes.'
    },
    {
        id: 'mock-2',
        cliente: 'Ana Paula',
        telefone: '11988888888',
        cidade: 'Guarulhos',
        data: '2024-01-01', // Data passada
        periodo: Periodo.TARDE,
        tecnicoId: '1',
        tecnicoNome: 'João Silva',
        atividade: 'Troca de Equipamento',
        status: 'Confirmado',
        statusExecucao: 'Não Finalizado',
        motivoNaoConclusao: 'Equipamento em falta',
        nomeUsuario: 'Atendente 1',
        tipo: 'PADRAO',
        criadoEm: new Date().toISOString(),
        observacao: ''
    }
  ],
  logs: [],
  apiToken: ""
};

// Mapa auxiliar para associar cidades aos estados (Mock Data)
// Em um sistema real, isso viria do banco de dados ou de uma API de CEP/IBGE
export const CITY_STATE_MAP: Record<string, string> = {
    "São Paulo": "SP", "Guarulhos": "SP", "Osasco": "SP", "São Bernardo do Campo": "SP", "Santo André": "SP",
    "Campinas": "SP", "Jundiaí": "SP", "Sorocaba": "SP", "Santos": "SP",
    "Rio de Janeiro": "RJ", "Niterói": "RJ", "Duque de Caxias": "RJ", "Nova Iguaçu": "RJ", "São Gonçalo": "RJ",
    "Belo Horizonte": "MG", "Contagem": "MG", "Betim": "MG", "Nova Lima": "MG", "Sabará": "MG",
    "Curitiba": "PR", "São José dos Pinhais": "PR", "Pinhais": "PR", "Colombo": "PR", "Araucária": "PR"
};

export const getSheetData = (): DatabaseSchema => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) {
    try {
        const parsed = JSON.parse(data);
        
        // --- Migrações de Schema ---
        if (parsed.usuarios && parsed.usuarios.length > 0) {
            // Migração de perfil e permissões
            parsed.usuarios = parsed.usuarios.map((u: any) => {
                const updatedUser = { ...u };
                
                // Garante perfil
                if (!updatedUser.perfil) {
                    updatedUser.perfil = updatedUser.nome === 'Administrador' ? 'admin' : 'user';
                }

                // Garante permissões baseado no perfil se não existir
                if (!updatedUser.permissoes) {
                    updatedUser.permissoes = {
                        agendamento: true,
                        dashboard: true,
                        planilha: updatedUser.perfil === 'admin'
                    };
                }
                return updatedUser;
            });
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
        
        if (typeof parsed.apiToken === 'undefined') parsed.apiToken = "";

        parsed.agendamentos = parsed.agendamentos.map((ag: any) => ({
            ...ag,
            tipo: ag.tipo || 'PADRAO',
            criadoEm: ag.criadoEm || new Date().toISOString(),
            observacao: ag.observacao || '',
            // Garante que o campo dadosIncidente exista se for do tipo INCIDENTE
            dadosIncidente: ag.dadosIncidente || undefined
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
    const updatedLogs = [newLog, ...(data.logs || [])].slice(0, 500);
    data.logs = updatedLogs;
    saveSheetData(data);
};

export const setFullData = (data: DatabaseSchema) => {
    saveSheetData(data);
};

export const addAgendamento = (agendamento: Agendamento) => {
  const data = getSheetData();
  
  // Garante inicialização correta
  const sanitizedAgendamento = {
      ...agendamento,
      motivoNaoConclusao: agendamento.motivoNaoConclusao || '',
      observacao: agendamento.observacao || '',
      dadosIncidente: agendamento.dadosIncidente || undefined
  };

  data.agendamentos.push(sanitizedAgendamento);
  saveSheetData(data);
};

export const removeAgendamento = (id: string) => {
    const data = getSheetData();
    data.agendamentos = data.agendamentos.filter(a => a.id !== id);
    saveSheetData(data);
};

export const expirePreBookings = (): Agendamento[] => {
    const data = getSheetData();
    const now = Date.now();
    const active: Agendamento[] = [];
    const expired: Agendamento[] = [];
    const EXPIRATION_LIMIT = 30 * 60 * 1000; 

    data.agendamentos.forEach(ag => {
        if (ag.tipo === 'PRE_AGENDAMENTO') {
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
                return; 
            }
        }
        active.push(ag);
    });

    if (expired.length > 0) {
        data.agendamentos = active;
        addLog('Sistema', 'Expiração Automática', `Removeu ${expired.length} pré-agendamentos expirados.`);
        saveSheetData(data);
    }

    return expired;
};

export const getActivePreBookings = (): Agendamento[] => {
    expirePreBookings(); // Clean up expired ones first
    const data = getSheetData();
    return data.agendamentos.filter(a => a.tipo === 'PRE_AGENDAMENTO');
};

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

// Verifica se houve técnicos trabalhando em uma cidade em uma data específica
export const checkTechnicianPresence = (cidade: string, dataStr: string): string[] => {
    const db = getSheetData();
    // Normalização para busca
    const targetCity = cidade.toLowerCase().trim();
    
    // Filtra agendamentos confirmados/concluídos naquela cidade/data
    const matches = db.agendamentos.filter(a => 
        a.cidade.toLowerCase().trim() === targetCity && 
        a.data === dataStr &&
        a.status !== 'Encerrado' && // Ignora cancelados se houver lógica para tal
        a.tipo !== 'PRE_AGENDAMENTO'
    );

    // Retorna lista única de nomes de técnicos
    return Array.from(new Set(matches.map(a => a.tecnicoNome)));
};

export const getAvailableTechnicians = (cidade: string, dataStr: string, periodo: Periodo): TecnicoDisponivel[] => {
  const db = getSheetData();
  const [year, month, day] = dataStr.split('-').map(Number);
  // Importante: criar a data corretamente sem fuso horário para pegar o dia da semana correto
  const dateObj = new Date(year, month - 1, day);
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
        // Capacidade Total do dia (independente de periodo)
        capacity = Number(tech.capacidadeFeriado ?? 0);
        // Conta todos os agendamentos do dia para este técnico
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else if (isSaturday) {
        // Capacidade Total do Sábado (independente de periodo)
        capacity = Number(tech.capacidadeSabado ?? 0);
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else if (isSunday) {
        // Capacidade Total do Domingo (independente de periodo)
        capacity = Number(tech.capacidadeDomingo ?? 0);
        appointmentsCount = db.agendamentos.filter(a => a.tecnicoId === tech.id && a.data === dataStr).length;
    } else {
        // Dia de semana comum: Capacidade por Período
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
    const today = new Date();
    const [year, month, day] = dataStr.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day);
    
    const isToday = selectedDate.getDate() === today.getDate() &&
                    selectedDate.getMonth() === today.getMonth() &&
                    selectedDate.getFullYear() === today.getFullYear();
    
    if (isToday) {
        const currentHour = today.getHours();
        if (currentHour >= 16) {
            return []; 
        }
    }

    const allPeriods = [Periodo.MANHA, Periodo.TARDE, Periodo.NOITE];
    return allPeriods.filter(p => {
        if (isToday) {
            const currentHour = today.getHours();
            if (p === Periodo.MANHA && currentHour >= 12) return false;
        }
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

// --- SERVIÇO DE CLIMA ---
export interface WeatherForecast {
    city: string;
    temperature: number;
    condition: 'Ensolarado' | 'Parcialmente Nublado' | 'Chuvoso' | 'Tempestade';
    humidity: number;
    windSpeed: number;
    operationalImpact: 'Baixo' | 'Médio' | 'Alto';
}

// Busca clima real via Open-Meteo
export const fetchRealTimeWeather = async (city: string, state?: string): Promise<WeatherForecast | null> => {
    try {
        // 1. Busca coordenadas (Geocoding)
        // Se tiver estado, adiciona na query para ser mais preciso
        const queryCity = state ? `${city}, ${state}` : city;
        const geoResponse = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryCity)}&count=1&language=pt&format=json`);
        const geoData = await geoResponse.json();

        if (!geoData.results || geoData.results.length === 0) return null;
        
        const { latitude, longitude, name } = geoData.results[0];

        // 2. Busca Clima Atual
        const weatherResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=America%2FSao_Paulo`);
        const weatherData = await weatherResponse.json();

        const current = weatherData.current;
        const code = current.weather_code;

        let condition: WeatherForecast['condition'] = 'Ensolarado';
        
        // Mapeamento WMO Codes para nossas categorias
        if (code === 0) condition = 'Ensolarado';
        else if (code >= 1 && code <= 3) condition = 'Parcialmente Nublado';
        else if (code >= 45 && code <= 48) condition = 'Parcialmente Nublado'; // Nevoeiro
        else if (code >= 51 && code <= 67) condition = 'Chuvoso'; // Garoa/Chuva
        else if (code >= 80 && code <= 82) condition = 'Chuvoso'; // Pancadas
        else if (code >= 95) condition = 'Tempestade'; // Tempestade
        else if (code >= 71 && code <= 77) condition = 'Chuvoso'; // Neve (Simplificado para o contexto)

        // Lógica de Impacto
        let operationalImpact: WeatherForecast['operationalImpact'] = 'Baixo';
        if (condition === 'Tempestade') operationalImpact = 'Alto';
        if (condition === 'Chuvoso' || current.wind_speed_10m > 25) operationalImpact = 'Médio';

        return {
            city: name, // Usa o nome oficial retornado
            temperature: Math.round(current.temperature_2m),
            condition,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            operationalImpact
        };

    } catch (error) {
        console.error("Erro ao buscar clima real:", error);
        return null;
    }
};

// Mock Fallback (Mantido para offline ou erro)
export const getWeatherForecast = (city: string, date: Date): WeatherForecast => {
    const dateStr = date.toISOString().split('T')[0];
    const seedStr = city + dateStr;
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    const normalizedHash = Math.abs(hash);

    const conditionIndex = normalizedHash % 100;
    let condition: WeatherForecast['condition'] = 'Ensolarado';
    if (conditionIndex > 90) condition = 'Tempestade';
    else if (conditionIndex > 70) condition = 'Chuvoso';
    else if (conditionIndex > 40) condition = 'Parcialmente Nublado';

    const month = date.getMonth(); 
    let baseTemp = 25;
    if (month < 3 || month > 9) baseTemp = 28; 
    else baseTemp = 18; 

    const tempVariation = (normalizedHash % 10) - 5;
    const temperature = baseTemp + tempVariation;

    const humidity = 40 + (normalizedHash % 50); 
    const windSpeed = 5 + (normalizedHash % 25); 

    let operationalImpact: WeatherForecast['operationalImpact'] = 'Baixo';
    if (condition === 'Tempestade') operationalImpact = 'Alto';
    if (condition === 'Chuvoso' || windSpeed > 20) operationalImpact = 'Médio';

    return {
        city,
        temperature,
        condition,
        humidity,
        windSpeed,
        operationalImpact
    };
};
