
import React, { useState, useEffect, useRef } from 'react';
import { getSheetData, saveSheetData, confirmarPreAgendamento, removeAgendamento, addLog } from '../services/mockSheetService';
import { DatabaseSchema, Tecnico, StatusExecucao, Agendamento, Periodo, UserProfile, UsuarioPermissoes } from '../types';
import { SaveIcon, TableIcon, CloudIcon, CodeIcon, AlertIcon, EditIcon, SearchIcon } from './Icons';

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
  }, [activeTab]);

  // Auto-Save Effect
  useEffect(() => {
      // Ignora a primeira renderização para não salvar dados recém carregados desnecessariamente
      if (isFirstRender.current) {
          isFirstRender.current = false;
          return;
      }

      if (data) {
          // Salva automaticamente após 2 segundos sem digitar
          const timer = setTimeout(() => {
              saveSheetData(data);
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
      
      // Force save first
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
      const newAgendamentos = [...data.agendamentos];
      
      if (field === 'tecnicoId') {
          const tech = data.tecnicos.find(t => t.id === value);
          newAgendamentos[index].tecnicoId = value;
          newAgendamentos[index].tecnicoNome = tech ? tech.nome : 'Desconhecido';
      } else {
          (newAgendamentos[index] as any)[field] = value;
      }

      if (field === 'statusExecucao' && value !== 'Não Finalizado') {
          newAgendamentos[index].motivoNaoConclusao = '';
      }

      setData({ ...data, agendamentos: newAgendamentos });
  }

  const handleExecutionStatusChange = (index: number, value: StatusExecucao) => {
      handleAgendamentoChange(index, 'statusExecucao', value);
  };

  const handleMotivoChange = (index: number, value: string) => {
      handleAgendamentoChange(index, 'motivoNaoConclusao', value);
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
      saveSheetData(data);
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

  const handleManualConfirm = (id: string) => {
      if (confirm('Confirmar este pré-agendamento manualmente?')) {
          confirmarPreAgendamento(id);
          addLog(currentUser.nome, 'Confirmar Manual', `Confirmou pré-agendamento ID: ${id}`);
      }
  }

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

  const filteredAgendamentos = data.agendamentos.map((a, i) => ({ ...a, originalIndex: i })).reverse().filter(a =>
      !searchTerm ||
      a.cliente.toLowerCase().includes(lowerSearch) ||
      a.tecnicoNome.toLowerCase().includes(lowerSearch) ||
      a.cidade.toLowerCase().includes(lowerSearch) ||
      a.data.includes(searchTerm) ||
      a.statusExecucao.toLowerCase().includes(lowerSearch)
  );

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
                            return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="p-2">
                                    <input 
                                        className="w-full p-2 rounded-lg border-transparent hover:border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none bg-transparent transition-all text-slate-700"
                                        value={item.value}
                                        type={activeTab === 'feriados' ? 'date' : 'text'}
                                        onChange={(e) => {
                                            if (activeTab === 'cidades') handleGlobalCityChange(idx, e.target.value);
                                            else if (activeTab === 'atividades') handleActivityChange(idx, e.target.value);
                                            else handleFeriadoChange(idx, e.target.value);
                                        }}
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <button 
                                        onClick={() => {
                                            if (activeTab === 'cidades') handleDeleteGlobalCity(idx);
                                            else if (activeTab === 'atividades') handleDeleteActivity(idx);
                                            else handleDeleteFeriado(idx);
                                        }} 
                                        className="text-slate-300 hover:text-rose-500 transition-colors"
                                    >
                                        &times;
                                    </button>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
                <button 
                    onClick={() => {
                        if (activeTab === 'cidades') handleAddGlobalCity();
                        else if (activeTab === 'atividades') handleAddActivity();
                        else handleAddFeriado();
                    }} 
                    className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg transition-colors shadow-sm"
                >
                    + Adicionar Item
                </button>
            </div>
        )}

        {activeTab === 'usuarios' && (
             <div className="space-y-4">
                 <div className="bg-indigo-50 text-indigo-800 text-xs p-3 rounded-lg border border-indigo-100 mb-4 inline-block">
                     ⚠️ Selecione <strong>Admin</strong> para acesso total ou personalize as permissões individualmente. A conta <strong>Administrador</strong> principal é protegida.
                 </div>
                 <table className="w-full border-collapse text-sm max-w-4xl">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 rounded-tl-lg w-1/4 shadow-sm">Usuário</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 w-1/4 shadow-sm">Senha</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 w-1/6 shadow-sm">Atalho Perfil</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 text-center w-1/3 shadow-sm">Permissões de Acesso</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 w-10 rounded-tr-lg shadow-sm"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredUsuarios.map((user) => {
                            const idx = user.originalIndex;
                            const isRootAdmin = user.nome === 'Administrador';
                            return (
                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-2">
                                        <input 
                                            className={`w-full p-2 rounded-lg border-transparent outline-none bg-transparent transition-all font-medium ${isRootAdmin ? 'text-slate-500 cursor-not-allowed bg-slate-50' : 'hover:border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-slate-700'}`}
                                            value={user.nome}
                                            onChange={(e) => handleUsuarioNameChange(idx, e.target.value)}
                                            placeholder="Ex: Gerente"
                                            disabled={isRootAdmin}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input 
                                            className={`w-full p-2 rounded-lg border-transparent outline-none bg-transparent transition-all font-mono text-xs ${isRootAdmin ? 'text-slate-400 cursor-not-allowed bg-slate-50' : 'hover:border-slate-200 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 text-slate-500'}`}
                                            value={isRootAdmin ? '••••••••' : user.senha}
                                            onChange={(e) => handleUsuarioPassChange(idx, e.target.value)}
                                            placeholder="Senha"
                                            type={isRootAdmin ? "password" : "text"}
                                            disabled={isRootAdmin}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <select
                                            className={`w-full p-2 rounded-lg text-xs font-bold border outline-none ${
                                                isRootAdmin ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' :
                                                user.perfil === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                                                'bg-slate-50 text-slate-600 border-slate-100'
                                            }`}
                                            value={user.perfil}
                                            onChange={(e) => handleUsuarioProfileChange(idx, e.target.value as UserProfile)}
                                            disabled={isRootAdmin}
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </td>
                                    <td className="p-2">
                                        <div className={`flex items-center justify-center gap-4 ${isRootAdmin ? 'opacity-50 pointer-events-none' : ''}`}>
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    checked={user.permissoes?.agendamento ?? true}
                                                    onChange={(e) => handleUsuarioPermissaoChange(idx, 'agendamento', e.target.checked)}
                                                    disabled={isRootAdmin}
                                                />
                                                <span className="text-xs text-slate-700 font-medium">Agenda</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    checked={user.permissoes?.dashboard ?? true}
                                                    onChange={(e) => handleUsuarioPermissaoChange(idx, 'dashboard', e.target.checked)}
                                                    disabled={isRootAdmin}
                                                />
                                                <span className="text-xs text-slate-700 font-medium">Dash</span>
                                            </label>
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                                <input 
                                                    type="checkbox" 
                                                    className="w-4 h-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                                                    checked={user.permissoes?.planilha ?? false}
                                                    onChange={(e) => handleUsuarioPermissaoChange(idx, 'planilha', e.target.checked)}
                                                    disabled={isRootAdmin}
                                                />
                                                <span className="text-xs text-slate-700 font-medium">Planilha</span>
                                            </label>
                                        </div>
                                    </td>
                                    <td className="p-2 text-center">
                                        {!isRootAdmin && (
                                            <button onClick={() => handleDeleteUsuario(idx)} className="text-slate-300 hover:text-rose-500 transition-colors">&times;</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <button onClick={handleAddUsuario} className="text-indigo-600 hover:text-indigo-800 font-bold text-xs bg-indigo-50 px-3 py-2 rounded-lg transition-colors shadow-sm">+ Novo Usuário</button>
            </div>
        )}

        {activeTab === 'logs' && (
             <div className="space-y-4">
                 <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                                <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 rounded-tl-lg shadow-sm">Data/Hora</th>
                                <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Usuário</th>
                                <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Ação</th>
                                <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 rounded-tr-lg shadow-sm">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="p-3 text-slate-500 text-xs font-mono whitespace-nowrap">
                                        {new Date(log.timestamp).toLocaleString()}
                                    </td>
                                    <td className="p-3 font-bold text-slate-700">
                                        {log.usuario}
                                    </td>
                                    <td className="p-3 text-indigo-600 font-medium">
                                        {log.acao}
                                    </td>
                                    <td className="p-3 text-slate-600 text-xs">
                                        {log.detalhes}
                                    </td>
                                </tr>
                            ))}
                            {filteredLogs.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">Nenhum registro encontrado para este filtro.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {activeTab === 'agendamentos' && (
             <div className="space-y-4">
                 <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                     <span className="text-xs font-bold text-slate-500 uppercase tracking-wide px-2 py-1">Filtros:</span>
                     <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">Todos ({data.agendamentos.length})</span>
                     {searchTerm && <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200">Filtrado ({filteredAgendamentos.length})</span>}
                 </div>
                 <div className="overflow-x-auto pb-10">
                 <table className="w-full border-collapse text-sm whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100 shadow-sm">
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 rounded-tl-lg w-12 shadow-sm">Editar</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Data</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Cliente</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Cidade</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Técnico</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Período</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Tipo</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Criado Por</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 shadow-sm">Status Execução</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 font-bold text-slate-600 rounded-tr-lg shadow-sm">Motivo (se falha)</th>
                            <th className="sticky top-0 z-20 bg-slate-50 p-3 shadow-sm"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredAgendamentos.map((ag) => {
                             const realIdx = ag.originalIndex;
                             const isEditing = editingAgendamentoId === ag.id;

                             return (
                            <tr key={ag.id} className="hover:bg-slate-50 transition-colors">
                                <td className="p-3 text-center">
                                    <button
                                        onClick={() => {
                                            if (isEditing) {
                                                handleSave(); // Explicit save when finishing edit
                                                setEditingAgendamentoId(null);
                                                addLog(currentUser.nome, 'Editar Agendamento', `ID: ${ag.id}, Cliente: ${ag.cliente}`);
                                            } else {
                                                setEditingAgendamentoId(ag.id);
                                            }
                                        }}
                                        className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-indigo-600'}`}
                                        title={isEditing ? 'Concluir Edição' : 'Editar Agendamento'}
                                    >
                                        {isEditing ? <SaveIcon className="w-4 h-4" /> : <EditIcon className="w-4 h-4" />}
                                    </button>
                                </td>
                                
                                <td className="p-3 text-slate-600 font-mono text-xs">
                                    {isEditing ? (
                                        <input 
                                            type="date" 
                                            className="bg-white border border-slate-300 rounded px-2 py-1 w-full text-xs"
                                            value={ag.data}
                                            onChange={(e) => handleAgendamentoChange(realIdx, 'data', e.target.value)}
                                        />
                                    ) : ag.data}
                                </td>
                                
                                <td className="p-3 font-medium text-slate-800">
                                    {isEditing ? (
                                        <div className="flex flex-col gap-1">
                                            <input 
                                                className="bg-white border border-slate-300 rounded px-2 py-1 w-full text-xs"
                                                value={ag.cliente}
                                                onChange={(e) => handleAgendamentoChange(realIdx, 'cliente', e.target.value)}
                                                placeholder="Nome"
                                            />
                                            <input 
                                                className="bg-white border border-slate-300 rounded px-2 py-1 w-full text-[10px]"
                                                value={ag.telefone}
                                                onChange={(e) => handleAgendamentoChange(realIdx, 'telefone', e.target.value)}
                                                placeholder="Telefone"
                                            />
                                        </div>
                                    ) : (
                                        <>
                                            {ag.cliente}
                                            <div className="text-[10px] text-slate-400">{ag.telefone}</div>
                                        </>
                                    )}
                                </td>
                                
                                <td className="p-3 text-slate-600">
                                    {isEditing ? (
                                        <select 
                                            className="bg-white border border-slate-300 rounded px-2 py-1 w-full text-xs"
                                            value={ag.cidade}
                                            onChange={(e) => handleAgendamentoChange(realIdx, 'cidade', e.target.value)}
                                        >
                                            {data.cidades.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    ) : ag.cidade}
                                </td>
                                
                                <td className="p-3 text-indigo-600 font-medium">
                                    {isEditing ? (
                                         <select 
                                            className="bg-white border border-slate-300 rounded px-2 py-1 w-full text-xs"
                                            value={ag.tecnicoId}
                                            onChange={(e) => handleAgendamentoChange(realIdx, 'tecnicoId', e.target.value)}
                                        >
                                            {data.tecnicos.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                                        </select>
                                    ) : ag.tecnicoNome}
                                </td>
                                
                                <td className="p-3 text-slate-500 text-xs">
                                     {isEditing ? (
                                         <select 
                                            className="bg-white border border-slate-300 rounded px-2 py-1 w-full text-xs"
                                            value={ag.periodo}
                                            onChange={(e) => handleAgendamentoChange(realIdx, 'periodo', e.target.value)}
                                        >
                                            <option value={Periodo.MANHA}>Manhã</option>
                                            <option value={Periodo.TARDE}>Tarde</option>
                                            <option value={Periodo.NOITE}>Especial (18h)</option>
                                        </select>
                                    ) : ag.periodo.split('(')[0]}
                                </td>
                                
                                <td className="p-3">
                                    {ag.tipo === 'PRE_AGENDAMENTO' ? (
                                        <div className="flex flex-col gap-1">
                                            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold border border-amber-200 w-fit">
                                                PRÉ-AGENDA
                                            </span>
                                            {ag.criadoEm && <CountdownTimer criadoEm={ag.criadoEm} />}
                                            <button 
                                                onClick={() => handleManualConfirm(ag.id)}
                                                className="text-[10px] text-indigo-600 hover:underline font-bold text-left"
                                            >
                                                Confirmar Manualmente
                                            </button>
                                        </div>
                                    ) : (
                                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px] font-bold">PADRÃO</span>
                                    )}
                                </td>

                                <td className="p-3 text-slate-500 text-xs font-medium">
                                    <div className="flex items-center gap-1">
                                        <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] border border-slate-200 uppercase">
                                            {(ag.nomeUsuario || '?').charAt(0)}
                                        </span>
                                        {ag.nomeUsuario || 'Sistema'}
                                    </div>
                                </td>

                                <td className="p-3">
                                    <select 
                                        className={`p-1.5 rounded-lg text-xs font-bold border outline-none ${
                                            ag.statusExecucao === 'Concluído' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                            ag.statusExecucao === 'Não Finalizado' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                            ag.statusExecucao === 'Em Andamento' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                            'bg-slate-50 text-slate-600 border-slate-200'
                                        }`}
                                        value={ag.statusExecucao}
                                        onChange={(e) => handleExecutionStatusChange(realIdx, e.target.value as StatusExecucao)}
                                    >
                                        <option value="Pendente">Pendente</option>
                                        <option value="Em Andamento">Em Andamento</option>
                                        <option value="Concluído">Concluído</option>
                                        <option value="Não Finalizado">Não Finalizado</option>
                                    </select>
                                </td>
                                <td className="p-3">
                                    {ag.statusExecucao === 'Não Finalizado' ? (
                                        <input 
                                            className="w-full p-2 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs placeholder-rose-300 outline-none focus:ring-1 focus:ring-rose-300 transition-colors"
                                            placeholder="Motivo obrigatório..."
                                            value={ag.motivoNaoConclusao || ''}
                                            onChange={(e) => handleMotivoChange(realIdx, e.target.value)}
                                        />
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <button 
                                        onClick={() => handleDeleteAgendamento(realIdx)}
                                        className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                                        title="Excluir Agendamento"
                                    >
                                        <TableIcon className="w-4 h-4" /> 
                                    </button>
                                </td>
                            </tr>
                        )})}
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
