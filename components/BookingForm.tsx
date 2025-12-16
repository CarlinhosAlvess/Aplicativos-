
import React, { useState, useEffect, useRef } from 'react';
import { getAvailableTechnicians, getUniqueCities, addAgendamento, getAtividades, getAvailablePeriods, addLog, getSheetData, getActivePreBookings, confirmarPreAgendamento, removeAgendamento, checkTechnicianPresence, getWeatherForecast, fetchRealTimeWeather, CITY_STATE_MAP, WeatherForecast } from '../services/mockSheetService';
import { Agendamento, Periodo, TecnicoDisponivel } from '../types';
import { CalendarIcon, SaveIcon, SparklesIcon, AlertIcon, MapPinIcon, ChevronRightIcon, SunIcon, CloudIcon, RainIcon, StormIcon, WindIcon } from './Icons';

interface BookingFormProps {
    currentUser: { nome: string, perfil: string };
}

// Mini Componente para Timer (Reutilizado/Local)
const BookingTimer = ({ criadoEm }: { criadoEm: string }) => {
    const [label, setLabel] = useState('');
    
    useEffect(() => {
        const update = () => {
            if (!criadoEm) {
                 setLabel('00:00');
                 return;
            }
            const now = Date.now();
            const created = new Date(criadoEm).getTime();
            const diff = now - created;
            const limit = 30 * 60 * 1000; // 30 min
            const remaining = limit - diff;

            if (remaining <= 0) {
                setLabel('Expirado');
            } else {
                const min = Math.floor(remaining / 60000);
                const sec = Math.floor((remaining % 60000) / 1000);
                setLabel(`${min}:${sec.toString().padStart(2, '0')}`);
            }
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [criadoEm]);

    return <span className="font-mono font-bold text-amber-700">{label}</span>;
}

const BookingForm = ({ currentUser }: BookingFormProps) => {
  const [cities, setCities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [availableTechs, setAvailableTechs] = useState<TecnicoDisponivel[]>([]);
  
  // New state for dynamic period filtering
  const [availablePeriods, setAvailablePeriods] = useState<Periodo[]>([]);
  const [pendingBookings, setPendingBookings] = useState<Agendamento[]>([]);
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  
  // City State Management
  const [cidade, setCidade] = useState('');
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const cityWrapperRef = useRef<HTMLDivElement>(null);

  const [atividade, setAtividade] = useState('');
  const [data, setData] = useState('');
  const [weather, setWeather] = useState<WeatherForecast | null>(null); // Novo Estado de Clima

  const [periodo, setPeriodo] = useState<Periodo>(Periodo.MANHA);
  const [tecnicoId, setTecnicoId] = useState('');
  const [observacao, setObservacao] = useState('');
  const [tipoAgendamento, setTipoAgendamento] = useState<'PADRAO' | 'PRE_AGENDAMENTO' | 'INCIDENTE'>('PADRAO');
  
  // States específicos para Incidente
  const [incidenteVisivel, setIncidenteVisivel] = useState(false); // Visto técnico?
  const [incidenteHora, setIncidenteHora] = useState('');
  const [incidenteDesc, setIncidenteDesc] = useState('');
  const [incidenteEndereco, setIncidenteEndereco] = useState(''); // Novo state para endereço
  
  // Estados de Verificação de Incidente
  const [verificationResult, setVerificationResult] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');
  const [verifiedTechs, setVerifiedTechs] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicityError, setDuplicityError] = useState<string | null>(null);
  const [cityError, setCityError] = useState<string | null>(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  // Helper de normalização aprimorado: remove acentos, lower case e espaços extras
  const normalizeText = (text: string) => {
      return text
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/\s+/g, ' ') // Remove espaços múltiplos internos
        .trim();
  };

  // Função centralizada para buscar e filtrar pendências
  const fetchPendingBookings = () => {
      const allPending = getActivePreBookings();
      if (currentUser.perfil === 'admin') {
          setPendingBookings(allPending);
      } else {
          const myPending = allPending.filter(a => a.nomeUsuario === currentUser.nome);
          setPendingBookings(myPending);
      }
  };

  useEffect(() => {
    setCities(getUniqueCities());
    setAvailableActivities(getAtividades());
    fetchPendingBookings();
    const interval = setInterval(() => {
        // Apenas atualiza se a lista local estiver vazia ou se o usuário não estiver interagindo ativamente
        // para evitar "pulos" na UI, mas aqui mantemos simples para garantir sincronia
        fetchPendingBookings();
    }, 3000); // Aumentado para 3s para dar mais tempo de leitura
    return () => clearInterval(interval);
  }, [currentUser]);

  // Click Outside Listener para fechar dropdown de cidade
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (cityWrapperRef.current && !cityWrapperRef.current.contains(event.target as Node)) {
              setShowCityDropdown(false);
              // Validação ao sair do campo (Blur)
              validateCityOnBlur();
          }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [cidade, cities]);

  const validateCityOnBlur = () => {
      if (!cidade) {
          setCityError(null);
          return;
      }
      const normalizedInput = normalizeText(cidade);
      // Verifica se existe alguma cidade que corresponde exatamente ao input normalizado
      const match = cities.find(c => normalizeText(c) === normalizedInput);
      
      if (match) {
          // Se encontrou, atualiza o texto para o formato correto (ex: "sao paulo" -> "São Paulo")
          if (cidade !== match) setCidade(match);
          setCityError(null);
      } else {
          // Se não encontrou exato, verifica se é um prefixo válido (usuário parou no meio?)
          // Para UX rigorosa, exigimos seleção válida.
          setCityError('Selecione uma cidade válida da lista.');
      }
  };

  // Update available periods when city or data changes
  useEffect(() => {
    // A validação real acontece no onBlur ou Submit, aqui limpamos erro se começar a corrigir
    if (cityError) {
        const normalizedInput = normalizeText(cidade);
        const hasPotentialMatch = cities.some(c => normalizeText(c).includes(normalizedInput));
        if (hasPotentialMatch) setCityError(null);
    }

    if (cidade && data && (!cityError)) {
        const validPeriods = getAvailablePeriods(cidade, data);
        setAvailablePeriods(validPeriods);
        if (validPeriods.length > 0 && !validPeriods.includes(periodo)) {
            setPeriodo(validPeriods[0]);
        }

        // --- PREVISÃO DO TEMPO REAL ---
        // Agora busca dados reais se a data for próxima
        const [year, month, day] = data.split('-').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        const fetchWeather = async () => {
             // Tenta buscar tempo real. Se falhar ou data muito distante, usa mock como fallback na própria função ou aqui.
             // Como fetchRealTimeWeather busca 'current', é ideal para hoje/amanhã.
             const state = CITY_STATE_MAP[cidade];
             const realForecast = await fetchRealTimeWeather(cidade, state);
             
             if (realForecast) {
                 setWeather(realForecast);
             } else {
                 // Fallback para lógica antiga se API falhar
                 const forecast = getWeatherForecast(cidade, dateObj);
                 setWeather(forecast);
             }
        };
        fetchWeather();

    } else {
        setAvailablePeriods([Periodo.MANHA, Periodo.TARDE, Periodo.NOITE]);
        setWeather(null);
    }
    
    checkDuplicity(nome, cidade, data);
    
    if(tipoAgendamento === 'INCIDENTE') {
        setVerificationResult('idle');
        setVerifiedTechs([]);
    }

  }, [cidade, data, cities]);

  useEffect(() => {
      checkDuplicity(nome, cidade, data);
  }, [nome]);

  useEffect(() => {
    setTecnicoId('');
    if (cidade && data && !cityError) {
      if (availablePeriods.includes(periodo)) {
        const techs = getAvailableTechnicians(cidade, data, periodo);
        setAvailableTechs(techs);
      } else {
        setAvailableTechs([]);
      }
    } else {
      setAvailableTechs([]);
    }
  }, [cidade, data, periodo, availablePeriods, cityError]);

  const checkDuplicity = (cName: string, cCity: string, cData: string) => {
      if (!cName || !cCity || !cData) {
          setDuplicityError(null);
          return;
      }
      const db = getSheetData();
      const exists = db.agendamentos.some(a => 
          (a.cliente || '').toLowerCase().trim() === cName.toLowerCase().trim() &&
          (a.cidade || '').toLowerCase().trim() === cCity.toLowerCase().trim() &&
          a.data === cData
      );

      if (exists) {
          setDuplicityError(`Já existe um agendamento para "${cName}" em ${cCity} nesta data.`);
      } else {
          setDuplicityError(null);
      }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 10) {
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
        value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    } else if (value.length > 0) {
        value = value.replace(/^(\d*)/, "($1");
    }
    setTelefone(value);
  };

  const handleQuickConfirm = (e: React.MouseEvent, id: string, clientName: string) => {
      e.preventDefault();
      e.stopPropagation();

      // UI Otimista: Remove da lista IMEDIATAMENTE para feedback visual rápido
      setPendingBookings(prev => prev.filter(b => b.id !== id));
      
      // Pequeno delay para permitir que o React renderize a remoção visual antes de processar pesado
      setTimeout(() => {
          const success = confirmarPreAgendamento(id);
          
          if (success) {
            addLog(currentUser.nome, 'Confirmar Manual (Form)', `Confirmou pré-agendamento ID: ${id}`);
            // Não precisa de alert, a ação já foi "sentida" pelo usuário.
            // Opcional: Mostrar um toast pequeno ou apenas deixar.
            fetchPendingBookings(); // Garante sincronia final
          } else {
              // Se falhou, recarrega a lista para mostrar o item de volta (ou mostrar que sumiu de verdade)
              fetchPendingBookings();
              
              // Verifica se falhou porque já estava feito (idempotência)
              const db = getSheetData();
              const alreadyDone = db.agendamentos.find(a => a.id === id && a.tipo === 'PADRAO');
              
              if (!alreadyDone) {
                 alert('Atenção: Não foi possível confirmar. O agendamento pode ter expirado.');
              }
          }
      }, 50);
  };

  const handleQuickCancel = (e: React.MouseEvent, id: string, clientName: string) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Confirmação simplificada apenas para destruição de dados
      if (window.confirm(`Cancelar reserva de ${clientName}?`)) {
          // UI Otimista
          setPendingBookings(prev => prev.filter(b => b.id !== id));
          
          setTimeout(() => {
            removeAgendamento(id);
            addLog(currentUser.nome, 'Cancelar Pré (Form)', `Cancelou pré-agendamento ID: ${id}`);
            fetchPendingBookings();
          }, 50);
      }
  }

  const handleVerifyPresence = () => {
      if (!cidade || !data) {
          alert('Por favor, selecione Cidade e Data para verificar a escala.');
          return;
      }
      setVerificationResult('checking');
      setTimeout(() => {
          const techsInArea = checkTechnicianPresence(cidade, data);
          if (techsInArea.length > 0) {
              setVerifiedTechs(techsInArea);
              setVerificationResult('found');
          } else {
              setVerifiedTechs([]);
              setVerificationResult('not_found');
          }
      }, 800); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Final Validation check before submit
    const normalizedInput = normalizeText(cidade);
    // Busca a cidade oficial (canônica) baseada no input do usuário
    const matchedCity = cities.find(c => normalizeText(c) === normalizedInput);
    
    if (!matchedCity) {
        setCityError('Selecione uma cidade válida.');
        return;
    }
    
    // Garante que o estado visual esteja correto (auto-correct se o user não deu blur)
    if (cidade !== matchedCity) setCidade(matchedCity);

    if (tipoAgendamento !== 'INCIDENTE' && !tecnicoId) return;
    if (duplicityError || cityError) return;

    setIsSubmitting(true);
    
    let selectedTechName = 'Desconhecido';
    let finalTechId = tecnicoId;

    if (tipoAgendamento === 'INCIDENTE') {
        if (verificationResult === 'found' && verifiedTechs.length > 0) {
            selectedTechName = verifiedTechs.join(', ');
            finalTechId = 'audit-log'; 
        } else {
            selectedTechName = 'Não Identificado (Suspeita)';
            finalTechId = 'audit-log';
        }
    } else {
        const selectedTech = availableTechs.find(t => t.id === tecnicoId);
        selectedTechName = selectedTech?.nome || 'Desconhecido';
    }

    const statusAgendamento = periodo === Periodo.NOITE ? 'Encerrado' : 'Confirmado';
    const atividadeFinal = tipoAgendamento === 'INCIDENTE' ? 'Verificação de Interferência' : atividade;

    const newBooking: Agendamento = {
      id: crypto.randomUUID(),
      cliente: nome,
      telefone,
      cidade: matchedCity, // Usa o nome oficial (Capitalizado, acentuado) para salvar
      atividade: atividadeFinal,
      data,
      periodo,
      tecnicoId: finalTechId,
      tecnicoNome: selectedTechName,
      status: statusAgendamento as 'Confirmado' | 'Encerrado',
      statusExecucao: 'Pendente',
      motivoNaoConclusao: '',
      nomeUsuario: currentUser.nome,
      tipo: tipoAgendamento,
      criadoEm: new Date().toISOString(),
      observacao: observacao.trim(), // Ensure observation is trimmed and present
      dadosIncidente: tipoAgendamento === 'INCIDENTE' ? {
          vistoNoPoste: incidenteVisivel,
          horarioAvistado: incidenteHora,
          descricaoTecnico: incidenteDesc,
          endereco: incidenteEndereco
      } : undefined
    };

    setTimeout(async () => {
      addAgendamento(newBooking);
      addLog(currentUser.nome, tipoAgendamento === 'INCIDENTE' ? 'Reportar Incidente' : 'Criar Agendamento', `Cliente: ${nome}, Técnico: ${newBooking.tecnicoNome}, Tipo: ${tipoAgendamento}`);
      
      let msg = '';
      if (tipoAgendamento === 'PRE_AGENDAMENTO') {
          msg = `⏱️ Pré-Agendamento Iniciado!\n\nA vaga está reservada por 30 minutos.\nVocê deve confirmar no app antes que expire.`;
      } else if (tipoAgendamento === 'INCIDENTE') {
          msg = `🚨 Relato de Incidente Registrado!\n\nA ocorrência foi salva para auditoria.`;
      } else {
          msg = `Agendamento confirmado!\nCliente: ${newBooking.cliente}\nTécnico: ${newBooking.tecnicoNome}\nData: ${newBooking.data.split('-').reverse().join('/')} - ${newBooking.periodo}\nLocal: ${newBooking.cidade}`;
      }
      setSuccessMessage(msg);
      setIsSubmitting(false);
      fetchPendingBookings();
      setNome('');
      setTelefone('');
      setTecnicoId('');
      setAtividade('');
      setObservacao('');
      setWeather(null);
      
      setIncidenteVisivel(false);
      setIncidenteHora('');
      setIncidenteDesc('');
      setIncidenteEndereco('');
      setVerificationResult('idle');
      setVerifiedTechs([]);

      setTipoAgendamento('PADRAO');
    }, 800);
  };

  const selectedTechData = availableTechs.find(t => t.id === tecnicoId);
  const totalVagasGeral = availableTechs.reduce((acc, curr) => acc + curr.vagasRestantes, 0);

  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium text-sm";
  const labelClass = "block text-xs font-bold text-slate-600 mb-1 ml-1 uppercase tracking-wide";

  const themeClass = tipoAgendamento === 'INCIDENTE' ? 'rose' : (tipoAgendamento === 'PRE_AGENDAMENTO' ? 'amber' : 'indigo');
  
  // Filtered cities for dropdown
  const filteredCities = cities.filter(c => normalizeText(c).includes(normalizeText(cidade)));

  const getWeatherIcon = (condition: string) => {
    switch (condition) {
        case 'Ensolarado': return <SunIcon className="w-8 h-8 text-orange-500" />;
        case 'Parcialmente Nublado': return <CloudIcon className="w-8 h-8 text-slate-400" />;
        case 'Chuvoso': return <RainIcon className="w-8 h-8 text-blue-500" />;
        case 'Tempestade': return <StormIcon className="w-8 h-8 text-violet-500" />;
        default: return <WindIcon className="w-8 h-8 text-slate-400" />;
    }
  };

  return (
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden w-full relative`}>
      <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-${themeClass}-500 to-${themeClass === 'rose' ? 'red' : (themeClass === 'amber' ? 'orange' : 'violet')}-500 transition-colors duration-500`}></div>

      <div className="p-4 sm:p-10">
        
        {pendingBookings.length > 0 && !successMessage && (
            <div className="mb-8 animate-fade-in-up">
                <div className="bg-amber-50 border border-amber-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-amber-100/50 border-b border-amber-200 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                            <span>⏳</span> Pré-Agendamentos Pendentes
                        </h3>
                        <span className="text-[10px] font-bold bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">{pendingBookings.length}</span>
                    </div>
                    {/* AUMENTADO DE max-h-48 PARA max-h-96 */}
                    <div className="divide-y divide-amber-100/50 max-h-96 overflow-y-auto">
                        {pendingBookings.map(pb => (
                            <div key={pb.id} className="p-3 flex items-center justify-between hover:bg-amber-100/30 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-slate-800">{pb.cliente}</span>
                                        {pb.criadoEm && <div className="text-xs bg-white px-1.5 rounded border border-amber-200 shadow-sm"><BookingTimer criadoEm={pb.criadoEm} /></div>}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        {pb.tecnicoNome} • {pb.data.split('-').reverse().join('/')} • {pb.cidade}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleQuickConfirm(e, pb.id, pb.cliente)}
                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors group"
                                        title="Confirmar Reserva"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleQuickCancel(e, pb.id, pb.cliente)}
                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors group"
                                        title="Cancelar Reserva"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="pointer-events-none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {successMessage ? (
          <div className={`bg-emerald-50 border border-emerald-100 rounded-2xl p-6 sm:p-8 text-center animate-fade-in flex flex-col items-center`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
               <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-2 tracking-tight">
                {successMessage.includes('Relato') ? 'Incidente Registrado!' : (successMessage.includes('Pré-Agendamento') ? 'Reserva Temporária Criada!' : 'Agendamento Realizado!')}
            </h3>
            <p className="text-sm sm:text-base text-emerald-700/80 mb-8 whitespace-pre-line leading-relaxed max-w-sm">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-bold transform hover:-translate-y-1"
            >
              Novo Agendamento
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-in">
            {/* TYPE SELECTOR TABS */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl mb-6">
                <button
                    type="button"
                    onClick={() => setTipoAgendamento('PADRAO')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tipoAgendamento === 'PADRAO' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Padrão
                </button>
                <button
                    type="button"
                    onClick={() => setTipoAgendamento('PRE_AGENDAMENTO')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tipoAgendamento === 'PRE_AGENDAMENTO' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Pré-Agendamento
                </button>
                <button
                    type="button"
                    onClick={() => setTipoAgendamento('INCIDENTE')}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${tipoAgendamento === 'INCIDENTE' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    Reportar Incidente
                </button>
            </div>

            {/* DUPLICITY ERROR */}
            {duplicityError && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl flex gap-3 items-start animate-pulse">
                    <AlertIcon className="w-5 h-5 mt-0.5 shrink-0" />
                    <span className="text-xs font-medium leading-relaxed">{duplicityError}</span>
                </div>
            )}
            
            {/* BASIC INFO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                    <label className={labelClass}>Nome do Cliente</label>
                    <input 
                        required 
                        type="text" 
                        value={nome} 
                        onChange={(e) => setNome(e.target.value)} 
                        className={inputClass} 
                        placeholder="Ex: João da Silva"
                    />
                </div>
                <div className="lg:col-span-2">
                    <label className={labelClass}>Telefone</label>
                    <input 
                        required 
                        type="tel" 
                        value={telefone} 
                        onChange={handlePhoneChange} 
                        className={inputClass} 
                        placeholder="(11) 99999-9999"
                    />
                </div>
            </div>

            {/* CITY & WEATHER */}
            <div className="relative" ref={cityWrapperRef}>
                <label className={labelClass}>Cidade</label>
                <div className="relative">
                    <input 
                        required 
                        type="text" 
                        value={cidade} 
                        onChange={(e) => {
                            setCidade(e.target.value);
                            setShowCityDropdown(true);
                            setCityError(null);
                        }} 
                        onFocus={() => setShowCityDropdown(true)}
                        className={`${inputClass} pl-10 ${cityError ? 'ring-2 ring-rose-300 bg-rose-50' : ''}`}
                        placeholder="Digite para buscar..."
                    />
                    <div className="absolute left-3 top-3 text-slate-400">
                        <MapPinIcon className="w-4 h-4" />
                    </div>
                </div>
                {cityError && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{cityError}</p>}
                
                {/* AUMENTADO DE max-h-48 PARA max-h-96 */}
                {showCityDropdown && filteredCities.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-96 overflow-y-auto">
                        {filteredCities.map(city => (
                            <div 
                                key={city} 
                                className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0"
                                onClick={() => {
                                    setCidade(city);
                                    setShowCityDropdown(false);
                                    setCityError(null);
                                }}
                            >
                                {city}
                            </div>
                        ))}
                    </div>
                )}
            </div>

             {/* WEATHER WIDGET */}
            {weather && (
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            {getWeatherIcon(weather.condition)}
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide">Previsão do Tempo</div>
                            <div className="text-lg font-bold text-slate-800">{weather.condition} • {weather.temperature}°C</div>
                            <div className="text-[10px] text-slate-500">
                                Vento: {weather.windSpeed}km/h • Umidade: {weather.humidity}%
                            </div>
                        </div>
                    </div>
                    {weather.operationalImpact !== 'Baixo' && (
                        <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                            weather.operationalImpact === 'Alto' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                        }`}>
                            Risco {weather.operationalImpact}
                        </div>
                    )}
                </div>
            )}

            {/* DATE & PERIOD */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                    <label className={labelClass}>Data da Visita</label>
                    <input 
                        required 
                        type="date" 
                        min={minDate}
                        value={data} 
                        onChange={(e) => setData(e.target.value)} 
                        className={inputClass}
                    />
                </div>
                <div className="lg:col-span-2">
                    <label className={labelClass}>Período</label>
                    <div className="relative">
                        <select 
                            value={periodo} 
                            onChange={(e) => setPeriodo(e.target.value as Periodo)} 
                            className={`${inputClass} appearance-none cursor-pointer`}
                            disabled={!data || !cidade}
                        >
                            {availablePeriods.map(p => <option key={p} value={p}>{p}</option>)}
                            {availablePeriods.length === 0 && <option disabled>Indisponível</option>}
                        </select>
                         <div className="absolute right-3 top-3 pointer-events-none text-slate-500">
                             <ChevronRightIcon className="w-4 h-4 rotate-90" />
                         </div>
                    </div>
                </div>
            </div>

            {/* INCIDENT REPORT FIELDS */}
            {tipoAgendamento === 'INCIDENTE' && (
                <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                         <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                             <AlertIcon className="w-4 h-4" /> Detalhes do Incidente
                         </h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <label className="flex items-center gap-2 p-3 bg-white rounded-lg border border-rose-200 cursor-pointer shadow-sm">
                            <input 
                                type="checkbox" 
                                checked={incidenteVisivel}
                                onChange={(e) => setIncidenteVisivel(e.target.checked)}
                                className="w-4 h-4 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                            />
                            <span className="text-xs font-bold text-rose-700">Técnico Visto no Poste?</span>
                        </label>
                        <div>
                            <input 
                                type="time" 
                                className={`${inputClass} border-rose-200 text-rose-800 focus:ring-rose-500`}
                                value={incidenteHora}
                                onChange={(e) => setIncidenteHora(e.target.value)}
                                placeholder="Horário"
                            />
                        </div>
                    </div>

                    <div>
                        <label className={`${labelClass} text-rose-700`}>Endereço Completo</label>
                        <input 
                             type="text"
                             className={`${inputClass} border-rose-200 focus:ring-rose-500`}
                             value={incidenteEndereco}
                             onChange={(e) => setIncidenteEndereco(e.target.value)}
                             placeholder="Rua, Número, Bairro, Referência..."
                        />
                    </div>

                    <div>
                        <label className={`${labelClass} text-rose-700`}>Descrição do Técnico/Veículo</label>
                        <textarea 
                            className={`${inputClass} border-rose-200 focus:ring-rose-500 h-20 resize-none`}
                            value={incidenteDesc}
                            onChange={(e) => setIncidenteDesc(e.target.value)}
                            placeholder="Ex: Carro branco com escada amarela, técnico sem uniforme..."
                        />
                    </div>

                    <div className="pt-2 border-t border-rose-200/50">
                        <div className="flex justify-between items-center mb-2">
                             <span className="text-xs font-bold text-rose-800">Verificação de Escala</span>
                             {verificationResult === 'checking' && <span className="text-xs text-rose-500 animate-pulse">Verificando...</span>}
                             {verificationResult === 'found' && <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded">⚠️ Técnico Identificado na Área</span>}
                             {verificationResult === 'not_found' && <span className="text-xs font-bold text-slate-500">Nenhum técnico oficial agendado</span>}
                        </div>
                        <button 
                            type="button"
                            onClick={handleVerifyPresence}
                            className="w-full py-2 bg-white border border-rose-300 text-rose-700 font-bold rounded-lg hover:bg-rose-100 transition text-xs shadow-sm"
                        >
                            Verificar Presença Autorizada
                        </button>
                    </div>
                </div>
            )}

            {/* STANDARD ACTIVITY SELECTOR */}
            {tipoAgendamento !== 'INCIDENTE' && (
                <div>
                    <label className={labelClass}>Tipo de Atividade</label>
                    <div className="relative">
                        <select 
                            required 
                            value={atividade} 
                            onChange={(e) => setAtividade(e.target.value)} 
                            className={`${inputClass} appearance-none cursor-pointer`}
                        >
                            <option value="">Selecione...</option>
                            {availableActivities.map(act => <option key={act} value={act}>{act}</option>)}
                        </select>
                        <div className="absolute right-3 top-3 pointer-events-none text-slate-500">
                             <ChevronRightIcon className="w-4 h-4 rotate-90" />
                        </div>
                    </div>
                </div>
            )}

            {/* TECHNICIAN SELECTOR */}
            {tipoAgendamento !== 'INCIDENTE' && (
                <div>
                    <div className="flex justify-between items-end mb-2">
                        <label className={labelClass}>Técnicos Disponíveis</label>
                        {totalVagasGeral > 0 && <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{totalVagasGeral} vagas na região</span>}
                    </div>
                    
                    {/* AUMENTADO DE max-h-48 PARA max-h-96 */}
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto pr-1">
                        {availableTechs.length > 0 ? (
                            availableTechs.map((tech) => (
                                <label 
                                    key={tech.id} 
                                    className={`relative flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                                        tecnicoId === tech.id 
                                        ? 'border-indigo-500 bg-indigo-50/50 shadow-sm' 
                                        : 'border-slate-100 bg-white hover:border-indigo-100 hover:bg-slate-50'
                                    }`}
                                >
                                    <input 
                                        type="radio" 
                                        name="tecnico" 
                                        value={tech.id} 
                                        checked={tecnicoId === tech.id} 
                                        onChange={(e) => setTecnicoId(e.target.value)} 
                                        className="sr-only"
                                    />
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tecnicoId === tech.id ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                                            {tech.nome.charAt(0)}
                                        </div>
                                        <div>
                                            <span className={`block text-sm font-bold ${tecnicoId === tech.id ? 'text-indigo-900' : 'text-slate-700'}`}>{tech.nome}</span>
                                            <span className="text-[10px] text-slate-400">
                                                {tech.vagasRestantes === 1 ? 'Última vaga!' : `${tech.vagasRestantes} vagas livres`}
                                            </span>
                                        </div>
                                    </div>
                                    {tecnicoId === tech.id && <div className="w-3 h-3 rounded-full bg-indigo-500 shadow-lg shadow-indigo-300/50"></div>}
                                </label>
                            ))
                        ) : (
                            <div className="p-4 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                                {(!cidade || !data) ? 'Selecione cidade e data primeiro.' : 'Nenhum técnico disponível para este período.'}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* OBSERVATIONS */}
            <div>
                <label className={labelClass}>Observações {tipoAgendamento === 'INCIDENTE' ? 'Adicionais' : '(Opcional)'}</label>
                <textarea 
                    value={observacao} 
                    onChange={(e) => setObservacao(e.target.value)} 
                    className={`${inputClass} resize-none h-20`}
                    placeholder="Instruções de acesso, referências, etc."
                />
            </div>

            <button 
                type="submit" 
                disabled={isSubmitting || (tipoAgendamento !== 'INCIDENTE' && !tecnicoId)}
                className={`w-full py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transform active:scale-95 transition-all flex items-center justify-center gap-2 ${
                    isSubmitting 
                    ? 'bg-slate-400 cursor-wait' 
                    : (tipoAgendamento !== 'INCIDENTE' && !tecnicoId)
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                        : `bg-${themeClass}-600 hover:bg-${themeClass}-700 shadow-${themeClass}-200 hover:-translate-y-1`
                }`}
            >
                {isSubmitting ? 'Processando...' : (
                    <>
                        <SaveIcon className="w-4 h-4" />
                        {tipoAgendamento === 'PRE_AGENDAMENTO' ? 'Reservar Vaga (30min)' : (tipoAgendamento === 'INCIDENTE' ? 'Registrar Ocorrência' : 'Confirmar Agendamento')}
                    </>
                )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default BookingForm;
