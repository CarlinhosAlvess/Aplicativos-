
import React, { useState, useEffect } from 'react';
import { getSheetData, saveSheetData } from '../services/mockSheetService';
import { DatabaseSchema, Tecnico, StatusExecucao } from '../types';
import { SaveIcon, TableIcon } from './Icons';

const SheetEditor = () => {
  const [data, setData] = useState<DatabaseSchema | null>(null);
  const [activeTab, setActiveTab] = useState<'tecnicos' | 'agendamentos' | 'atividades' | 'cidades' | 'usuarios' | 'feriados'>('tecnicos');
  const [newCityInput, setNewCityInput] = useState<{techIndex: number, value: string} | null>(null);

  useEffect(() => {
    setData(getSheetData());
  }, []);

  const handleTechChange = (index: number, field: keyof Tecnico, value: string | number) => {
    if (!data) return;
    const newTechs = [...data.tecnicos];
    
    // Lista de campos numéricos
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

  const handleUsuarioChange = (index: number, value: string) => {
      if (!data) return;
      const newUsers = [...(data.usuarios || [])];
      newUsers[index] = value;
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
      const newUsers = [...(data.usuarios || []), "Novo Usuário"];
      setData({...data, usuarios: newUsers});
  }

  // --- CRUD FERIADOS ---
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
    // Adiciona data de amanhã como default
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
      alert('Planilha atualizada com sucesso!');
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

  if (!data) return <div>Carregando planilha...</div>;

  const tabClass = (tab: string) => `px-4 py-2 rounded-t-lg text-sm font-medium transition-colors whitespace-nowrap ${
    activeTab === tab 
      ? 'bg-white text-green-800 border-t border-x border-gray-300 shadow-sm relative top-[1px]' 
      : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
  }`;

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[600px]">
      <div className="bg-green-700 p-3 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <TableIcon className="w-6 h-6" />
          <span className="font-semibold text-lg">Google Sheets (Simulação)</span>
        </div>
        <button 
            onClick={handleSave}
            className="bg-white text-green-700 px-4 py-1.5 rounded font-bold text-sm hover:bg-green-50 transition flex items-center gap-2"
        >
            <SaveIcon className="w-4 h-4" />
            Salvar Alterações
        </button>
      </div>

      <div className="bg-gray-100 border-b border-gray-300 flex px-2 pt-2 gap-1 overflow-x-auto">
        <button onClick={() => setActiveTab('tecnicos')} className={tabClass('tecnicos')}>
          Página1 (Técnicos)
        </button>
        <button onClick={() => setActiveTab('agendamentos')} className={tabClass('agendamentos')}>
          Página2 (Agendamentos)
        </button>
        <button onClick={() => setActiveTab('cidades')} className={tabClass('cidades')}>
          Página3 (Cidades)
        </button>
        <button onClick={() => setActiveTab('atividades')} className={tabClass('atividades')}>
          Página4 (Atividades)
        </button>
        <button onClick={() => setActiveTab('usuarios')} className={tabClass('usuarios')}>
          Página5 (Usuários)
        </button>
        <button onClick={() => setActiveTab('feriados')} className={tabClass('feriados')}>
          Página6 (Feriados)
        </button>
      </div>

      <div className="flex-1 overflow-auto bg-white p-4">
        {activeTab === 'tecnicos' && (
          <div className="space-y-4">
              <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
                  <p className="text-sm text-yellow-700">
                      <strong>Capacidades:</strong> Para Sábados, Domingos e Feriados, a capacidade definida é o <strong>total do dia</strong>, independente do período (Manhã/Tarde).
                  </p>
              </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border p-2">Nome</th>
                  <th className="border p-2 min-w-[200px]">Cidades</th>
                  <th className="border p-2 w-16 bg-blue-50 text-center" title="Capacidade Manhã">Manhã</th>
                  <th className="border p-2 w-16 bg-blue-50 text-center" title="Capacidade Tarde">Tarde</th>
                  <th className="border p-2 w-16 bg-blue-50 text-center" title="Capacidade 18h">18h</th>
                  <th className="border p-2 w-16 bg-orange-50 text-center text-orange-800" title="Total Sábado">Sáb</th>
                  <th className="border p-2 w-16 bg-red-50 text-center text-red-800" title="Total Domingo">Dom</th>
                  <th className="border p-2 w-16 bg-purple-50 text-center text-purple-800" title="Total Feriado">Feriado</th>
                </tr>
              </thead>
              <tbody>
                {data.tecnicos.map((tech, idx) => (
                  <tr key={tech.id} className="hover:bg-gray-50">
                    <td className="border p-0">
                      <input 
                        className="w-full p-2 outline-none bg-transparent focus:bg-blue-50"
                        value={tech.nome}
                        onChange={(e) => handleTechChange(idx, 'nome', e.target.value)}
                      />
                    </td>
                    <td className="border p-2">
                        <div className="flex flex-wrap gap-2">
                            {tech.cidades.map((city, cIdx) => (
                                <span key={cIdx} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs flex items-center gap-1">
                                    {city}
                                    <button onClick={() => handleRemoveCityFromTech(idx, city)} className="hover:text-red-600 font-bold">×</button>
                                </span>
                            ))}
                            {newCityInput?.techIndex === idx ? (
                                <select 
                                    autoFocus
                                    className="border border-blue-300 rounded px-1 py-0.5 text-xs w-24 outline-none"
                                    value={newCityInput.value}
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            setNewCityInput({techIndex: idx, value: e.target.value});
                                            setTimeout(() => handleAddCityToTech(idx), 100);
                                        }
                                    }}
                                    onBlur={() => handleAddCityToTech(idx)}
                                >
                                    <option value="">...</option>
                                    {(data.cidades || []).filter(c => !tech.cidades.includes(c)).map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            ) : (
                                <button onClick={() => setNewCityInput({techIndex: idx, value: ''})} className="text-gray-400 hover:text-blue-600 text-xs border border-dashed border-gray-300 px-2 rounded">+</button>
                            )}
                        </div>
                    </td>
                    {/* Dias Úteis */}
                    <td className="border p-0 bg-blue-50"><input type="number" className="w-full p-2 text-center outline-none bg-transparent" value={tech.capacidadeManha} onChange={(e) => handleTechChange(idx, 'capacidadeManha', e.target.value)} /></td>
                    <td className="border p-0 bg-blue-50"><input type="number" className="w-full p-2 text-center outline-none bg-transparent" value={tech.capacidadeTarde} onChange={(e) => handleTechChange(idx, 'capacidadeTarde', e.target.value)} /></td>
                    <td className="border p-0 bg-blue-50"><input type="number" className="w-full p-2 text-center outline-none bg-transparent" value={tech.capacidadeNoite || 0} onChange={(e) => handleTechChange(idx, 'capacidadeNoite', e.target.value)} /></td>
                    
                    {/* Especiais */}
                    <td className="border p-0 bg-orange-50"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-bold text-orange-800" value={tech.capacidadeSabado || 0} onChange={(e) => handleTechChange(idx, 'capacidadeSabado', e.target.value)} /></td>
                    <td className="border p-0 bg-red-50"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-bold text-red-800" value={tech.capacidadeDomingo || 0} onChange={(e) => handleTechChange(idx, 'capacidadeDomingo', e.target.value)} /></td>
                    <td className="border p-0 bg-purple-50"><input type="number" className="w-full p-2 text-center outline-none bg-transparent font-bold text-purple-800" value={tech.capacidadeFeriado || 0} onChange={(e) => handleTechChange(idx, 'capacidadeFeriado', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAddTech} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2">+ Adicionar Técnico</button>
          </div>
        )}

        {activeTab === 'feriados' && (
          <div className="space-y-4">
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                  <p className="text-sm text-purple-700">
                      <strong>Cadastro de Feriados:</strong> Insira aqui as datas que devem ser consideradas feriados. Nesses dias, o sistema usará a "Capacidade Feriado" definida na aba de Técnicos.
                  </p>
              </div>
            <table className="w-full border-collapse text-sm max-w-md">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border p-2 w-12">#</th>
                  <th className="border p-2">Data (YYYY-MM-DD)</th>
                  <th className="border p-2 w-20 text-center">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(data.feriados || []).map((dateStr, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border p-2 text-center text-gray-400">{idx + 1}</td>
                    <td className="border p-0">
                      <input 
                        type="date"
                        className="w-full p-2 outline-none bg-transparent focus:bg-blue-50"
                        value={dateStr}
                        onChange={(e) => handleFeriadoChange(idx, e.target.value)}
                      />
                    </td>
                    <td className="border p-2 text-center">
                        <button onClick={() => handleDeleteFeriado(idx)} className="text-red-500 hover:text-red-700 font-bold px-2" title="Remover">✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAddFeriado} className="text-blue-600 hover:text-blue-800 text-sm font-medium px-2">+ Adicionar Feriado</button>
          </div>
        )}

        {/* --- Outras abas (Agendamentos, Cidades, Atividades, Usuários) mantidas idênticas, apenas renderizadas condicionalmente --- */}
        
        {activeTab === 'agendamentos' && (
          <div className="space-y-4">
             {/* ... conteúdo existente da tabela de agendamentos ... */}
             <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="border p-2">Data/Per.</th>
                  <th className="border p-2">Usuário</th>
                  <th className="border p-2">Cliente/Téc.</th>
                  <th className="border p-2">Atividade</th>
                  <th className="border p-2">Cidade</th>
                  <th className="border p-2 bg-yellow-50">Status Execução</th>
                  <th className="border p-2 bg-yellow-50 min-w-[150px]">Motivo</th>
                </tr>
              </thead>
              <tbody>
                {data.agendamentos.map((ag, idx) => (
                    <tr key={ag.id} className="hover:bg-gray-50">
                        <td className="border p-2 text-xs">
                            <div className="font-bold">{ag.data}</div>
                            <div className="text-gray-500">{ag.periodo}</div>
                        </td>
                         <td className="border p-2 text-xs text-gray-600">{ag.nomeUsuario || '-'}</td>
                        <td className="border p-2 text-xs">
                            <div>{ag.cliente}</div>
                            <div className="text-blue-600 font-medium">{ag.tecnicoNome}</div>
                        </td>
                        <td className="border p-2">{ag.atividade || '-'}</td>
                        <td className="border p-2">{ag.cidade}</td>
                        <td className="border p-0 bg-yellow-50">
                           <select 
                                value={ag.statusExecucao || 'Pendente'}
                                onChange={(e) => handleExecutionStatusChange(idx, e.target.value as StatusExecucao)}
                                className={`w-full h-full p-2 outline-none bg-transparent font-medium ${
                                    ag.statusExecucao === 'Concluído' ? 'text-green-700' :
                                    ag.statusExecucao === 'Não Finalizado' ? 'text-red-700' :
                                    'text-gray-500'
                                }`}
                           >
                               <option value="Pendente">Pendente</option>
                               <option value="Em Andamento">Em Andamento</option>
                               <option value="Concluído">Concluído</option>
                               <option value="Não Finalizado">Não Finalizado</option>
                           </select>
                        </td>
                        <td className="border p-0 bg-yellow-50">
                            {ag.statusExecucao === 'Não Finalizado' ? (
                                <input className="w-full p-2 outline-none bg-transparent text-red-800" value={ag.motivoNaoConclusao || ''} onChange={(e) => handleMotivoChange(idx, e.target.value)} />
                            ) : <span className="block p-2 text-gray-300 text-xs text-center">-</span>}
                        </td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'cidades' && (
             <div className="space-y-4">
            <table className="w-full border-collapse text-sm max-w-md">
              <thead><tr className="bg-gray-50 text-left"><th className="border p-2">Nome</th><th className="border p-2 w-20">Ações</th></tr></thead>
              <tbody>
                {(data.cidades || []).map((city, idx) => (
                  <tr key={idx}><td className="border p-0"><input className="w-full p-2 outline-none" value={city} onChange={(e) => handleGlobalCityChange(idx, e.target.value)}/></td>
                  <td className="border p-2 text-center"><button onClick={() => handleDeleteGlobalCity(idx)} className="text-red-500 font-bold">✕</button></td></tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAddGlobalCity} className="text-blue-600 text-sm font-medium">+ Add Cidade</button>
          </div>
        )}

        {activeTab === 'atividades' && (
             <div className="space-y-4">
            <table className="w-full border-collapse text-sm max-w-md">
              <thead><tr className="bg-gray-50 text-left"><th className="border p-2">Nome</th><th className="border p-2 w-20">Ações</th></tr></thead>
              <tbody>
                {(data.atividades || []).map((ativ, idx) => (
                  <tr key={idx}><td className="border p-0"><input className="w-full p-2 outline-none" value={ativ} onChange={(e) => handleActivityChange(idx, e.target.value)}/></td>
                  <td className="border p-2 text-center"><button onClick={() => handleDeleteActivity(idx)} className="text-red-500 font-bold">✕</button></td></tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAddActivity} className="text-blue-600 text-sm font-medium">+ Add Atividade</button>
          </div>
        )}

        {activeTab === 'usuarios' && (
             <div className="space-y-4">
            <table className="w-full border-collapse text-sm max-w-md">
              <thead><tr className="bg-gray-50 text-left"><th className="border p-2">Nome</th><th className="border p-2 w-20">Ações</th></tr></thead>
              <tbody>
                {(data.usuarios || []).map((user, idx) => (
                  <tr key={idx}><td className="border p-0"><input className="w-full p-2 outline-none" value={user} onChange={(e) => handleUsuarioChange(idx, e.target.value)}/></td>
                  <td className="border p-2 text-center"><button onClick={() => handleDeleteUsuario(idx)} className="text-red-500 font-bold">✕</button></td></tr>
                ))}
              </tbody>
            </table>
            <button onClick={handleAddUsuario} className="text-blue-600 text-sm font-medium">+ Add Usuário</button>
          </div>
        )}

      </div>
    </div>
  );
};

export default SheetEditor;
