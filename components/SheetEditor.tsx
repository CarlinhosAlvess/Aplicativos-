
import React, { useState, useEffect } from 'react';
import { getSheetData, saveSheetData } from '../services/mockSheetService';
import { DatabaseSchema, Tecnico, StatusExecucao } from '../types';
import { SaveIcon, TableIcon, LockIcon } from './Icons';

const SheetEditor = () => {
  const [data, setData] = useState<DatabaseSchema | null>(null);
  const [activeTab, setActiveTab] = useState<'tecnicos' | 'agendamentos' | 'atividades' | 'cidades' | 'usuarios' | 'feriados'>('tecnicos');
  const [newCityInput, setNewCityInput] = useState<{techIndex: number, value: string} | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    setData(getSheetData());
    
    // Check for persistent session
    const savedUser = sessionStorage.getItem('app_sheet_user');
    if (savedUser) {
        setLoginUser(savedUser);
        setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!data) return;
    
    // Find the user in the database
    const targetUser = data.usuarios.find(u => u.nome === loginUser);

    if (targetUser && targetUser.senha === loginPass) {
        setIsAuthenticated(true);
        setLoginError('');
        sessionStorage.setItem('app_sheet_user', loginUser); // Persist session
    } else {
        setLoginError('Senha incorreta para este usuário.');
    }
  };

  const handleLogout = () => {
      setIsAuthenticated(false);
      setLoginUser('');
      setLoginPass('');
      sessionStorage.removeItem('app_sheet_user');
  };

  const handleTechChange = (index: number, field: keyof Tecnico, value: string | number) => {
    if (!data) return;
    const newTechs = [...data.tecnicos];
    const numFields = ['capacidadeManha', 'capacidadeTarde', 'capacidadeNoite', 'capacidadeSabado', 'capacidadeDomingo', 'capacidadeFeriado'];
    if (numFields.includes(field as string)) {
        (newTechs[index] as any)[field] = Number(value);
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
      const newUsers = [...(data.usuarios || [])];
      newUsers[index].nome = value;
      setData({ ...data, usuarios: newUsers });
  };

  const handleUsuarioPassChange = (index: number, value: string) => {
      if (!data) return;
      const newUsers = [...(data.usuarios || [])];
      newUsers[index].senha = value;
      setData({ ...data, usuarios: newUsers });
  };

  const handleDeleteUsuario = (index: number) => {
      if(!data) return;
      const newUsers = [...(data.usuarios || [])];
      newUsers.splice(index, 1);
      setData({...data, usuarios: newUsers});
  }

  const handleAddUsuario = () => {
      if(!data) return;
      const newUsers = [...(data.usuarios || []), { nome: "Novo Usuário", senha: "123" }];
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

  const handleExecutionStatusChange = (index: number, value: StatusExecucao) => {
      if (!data) return;
      const newAgendamentos = [...data.agendamentos];
      newAgendamentos[index].statusExecucao = value;
      if (value !== 'Não Finalizado') {
          newAgendamentos[index].motivoNaoConclusao = '';
      }
      setData({ ...data, agendamentos: newAgendamentos });
  }

  const handleMotivoChange = (index: number, value: string) => {
      if (!data) return;
      const newAgendamentos = [...data.agendamentos];
      newAgendamentos[index].motivoNaoConclusao = value;
      setData({ ...data, agendamentos: newAgendamentos });
  }

  const handleSave = () => {
    if (data) {
      saveSheetData(data);
      alert('Dados salvos com sucesso.');
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

  const isAdmin = loginUser === 'Administrador';

  if (!data) return <div className="text-center p-10 text-slate-500">Iniciando base de dados...</div>;

  if (!isAuthenticated) {
      return (
          <div className="flex flex-col items-center justify-center h-[500px] bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100">
              <div className="bg-slate-50 p-10 rounded-2xl border border-slate-200 text-center max-w-sm w-full">
                  <div className="flex justify-center mb-6">
                      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                        <LockIcon className="w-8 h-8 text-slate-700" />
                      </div>
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Área de Gestão</h2>
                  <p className="text-sm text-slate-500 mb-8 font-light">Identifique-se para gerenciar os dados.</p>
                  
                  <form onSubmit={handleLogin} className="space-y-5">
                      <div className="text-left">
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Usuário</label>
                          <select 
                             className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium transition-all"
                             value={loginUser}
                             onChange={(e) => setLoginUser(e.target.value)}
                             required
                          >
                              <option value="">Selecione...</option>
                              {(data.usuarios || []).map(u => <option key={u.nome} value={u.nome}>{u.nome}</option>)}
                          </select>
                      </div>
                      <div className="text-left">
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Senha</label>
                          <input 
                            type="password" 
                            className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium transition-all"
                            placeholder="••••••"
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            required
                          />
                      </div>
                      
                      {loginError && (
                          <div className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-lg border border-rose-100">
                              {loginError}
                          </div>
                      )}

                      <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200">
                          Acessar Base de Dados
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  const tabClass = (tab: string) => `px-4 py-3 rounded-t-xl text-sm font-bold transition-all whitespace-nowrap ${
    activeTab === tab 
      ? 'bg-white text-indigo-600 shadow-[0_-2px_10px_rgba(0,0,0,0.02)] border-t-2 border-indigo-500' 
      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
  }`;

  return (
    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden flex flex-col h-[650px]">
      <div className="bg-slate-50 border-b border-slate-200 p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-lg border border-slate-200 shadow-sm"><TableIcon className="w-5 h-5 text-indigo-600" /></div>
          <span className="font-bold text-slate-700">Editor de Dados</span>
        </div>
        <div className="flex items-center gap-4">
             <span className="text-xs font-medium text-slate-400">Logado: <span className="text-slate-700 font-bold">{loginUser}</span> {isAdmin && <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] uppercase ml-1">Admin</span>}</span>
            <button 
                onClick={handleLogout}
                className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 px-3 py-2 rounded-lg transition-all flex items-center gap-2 text-xs font-bold uppercase tracking-wider"
                title="Bloquear Acesso"
            >
                <LockIcon className="w-4 h-4" />
                Bloquear
            </button>
            <button 
                onClick={handleSave}
                className="bg-indigo-600 text-white px-5 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-100 flex items-center gap-2"
            >
                <SaveIcon className="w-4 h-4" />
                Salvar
            </button>
        </div>
      </div>

      <div className="bg-slate-50 px-6 pt-2 flex gap-2 overflow-x-auto border-b border-slate-200 scrollbar-hide">
        <button onClick={() => setActiveTab('tecnicos')} className={tabClass('tecnicos')}>Técnicos</button>
        <button onClick={() => setActiveTab('agendamentos')} className={tabClass('agendamentos')}>Agendamentos</button>
        <button onClick={() => setActiveTab('cidades')} className={tabClass('cidades')}>Cidades</button>
        <button onClick={() => setActiveTab('atividades')} className={tabClass('atividades')}>Atividades</button>
        <button onClick={() => setActiveTab('usuarios')} className={tabClass('usuarios')}>Usuários</button>
        <button onClick={() => setActiveTab('feriados')} className={tabClass('feriados')}>Feriados</button>
      </div>

      <div className="flex-1 overflow-auto bg-white p-6">
        
        {activeTab === 'tecnicos' && (
          <div className="space-y-6">
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                  <span className="text-amber-500 text-xl">💡</span>
                  <p className="text-sm text-amber-800 leading-relaxed">
                      <strong>Dica de Capacidade:</strong> Para fins de semana e feriados, o número define o total de visitas permitidas no dia inteiro (ignorando turnos).
                  </p>
              </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-100">
                  <th className="p-4 font-bold text-slate-600 rounded-tl-xl">Nome</th>
                  <th className="p-4 font-bold text-slate-600 min-w-[200px]">Área de Atuação</th>
                  <th className="p-4 font-bold text-slate-600 text-center w-20 bg-indigo-50/50">Manhã</th>
                  <th className="p-4 font-bold text-slate-600 text-center w-20 bg-indigo-50/50">Tarde</th>
                  <th className="p-4 font-bold text-slate-600 text-center w-20 bg-indigo-50/50">18h</th>
                  <th className="p-4 font-bold text-slate-600 text-center w-20 bg-amber-50/50">Sáb</th>
                  <th className="p-4 font-bold text-slate-600 text-center w-20 bg-rose-50/50">Dom</th>
                  <th className="p-4 font-bold text-slate-600 text-center w-20 rounded-tr-xl bg-purple-50/50">Feriado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.tecnicos.map((tech, idx) => (
                  <tr key={tech.id} className="hover:bg-slate-50 transition-colors group">
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
                                    <button onClick={() => handleRemoveCityFromTech(idx, city)} className="text-slate-400 hover:text-rose-500 transition-colors">×</button>
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
                    {/* Capacidades */}
                    <td className="p-1 bg-indigo-50/30"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-medium text-slate-600" value={tech.capacidadeManha} onChange={(e) => handleTechChange(idx, 'capacidadeManha', e.target.value)} /></td>
                    <td className="p-1 bg-indigo-50/30"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-medium text-slate-600" value={tech.capacidadeTarde} onChange={(e) => handleTechChange(idx, 'capacidadeTarde', e.target.value)} /></td>
                    <td className="p-1 bg-indigo-50/30"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-medium text-slate-600" value={tech.capacidadeNoite || 0} onChange={(e) => handleTechChange(idx, 'capacidadeNoite', e.target.value)} /></td>
                    
                    <td className="p-1 bg-amber-50/30"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-bold text-amber-700" value={tech.capacidadeSabado || 0} onChange={(e) => handleTechChange(idx, 'capacidadeSabado', e.target.value)} /></td>
                    <td className="p-1 bg-rose-50/30"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-bold text-rose-700" value={tech.capacidadeDomingo || 0} onChange={(e) => handleTechChange(idx, 'capacidadeDomingo', e.target.value)} /></td>
                    <td className="p-1 bg-purple-50/30"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-bold text-purple-700" value={tech.capacidadeFeriado || 0} onChange={(e) => handleTechChange(idx, 'capacidadeFeriado', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAddTech} className="text-indigo-600 hover:text-indigo-800 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-lg transition-colors shadow-sm">+ Novo Técnico</button>
          </div>
        )}

        {/* Generic Lists */}
        {['cidades', 'atividades', 'feriados'].includes(activeTab) && (
            <div className="space-y-4">
                 <table className="w-full border-collapse text-sm max-w-lg">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100">
                            <th className="p-3 font-bold text-slate-600 rounded-tl-lg">
                                {activeTab === 'feriados' ? 'Data (YYYY-MM-DD)' : 'Nome / Valor'}
                            </th>
                            <th className="p-3 font-bold text-slate-600 w-24 text-center rounded-tr-lg">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {((data as any)[activeTab] || []).map((item: string, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50 group">
                                <td className="p-2">
                                    <input 
                                        type={activeTab === 'feriados' ? 'date' : 'text'}
                                        className="w-full p-2 rounded-md bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none text-slate-700 transition-all"
                                        value={item}
                                        onChange={(e) => {
                                            if(activeTab === 'cidades') handleGlobalCityChange(idx, e.target.value);
                                            if(activeTab === 'atividades') handleActivityChange(idx, e.target.value);
                                            if(activeTab === 'feriados') handleFeriadoChange(idx, e.target.value);
                                        }}
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <button 
                                        onClick={() => {
                                            if(activeTab === 'cidades') handleDeleteGlobalCity(idx);
                                            if(activeTab === 'atividades') handleDeleteActivity(idx);
                                            if(activeTab === 'feriados') handleDeleteFeriado(idx);
                                        }}
                                        className="text-slate-300 hover:text-rose-500 font-bold px-2 transition-colors"
                                    >✕</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                 <button 
                    onClick={() => {
                        if(activeTab === 'cidades') handleAddGlobalCity();
                        if(activeTab === 'atividades') handleAddActivity();
                        if(activeTab === 'feriados') handleAddFeriado();
                    }}
                    className="text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                 >
                    + Adicionar Item
                 </button>
            </div>
        )}

        {/* Tab Usuários with Password */}
        {activeTab === 'usuarios' && (
             <div className="space-y-4">
                 {!isAdmin ? (
                     <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 flex gap-3 items-center">
                         <LockIcon className="w-5 h-5 text-rose-500" />
                         <p className="text-sm text-rose-800">
                             <strong>Acesso Restrito:</strong> Apenas o <u>Administrador</u> pode visualizar senhas ou gerenciar outros usuários.
                         </p>
                     </div>
                 ) : (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-4">
                        <p className="text-sm text-indigo-800">
                            <strong>Área Administrativa:</strong> Gerencie aqui os usuários que podem acessar a área de gestão.
                        </p>
                    </div>
                 )}
                 <table className="w-full border-collapse text-sm max-w-2xl">
                    <thead>
                        <tr className="bg-slate-50 text-left border-b border-slate-100">
                            <th className="p-3 font-bold text-slate-600 rounded-tl-lg">Nome do Usuário</th>
                            <th className="p-3 font-bold text-slate-600">Senha de Acesso</th>
                            <th className="p-3 font-bold text-slate-600 w-24 text-center rounded-tr-lg">Ação</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {data.usuarios.map((user, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 group">
                                <td className="p-2">
                                    <input 
                                        type="text"
                                        disabled={!isAdmin}
                                        className={`w-full p-2 rounded-md bg-transparent outline-none text-slate-700 transition-all font-medium ${isAdmin ? 'focus:bg-white focus:ring-2 focus:ring-indigo-100' : 'cursor-not-allowed opacity-70'}`}
                                        value={user.nome}
                                        onChange={(e) => handleUsuarioNameChange(idx, e.target.value)}
                                        placeholder="Nome do usuário"
                                    />
                                </td>
                                <td className="p-2">
                                    {isAdmin ? (
                                        <input 
                                            type="text"
                                            className="w-full p-2 rounded-md bg-transparent focus:bg-white focus:ring-2 focus:ring-indigo-100 outline-none text-slate-600 transition-all font-mono"
                                            value={user.senha}
                                            onChange={(e) => handleUsuarioPassChange(idx, e.target.value)}
                                            placeholder="Senha"
                                        />
                                    ) : (
                                        <div className="p-2 text-slate-400 font-mono tracking-widest text-sm select-none">••••••</div>
                                    )}
                                </td>
                                <td className="p-2 text-center">
                                    {isAdmin && (
                                        <button 
                                            onClick={() => handleDeleteUsuario(idx)}
                                            className="text-slate-300 hover:text-rose-500 font-bold px-2 transition-colors"
                                        >✕</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                 </table>
                 {isAdmin && (
                    <button 
                        onClick={handleAddUsuario}
                        className="text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                    >
                        + Novo Usuário
                    </button>
                 )}
            </div>
        )}
        
        {activeTab === 'agendamentos' && (
          <div className="space-y-4">
             <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-100">
                  <th className="p-3 font-bold text-slate-600">Data</th>
                  <th className="p-3 font-bold text-slate-600">Usuário</th>
                  <th className="p-3 font-bold text-slate-600">Cliente / Técnico</th>
                  <th className="p-3 font-bold text-slate-600">Atividade / Cidade</th>
                  <th className="p-3 font-bold text-slate-600 bg-amber-50/50">Status</th>
                  <th className="p-3 font-bold text-slate-600 bg-amber-50/50">Obs. Falha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.agendamentos.map((ag, idx) => (
                    <tr key={ag.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                            <div className="font-bold text-slate-700">{ag.data}</div>
                            <div className="text-xs text-slate-400 font-medium uppercase">{ag.periodo.split(' ')[0]}</div>
                        </td>
                         <td className="p-3 text-slate-500 font-medium">{ag.nomeUsuario || '-'}</td>
                        <td className="p-3">
                            <div className="font-semibold text-slate-800">{ag.cliente}</div>
                            <div className="text-indigo-600 text-xs mt-0.5">{ag.tecnicoNome}</div>
                        </td>
                        <td className="p-3">
                            <div className="text-slate-700">{ag.atividade || '-'}</div>
                            <div className="text-slate-400 text-xs mt-0.5">{ag.cidade}</div>
                        </td>
                        <td className="p-1 bg-amber-50/30">
                           <select 
                                value={ag.statusExecucao || 'Pendente'}
                                onChange={(e) => handleExecutionStatusChange(idx, e.target.value as StatusExecucao)}
                                className={`w-full p-2 bg-transparent rounded-lg outline-none font-bold text-xs border border-transparent focus:bg-white focus:shadow-sm transition-all ${
                                    ag.statusExecucao === 'Concluído' ? 'text-emerald-600' :
                                    ag.statusExecucao === 'Não Finalizado' ? 'text-rose-600' :
                                    'text-amber-600'
                                }`}
                           >
                               <option value="Pendente">Pendente</option>
                               <option value="Em Andamento">Em Andamento</option>
                               <option value="Concluído">Concluído</option>
                               <option value="Não Finalizado">Não Finalizado</option>
                           </select>
                        </td>
                        <td className="p-1 bg-amber-50/30">
                            {ag.statusExecucao === 'Não Finalizado' ? (
                                <input 
                                    className="w-full p-2 text-xs bg-white/50 border border-slate-200 rounded text-rose-700 outline-none focus:ring-1 focus:ring-rose-200" 
                                    placeholder="Descreva o motivo..."
                                    value={ag.motivoNaoConclusao || ''} 
                                    onChange={(e) => handleMotivoChange(idx, e.target.value)} 
                                />
                            ) : <span className="block text-center text-slate-300">-</span>}
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

export default SheetEditor;
