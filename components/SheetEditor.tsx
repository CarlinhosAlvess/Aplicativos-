
import React, { useState, useEffect, useRef } from 'react';
import { getSheetData, saveSheetData, confirmarPreAgendamento, removeAgendamento, addLog, getAvailableTechnicians, getAvailablePeriods } from '../services/mockSheetService';
import { DatabaseSchema, Tecnico, StatusExecucao, Agendamento, Periodo, UserProfile, UsuarioPermissoes, TecnicoDisponivel } from '../types';
import { SaveIcon, TableIcon, CloudIcon, CodeIcon, AlertIcon, EditIcon, SearchIcon, RefreshCwIcon, CalendarIcon, LockIcon } from './Icons';

interface SheetEditorProps {
  onCloudConfig: () => void;
  isCloudConfigured: boolean;
  isSyncing: boolean;
  currentUser: { nome: string, perfil: string };
}

// Pequeno componente para o contador regressivo
const CountdownTimer = ({ criadoEm }: { criadoEm: string }) => {
    const [timeLeft, setTimeLeft] = useState('');
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculate = () => {
            const now = Date.now();
            const created = new Date(criadoEm).getTime();
            const diff = now - created;
            const limit = 30 * 60 * 1000; // 30 min em ms
            const remaining = limit - diff;

            if (remaining <= 0) {
                setIsExpired(true);
                setTimeLeft('Expirando...');
            } else {
                const minutes = Math.floor(remaining / 60000);
                const seconds = Math.floor((remaining % 60000) / 1000);
                setTimeLeft(`${minutes}m ${seconds}s`);
            }
        };
        
        calculate();
        const interval = setInterval(calculate, 1000);
        return () => clearInterval(interval);
    }, [criadoEm]);

    return (
        <span className={`font-mono font-bold ${isExpired ? 'text-red-600 animate-pulse' : 'text-amber-700'}`}>
            {timeLeft}
        </span>
    );
};

const SheetEditor = ({ onCloudConfig, isCloudConfigured, isSyncing, currentUser }: SheetEditorProps) => {
  const [data, setData] = useState<DatabaseSchema | null>(null);
  const [activeTab, setActiveTab] = useState<'tecnicos' | 'agendamentos' | 'atividades' | 'cidades' | 'usuarios' | 'feriados' | 'logs'>('tecnicos');
  const [newCityInput, setNewCityInput] = useState<{techIndex: number, value: string} | null>(null);
  const [editingAgendamentoId, setEditingAgendamentoId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);

  // Filtros Avançados
  const [filterDate, setFilterDate] = useState('');
  const [filterPeriod, setFilterPeriod] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTech, setFilterTech] = useState('');
  const [filterCity, setFilterCity] = useState(''); // Novo filtro de Cidade

  // Estados para Reagendamento (Reschedule)
  const [rescheduleData, setRescheduleData] = useState<{
      id: string;
      currentDate: string;
      currentPeriod: string;
      currentCity: string;
      newDate: string;
      newPeriod: Periodo;
      newTechId: string;
      clientName: string;
      reason: string; // Novo campo obrigatório
  } | null>(null);
  const [availableTechsForReschedule, setAvailableTechsForReschedule] = useState<TecnicoDisponivel[]>([]);


  // API Token State
  const [showApiModal, setShowApiModal] = useState(false);

  // Auto-Save State (Logic only, no visual feedback)
  const isFirstRender = useRef(true);

  useEffect(() => {
    setData(getSheetData());
    const handleDataUpdate = () => setData(getSheetData());
    window.addEventListener('localDataChanged', handleDataUpdate);
    return () => window.removeEventListener('localDataChanged', handleDataUpdate);
  }, []);

  useEffect(() => {
      setSearchTerm('');
      // Limpa filtros ao trocar de aba para evitar confusão
      setFilterDate('');
      setFilterPeriod('');
      setFilterStatus('');
      setFilterTech('');
      setFilterCity('');
  }, [activeTab]);

  // Effect para calcular técnicos disponíveis durante o reagendamento
  useEffect(() => {
      if (rescheduleData && rescheduleData.newDate && rescheduleData.newPeriod) {
          const techs = getAvailableTechnicians(rescheduleData.currentCity, rescheduleData.newDate, rescheduleData.newPeriod);
          setAvailableTechsForReschedule(techs);
          
          // Se o técnico selecionado não estiver mais disponível (ex: troca de data), reseta
          const isSelectedTechAvailable = techs.some(t => t.id === rescheduleData.newTechId);
          if (!isSelectedTechAvailable && techs.length > 0) {
              setRescheduleData(prev => prev ? ({ ...prev, newTechId: '' }) : null);
          }
      } else {
          setAvailableTechsForReschedule([]);
      }
  }, [rescheduleData?.newDate, rescheduleData?.newPeriod]);


  // Helper de Validação
  const isDataValid = (currentData: DatabaseSchema): boolean => {
      const invalidCities = currentData.cidades.some(c => !c.trim());
      const invalidActivities = currentData.atividades.some(a => !a.trim());
      const invalidHolidays = currentData.feriados.some(f => !f.trim());
      
      // Validação de Agendamentos: Atividade não pode ser vazia
      const invalidAgendamentos = currentData.agendamentos.some(a => !a.atividade || !a.atividade.trim());
      
      return !invalidCities && !invalidActivities && !invalidHolidays && !invalidAgendamentos;
  };

  // Auto-Save Effect
  useEffect(() => {
      // Ignora a primeira renderização para não salvar dados recém carregados desnecessariamente
      if (isFirstRender.current) {
          isFirstRender.current = false;
          return;
      }

      if (data) {
          // Validação silenciosa para o Auto-Save: Se inválido, não salva automaticamente para evitar corrupção
          if (!isDataValid(data)) {
              return; 
          }

          // Salva automaticamente após 2 segundos sem digitar
          const timer = setTimeout(() => {
              saveSheetData(data);
              setSaveError(null); // Limpa erro se o auto-save ocorrer com sucesso (significa que usuário corrigiu)
          }, 2000); 

          return () => clearTimeout(timer);
      }
  }, [data]);

  const handleTechChange = (index: number, field: keyof Tecnico, value: string | number) => {
    if (!data) return;
    const newTechs = [...data.tecnicos];
    const numFields = ['capacidadeManha', 'capacidadeTarde', 'capacidadeNoite', 'capacidadeSabado', 'capacidadeDomingo', 'capacidadeFeriado'];
    
    if (numFields.includes(field as string)) {
        // Validação estrita: Apenas inteiros positivos
        let parsed = parseInt(value.toString(), 10);
        if (isNaN(parsed)) parsed = 0;
        if (parsed < 0) parsed = 0;
        (newTechs[index] as any)[field] = parsed;
    } else {
        (newTechs[index] as any)[field] = value;
    }
    setData({ ...data, tecnicos: newTechs });
  };

  const handleRemoveCityFromTech = (techIndex: number, cityToRemove: string) => {
    if (!data) return;
    const newTechs = [...data.tecnicos];
    newTechs[techIndex].cidades = newTechs[techIndex].cidades.filter(c => c !== cityToRemove);
    setData({ ...data, tecnicos: newTechs });
  };

  const handleAddCityToTech = (techIndex: number) => {
      if (!data || !newCityInput || newCityInput.techIndex !== techIndex || !newCityInput.value.trim()) return;
      const newTechs = [...data.tecnicos];
      if (!newTechs[techIndex].cidades.includes(newCityInput.value.trim())) {
          newTechs[techIndex].cidades.push(newCityInput.value.trim());
      }
      setData({ ...data, tecnicos: newTechs });
      setNewCityInput(null);
  };

  const handleActivityChange = (index: number, value: string) => {
      if (!data) return;
      const newActivities = [...(data.atividades || [])];
      newActivities[index] = value;
      setData({ ...data, atividades: newActivities });
  };

  const handleDeleteActivity = (index: number) => {
      if(!data) return;
      const newActivities = [...(data.atividades || [])];
      newActivities.splice(index, 1);
      setData({...data, atividades: newActivities});
  }

  const handleAddActivity = () => {
      if(!data) return;
      const newActivities = [...(data.atividades || []), "Nova Atividade"];
      setData({...data, atividades: newActivities});
  }

  const handleGlobalCityChange = (index: number, value: string) => {
      if (!data) return;
      const newCities = [...(data.cidades || [])];
      newCities[index] = value;
      setData({ ...data, cidades: newCities });
  };

  const handleDeleteGlobalCity = (index: number) => {
      if(!data) return;
      const newCities = [...(data.cidades || [])];
      newCities.splice(index, 1);
      setData({...data, cidades: newCities});
  }

  const handleAddGlobalCity = () => {
      if(!data) return;
      const newCities = [...(data.cidades || []), "Nova Cidade"];
      setData({...data, cidades: newCities});
  }

  const handleUsuarioNameChange = (index: number, value: string) => {
      if (!data) return;
      const newUsers = data.usuarios.map((u, i) => i === index ? { ...u, nome: value } : u);
      setData({ ...data, usuarios: newUsers });
  };

  const handleUsuarioPassChange = (index: number, value: string) => {
      if (!data) return;
      const newUsers = data.usuarios.map((u, i) => i === index ? { ...u, senha: value } : u);
      setData({ ...data, usuarios: newUsers });
  };

  const handleUsuarioProfileChange = (index: number, value: UserProfile) => {
      if (!data) return;
      
      const newPerms: UsuarioPermissoes = value === 'admin' 
        ? { agendamento: true, dashboard: true, planilha: true }
        : { agendamento: true, dashboard: true, planilha: false };

      const newUsers = data.usuarios.map((u, i) => i === index ? { ...u, perfil: value, permissoes: newPerms } : u);
      const newData = { ...data, usuarios: newUsers };
      
      // Force save first (skip validation for user change to allow fluid edits, or apply same validation)
      // Here we assume user changes are safe enough, but ideally we validate everything.
      saveSheetData(newData);
      setData(newData);
      
      // Then log
      addLog(currentUser.nome, 'Alterar Perfil', `Usuário: ${newUsers[index].nome} para ${value} (Permissões resetadas)`);
  }

  const handleUsuarioPermissaoChange = (index: number, perm: keyof UsuarioPermissoes, checked: boolean) => {
      if (!data) return;
      const user = data.usuarios[index];
      const newPerms = { ...user.permissoes, [perm]: checked };
      
      const newUsers = data.usuarios.map((u, i) => i === index ? { ...u, permissoes: newPerms } : u);
      const newData = { ...data, usuarios: newUsers };
      
      setData(newData);
      saveSheetData(newData);
  };

  const handleDeleteUsuario = (index: number) => {
      if(!data) return;
      const newUsers = [...(data.usuarios || [])];
      const deletedUser = newUsers[index].nome;
      newUsers.splice(index, 1);
      
      const newData = {...data, usuarios: newUsers};
      
      // Force save first
      saveSheetData(newData);
      setData(newData);
      
      // Then log
      addLog(currentUser.nome, 'Excluir Usuário', `Usuário: ${deletedUser}`);
  }

  const handleAddUsuario = () => {
      if(!data) return;
      const newUsers = [...(data.usuarios || []), { 
          nome: "Novo Usuário", 
          senha: "123", 
          perfil: 'user' as UserProfile,
          permissoes: { agendamento: true, dashboard: true, planilha: false }
      }];
      setData({...data, usuarios: newUsers});
  }

  const handleFeriadoChange = (index: number, value: string) => {
    if (!data) return;
    const newFeriados = [...(data.feriados || [])];
    newFeriados[index] = value;
    setData({ ...data, feriados: newFeriados });
  };

  const handleDeleteFeriado = (index: number) => {
    if(!data) return;
    const newFeriados = [...(data.feriados || [])];
    newFeriados.splice(index, 1);
    setData({...data, feriados: newFeriados});
  }

  const handleAddFeriado = () => {
    if(!data) return;
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split('T')[0];
    const newFeriados = [...(data.feriados || []), dateStr];
    setData({...data, feriados: newFeriados});
  }

  // --- Funções de Edição de Agendamento ---

  const handleAgendamentoChange = (index: number, field: keyof Agendamento, value: any) => {
      if (!data) return;
      
      // CRITICAL FIX: Create a shallow copy of the specific item to ensure immutability.
      // Modifying the object inside the array directly prevented React from detecting the change.
      const currentItem = data.agendamentos[index];
      const updatedItem = { ...currentItem, [field]: value };
      
      if (field === 'tecnicoId') {
          const tech = data.tecnicos.find(t => t.id === value);
          updatedItem.tecnicoNome = tech ? tech.nome : 'Desconhecido';
      }

      if (field === 'statusExecucao' && value !== 'Não Finalizado') {
          updatedItem.motivoNaoConclusao = '';
      }

      const newAgendamentos = [...data.agendamentos];
      newAgendamentos[index] = updatedItem;

      setData({ ...data, agendamentos: newAgendamentos });
  }

  const handleExecutionStatusChange = (index: number, value: StatusExecucao) => {
      handleAgendamentoChange(index, 'statusExecucao', value);
  };

  const handleMotivoChange = (index: number, value: string) => {
      handleAgendamentoChange(index, 'motivoNaoConclusao', value);
  };

  const handleObservacaoChange = (index: number, value: string) => {
    handleAgendamentoChange(index, 'observacao', value);
  };
  
  const handleDeleteAgendamento = (index: number) => {
      if (!data) return;
      const agendamento = data.agendamentos[index];
      if (confirm('Tem certeza que deseja excluir este agendamento?')) {
          removeAgendamento(agendamento.id);
          const newAgendamentos = data.agendamentos.filter((_, i) => i !== index);
          setData({...data, agendamentos: newAgendamentos});
          addLog(currentUser.nome, 'Excluir Agendamento', `ID: ${agendamento.id}, Cliente: ${agendamento.cliente}`);
      }
  }

  const handleSave = () => {
    if (data) {
      if (!isDataValid(data)) {
          setSaveError('Não é possível salvar. Existem campos vazios em Cidades, Atividades, Feriados ou Atividade do Agendamento.');
          return;
      }

      saveSheetData(data);
      setSaveError(null);
      addLog(currentUser.nome, 'Salvar Manual', 'Salvamento manual da planilha');
    }
  };

  const handleAddTech = () => {
      if(!data) return;
      const newTech: Tecnico = {
          id: crypto.randomUUID(),
          nome: "Novo Técnico",
          cidades: ["São Paulo"],
          capacidadeManha: 2,
          capacidadeTarde: 2,
          capacidadeNoite: 1,
          capacidadeSabado: 3,
          capacidadeDomingo: 0,
          capacidadeFeriado: 1
      };
      setData({...data, tecnicos: [...data.tecnicos, newTech]});
  }

  const handleManualConfirm = (e: React.MouseEvent, id: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      if (window.confirm('Confirmar este pré-agendamento manualmente?')) {
          // CORREÇÃO: Não salvar 'data' aqui. O 'data' pode estar desatualizado (stale)
          // e sobrescrever a confirmação. Chamamos a função de serviço diretamente
          // e depois recarregamos os dados frescos.
          
          const success = confirmarPreAgendamento(id);
          
          if (success) {
              const freshData = getSheetData();
              setData(freshData);
              addLog(currentUser.nome, 'Confirmar Manual', `Confirmou pré-agendamento ID: ${id}`);
          } else {
              alert('Erro: Agendamento não encontrado ou já processado.');
              setData(getSheetData()); // Sync anyway
          }
      }
  }

  // --- RESCHEDULE LOGIC ---
  const openRescheduleModal = (agendamento: Agendamento) => {
      setRescheduleData({
          id: agendamento.id,
          currentDate: agendamento.data,
          currentPeriod: agendamento.periodo,
          currentCity: agendamento.cidade,
          clientName: agendamento.cliente,
          newDate: agendamento.data, // Default to current
          newPeriod: agendamento.periodo, // Default to current
          newTechId: '',
          reason: ''
      });
  };

  const handleConfirmReschedule = () => {
      // Validação aprimorada: Exige técnico E motivo
      if (!data || !rescheduleData || !rescheduleData.newTechId || !rescheduleData.reason.trim()) return;

      const tech = data.tecnicos.find(t => t.id === rescheduleData.newTechId);
      const techName = tech ? tech.nome : 'Desconhecido';

      const newAgendamentos = data.agendamentos.map(a => {
          if (a.id === rescheduleData.id) {
              // Adiciona o motivo ao histórico de observações do agendamento
              const currentObs = a.observacao ? a.observacao + '\n' : '';
              const historyLog = `[Reagendado em ${new Date().toLocaleDateString()}: ${rescheduleData.reason}]`;
              
              return {
                  ...a,
                  data: rescheduleData.newDate,
                  periodo: rescheduleData.newPeriod,
                  tecnicoId: rescheduleData.newTechId,
                  tecnicoNome: techName,
                  statusExecucao: 'Pendente', // Reset status if moved
                  motivoNaoConclusao: '',
                  observacao: currentObs + historyLog
              } as Agendamento; 
          }
          return a;
      });

      const newData = { ...data, agendamentos: newAgendamentos };
      setData(newData);
      saveSheetData(newData);
      addLog(currentUser.nome, 'Reagendamento', `ID: ${rescheduleData.id} - Motivo: ${rescheduleData.reason} - De: ${rescheduleData.currentDate} para ${rescheduleData.newDate}`);
      
      setRescheduleData(null); // Close modal
  };

  const handleGenerateToken = () => {
      if (!data) return;
      const newToken = 'sk_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      const newData = { ...data, apiToken: newToken };
      
      // Force save first
      saveSheetData(newData);
      setData(newData);
      
      // Then log
      addLog(currentUser.nome, 'Gerar Token', 'Gerou novo token de API');
  }

  const apiEndpoint = localStorage.getItem('app_cloud_url') || 'https://script.google.com/macros/s/.../exec';

  if (!data) return <div className="text-center p-10 text-slate-500">Iniciando base de dados...</div>;

  const tabClass = (tab: string) => `px-3 sm:px-4 py-3 rounded-t-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
    activeTab === tab 
      ? 'bg-white text-indigo-600 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] border-t-2 border-indigo-500' 
      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
  }`;

  // --- Lógica de Filtro ---
  const lowerSearch = searchTerm.toLowerCase();

  const filteredTecnicos = data.tecnicos.map((t, i) => ({ ...t, originalIndex: i })).filter(t => 
      !searchTerm || 
      t.nome.toLowerCase().includes(lowerSearch) || 
      t.cidades.some(c => c.toLowerCase().includes(lowerSearch))
  );

  const filteredAgendamentos = data.agendamentos.map((a, i) => ({ ...a, originalIndex: i })).reverse().filter(a => {
      // Filtro de Texto Livre
      const matchesSearch = !searchTerm ||
          a.cliente.toLowerCase().includes(lowerSearch) ||
          a.tecnicoNome.toLowerCase().includes(lowerSearch) ||
          a.cidade.toLowerCase().includes(lowerSearch) ||
          a.data.includes(searchTerm) ||
          a.statusExecucao.toLowerCase().includes(lowerSearch) ||
          (a.observacao || '').toLowerCase().includes(lowerSearch) ||
          (a.atividade || '').toLowerCase().includes(lowerSearch); // Inclui atividade

      // Filtros Específicos
      const matchesDate = !filterDate || a.data === filterDate;
      const matchesPeriod = !filterPeriod || a.periodo === filterPeriod;
      const matchesStatus = !filterStatus || a.statusExecucao === filterStatus;
      const matchesTech = !filterTech || a.tecnicoId === filterTech;
      const matchesCity = !filterCity || a.cidade === filterCity;

      return matchesSearch && matchesDate && matchesPeriod && matchesStatus && matchesTech && matchesCity;
  });

  const filteredUsuarios = data.usuarios.map((u, i) => ({ ...u, originalIndex: i })).filter(u =>
      !searchTerm ||
      u.nome.toLowerCase().includes(lowerSearch) ||
      u.perfil.toLowerCase().includes(lowerSearch)
  );

  const filteredCidades = data.cidades.map((c, i) => ({ value: c, originalIndex: i })).filter(c =>
      !searchTerm || c.value.toLowerCase().includes(lowerSearch)
  );

  const filteredAtividades = data.atividades.map((a, i) => ({ value: a, originalIndex: i })).filter(a =>
      !searchTerm || a.value.toLowerCase().includes(lowerSearch)
  );
  
  const filteredFeriados = data.feriados.map((f, i) => ({ value: f, originalIndex: i })).filter(f =>
      !searchTerm || f.value.includes(searchTerm)
  );

  const filteredLogs = (data.logs || []).filter(l => 
      !searchTerm || 
      l.usuario.toLowerCase().includes(lowerSearch) || 
      l.acao.toLowerCase().includes(lowerSearch) ||
      l.detalhes.toLowerCase().includes(lowerSearch)
  );

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-[calc(100vh-180px)] sm:h-[calc(100vh-150px)]">
      
      {/* ERROR TOAST */}
      {saveError && (
          <div className="fixed top-20 right-4 z-[90] bg-white border-l-4 border-rose-500 rounded-xl shadow-2xl p-4 animate-fade-in-up max-w-sm">
              <div className="flex gap-3">
                  <div className="text-rose-500 mt-0.5"><AlertIcon className="w-5 h-5" /></div>
                  <div>
                      <h4 className="font-bold text-slate-800 text-sm">Erro ao Salvar</h4>
                      <p className="text-xs text-slate-500 mt-1">{saveError}</p>
                      <button onClick={() => setSaveError(null)} className="text-xs font-bold text-slate-400 hover:text-slate-600 mt-2">Dispensar</button>
                  </div>
              </div>
          </div>
      )}

      {/* --- RESCHEDULE MODAL --- */}
      {rescheduleData && (
          <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                              <RefreshCwIcon className="w-5 h-5" />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-slate-800">Reagendar Visita</h3>
                              <p className="text-sm text-slate-500">Cliente: <strong>{rescheduleData.clientName}</strong></p>
                          </div>
                      </div>
                      <button onClick={() => setRescheduleData(null)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">&times;</button>
                  </div>

                  <div className="space-y-4">
                      {/* Current Info (Read-onlyish) */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-500 flex justify-between">
                          <div>
                              <span className="block font-bold uppercase tracking-wider mb-1">De:</span>
                              {rescheduleData.currentDate.split('-').reverse().join('/')} - {rescheduleData.currentPeriod}
                          </div>
                          <div className="text-right">
                              <span className="block font-bold uppercase tracking-wider mb-1">Cidade:</span>
                              {rescheduleData.currentCity}
                          </div>
                      </div>

                      {/* New Date & Period */}
                      <div className="grid grid-cols-2 gap-3">
                          <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Nova Data</label>
                              <div className="relative">
                                  <input 
                                      type="date"
                                      className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                      min={new Date().toISOString().split('T')[0]}
                                      value={rescheduleData.newDate}
                                      onChange={(e) => setRescheduleData({...rescheduleData, newDate: e.target.value})}
                                  />
                                  <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                                      <CalendarIcon className="w-4 h-4" />
                                  </div>
                              </div>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-600 mb-1">Novo Período</label>
                              <select 
                                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
                                  value={rescheduleData.newPeriod}
                                  onChange={(e) => setRescheduleData({...rescheduleData, newPeriod: e.target.value as Periodo})}
                              >
                                  <option value={Periodo.MANHA}>Manhã</option>
                                  <option value={Periodo.TARDE}>Tarde</option>
                                  <option value={Periodo.NOITE}>Especial (18h)</option>
                              </select>
                          </div>
                      </div>

                      {/* Motivo do Reagendamento (Campo Obrigatório) */}
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-1">
                              Motivo do Reagendamento <span className="text-rose-500">*</span>
                          </label>
                          <textarea 
                              className="w-full p-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none resize-none h-20"
                              placeholder="Ex: Cliente solicitou mudança de horário por imprevisto..."
                              value={rescheduleData.reason}
                              onChange={(e) => setRescheduleData({...rescheduleData, reason: e.target.value})}
                          />
                      </div>

                      {/* Technician Selection */}
                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2">Técnicos Disponíveis</label>
                          <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg bg-slate-50 p-2 space-y-2">
                              {availableTechsForReschedule.length > 0 ? (
                                  availableTechsForReschedule.map(tech => (
                                      <label key={tech.id} className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${rescheduleData.newTechId === tech.id ? 'bg-amber-50 border-amber-500 ring-1 ring-amber-500' : 'bg-white border-slate-200 hover:bg-slate-100'}`}>
                                          <div className="flex items-center gap-2">
                                              <input 
                                                  type="radio"
                                                  name="rescheduleTech"
                                                  value={tech.id}
                                                  checked={rescheduleData.newTechId === tech.id}
                                                  onChange={(e) => setRescheduleData({...rescheduleData, newTechId: e.target.value})}
                                                  className="text-amber-600 focus:ring-amber-500"
                                              />
                                              <span className="text-sm font-medium text-slate-700">{tech.nome}</span>
                                          </div>
                                          <span className="text-xs font-bold text-amber-600">{tech.vagasRestantes} vagas</span>
                                      </label>
                                  ))
                              ) : (
                                  <div className="text-center py-4 text-slate-400 text-xs italic">
                                      Nenhum técnico disponível nesta data/período.
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="flex justify-end gap-3 pt-2">
                          <button onClick={() => setRescheduleData(null)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg text-sm">Cancelar</button>
                          <button 
                              onClick={handleConfirmReschedule}
                              disabled={!rescheduleData.newTechId || !rescheduleData.reason.trim()}
                              className={`px-4 py-2 bg-amber-600 text-white font-bold rounded-lg text-sm transition-all shadow-md ${(!rescheduleData.newTechId || !rescheduleData.reason.trim()) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-amber-700 hover:shadow-lg'}`}
                          >
                              Confirmar Mudança
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showApiModal && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-2xl animate-fade-in-up max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                            <CodeIcon className="w-6 h-6 text-indigo-600" />
                            Integração API
                        </h3>
                        <p className="text-sm text-slate-500">Documentação para sistemas externos</p>
                      </div>
                      <button onClick={() => setShowApiModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold leading-none">&times;</button>
                  </div>

                  <div className="space-y-6">
                      {/* NOVA SESSÃO DE VISUALIZAÇÃO DE ABAS */}
                      <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 flex gap-3">
                        <div className="bg-white p-2 h-fit rounded-lg shadow-sm text-emerald-600">
                          <TableIcon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-emerald-800 text-sm">Visualização na Planilha</h4>
                          <p className="text-xs text-emerald-700 mt-1 leading-relaxed">
                            O App salva os dados automaticamente na célula <strong>A1</strong> da aba <strong>Data</strong>. 
                            <br/><br/>
                            O Script gera abas de visualização automaticamente:
                            <ul className="list-disc ml-4 mt-1">
                              <li><strong>Visão - Agendamentos</strong>: Tabela formatada de visitas.</li>
                              <li><strong>Visão - Técnicos</strong>: Resumo de técnicos e vagas.</li>
                            </ul>
                            <span className="block mt-2 font-bold opacity-80">Não edite essas abas manualmente, elas são regeradas a cada salvamento.</span>
                          </p>
                        </div>
                      </div>

                      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                          <label className="block text-xs font-bold text-indigo-800 mb-1 uppercase tracking-wide">Endpoint (URL do Script Google)</label>
                          <div className="bg-white p-3 rounded-lg border border-indigo-200 font-mono text-xs text-slate-600 break-all select-all">
                              {apiEndpoint}
                          </div>
                      </div>

                      <div>
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Token de Autenticação</label>
                          <div className="flex gap-2">
                              <input 
                                readOnly
                                type="text" 
                                value={data.apiToken || 'Nenhum token gerado'}
                                className="flex-1 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono text-sm text-slate-700"
                              />
                              <button 
                                onClick={handleGenerateToken}
                                className="bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs hover:bg-slate-900 transition"
                              >
                                  Gerar Novo
                              </button>
                          </div>
                          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                              <AlertIcon className="w-3 h-3" />
                              Atenção: Ao gerar um novo token, o anterior deixará de funcionar.
                          </p>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="bg-white p-1.5 sm:p-2 rounded-lg border border-slate-200 shadow-sm"><TableIcon className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" /></div>
          <span className="font-bold text-slate-700 text-sm sm:text-base">Editor de Dados</span>
        </div>
        
        <div className="flex items-center gap-1 sm:gap-3">
            <button 
                onClick={() => setShowApiModal(true)}
                className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-2 sm:px-3 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                title="API Integration"
            >
                <CodeIcon className="w-4 h-4 sm:w-4 sm:h-4" />
                <span className="hidden lg:inline">API</span>
            </button>

            <button 
                onClick={onCloudConfig}
                className={`text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 px-2 py-2 sm:px-3 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${isCloudConfigured ? 'text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50' : ''}`}
                title="Configurar Nuvem"
            >
                <CloudIcon className={`w-5 h-5 sm:w-4 sm:h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isCloudConfigured ? 'Conectado' : 'Conectar'}</span>
            </button>

            <button 
                onClick={handleSave}
                className="px-3 sm:px-5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all shadow-md flex items-center gap-2 ml-1 bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                title="Salvar Manualmente"
            >
                <SaveIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Salvar</span>
            </button>
        </div>
      </div>
      
      {/* ... rest of the component (tabs, filter bar, content) remains unchanged ... */}
      <div className="bg-slate-50 px-2 sm:px-6 pt-2 flex gap-1 sm:gap-2 overflow-x-auto border-b border-slate-200 scrollbar-hide">
        <button onClick={() => setActiveTab('tecnicos')} className={tabClass('tecnicos')}>Técnicos</button>
        <button onClick={() => setActiveTab('agendamentos')} className={tabClass('agendamentos')}>Agendamentos</button>
        <button onClick={() => setActiveTab('cidades')} className={tabClass('cidades')}>Cidades</button>
        <button onClick={() => setActiveTab('atividades')} className={tabClass('atividades')}>Atividades</button>
        <button onClick={() => setActiveTab('usuarios')} className={tabClass('usuarios')}>Usuários</button>
        <button onClick={() => setActiveTab('feriados')} className={tabClass('feriados')}>Feriados</button>
        <button onClick={() => setActiveTab('logs')} className={tabClass('logs')}>Histórico</button>
      </div>

      {/* FILTER BAR */}
      <div className="bg-white px-2 sm:px-6 py-3 border-b border-slate-100">
        <div className="relative">
            <input 
                type="text" 
                placeholder={`Filtrar ${activeTab}...`} 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
            />
            <div className="absolute left-3 top-2.5 text-slate-400">
                <SearchIcon className="w-5 h-5" />
            </div>
            {searchTerm && (
                <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                >
                    &times;
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-white p-2 sm:p-6">
        
        {activeTab === 'tecnicos' && (
          <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 sm:p-4 flex gap-3">
                  <span className="text-amber-500 text-lg sm:text-xl">💡</span>
                  <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                      <strong>Definição de Vagas:</strong> Os números abaixo definem o total de vagas (capacidade) que cada técnico pode atender. Edite para alterar a disponibilidade.
                  </p>
              </div>
            <div className="overflow-x-auto pb-4">
            <table className="w-full border-collapse text-sm min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                  <th className="sticky top-0 z-20 bg-slate-50 p-4 font-bold text-slate-600 rounded-tl-xl shadow-sm">Nome</th>
                  <th className="sticky top-0 z-20 bg-slate-50 p-4 font-bold text-slate-600 min-w-[200px] shadow-sm">Área de Atuação</th>
                  <th className="sticky top-0 z-20 bg-indigo-50/50 p-4 font-bold text-slate-600 text-center w-24 shadow-sm">Vagas Manhã</th>
                  <th className="sticky top-0 z-20 bg-indigo-50/50 p-4 font-bold text-slate-600 text-center w-24 shadow-sm">Vagas Tarde</th>
                  <th className="sticky top-0 z-20 bg-indigo-50/50 p-4 font-bold text-slate-600 text-center w-24 shadow-sm">Vagas 18h</th>
                  <th className="sticky top-0 z-20 bg-amber-50/50 p-4 font-bold text-slate-600 text-center w-24 shadow-sm">Vagas Sáb</th>
                  <th className="sticky top-0 z-20 bg-rose-50/50 p-4 font-bold text-slate-600 text-center w-24 shadow-sm">Vagas Dom</th>
                  <th className="sticky top-0 z-20 bg-purple-50/50 p-4 font-bold text-slate-600 text-center w-24 rounded-tr-xl shadow-sm">Vagas Feriado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTecnicos.map((tech) => {
                  const idx = tech.originalIndex;
                  return (
                  <tr key={tech.id} className="hover:bg-white hover:shadow-md hover:scale-[1.01] transition-all duration-200 group relative z-0 hover:z-10 border-b border-transparent hover:border-slate-100 rounded-lg">
                    <td className="p-3">
                      <input 
                        className="w-full p-2 rounded-lg border-transparent hover:border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none bg-transparent transition-all font-medium text-slate-700"
                        value={tech.nome}
                        onChange={(e) => handleTechChange(idx, 'nome', e.target.value)}
                      />
                    </td>
                    <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                            {tech.cidades.map((city, cIdx) => (
                                <span key={cIdx} className="bg-white border border-slate-200 text-slate-600 px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 shadow-sm">
                                    {city}
                                    <button onClick={() => handleRemoveCityFromTech(idx, city)} className="text-slate-400 hover:text-rose-500 transition-colors" type="button">×</button>
                                </span>
                            ))}
                            {newCityInput?.techIndex === idx ? (
                                <select 
                                    autoFocus
                                    className="border border-indigo-300 rounded-lg px-2 py-1 text-xs w-32 outline-none shadow-sm"
                                    value={newCityInput.value}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setNewCityInput({techIndex: idx, value: e.target.value});
                                            setTimeout(() => handleAddCityToTech(idx), 100);
                                        }
                                    }}
                                    onBlur={() => handleAddCityToTech(idx)}
                                >
                                    <option value="">Selecionar...</option>
                                    {(data.cidades || []).filter(c => !tech.cidades.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            ) : (
                                <button onClick={() => setNewCityInput({techIndex: idx, value: ''})} className="text-indigo-600 hover:bg-indigo-50 px-2 py-1 rounded-md text-xs font-bold transition-colors">+</button>
                            )}
                        </div>
                    </td>
                    <td className="p-1 bg-indigo-50/30 group-hover:bg-indigo-50/50 transition-colors"><input type="number" step="1" min="0" className="w-full p-2 text-center outline-none bg-transparent font-medium text-slate-600" value={tech.capacidadeManha} onChange={(e) => handleTechChange(idx, 'capacidadeManha', e.target.value)} /></td>
                    <td className="p-1 bg-indigo-50/30 group-hover:bg-indigo-50/50 transition-colors"><input type="number" step="1" min="0" className="w-full p-2 text-center outline-none bg-transparent font-medium text-slate-600" value={tech.capacidadeTarde} onChange={(e) => handleTechChange(idx, 'capacidadeTarde', e.target.value)} /></td>
                    <td className="p-1 bg-indigo-50/30 group-hover:bg-indigo-50/50 transition-colors"><input type="number" step="1" min="0" className="w-full p-2 text-center outline-none bg-transparent font-medium text-slate-600" value={tech.capacidadeNoite || 0} onChange={(e) => handleTechChange(idx, 'capacidadeNoite', e.target.value)} /></td>
                    <td className="p-1 bg-amber-50/30 group-hover:bg-amber-50/50 transition-colors"><input type="number" step="1" min="0" className="w-full p-2 text-center outline-none bg-transparent font-bold text-amber-700" value={tech.capacidadeSabado || 0} onChange={(e) => handleTechChange(idx, 'capacidadeSabado', e.target.value)} /></td>
                    <td className="p-1 bg-rose-50/30 group-hover:bg-rose-50/50 transition-colors"><input type="number" step="1" min="0" className="w-full p-2 text-center outline-none bg-transparent font-bold text-rose-700" value={tech.capacidadeDomingo || 0} onChange={(e) => handleTechChange(idx, 'capacidadeDomingo', e.target.value)} /></td>
                    <td className="p-1 bg-purple-50/30 group-hover:bg-purple-50/50 transition-colors"><input type="number" step="1" min="0" className="w-full p-2 text-center outline-none bg-transparent font-bold text-purple-700" value={tech.capacidadeFeriado || 0} onChange={(e) => handleTechChange(idx, 'capacidadeFeriado', e.target.value)} /></td>
                  </tr>
                )})}
              </tbody>
            </table>
            </div>
            <button onClick={handleAddTech} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-lg transition-colors shadow-sm">+ Novo Técnico</button>
          </div>
        )}

        {['cidades', 'atividades', 'feriados'].includes(activeTab) && (
            <div className="space-y-4">
                 <div className="overflow-x-auto">
                 <table className="w-full border-collapse text-sm max-w-lg">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 rounded-tl-lg shadow-sm">
                                {activeTab === 'feriados' ? 'Data (YYYY-MM-DD)' : 'Nome / Valor'}
                            </th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 w-10 rounded-tr-lg shadow-sm"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {(activeTab === 'cidades' ? filteredCidades : activeTab === 'atividades' ? filteredAtividades : filteredFeriados).map((item, _) => {
                            const idx = item.originalIndex;
                            const isInvalid = !item.value.trim();
                            return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2">
                                    <input 
                                        type={activeTab === 'feriados' ? 'date' : 'text'}
                                        className={`w-full p-2 rounded-lg border focus:ring-2 outline-none transition-all ${isInvalid ? 'border-rose-300 bg-rose-50' : 'border-transparent hover:border-slate-200 focus:border-indigo-300 focus:ring-indigo-100 bg-transparent'}`}
                                        value={item.value}
                                        onChange={(e) => {
                                            if(activeTab === 'cidades') handleGlobalCityChange(idx, e.target.value);
                                            else if(activeTab === 'atividades') handleActivityChange(idx, e.target.value);
                                            else handleFeriadoChange(idx, e.target.value);
                                        }}
                                        placeholder="Valor..."
                                    />
                                </td>
                                <td className="p-2 text-right">
                                    <button 
                                        onClick={() => {
                                            if(activeTab === 'cidades') handleDeleteGlobalCity(idx);
                                            else if(activeTab === 'atividades') handleDeleteActivity(idx);
                                            else handleDeleteFeriado(idx);
                                        }}
                                        className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50 transition-all"
                                    >
                                        &times;
                                    </button>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
                </div>
                <button 
                    onClick={() => {
                        if(activeTab === 'cidades') handleAddGlobalCity();
                        else if(activeTab === 'atividades') handleAddActivity();
                        else handleAddFeriado();
                    }}
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-lg transition-colors shadow-sm"
                >
                    + Adicionar {activeTab === 'cidades' ? 'Cidade' : (activeTab === 'atividades' ? 'Atividade' : 'Feriado')}
                </button>
            </div>
        )}

        {/* ... (resto do componente de usuários e logs permanece igual) */}
         {activeTab === 'usuarios' && (
            // ... (mesmo código de usuários)
            <div className="space-y-4">
                 <div className="overflow-x-auto">
                 <table className="w-full border-collapse text-sm min-w-[600px]">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                            <th className="p-3 font-bold text-slate-600">Usuário</th>
                            <th className="p-3 font-bold text-slate-600">Senha</th>
                            <th className="p-3 font-bold text-slate-600">Perfil</th>
                            <th className="p-3 font-bold text-slate-600">Permissões Específicas</th>
                            <th className="p-3 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsuarios.map((u, _) => {
                            const idx = u.originalIndex;
                            return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2"><input className="w-full p-2 bg-transparent border-transparent hover:border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" value={u.nome} onChange={(e) => handleUsuarioNameChange(idx, e.target.value)} /></td>
                                <td className="p-2"><input className="w-full p-2 bg-transparent border-transparent hover:border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none" type="text" value={u.senha} onChange={(e) => handleUsuarioPassChange(idx, e.target.value)} /></td>
                                <td className="p-2">
                                    <select 
                                        className="w-full p-2 bg-transparent border-transparent hover:border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer"
                                        value={u.perfil}
                                        onChange={(e) => handleUsuarioProfileChange(idx, e.target.value as UserProfile)}
                                    >
                                        <option value="user">Padrão</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                </td>
                                <td className="p-2">
                                    <div className="flex gap-3">
                                        <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                                            <input type="checkbox" checked={u.permissoes.agendamento} onChange={(e) => handleUsuarioPermissaoChange(idx, 'agendamento', e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                            <span>Agendamento</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                                            <input type="checkbox" checked={u.permissoes.dashboard} onChange={(e) => handleUsuarioPermissaoChange(idx, 'dashboard', e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                            <span>Dash</span>
                                        </label>
                                        <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
                                            <input type="checkbox" checked={u.permissoes.planilha} onChange={(e) => handleUsuarioPermissaoChange(idx, 'planilha', e.target.checked)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                                            <span>Planilha</span>
                                        </label>
                                    </div>
                                </td>
                                <td className="p-2 text-right">
                                    <button onClick={() => handleDeleteUsuario(idx)} className="text-slate-400 hover:text-rose-500 p-2 rounded-full hover:bg-rose-50">&times;</button>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
                </div>
                <button onClick={handleAddUsuario} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-lg transition-colors shadow-sm">+ Adicionar Usuário</button>
            </div>
         )}
         
         {activeTab === 'logs' && (
             <div className="overflow-x-auto">
                 <table className="w-full border-collapse text-sm whitespace-nowrap">
                     <thead>
                         <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                             <th className="p-3 font-bold text-slate-600">Data/Hora</th>
                             <th className="p-3 font-bold text-slate-600">Usuário</th>
                             <th className="p-3 font-bold text-slate-600">Ação</th>
                             <th className="p-3 font-bold text-slate-600">Detalhes</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 font-mono text-xs">
                         {filteredLogs.map((log) => (
                             <tr key={log.id} className="hover:bg-slate-50">
                                 <td className="p-2 text-slate-500">{new Date(log.timestamp).toLocaleString()}</td>
                                 <td className="p-2 font-bold text-slate-700">{log.usuario}</td>
                                 <td className="p-2">
                                     <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                                         log.acao.includes('Excluir') || log.acao.includes('Cancelar') ? 'bg-rose-100 text-rose-700' :
                                         log.acao.includes('Confirmar') || log.acao.includes('Salvar') ? 'bg-emerald-100 text-emerald-700' :
                                         log.acao.includes('Reagendamento') ? 'bg-amber-100 text-amber-700' :
                                         'bg-slate-100 text-slate-600'
                                     }`}>
                                         {log.acao}
                                     </span>
                                 </td>
                                 <td className="p-2 text-slate-600 max-w-xs truncate" title={log.detalhes}>{log.detalhes}</td>
                             </tr>
                         ))}
                         {filteredLogs.length === 0 && <tr><td colSpan={4} className="p-4 text-center text-slate-400">Nenhum registro encontrado.</td></tr>}
                     </tbody>
                 </table>
             </div>
         )}

         {/* --- TAB DE AGENDAMENTOS --- */}
         {activeTab === 'agendamentos' && (
             <div className="space-y-4">
                 
                 {/* FILTROS DE AGENDAMENTO */}
                 <div className="flex flex-wrap gap-2 mb-4 bg-slate-50 p-2 rounded-lg border border-slate-200">
                     <input 
                         type="date" 
                         value={filterDate} 
                         onChange={(e) => setFilterDate(e.target.value)} 
                         className="p-2 text-xs rounded border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-100"
                         title="Filtrar por Data"
                     />
                     <select 
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="p-2 text-xs rounded border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-100 cursor-pointer"
                     >
                         <option value="">Todas as Cidades</option>
                         {(data.cidades || []).map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <select 
                         value={filterPeriod} 
                         onChange={(e) => setFilterPeriod(e.target.value)} 
                         className="p-2 text-xs rounded border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-100"
                     >
                         <option value="">Todos Períodos</option>
                         <option value={Periodo.MANHA}>Manhã</option>
                         <option value={Periodo.TARDE}>Tarde</option>
                         <option value={Periodo.NOITE}>Especial (18h)</option>
                     </select>
                     <select 
                         value={filterStatus} 
                         onChange={(e) => setFilterStatus(e.target.value)} 
                         className="p-2 text-xs rounded border border-slate-300 outline-none focus:ring-2 focus:ring-indigo-100"
                     >
                         <option value="">Todos Status</option>
                         <option value="Pendente">Pendente</option>
                         <option value="Em Andamento">Em Andamento</option>
                         <option value="Concluído">Concluído</option>
                         <option value="Não Finalizado">Não Finalizado</option>
                     </select>
                      <button 
                         onClick={() => { setFilterDate(''); setFilterPeriod(''); setFilterStatus(''); setFilterCity(''); setSearchTerm(''); }}
                         className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded transition"
                     >
                         Limpar
                     </button>
                 </div>

                 <div className="overflow-x-auto min-h-[400px]">
                 <table className="w-full border-collapse text-sm min-w-[1000px]">
                     <thead>
                         <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                             <th className="p-3 font-bold text-slate-600 rounded-tl-lg">Data / Hora</th>
                             <th className="p-3 font-bold text-slate-600">Cliente</th>
                             <th className="p-3 font-bold text-slate-600">Cidade</th>
                             <th className="p-3 font-bold text-slate-600">Técnico</th>
                             <th className="p-3 font-bold text-slate-600 text-center">Tipo</th>
                             <th className="p-3 font-bold text-slate-600">Status Execução</th>
                             <th className="p-3 font-bold text-slate-600">Observação</th>
                             <th className="p-3 w-20 rounded-tr-lg text-center">Ações</th>
                         </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                         {filteredAgendamentos.map((ag) => {
                             const idx = ag.originalIndex;
                             const isPre = ag.tipo === 'PRE_AGENDAMENTO';
                             const isIncidente = ag.tipo === 'INCIDENTE';
                             
                             return (
                             <tr key={ag.id} className={`hover:bg-slate-50 transition-colors ${isPre ? 'bg-amber-50/40' : (isIncidente ? 'bg-rose-50/40' : '')}`}>
                                 <td className="p-3 align-top">
                                     <div className="font-bold text-slate-700">{ag.data.split('-').reverse().join('/')}</div>
                                     <div className="text-xs text-slate-500">{ag.periodo}</div>
                                     {isPre && ag.criadoEm && (
                                         <div className="mt-1 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded w-fit">
                                             <CountdownTimer criadoEm={ag.criadoEm} />
                                         </div>
                                     )}
                                     {isIncidente && ag.dadosIncidente?.horarioAvistado && (
                                         <div className="mt-1 text-xs bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded w-fit font-bold">
                                             Avistado às {ag.dadosIncidente.horarioAvistado}
                                         </div>
                                     )}
                                 </td>
                                 <td className="p-3 align-top">
                                     <div className="font-bold text-slate-800">{ag.cliente}</div>
                                     <div className="text-xs text-slate-500">{ag.telefone}</div>
                                     <div className="text-[10px] text-indigo-500 font-bold mt-1 bg-indigo-50 inline-block px-1.5 rounded">{ag.atividade}</div>
                                     {isIncidente && ag.dadosIncidente?.endereco && (
                                          <div className="text-[10px] text-rose-600 mt-1 font-medium max-w-[150px] leading-tight">📍 {ag.dadosIncidente.endereco}</div>
                                     )}
                                 </td>
                                 <td className="p-3 align-top text-slate-600">{ag.cidade}</td>
                                 <td className="p-3 align-top">
                                     <div className="flex items-center gap-2">
                                         <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${ag.tecnicoNome === 'Desconhecido' ? 'bg-slate-200 text-slate-500' : 'bg-indigo-100 text-indigo-600'}`}>
                                             {ag.tecnicoNome.charAt(0)}
                                         </div>
                                         <span className="text-sm font-medium">{ag.tecnicoNome}</span>
                                     </div>
                                 </td>
                                 <td className="p-3 align-top text-center">
                                     {isPre ? (
                                         <span className="px-2 py-1 rounded bg-amber-100 text-amber-700 text-xs font-bold border border-amber-200">Pré-Reserva</span>
                                     ) : isIncidente ? (
                                         <span className="px-2 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200">Incidente</span>
                                     ) : (
                                         <span className="px-2 py-1 rounded bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">Confirmado</span>
                                     )}
                                 </td>
                                 <td className="p-3 align-top">
                                     {isPre ? (
                                         <button 
                                             onClick={(e) => handleManualConfirm(e, ag.id)}
                                             className="w-full py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded shadow-sm transition-colors mb-2"
                                         >
                                             Confirmar Agora
                                         </button>
                                     ) : (
                                         <div className="space-y-2">
                                             <select 
                                                 className={`w-full p-1.5 text-xs rounded border outline-none font-bold cursor-pointer ${
                                                     ag.statusExecucao === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                     ag.statusExecucao === 'Não Finalizado' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                     ag.statusExecucao === 'Em Andamento' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                     'bg-slate-50 text-slate-600 border-slate-200'
                                                 }`}
                                                 value={ag.statusExecucao}
                                                 onChange={(e) => handleExecutionStatusChange(idx, e.target.value as StatusExecucao)}
                                             >
                                                 <option value="Pendente">Pendente</option>
                                                 <option value="Em Andamento">Em Andamento</option>
                                                 <option value="Concluído">Concluído</option>
                                                 <option value="Não Finalizado">Não Finalizado</option>
                                             </select>
                                             
                                             {ag.statusExecucao === 'Não Finalizado' && (
                                                 <input 
                                                     type="text"
                                                     placeholder="Motivo (Obrigatório)"
                                                     className="w-full p-1.5 text-xs border border-rose-300 rounded bg-rose-50 text-rose-800 placeholder-rose-300 outline-none focus:ring-1 focus:ring-rose-500"
                                                     value={ag.motivoNaoConclusao || ''}
                                                     onChange={(e) => handleMotivoChange(idx, e.target.value)}
                                                 />
                                             )}
                                         </div>
                                     )}
                                 </td>
                                 <td className="p-3 align-top">
                                     <textarea 
                                         className="w-full p-1.5 text-xs bg-slate-50 border-transparent hover:border-slate-200 rounded focus:bg-white focus:border-indigo-300 outline-none resize-none h-16 transition-all"
                                         placeholder="Observações..."
                                         value={ag.observacao || ''}
                                         onChange={(e) => handleObservacaoChange(idx, e.target.value)}
                                     />
                                     {isIncidente && ag.dadosIncidente?.descricaoTecnico && (
                                         <div className="mt-1 text-[10px] text-slate-500 bg-slate-100 p-1 rounded italic">
                                             "{(ag.dadosIncidente.descricaoTecnico)}"
                                         </div>
                                     )}
                                 </td>
                                 <td className="p-3 align-top text-center space-y-2">
                                      <button 
                                         onClick={() => openRescheduleModal(ag)}
                                         className="p-1.5 text-amber-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors w-full flex justify-center"
                                         title="Reagendar"
                                     >
                                         <RefreshCwIcon className="w-4 h-4" />
                                     </button>
                                     <button 
                                         onClick={() => handleDeleteAgendamento(idx)}
                                         className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors w-full flex justify-center"
                                         title="Excluir"
                                     >
                                         &times;
                                     </button>
                                 </td>
                             </tr>
                         )})}
                         {filteredAgendamentos.length === 0 && (
                             <tr><td colSpan={8} className="p-8 text-center text-slate-400">Nenhum agendamento encontrado com os filtros atuais.</td></tr>
                         )}
                     </tbody>
                 </table>
                 </div>
             </div>
         )}

      </div>
    </div>
  );
};

export default SheetEditor;
