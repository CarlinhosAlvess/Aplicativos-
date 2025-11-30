import React, { useEffect, useState } from 'react';
import { getSheetData, getUniqueCities } from '../services/mockSheetService';
import { DatabaseSchema, StatusExecucao } from '../types';
import { ChartIcon, AlertIcon, SparklesIcon } from './Icons';

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

interface Opportunity {
    area: string;
    problema: string;
    acao: string;
    prioridade: 'Alta' | 'Média' | 'Baixa';
    impacto: string;
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
    data.tecnicos.forEach(tech => {
        if (tech.cidades && Array.isArray(tech.cidades)) {
            tech.cidades.forEach(c => {
                if (cidadesStats[c]) {
                    cidadesStats[c].tecnicos += 1;
                    cidadesStats[c].capacidadeDiaria += (Number(tech.capacidadeManha) + Number(tech.capacidadeTarde) + (Number(tech.capacidadeNoite) || 0));
                }
            });
        }
    });

    // Calcula uso real (Agendamentos)
    filteredAgendamentos.forEach(ag => {
        if (cidadesStats[ag.cidade]) {
            cidadesStats[ag.cidade].agendamentos += 1;
        } else if (!cidadesStats[ag.cidade]) {
            cidadesStats[ag.cidade] = {
                nome: ag.cidade,
                tecnicos: 0,
                agendamentos: 1,
                capacidadeDiaria: 0
            };
        }
    });
    
    const listaCidades = (Object.values(cidadesStats) as CityStats[]).sort((a: CityStats, b: CityStats) => {
        const satA = Number(a.agendamentos) / (Number(a.capacidadeDiaria) || 1);
        const satB = Number(b.agendamentos) / (Number(b.capacidadeDiaria) || 1);
        return satB - satA;
    });

    // --- ANÁLISE DE MOTIVOS (Pareto) & NORMALIZAÇÃO ---
    // Corrige problema de duplicação (ex: "ausente" vs "Ausente")
    const incidentesDetalhados = filteredAgendamentos.filter(a => a.statusExecucao === 'Não Finalizado');

    const motivosStats = incidentesDetalhados.reduce<Record<string, number>>((acc, curr) => {
        const raw = curr.motivoNaoConclusao || 'Outros';
        // Normaliza: remove espaços nas pontas e coloca tudo minúsculo para agrupar
        const normalizedKey = raw.trim().toLowerCase();
        acc[normalizedKey] = (acc[normalizedKey] || 0) + 1;
        return acc;
    }, {});
    
    // Converte de volta para array e capitaliza para exibição
    const chartMotivos = Object.entries(motivosStats)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .map(([key, qtd]) => ({ 
            motivo: key.charAt(0).toUpperCase() + key.slice(1), // Capitaliza primeira letra
            qtd: Number(qtd)
        }));

    // --- GERADOR DE INSIGHTS AUTOMÁTICOS ---
    const insights = [];
    
    // Alerta de Capacidade
    const cidadeSaturada = listaCidades.find(c => (c.agendamentos / (c.capacidadeDiaria || 1)) > 0.8);
    if (cidadeSaturada) {
        insights.push({
            type: 'danger' as const,
            title: `GAP Crítico em ${cidadeSaturada.nome}`,
            message: `A cidade está operando perto da capacidade máxima (${cidadeSaturada.agendamentos}/${cidadeSaturada.capacidadeDiaria}).`
        });
    } else {
        insights.push({
            type: 'success' as const,
            title: 'Capacidade Operacional',
            message: 'Todas as regiões estão operando dentro dos limites de capacidade técnica.'
        });
    }

    // --- LÓGICA DE GAPS DE MELHORIAS (Diagnóstico & Plano de Ação) ---
    // Agora usa os dados agrupados (chartMotivos) para ser mais preciso
    const oportunidadesMelhoria: Opportunity[] = [];

    // Função auxiliar para somar falhas por palavras-chave
    const countFailuresByKeyword = (keywords: string[]) => {
        return chartMotivos
            .filter(m => keywords.some(k => m.motivo.toLowerCase().includes(k)))
            .reduce((sum: number, m) => sum + m.qtd, 0);
    };

    // 1. Melhoria de Logística
    const qtdLogistica = countFailuresByKeyword(['equipamento', 'material', 'peça', 'estoque', 'ferramenta']);
    if (qtdLogistica > 0) {
        oportunidadesMelhoria.push({
            area: 'Logística / Estoque',
            problema: `${qtdLogistica} visitas perdidas por falta de material/equipamento.`,
            acao: 'Revisar kit básico dos veículos e alinhar estoque com a demanda prevista.',
            prioridade: 'Alta',
            impacto: 'Redução imediata de reagendamentos e custos de deslocamento.'
        });
    }

    // 2. Melhoria de Acesso/Cliente
    const qtdAcesso = countFailuresByKeyword(['ausente', 'fechado', 'não atende', 'endereço', 'local']);
    if (qtdAcesso > 0) {
        oportunidadesMelhoria.push({
            area: 'Comunicação / CX',
            problema: `${qtdAcesso} visitas perdidas por problemas de acesso/cliente.`,
            acao: 'Implementar confirmação via WhatsApp 1h antes da visita.',
            prioridade: 'Média',
            impacto: 'Otimização do deslocamento técnico e aumento de produtividade.'
        });
    }

    // 3. Melhoria de Capacidade
    const cidadesCriticas = listaCidades.filter(c => (c.agendamentos / (c.capacidadeDiaria || 1)) > 0.9);
    if (cidadesCriticas.length > 0) {
        oportunidadesMelhoria.push({
            area: 'Gestão de Força de Trabalho',
            problema: `Saturação crítica (>90%) em: ${cidadesCriticas.map(c => c.nome).join(', ')}.`,
            acao: 'Iniciar processo seletivo urgente ou remanejar técnicos de regiões vizinhas.',
            prioridade: 'Alta',
            impacto: 'Evitar perda de SLA e recusa de agendamentos.'
        });
    }

    // 4. Melhoria Técnica Geral
    if (taxaSucesso < 85 && totalAgendamentos > 5) {
        oportunidadesMelhoria.push({
            area: 'Treinamento Técnico',
            problema: `Taxa de sucesso global (${taxaSucesso}%) abaixo da meta de 85%.`,
            acao: 'Realizar reciclagem técnica focada nos principais motivos de falha.',
            prioridade: 'Média',
            impacto: 'Melhoria na qualidade percebida e redução de retorno.'
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

            {/* Seção de Insights Automáticos (Simples) */}
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

            {/* SEÇÃO NOVA: PLANO DE MELHORIAS (GAPS DE MELHORIA) */}
            <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
                <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5" />
                        Diagnóstico e Gaps de Melhoria
                    </h3>
                    <p className="text-xs text-indigo-700">Plano de ação estratégico gerado automaticamente baseado nos dados acumulados.</p>
                </div>
                
                {oportunidadesMelhoria.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 flex flex-col items-center">
                        <span className="text-2xl mb-2">🏆</span>
                        <p>Nenhum gap crítico identificado no momento. A operação está eficiente!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50">
                        {oportunidadesMelhoria.map((item, idx) => (
                            <div key={idx} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 bg-gray-100 px-2 py-1 rounded">{item.area}</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-full border ${
                                        item.prioridade === 'Alta' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                                    }`}>
                                        Prioridade {item.prioridade}
                                    </span>
                                </div>
                                <h4 className="font-bold text-gray-800 mb-2 text-lg">{item.acao}</h4>
                                <div className="space-y-2">
                                    <p className="text-sm text-red-600 bg-red-50 p-2 rounded flex items-start gap-2">
                                        <AlertIcon className="w-4 h-4 mt-0.5 shrink-0" />
                                        <span><strong>Problema Detectado:</strong> {item.problema}</span>
                                    </p>
                                    <p className="text-sm text-green-700 bg-green-50 p-2 rounded">
                                        <strong>Impacto Esperado:</strong> {item.impacto}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

             {/* TABELA DE DETALHAMENTO DE FALHAS */}
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
                        Nenhuma incidência registrada para o filtro selecionado.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-red-700 uppercase bg-red-50/50">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Cliente</th>
                                    <th className="px-6 py-3">Técnico</th>
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
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Saturação de Capacidade (Por Cidade)</h3>
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
                    <h3 className="text-lg font-bold text-gray-800 mb-6">Principais Motivos de Falha</h3>
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