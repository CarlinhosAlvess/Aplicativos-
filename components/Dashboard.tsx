
import React, { useEffect, useState } from 'react';
import { getSheetData } from '../services/mockSheetService';
import { DatabaseSchema } from '../types';
import { 
    ChartIcon, AlertIcon, SparklesIcon, CalendarIcon, 
    ChevronLeftIcon, ChevronRightIcon, DownloadIcon, UsersIcon, EditIcon
} from './Icons';

interface ProgressBarProps {
    value: number;
    color?: string;
    label?: string;
    showValue?: boolean;
    subLabel?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, color = "bg-indigo-600", label, showValue = true, subLabel }) => (
  <div className="w-full">
    <div className="flex justify-between mb-1.5 items-end">
      <div>
          {label && <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">{label}</span>}
          {subLabel && <span className="text-[10px] text-slate-400 font-medium block -mt-0.5">{subLabel}</span>}
      </div>
      {showValue && <span className="text-xs font-bold text-slate-700">{Math.round(value)}%</span>}
    </div>
    <div className="w-full bg-slate-100 rounded-full h-2">
      <div className={`${color} h-2 rounded-full transition-all duration-1000 shadow-sm`} style={{ width: `${Math.min(value, 100)}%` }}></div>
    </div>
  </div>
);

const Dashboard = () => {
    const [data, setData] = useState<DatabaseSchema | null>(null);
    
    // Novo Sistema de Estado: Baseado em Objeto Date (Mais robusto)
    const [currentDate, setCurrentDate] = useState<Date>(new Date());
    const [filterMode, setFilterMode] = useState<'mes' | 'dia'>('mes');

    useEffect(() => {
        const interval = setInterval(() => setData(getSheetData()), 2000);
        setData(getSheetData());
        return () => clearInterval(interval);
    }, []);

    const handleNavigate = (direction: 'prev' | 'next') => {
        const newDate = new Date(currentDate);
        if (filterMode === 'mes') {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        } else {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        }
        setCurrentDate(newDate);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    }

    // Helper para formatar o valor do input nativo (YYYY-MM-DD ou YYYY-MM)
    const getInputValue = () => {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        
        if (filterMode === 'mes') return `${year}-${month}`;
        return `${year}-${month}-${day}`;
    };

    // Handler para quando o usuário seleciona uma data diretamente no calendário nativo
    const handleDateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        
        const [year, month, day] = e.target.value.split('-').map(Number);
        
        // Cria a data preservando o dia/mês corretos (evita bugs de timezone criando com string)
        // Se for mês, define dia como 1
        const newDate = new Date(year, month - 1, day || 1);
        setCurrentDate(newDate);
    };

    if (!data) return <div className="text-center p-10 text-slate-400">Carregando dados...</div>;

    // --- LÓGICA DE FILTRAGEM ---
    const yyyy = currentDate.getFullYear();
    const mm = String(currentDate.getMonth() + 1).padStart(2, '0');
    const dd = String(currentDate.getDate()).padStart(2, '0');

    const filterString = filterMode === 'mes' ? `${yyyy}-${mm}` : `${yyyy}-${mm}-${dd}`;
    
    const filteredAgendamentos = data.agendamentos.filter(a => a.data.startsWith(filterString));

    // Cálculos de KPIs
    const totalAgendamentos = filteredAgendamentos.length;
    const concluidos = filteredAgendamentos.filter(a => a.statusExecucao === 'Concluído').length;
    const problemas = filteredAgendamentos.filter(a => a.statusExecucao === 'Não Finalizado').length;
    const taxaConclusao = totalAgendamentos > 0 ? (concluidos / totalAgendamentos) * 100 : 0;

    const cityCounts: Record<string, number> = {};
    filteredAgendamentos.forEach(a => {
        cityCounts[a.cidade] = (cityCounts[a.cidade] || 0) + 1;
    });
    
    const sortedCities = Object.entries(cityCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // --- NOVA LÓGICA DE MOTIVOS DE FALHA (Root Cause Analysis) ---
    const failureReasons: Record<string, number> = {};
    let totalFailures = 0;

    filteredAgendamentos
        .filter(a => a.statusExecucao === 'Não Finalizado' && a.motivoNaoConclusao)
        .forEach(a => {
            // Normalização Básica: Remove espaços, Capitaliza primeira letra
            let rawReason = a.motivoNaoConclusao?.trim() || 'Não especificado';
            if (rawReason.length > 1) {
                rawReason = rawReason.charAt(0).toUpperCase() + rawReason.slice(1).toLowerCase();
            }
            
            // Agrupamento Simples (pode ser expandido com IA no futuro)
            if (rawReason.includes('cliente') && (rawReason.includes('ausente') || rawReason.includes('casa'))) rawReason = 'Cliente Ausente';
            if (rawReason.includes('chuva') || rawReason.includes('tempo')) rawReason = 'Condições Climáticas';
            if (rawReason.includes('equipamento') || rawReason.includes('material')) rawReason = 'Falta de Material';

            failureReasons[rawReason] = (failureReasons[rawReason] || 0) + 1;
            totalFailures++;
        });

    const sortedReasons = Object.entries(failureReasons)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5); // Top 5 motivos

    // Lógica Avançada de Técnicos (Workload & Efficiency)
    const techStats = data.tecnicos.map(tech => {
        const jobs = filteredAgendamentos.filter(a => a.tecnicoId === tech.id);
        const totalJobs = jobs.length;
        // Simulação básica de "Ocupação" para o mês.
        const maxCapacity = filterMode === 'mes' ? 66 : (Number(tech.capacidadeManha) + Number(tech.capacidadeTarde) + Number(tech.capacidadeNoite));
        const occupancy = Math.min(100, (totalJobs / (maxCapacity || 1)) * 100);
        
        const failedJobsCount = jobs.filter(j => j.statusExecucao === 'Não Finalizado').length;
        const completedJobsCount = jobs.filter(j => j.statusExecucao === 'Concluído').length;
        
        // Efficiency Score: (Completed / (Total - Pending)) * 100. Pula se for 0.
        // Pending jobs shouldn't count against efficiency yet.
        const finishedJobs = completedJobsCount + failedJobsCount;
        const efficiency = finishedJobs > 0 ? (completedJobsCount / finishedJobs) * 100 : 100;

        return {
            ...tech,
            totalJobs,
            occupancy,
            failedJobs: failedJobsCount,
            efficiency
        };
    }).sort((a, b) => b.totalJobs - a.totalJobs);

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    const displayLabel = filterMode === 'mes' 
        ? `${monthNames[currentDate.getMonth()]} de ${currentDate.getFullYear()}`
        : `${currentDate.getDate()} de ${monthNames[currentDate.getMonth()]}, ${currentDate.getFullYear()}`;

    return (
        <div className="space-y-6 sm:space-y-8 pb-10">
            {/* Header Moderno com Navegação Temporal Unificada */}
            <div className="bg-white p-6 rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 flex flex-col lg:flex-row justify-between items-center gap-6">
                <div className="w-full lg:w-auto">
                    <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                        Dashboard Gerencial
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 font-medium">
                        Visão geral de performance e alocação.
                    </p>
                </div>

                {/* CONTROLE CENTRAL DE NAVEGAÇÃO PREMIUM */}
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <button 
                        onClick={handleToday}
                        className="px-4 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 rounded-xl transition-all shadow-sm"
                    >
                        Hoje
                    </button>
                    
                    <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-200 shadow-inner select-none">
                        <button 
                            onClick={() => handleNavigate('prev')}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        
                        {/* Área Clicável com Date Picker Nativo - Design Aprimorado */}
                        <div className="relative group cursor-pointer px-4 sm:px-6 flex flex-col items-center min-w-[200px] transition-all bg-white rounded-xl py-1.5 mx-1 border border-transparent hover:border-indigo-200 hover:shadow-sm">
                            
                            {/* Input Invisível que ocupa todo o espaço do container */}
                            <input 
                                type={filterMode === 'mes' ? 'month' : 'date'}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                value={getInputValue()}
                                onChange={handleDateSelect}
                                title="Clique para alterar a data"
                            />

                            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-widest mb-0.5 group-hover:text-indigo-400 transition-colors">
                                {filterMode === 'mes' ? 'Mês de Referência' : 'Data Selecionada'}
                            </span>
                            <div className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-2 whitespace-nowrap group-hover:text-indigo-600 transition-colors">
                                <CalendarIcon className="w-4 h-4 text-indigo-500" />
                                {displayLabel}
                            </div>
                            
                            {/* Indicador visual de "Editável" */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <EditIcon className="w-3 h-3 text-indigo-300" />
                            </div>
                        </div>

                        <button 
                            onClick={() => handleNavigate('next')}
                            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* SELETOR DE MODO E AÇÕES */}
                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                    <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button 
                            onClick={() => setFilterMode('mes')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filterMode === 'mes' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Mensal
                        </button>
                        <button 
                            onClick={() => setFilterMode('dia')}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                filterMode === 'dia' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Diário
                        </button>
                    </div>

                    <div className="w-px h-8 bg-slate-200 mx-1 hidden sm:block"></div>

                    <button 
                        onClick={() => alert('Exportando relatório PDF...')}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 rounded-xl transition-all"
                        title="Exportar Relatório"
                    >
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grid 3 Colunas (Removido Weather Widget) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-fade-in-up">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ChartIcon className="w-16 h-16 text-indigo-600" /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Agendamentos</span>
                    <span className="text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tighter">{totalAgendamentos}</span>
                    <div className="text-xs text-slate-400 font-medium mt-1">Neste período</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><SparklesIcon className="w-16 h-16 text-emerald-600" /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Taxa de Conclusão</span>
                    <span className="text-3xl lg:text-4xl font-extrabold text-emerald-600 tracking-tighter">{Math.round(taxaConclusao)}%</span>
                    <div className="text-xs text-slate-400 font-medium mt-1">{concluidos} concluídos</div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between h-32 relative overflow-hidden group hover:shadow-md transition-all">
                    <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><AlertIcon className="w-16 h-16 text-rose-600" /></div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Problemas / Falhas</span>
                    <span className="text-3xl lg:text-4xl font-extrabold text-rose-600 tracking-tighter">{problemas}</span>
                    <div className="text-xs text-slate-400 font-medium mt-1">Requer atenção</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in-up delay-100">
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

                {/* NOVA SEÇÃO: INTELIGÊNCIA DE FALHAS */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col">
                     <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <span className="w-2 h-6 bg-rose-500 rounded-full"></span>
                        Diagnóstico de Falhas
                    </h3>
                    <p className="text-xs text-slate-500 mb-6">Principais motivos de não conclusão (Pareto)</p>
                    
                    <div className="space-y-5 flex-1 overflow-y-auto max-h-[300px] pr-2">
                        {sortedReasons.length > 0 ? (
                            sortedReasons.map(([reason, count]) => (
                                <ProgressBar 
                                    key={reason} 
                                    label={reason}
                                    subLabel={`${count} ocorrências`}
                                    value={(count / totalFailures) * 100} 
                                    color="bg-rose-500" 
                                />
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center py-8">
                                <div className="bg-emerald-50 p-4 rounded-full mb-3">
                                    <SparklesIcon className="w-8 h-8 text-emerald-500" />
                                </div>
                                <p className="text-sm font-bold text-emerald-800">Tudo Certo!</p>
                                <p className="text-xs text-emerald-600 mt-1">Nenhuma falha registrada neste período.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NOVA SEÇÃO: Carga de Trabalho dos Técnicos */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in-up delay-200">
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                     <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                        <UsersIcon className="w-5 h-5 text-indigo-600" />
                        Eficiência da Equipe
                    </h3>
                </div>
                <div className="divide-y divide-slate-100">
                    {techStats.map((tech) => (
                        <div key={tech.id} className="p-5 flex flex-col sm:flex-row items-center gap-4 hover:bg-slate-50 transition-colors">
                            {/* Avatar/Name */}
                            <div className="flex items-center gap-3 w-full sm:w-1/4">
                                <div className={`w-10 h-10 rounded-full font-bold flex items-center justify-center shadow-sm ${tech.efficiency < 80 ? 'bg-rose-100 text-rose-600' : 'bg-slate-200 text-slate-600'}`}>
                                    {tech.nome.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-800 text-sm">{tech.nome}</div>
                                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                                        {tech.cidades.length} Cidades
                                    </div>
                                </div>
                            </div>

                            {/* Occupancy & Efficiency Bars */}
                            <div className="w-full sm:w-1/2 px-2 grid grid-cols-2 gap-4">
                                {/* Ocupação */}
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Volume</span>
                                        <span className="text-[10px] font-bold text-slate-600">{Math.round(tech.occupancy)}%</span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div className="h-full rounded-full bg-slate-400" style={{ width: `${tech.occupancy}%` }}></div>
                                    </div>
                                </div>
                                {/* Eficiência (Nova Métrica) */}
                                <div>
                                    <div className="flex justify-between mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Sucesso</span>
                                        <span className={`text-[10px] font-bold ${tech.efficiency < 80 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                            {Math.round(tech.efficiency)}%
                                        </span>
                                    </div>
                                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                        <div 
                                            className={`h-full rounded-full ${tech.efficiency < 80 ? 'bg-rose-500' : 'bg-emerald-500'}`} 
                                            style={{ width: `${tech.efficiency}%` }}
                                        ></div>
                                    </div>
                                </div>
                            </div>

                            {/* Stats */}
                            <div className="w-full sm:w-1/4 flex justify-end gap-6">
                                <div className="text-center">
                                    <div className="text-lg font-extrabold text-slate-800 leading-none">{tech.totalJobs}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Visitas</div>
                                </div>
                                <div className="text-center">
                                    <div className={`text-lg font-extrabold leading-none ${tech.failedJobs > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                                        {tech.failedJobs}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">Falhas</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {techStats.length === 0 && (
                        <div className="p-8 text-center text-slate-400">Nenhum técnico cadastrado.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
