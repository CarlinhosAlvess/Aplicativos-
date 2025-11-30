
import React, { useEffect, useState } from 'react';
import { getSheetData, getUniqueCities } from '../services/mockSheetService';
import { DatabaseSchema, StatusExecucao } from '../types';
import { ChartIcon, TableIcon, AlertIcon } from './Icons';

// --- Componentes Visuais Auxiliares (Gráficos CSS/SVG) ---

const ProgressBar = ({ value, color = "bg-blue-600", label, showValue = true }: { value: number, color?: string, label?: string, showValue?: boolean }) => (
  <div className="w-full">
    <div className="flex justify-between mb-1">
      {label && <span className="text-xs font-medium text-gray-700">{label}</span>}
      {showValue && <span className="text-xs font-medium text-gray-700">{Math.round(value)}%</span>}
    </div>
    <div className="w-full bg-gray-200 rounded-full h-2.5">
      <div className={`${color} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
  </div>
);

const DonutChart = ({ data }: { data: { label: string, value: number, color: string }[] }) => {
  const total = data.reduce((acc, curr) => acc + curr.value, 0);
  let accumulated = 0;

  if (total === 0) return <div className="text-center text-gray-400 text-sm py-10 flex flex-col items-center justify-center h-40"><span>Sem dados</span></div>;

  return (
    <div className="relative w-40 h-40 mx-auto">
      <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
        {data.map((item, index) => {
          const percent = (item.value / total) * 100;
          const strokeDasharray = `${percent} 100`;
          const strokeDashoffset = -accumulated;
          accumulated += percent;

          return (
            <circle
              key={index}
              cx="50"
              cy="50"
              r="40"
              fill="transparent"
              stroke={item.color}
              strokeWidth="20"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 hover:opacity-80"
            >
              <title>{item.label}: {item.value} ({Math.round(percent)}%)</title>
            </circle>
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center flex-col pointer-events-none">
        <span className="text-2xl font-bold text-gray-800">{total}</span>
        <span className="text-xs text-gray-500">Total</span>
      </div>
    </div>
  );
};

// Componente de Insight/Alerta
const InsightCard = ({ type, title, message }: { type: 'danger' | 'warning' | 'success' | 'info', title: string, message: string }) => {
    const colors = {
        danger: 'bg-red-50 border-red-200 text-red-800',
        warning: 'bg-amber-50 border-amber-200 text-amber-800',
        success: 'bg-green-50 border-green-200 text-green-800',
        info: 'bg-blue-50 border-blue-200 text-blue-800'
    };
    const icons = {
        danger: '⚠️',
        warning: '⚡',
        success: '✅',
        info: 'ℹ️'
    };

    return (
        <div className={`p-4 rounded-lg border ${colors[type]} flex items-start gap-3 shadow-sm`}>
            <span className="text-xl">{icons[type]}</span>
            <div>
                <h4 className="font-bold text-sm">{title}</h4>
                <p className="text-xs mt-1 opacity-90">{message}</p>
            </div>
        </div>
    );
}

// Interface definada localmente para facilitar tipagem no reduce
interface CityStats {
    nome: string;
    tecnicos: number;
    agendamentos: number;
    capacidadeDiaria: number;
}

const Dashboard = () => {
    const [data, setData] = useState<DatabaseSchema | null>(null);
    const [filterMode, setFilterMode] = useState<'todos' | 'data'>('todos');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [uniqueCities, setUniqueCities] = useState<string[]>([]);

    useEffect(() => {
        const interval = setInterval(() => setData(getSheetData()), 2000);
        setData(getSheetData());
        setUniqueCities(getUniqueCities());
        
        // Default date to today
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);

        return () => clearInterval(interval);
    }, []);

    if (!data) return <div className="p-10 text-center text-gray-500 flex flex-col items-center gap-2"><div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>Carregando inteligência de dados...</div>;

    // --- Processamento de Dados ---

    const filteredAgendamentos = data.agendamentos.filter(ag => {
        if (filterMode === 'data' && selectedDate) {
            return ag.data === selectedDate;
        }
        return true; 
    });

    const totalAgendamentos = filteredAgendamentos.length;
    
    // Status
    const countStatus = (status: StatusExecucao) => filteredAgendamentos.filter(a => a.statusExecucao === status).length;
    const concluidos = countStatus('Concluído');
    const naoFinalizados = countStatus('Não Finalizado');
    const emAndamento = countStatus('Em Andamento');
    const pendentes = countStatus('Pendente');
    
    // Taxa de Sucesso (KPI de Qualidade)
    const totalFechados = concluidos + naoFinalizados;
    const taxaSucesso = totalFechados > 0 ? Math.round((concluidos / totalFechados) * 100) : 0;

    // --- ANÁLISE DE GAPS (Cidade/Capacidade) ---
    // Recalculado para suportar múltiplas cidades por técnico
    const cidadesStats: Record<string, CityStats> = {};
    
    // Inicializa todas as cidades
    uniqueCities.forEach(cidade => {
        cidadesStats[cidade] = {
            nome: cidade,
            tecnicos: 0,
            agendamentos: 0,
            capacidadeDiaria: 0
        }
    });

    // Calcula capacidade técnica por cidade
    // Se um técnico atende SP e Rio, sua capacidade conta para ambos (no sentido de oferta potencial)
    data.tecnicos.forEach(tech => {
        if (tech.cidades && Array.isArray(tech.cidades)) {
            tech.cidades.forEach(c => {
                if (cidadesStats[c]) {
                    cidadesStats[c].tecnicos += 1;
                    cidadesStats[c].capacidadeDiaria += (tech.capacidadeManha + tech.capacidadeTarde + (tech.capacidadeNoite || 0));
                }
            });
        }
    });

    // Calcula uso real (Agendamentos)
    filteredAgendamentos.forEach(ag => {
        if (cidadesStats[ag.cidade]) {
            cidadesStats[ag.cidade].agendamentos += 1;
        } else if (!cidadesStats[ag.cidade]) {
            // Caso tenha agendamento em cidade antiga ou removida, cria entrada
            cidadesStats[ag.cidade] = {
                nome: ag.cidade,
                tecnicos: 0,
                agendamentos: 1,
                capacidadeDiaria: 0
            };
        }
    });
    
    const listaCidades = (Object.values(cidadesStats) as CityStats[]).sort((a, b) => {
        const satA = a.agendamentos / (a.capacidadeDiaria || 1);
        const satB = b.agendamentos / (b.capacidadeDiaria || 1);
        return satB - satA;
    });

    // --- ANÁLISE DE MELHORIAS (Motivos de Falha) ---
    const incidentesDetalhados = filteredAgendamentos.filter(a => a.statusExecucao === 'Não Finalizado');

    const motivosStats = incidentesDetalhados
        .reduce((acc, curr) => {
            const motivo = curr.motivoNaoConclusao || 'Outros';
            acc[motivo] = (acc[motivo] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    
    // Explicitly casting Object.entries result to handle potential inference issues
    const chartMotivos = (Object.entries(motivosStats) as [string, number][])
        .sort((a, b) => b[1] - a[1])
        .map(([motivo, qtd]) => ({ motivo, qtd }));

    // --- ANÁLISE DE ATIVIDADES ---
    const atividadesStats = filteredAgendamentos.reduce((acc, curr) => {
        const ativ = curr.atividade || 'Não especificado';
        acc[ativ] = (acc[ativ] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const chartAtividades = Object.entries(atividadesStats).map(([label, value], idx) => ({
        label,
        value,
        color: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5]
    }));

    // --- GERADOR DE INSIGHTS (IA Rules Based) ---
    const insights = [];
    
    // Alerta de Capacidade
    const cidadeSaturada = listaCidades.find(c => (c.agendamentos / c.capacidadeDiaria) > 0.8);
    if (cidadeSaturada) {
        insights.push({
            type: 'danger' as const,
            title: `GAP Crítico em ${cidadeSaturada.nome}`,
            message: `A cidade está operando perto da capacidade máxima (${cidadeSaturada.agendamentos}/${cidadeSaturada.capacidadeDiaria}). Considere alocar mais técnicos.`
        });
    } else {
        insights.push({
            type: 'success' as const,
            title: 'Capacidade Operacional',
            message: 'Todas as regiões estão operando dentro dos limites de capacidade técnica.'
        });
    }

    // Alerta de Qualidade
    if (taxaSucesso < 80 && totalFechados > 0) {
        const principalMotivo = chartMotivos[0]?.motivo || 'diversos';
        insights.push({
            type: 'warning' as const,
            title: 'Alerta de Qualidade',
            message: `Taxa de sucesso abaixo da meta (80%). Principal ofensor: "${principalMotivo}". Ação sugerida: Reciclagem técnica.`
        });
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header com Filtros */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ChartIcon className="text-indigo-600" /> 
                        Centro de Comando
                    </h2>
                    <p className="text-gray-500 text-sm">Monitoramento e Análise de Falhas</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <span className="text-xs font-bold text-gray-500 uppercase">Filtrar por Data:</span>
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                            setSelectedDate(e.target.value);
                            setFilterMode('data');
                        }}
                        className={`px-3 py-1.5 rounded-md text-sm border focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${filterMode === 'data' ? 'border-indigo-500 bg-white text-indigo-700 shadow-sm' : 'border-gray-300 text-gray-600'}`}
                    />
                    <button 
                         onClick={() => setFilterMode('todos')}
                         className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${filterMode === 'todos' ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-100'}`}
                    >
                        Ver Tudo
                    </button>
                </div>
            </div>

            {/* Seção de Insights Automáticos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, idx) => (
                    <InsightCard key={idx} {...insight} />
                ))}
            </div>

            {/* KPI Cards Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-indigo-500">
                    <span className="text-gray-400 text-xs font-bold uppercase">Volume Total</span>
                    <div className="mt-2 text-3xl font-bold text-gray-800">{totalAgendamentos}</div>
                    <div className="text-xs text-gray-500 mt-1">Visitas no período</div>
                </div>
                
                <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-green-500">
                    <span className="text-gray-400 text-xs font-bold uppercase">Taxa de Sucesso</span>
                    <div className="mt-2 text-3xl font-bold text-gray-800">{taxaSucesso}%</div>
                    <div className="text-xs text-green-600 mt-1">Conclusão Efetiva</div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-yellow-500">
                    <span className="text-gray-400 text-xs font-bold uppercase">Em Andamento</span>
                    <div className="mt-2 text-3xl font-bold text-gray-800">{pendentes + emAndamento}</div>
                    <div className="text-xs text-yellow-600 mt-1">Visitas ativas</div>
                </div>

                <div className="bg-white p-5 rounded-xl shadow-sm border-t-4 border-red-500">
                    <span className="text-gray-400 text-xs font-bold uppercase">Incidências (Falhas)</span>
                    <div className="mt-2 text-3xl font-bold text-gray-800">{naoFinalizados}</div>
                    <div className="text-xs text-red-600 mt-1">Visitas não finalizadas</div>
                </div>
            </div>

             {/* TABELA DE DETALHAMENTO DE FALHAS (NOVO) */}
             <div className="bg-white rounded-xl shadow-sm border border-red-100 overflow-hidden">
                <div className="bg-red-50 px-6 py-4 border-b border-red-100 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                            <AlertIcon className="w-5 h-5" />
                            Relatório de Incidências
                        </h3>
                        <p className="text-xs text-red-600">Detalhamento dos serviços não finalizados por cliente</p>
                    </div>
                    <div className="text-red-800 font-bold bg-white px-3 py-1 rounded-full text-sm border border-red-100 shadow-sm">
                        {incidentesDetalhados.length} Casos
                    </div>
                </div>
                
                {incidentesDetalhados.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 italic">
                        Nenhuma incidência registrada para o filtro selecionado. Ótimo trabalho! 👏
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-red-700 uppercase bg-red-50/50">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Técnico Responsável</th>
                                    <th className="px-6 py-3">Atividade</th>
                                    <th className="px-6 py-3">Motivo da Não Conclusão</th>
                                </tr>
                            </thead>
                            <tbody>
                                {incidentesDetalhados.map((item) => (
                                    <tr key={item.id} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                                            {item.data}
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            {item.cliente}
                                            <div className="text-xs font-normal text-gray-500">{item.cidade}</div>
                                        </td>
                                        <td className="px-6 py-4 text-blue-600">
                                            {item.tecnicoNome}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {item.atividade}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="bg-red-100 text-red-800 text-xs font-bold px-2.5 py-0.5 rounded border border-red-200">
                                                {item.motivoNaoConclusao || 'Motivo não informado'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* GAP ANALYSIS & GRAPHS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Capacidade vs Demanda (GAPS) */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Análise de Gaps (Capacidade)</h3>
                    <div className="space-y-6">
                        {listaCidades.map((cid, idx) => {
                            const percentualSaturacao = Math.min((cid.agendamentos / (cid.capacidadeDiaria || 1)) * 100, 100);
                            const corBarra = percentualSaturacao > 80 ? 'bg-red-500' : percentualSaturacao > 50 ? 'bg-blue-500' : 'bg-green-500';
                            
                            return (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="font-bold text-gray-700 w-1/4">{cid.nome}</span>
                                        <div className="flex-1 px-4 flex justify-between text-xs text-gray-500">
                                            <span>Cap: {cid.capacidadeDiaria}</span>
                                            <span>Uso: {cid.agendamentos}</span>
                                        </div>
                                    </div>
                                    <div className="relative w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${corBarra}`} 
                                            style={{ width: `${percentualSaturacao}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pareto de Falhas */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Gráfico de Motivos (Pareto)</h3>
                    {chartMotivos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-40 bg-gray-50 rounded-lg">
                            <span className="text-gray-400">Sem falhas registradas</span>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {chartMotivos.map((m, idx) => (
                                <div key={idx} className="group">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm font-bold text-gray-700">{m.motivo}</span>
                                        <span className="text-sm font-bold text-red-500">{m.qtd}</span>
                                    </div>
                                    <ProgressBar value={(m.qtd / (naoFinalizados || 1)) * 100} color="bg-red-400" showValue={false} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default Dashboard;
