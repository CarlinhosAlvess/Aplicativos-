import React, { useEffect, useState } from 'react';
import { getSheetData, getUniqueCities } from '../services/mockSheetService';
import { DatabaseSchema, StatusExecucao } from '../types';
import { ChartIcon, AlertIcon, SparklesIcon } from './Icons';

const ProgressBar = ({ value, color = "bg-indigo-600", label, showValue = true }: { value: number, color?: string, label?: string, showValue?: boolean }) => (
  <div className="w-full">
    <div className="flex justify-between mb-1.5">
      {label && <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</span>}
      {showValue && <span className="text-xs font-bold text-slate-700">{Math.round(value)}%</span>}
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
  </div>
);

const InsightCard = ({ type, title, message }: { type: 'danger' | 'warning' | 'success' | 'info', title: string, message: string }) => {
    const styles = {
        danger: 'bg-red-50 border-red-100 text-red-900',
        warning: 'bg-amber-50 border-amber-100 text-amber-900',
        success: 'bg-emerald-50 border-emerald-100 text-emerald-900',
        info: 'bg-indigo-50 border-indigo-100 text-indigo-900'
    };
    const icons = {
        danger: '🚨',
        warning: '⚡',
        success: '✨',
        info: '💡'
    };

    return (
        <div className={`p-5 rounded-2xl border ${styles[type]} flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow`}>
            <span className="text-xl bg-white w-10 h-10 flex items-center justify-center rounded-full shadow-sm shrink-0">{icons[type]}</span>
            <div>
                <h4 className="font-bold text-sm tracking-wide mb-1">{title}</h4>
                <p className="text-xs opacity-90 leading-relaxed font-medium">{message}</p>
            </div>
        </div>
    );
}

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
        
        const today = new Date().toISOString().split('T')[0];
        setSelectedDate(today);

        return () => clearInterval(interval);
    }, []);

    if (!data) return <div className="p-20 text-center text-slate-400 flex flex-col items-center gap-4"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 rounded-full border-t-transparent"></div><span className="text-sm font-medium">Carregando inteligência...</span></div>;

    // --- Processamento (igual ao anterior) ---
    const filteredAgendamentos = data.agendamentos.filter(ag => {
        if (filterMode === 'data' && selectedDate) {
            return ag.data === selectedDate;
        }
        return true; 
    });

    const totalAgendamentos = filteredAgendamentos.length;
    const countStatus = (status: StatusExecucao) => filteredAgendamentos.filter(a => a.statusExecucao === status).length;
    const concluidos = countStatus('Concluído');
    const naoFinalizados = countStatus('Não Finalizado');
    const emAndamento = countStatus('Em Andamento');
    const pendentes = countStatus('Pendente');
    const totalFechados = concluidos + naoFinalizados;
    const taxaSucesso = totalFechados > 0 ? Math.round((concluidos / totalFechados) * 100) : 0;

    const cidadesStats: Record<string, CityStats> = {};
    uniqueCities.forEach(cidade => {
        cidadesStats[cidade] = { nome: cidade, tecnicos: 0, agendamentos: 0, capacidadeDiaria: 0 }
    });

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

    filteredAgendamentos.forEach(ag => {
        if (cidadesStats[ag.cidade]) {
            cidadesStats[ag.cidade].agendamentos += 1;
        } else if (!cidadesStats[ag.cidade]) {
            cidadesStats[ag.cidade] = { nome: ag.cidade, tecnicos: 0, agendamentos: 1, capacidadeDiaria: 0 };
        }
    });
    
    const listaCidades = (Object.values(cidadesStats) as CityStats[]).sort((a: CityStats, b: CityStats) => {
        const satA = Number(a.agendamentos) / (Number(a.capacidadeDiaria) || 1);
        const satB = Number(b.agendamentos) / (Number(b.capacidadeDiaria) || 1);
        return satB - satA;
    });

    const incidentesDetalhados = filteredAgendamentos.filter(a => a.statusExecucao === 'Não Finalizado');

    const motivosStats = incidentesDetalhados.reduce<Record<string, number>>((acc, curr) => {
        const raw = curr.motivoNaoConclusao || 'Outros';
        const normalizedKey = raw.trim().toLowerCase();
        acc[normalizedKey] = (acc[normalizedKey] || 0) + 1;
        return acc;
    }, {});
    
    const chartMotivos = Object.entries(motivosStats)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .map(([key, qtd]) => ({ 
            motivo: key.charAt(0).toUpperCase() + key.slice(1), 
            qtd: Number(qtd)
        }));

    const insights = [];
    const cidadeSaturada = listaCidades.find(c => (c.agendamentos / (c.capacidadeDiaria || 1)) > 0.8);
    if (cidadeSaturada) {
        insights.push({ type: 'danger' as const, title: `Atenção: ${cidadeSaturada.nome}`, message: `Operando próximo da saturação máxima (${cidadeSaturada.agendamentos}/${cidadeSaturada.capacidadeDiaria}).` });
    } else {
        insights.push({ type: 'success' as const, title: 'Operação Saudável', message: 'Regiões dentro da capacidade ideal.' });
    }

    const oportunidadesMelhoria: Opportunity[] = [];
    const countFailuresByKeyword = (keywords: string[]) => {
        return chartMotivos.filter(m => keywords.some(k => m.motivo.toLowerCase().includes(k))).reduce((sum: number, m) => sum + m.qtd, 0);
    };

    const qtdLogistica = countFailuresByKeyword(['equipamento', 'material', 'peça', 'estoque', 'ferramenta']);
    if (qtdLogistica > 0) oportunidadesMelhoria.push({ area: 'Logística', problema: `${qtdLogistica} visitas sem material.`, acao: 'Revisar kit veicular e estoque.', prioridade: 'Alta', impacto: 'Redução de retorno.' });

    const qtdAcesso = countFailuresByKeyword(['ausente', 'fechado', 'não atende', 'endereço', 'local']);
    if (qtdAcesso > 0) oportunidadesMelhoria.push({ area: 'Comunicação', problema: `${qtdAcesso} clientes ausentes.`, acao: 'WhatsApp pré-visita.', prioridade: 'Média', impacto: 'Otimização de rotas.' });

    const cidadesCriticas = listaCidades.filter(c => (c.agendamentos / (c.capacidadeDiaria || 1)) > 0.9);
    if (cidadesCriticas.length > 0) oportunidadesMelhoria.push({ area: 'Capacidade', problema: `Alta saturação em ${cidadesCriticas.length} regiões.`, acao: 'Remanejar ou contratar técnicos.', prioridade: 'Alta', impacto: 'SLA garantido.' });

    if (taxaSucesso < 85 && totalAgendamentos > 5) oportunidadesMelhoria.push({ area: 'Qualidade', problema: `Taxa de sucesso ${taxaSucesso}% (Meta 85%).`, acao: 'Reciclagem técnica.', prioridade: 'Média', impacto: 'Qualidade percebida.' });

    // --- RENDER ---
    return (
        <div className="space-y-8 pb-12 font-sans">
            {/* Header com Filtros Modernos */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                        <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600"><ChartIcon className="w-6 h-6" /></div>
                        Centro de Comando
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 ml-12">Análise de performance em tempo real</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <input 
                        type="date"
                        value={selectedDate}
                        onChange={(e) => { setSelectedDate(e.target.value); setFilterMode('data'); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border-0 focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${filterMode === 'data' ? 'bg-white text-indigo-700 shadow-sm' : 'bg-transparent text-slate-500'}`}
                    />
                    <button 
                         onClick={() => setFilterMode('todos')}
                         className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${filterMode === 'todos' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200/50'}`}
                    >
                        Visão Global
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {insights.map((insight, idx) => (
                    <InsightCard key={idx} {...insight} />
                ))}
            </div>

            {/* KPI Cards Minimalistas */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Volume Total', value: totalAgendamentos, sub: 'Visitas', color: 'text-slate-800', border: 'border-indigo-500' },
                    { label: 'Taxa Sucesso', value: `${taxaSucesso}%`, sub: 'Conclusão', color: 'text-emerald-600', border: 'border-emerald-500' },
                    { label: 'Em Andamento', value: pendentes + emAndamento, sub: 'Ativas', color: 'text-amber-600', border: 'border-amber-500' },
                    { label: 'Incidências', value: naoFinalizados, sub: 'Falhas', color: 'text-rose-600', border: 'border-rose-500' }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className={`absolute top-0 left-0 w-1 h-full ${kpi.border.replace('border-', 'bg-')}`}></div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{kpi.label}</span>
                        <div className={`mt-2 text-4xl font-extrabold ${kpi.color}`}>{kpi.value}</div>
                        <div className="text-xs text-slate-400 mt-1 font-medium">{kpi.sub}</div>
                    </div>
                ))}
            </div>

            {/* Plano de Melhorias */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-violet-50 px-8 py-6 border-b border-indigo-100/50">
                    <h3 className="text-lg font-bold text-indigo-900 flex items-center gap-2">
                        <SparklesIcon className="w-5 h-5 text-indigo-600" />
                        Diagnóstico Inteligente
                    </h3>
                </div>
                
                {oportunidadesMelhoria.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center">
                        <div className="w-16 h-16 bg-emerald-50 text-2xl flex items-center justify-center rounded-full mb-4">🏆</div>
                        <h4 className="text-slate-800 font-bold">Excelente!</h4>
                        <p className="text-slate-500 text-sm mt-1">Nenhum gap crítico detectado nos dados atuais.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {oportunidadesMelhoria.map((item, idx) => (
                            <div key={idx} className="p-8 hover:bg-slate-50/50 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 px-2 py-1 rounded-md">{item.area}</span>
                                    <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                                        item.prioridade === 'Alta' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {item.prioridade} Prioridade
                                    </span>
                                </div>
                                <h4 className="font-bold text-slate-800 mb-3 text-lg leading-tight">{item.acao}</h4>
                                <div className="space-y-3">
                                    <div className="text-xs text-rose-600 bg-rose-50/50 p-3 rounded-lg border border-rose-100 flex gap-2">
                                        <AlertIcon className="w-4 h-4 shrink-0" />
                                        {item.problema}
                                    </div>
                                    <div className="text-xs text-emerald-700 bg-emerald-50/50 p-3 rounded-lg border border-emerald-100 font-medium">
                                        Impacto: {item.impacto}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Gráficos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Saturação */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-8">Capacidade vs Demanda</h3>
                    <div className="space-y-6">
                        {listaCidades.map((cid, idx) => {
                            const percentualSaturacao = Math.min((cid.agendamentos / (cid.capacidadeDiaria || 1)) * 100, 100);
                            const corBarra = percentualSaturacao > 80 ? 'bg-rose-500 shadow-rose-200' : percentualSaturacao > 50 ? 'bg-indigo-500 shadow-indigo-200' : 'bg-emerald-500 shadow-emerald-200';
                            
                            return (
                                <div key={idx}>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="font-semibold text-slate-700">{cid.nome}</span>
                                        <div className="text-xs font-mono text-slate-400">
                                            {cid.agendamentos} <span className="text-slate-300">/</span> {cid.capacidadeDiaria}
                                        </div>
                                    </div>
                                    <div className="relative w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 shadow-md ${corBarra}`} 
                                            style={{ width: `${percentualSaturacao}%` }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Pareto */}
                <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
                    <h3 className="text-lg font-bold text-slate-800 mb-8">Motivos de Falha</h3>
                    {chartMotivos.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                            <span className="text-slate-400 text-sm font-medium">Sem dados de falha registrados</span>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {chartMotivos.map((m, idx) => (
                                <div key={idx}>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-sm font-semibold text-slate-700">{m.motivo}</span>
                                        <span className="text-xs font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded">{m.qtd}</span>
                                    </div>
                                    <ProgressBar value={(m.qtd / (naoFinalizados || 1)) * 100} color="bg-rose-400" showValue={false} />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>

             {/* Tabela Incidências */}
             <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="text-lg font-bold text-slate-800">
                        Relatório de Incidências
                    </h3>
                    <span className="bg-white px-3 py-1 rounded-full text-xs font-bold border border-slate-200 text-slate-500 shadow-sm">
                        {incidentesDetalhados.length} Registros
                    </span>
                </div>
                
                {incidentesDetalhados.length === 0 ? (
                     <div className="p-8 text-center text-slate-400 italic">Nenhuma pendência.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 font-semibold uppercase bg-slate-50 border-b border-slate-100">
                                <tr>
                                    <th className="px-8 py-4">Data</th>
                                    <th className="px-8 py-4">Cliente</th>
                                    <th className="px-8 py-4">Técnico</th>
                                    <th className="px-8 py-4">Motivo</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {incidentesDetalhados.map((item) => (
                                    <tr key={item.id} className="bg-white hover:bg-slate-50 transition-colors">
                                        <td className="px-8 py-4 whitespace-nowrap text-slate-600 font-mono text-xs">
                                            {item.data}
                                        </td>
                                        <td className="px-8 py-4 font-semibold text-slate-800">
                                            {item.cliente}
                                            <div className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">{item.cidade}</div>
                                        </td>
                                        <td className="px-8 py-4 text-indigo-600 font-medium">
                                            {item.tecnicoNome}
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="inline-block bg-rose-50 text-rose-700 text-xs font-bold px-2 py-1 rounded border border-rose-100">
                                                {item.motivoNaoConclusao}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;