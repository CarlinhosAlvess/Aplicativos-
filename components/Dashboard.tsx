
import React, { useEffect, useState } from 'react';
import { getSheetData, getUniqueCities } from '../services/mockSheetService';
import { DatabaseSchema, StatusExecucao, Agendamento } from '../types';
import { ChartIcon, AlertIcon, SparklesIcon, TableIcon } from './Icons';

interface ProgressBarProps {
    value: number;
    color?: string;
    label?: string;
    showValue?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, color = "bg-indigo-600", label, showValue = true }) => (
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
        danger: 'bg-rose-50 border-rose-100 text-rose-900',
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
        <div className={`p-4 sm:p-5 rounded-2xl border ${styles[type]} flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow`}>
            <span className="text-lg sm:text-xl bg-white w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full shadow-sm shrink-0">{icons[type]}</span>
            <div>
                <h4 className="font-bold text-sm tracking-wide mb-1">{title}</h4>
                <p className="text-xs opacity-90 leading-relaxed font-medium">{message}</p>
            </div>
        </div>
    );
}

const Dashboard = () => {
    const [data, setData] = useState<DatabaseSchema | null>(null);
    const [filterMode, setFilterMode] = useState<'todos' | 'data' | 'mes'>('mes');
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    useEffect(() => {
        const interval = setInterval(() => setData(getSheetData()), 2000);
        setData(getSheetData());
        
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        
        setSelectedDate(today.toISOString().split('T')[0]);
        setSelectedMonth(`${yyyy}-${mm}`); // Define o mês atual como padrão

        return () => clearInterval(interval);
    }, []);

    const handleClearFilters = () => {
        setFilterMode('todos');
        setSelectedDate('');
        // Mantém o mês selecionado no atual para não quebrar a view mensal, mas limpa filtro de dia
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        setSelectedMonth(`${yyyy}-${mm}`);
    };

    if (!data) return <div className="text-center p-10 text-slate-400">Carregando dados...</div>;

    // --- FILTRAGEM DE DADOS ---
    let filteredAgendamentos = data.agendamentos;
    
    // Filtragem para KPIs e Gráficos Gerais (Pode ser por dia ou mês)
    if (filterMode === 'data' && selectedDate) {
        filteredAgendamentos = data.agendamentos.filter(a => a.data === selectedDate);
    } else if (filterMode === 'mes' && selectedMonth) {
        filteredAgendamentos = data.agendamentos.filter(a => a.data.startsWith(selectedMonth));
    }

    const totalAgendamentos = filteredAgendamentos.length;
    const concluidos = filteredAgendamentos.filter(a => a.statusExecucao === 'Concluído').length;
    const problemas = filteredAgendamentos.filter(a => a.statusExecucao === 'Não Finalizado').length;
    const taxaConclusao = totalAgendamentos > 0 ? (concluidos / totalAgendamentos) * 100 : 0;

    // Dados para Gráficos
    const statusCounts: Record<string, number> = {};
    filteredAgendamentos.forEach(a => {
        statusCounts[a.statusExecucao] = (statusCounts[a.statusExecucao] || 0) + 1;
    });

    const cityCounts: Record<string, number> = {};
    filteredAgendamentos.forEach(a => {
        cityCounts[a.cidade] = (cityCounts[a.cidade] || 0) + 1;
    });
    
    // Ordenar cidades por volume
    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // GAPS e Melhorias
    const idleTechs = data.tecnicos.filter(t => {
        // Verifica técnicos sem agendamento no período filtrado
        const hasWork = filteredAgendamentos.some(a => a.tecnicoId === t.id);
        return !hasWork;
    });

    return (
        <div className="space-y-6 sm:space-y-8 pb-10">
            {/* Header e Filtros */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Dashboard Gerencial</h2>
                    <p className="text-slate-500 text-sm mt-1">Visão geral de desempenho e operações.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    {/* Filtro de Mês (Principal) */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">Mês de Referência</label>
                         <input 
                            type="month" 
                            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg block w-full p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={selectedMonth}
                            onChange={(e) => {
                                setSelectedMonth(e.target.value);
                                setFilterMode('mes');
                            }}
                         />
                    </div>
                    
                    {/* Filtro de Dia (Opcional) */}
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                         <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide px-1 mb-1">Dia Específico</label>
                         <input 
                            type="date" 
                            className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg block w-full p-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            value={selectedDate}
                            onChange={(e) => {
                                setSelectedDate(e.target.value);
                                setFilterMode('data');
                            }}
                         />
                    </div>

                    <button 
                        onClick={handleClearFilters}
                        className="self-end px-4 py-2.5 text-sm font-bold text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
                    >
                        Limpar
                    </button>
                </div>
            </div>

            {/* KPIs Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ChartIcon className="w-16 h-16 text-indigo-600" /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Agendamentos</span>
                    <span className="text-4xl font-extrabold text-slate-900 tracking-tighter">{totalAgendamentos}</span>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><SparklesIcon className="w-16 h-16 text-emerald-600" /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Taxa de Conclusão</span>
                    <span className="text-4xl font-extrabold text-emerald-600 tracking-tighter">{Math.round(taxaConclusao)}%</span>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><AlertIcon className="w-16 h-16 text-rose-600" /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Problemas / Falhas</span>
                    <span className="text-4xl font-extrabold text-rose-600 tracking-tighter">{problemas}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Gráfico de Barras - Cidades */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 lg:col-span-2">
                    <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-indigo-500 rounded-full"></span>
                        Volume por Cidade
                    </h3>
                    <div className="space-y-4">
                        {sortedCities.map(([city, count]) => (
                            <ProgressBar 
                                key={city} 
                                label={city} 
                                value={(count / totalAgendamentos) * 100} 
                                showValue={false}
                                color="bg-indigo-500"
                            />
                        ))}
                        {sortedCities.length === 0 && <div className="text-center text-slate-400 text-sm py-10">Sem dados para exibir</div>}
                    </div>
                </div>

                {/* Status Donut Chart (Simulated with Bars for simplicity/performance) */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                     <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                        <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                        Status de Execução
                    </h3>
                    <div className="space-y-4">
                        <ProgressBar label="Concluído" value={((statusCounts['Concluído'] || 0) / totalAgendamentos) * 100} color="bg-emerald-500" />
                        <ProgressBar label="Em Andamento" value={((statusCounts['Em Andamento'] || 0) / totalAgendamentos) * 100} color="bg-amber-500" />
                        <ProgressBar label="Pendente" value={((statusCounts['Pendente'] || 0) / totalAgendamentos) * 100} color="bg-slate-400" />
                        <ProgressBar label="Não Finalizado" value={((statusCounts['Não Finalizado'] || 0) / totalAgendamentos) * 100} color="bg-rose-500" />
                    </div>
                </div>
            </div>

            {/* RELATÓRIO MENSAL DETALHADO */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                            <TableIcon className="w-5 h-5 text-indigo-600" />
                            Relatório Detalhado
                        </h3>
                        <p className="text-xs text-slate-500 mt-1">
                            Listagem completa referente a <strong>{selectedMonth ? selectedMonth : 'Todo o Período'}</strong>
                        </p>
                    </div>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase tracking-wider border-b border-slate-100">
                            <tr>
                                <th className="px-6 py-4">Data / Período</th>
                                <th className="px-6 py-4">Cidade</th>
                                <th className="px-6 py-4">Cliente</th>
                                <th className="px-6 py-4">Técnico</th>
                                <th className="px-6 py-4">Atividade</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Motivo / Obs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredAgendamentos.length > 0 ? (
                                filteredAgendamentos.map((ag) => (
                                    <tr key={ag.id} className="hover:bg-slate-50/80 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-slate-700">{ag.data.split('-').reverse().join('/')}</div>
                                            <div className="text-xs text-slate-400">{ag.periodo.split('(')[0]}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-medium">{ag.cidade}</td>
                                        <td className="px-6 py-4 text-slate-800 font-bold">
                                            {ag.cliente}
                                            {/* Telefone removido conforme solicitado */}
                                        </td>
                                        <td className="px-6 py-4 text-indigo-600 font-medium">{ag.tecnicoNome}</td>
                                        <td className="px-6 py-4 text-slate-600">{ag.atividade}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                                                ag.statusExecucao === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                                ag.statusExecucao === 'Não Finalizado' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                                ag.statusExecucao === 'Em Andamento' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                                                'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                                {ag.statusExecucao}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">
                                            {ag.statusExecucao === 'Não Finalizado' 
                                                ? <span className="text-rose-600 font-bold">{ag.motivoNaoConclusao || 'Não informado'}</span> 
                                                : <span className="opacity-50">-</span>
                                            }
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">
                                        Nenhum agendamento encontrado para este período.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Gaps e Oportunidades */}
            <h3 className="font-bold text-slate-800 mt-8 mb-4">Insights e Oportunidades</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {idleTechs.length > 0 ? (
                    <InsightCard 
                        type="info" 
                        title="Ociosidade Identificada" 
                        message={`${idleTechs.length} técnicos não possuem agendamentos neste período (${idleTechs.map(t => t.nome.split(' ')[0]).join(', ')}). Considere remanejar atendimentos.`} 
                    />
                ) : (
                    <InsightCard type="success" title="Alta Ocupação" message="Todos os técnicos estão ativos neste período." />
                )}
                
                {problemas > (totalAgendamentos * 0.2) && (
                    <InsightCard 
                        type="danger" 
                        title="Alto Índice de Problemas" 
                        message={`A taxa de falhas está acima de 20% (${Math.round((problemas/totalAgendamentos)*100)}%). Verifique os motivos de "Não Finalizado" na tabela acima.`} 
                    />
                )}
            </div>
        </div>
    );
};

export default Dashboard;
