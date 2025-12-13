
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

  // Helper de normalização para comparação insensível a acentos/case
  const normalizeText = (text: string) => {
      return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
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
        fetchPendingBookings();
    }, 2000);
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
      if (confirm(`Deseja efetivar a reserva de ${clientName}?`)) {
          const success = confirmarPreAgendamento(id);
          if (success) {
            addLog(currentUser.nome, 'Confirmar Manual (Form)', `Confirmou pré-agendamento ID: ${id}`);
            setPendingBookings(prev => prev.filter(p => p.id !== id));
            alert('Reserva confirmada com sucesso!');
          }
      }
  };

  const handleQuickCancel = (e: React.MouseEvent, id: string, clientName: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (confirm(`Deseja CANCELAR a reserva de ${clientName}? Esta ação libera a vaga imediatamente.`)) {
          removeAgendamento(id);
          addLog(currentUser.nome, 'Cancelar Pré (Form)', `Cancelou pré-agendamento ID: ${id}`);
          setPendingBookings(prev => prev.filter(p => p.id !== id));
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
    const cityExists = cities.some(c => normalizeText(c) === normalizedInput);
    if (!cityExists) {
        setCityError('Selecione uma cidade válida.');
        return;
    }

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
      cidade, // Value is already normalized or correct from validation
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
      observacao: observacao,
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
    <div className={`bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-w-2xl mx-auto relative`}>
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
                    <div className="divide-y divide-amber-100/50 max-h-48 overflow-y-auto">
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
                                        className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors"
                                        title="Confirmar Reserva"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={(e) => handleQuickCancel(e, pb.id, pb.cliente)}
                                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 transition-colors"
                                        title="Cancelar Reserva"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
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
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-bold transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Novo Atendimento
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            
            <div className="bg-slate-50 p-1.5 rounded-xl border border-slate-100 flex gap-1 sm:gap-2">
                <button
                    type="button"
                    onClick={() => setTipoAgendamento('PADRAO')}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                        tipoAgendamento === 'PADRAO' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-200' 
                        : 'text-slate-500 hover:bg-white/50'
                    }`}
                >
                    Agendar
                </button>
                <button
                    type="button"
                    onClick={() => setTipoAgendamento('PRE_AGENDAMENTO')}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                        tipoAgendamento === 'PRE_AGENDAMENTO' 
                        ? 'bg-white text-amber-600 shadow-sm ring-1 ring-amber-200' 
                        : 'text-slate-500 hover:bg-white/50'
                    }`}
                >
                    Pré-Agendar
                </button>
                <button
                    type="button"
                    onClick={() => {
                        setTipoAgendamento('INCIDENTE');
                        setAtividade('Verificação de Interferência');
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                        tipoAgendamento === 'INCIDENTE' 
                        ? 'bg-white text-rose-600 shadow-sm ring-1 ring-rose-200' 
                        : 'text-slate-500 hover:bg-white/50'
                    }`}
                >
                    <AlertIcon className="w-3 h-3" />
                    Reportar
                </button>
            </div>

            {tipoAgendamento === 'PRE_AGENDAMENTO' && (
                <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg border border-amber-100 flex gap-2 items-center animate-fade-in">
                    <span className="text-lg">⏱️</span>
                    <p>Esta vaga ficará reservada por <strong>29 minutos</strong>. Se não for confirmada no app após 30 minutos, será excluída automaticamente.</p>
                </div>
            )}

            {tipoAgendamento === 'INCIDENTE' && (
                <div className="bg-rose-50 text-rose-800 text-xs p-3 rounded-lg border border-rose-100 flex gap-2 items-start animate-fade-in">
                    <span className="text-lg">🚨</span>
                    <div>
                        <p className="font-bold mb-0.5">Relato de Interferência</p>
                        <p>Primeiro verifique se houve equipe no local. O endereço específico ajudará a cruzar com o GPS da equipe da região.</p>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={labelClass}>Nome do Cliente</label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Nome completo do cliente"
                    className={`${inputClass} focus:ring-${themeClass}-500`}
                  />
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Telefone</label>
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={handlePhoneChange}
                  placeholder="(00) 0000-0000"
                  maxLength={15}
                  className={`${inputClass} focus:ring-${themeClass}-500`}
                />
              </div>

              {/* SELETOR DE CIDADE MELHORADO (CUSTOM COMBOBOX) */}
              <div ref={cityWrapperRef} className="relative">
                <label className={labelClass}>Cidade</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={cidade}
                    onClick={() => setShowCityDropdown(true)}
                    onFocus={() => setShowCityDropdown(true)}
                    onChange={(e) => {
                        setCidade(e.target.value);
                        setShowCityDropdown(true);
                        setCityError(null);
                    }}
                    placeholder="Selecione ou busque..."
                    className={`${inputClass} focus:ring-${themeClass}-500 pr-10 ${cityError ? 'border-rose-500 ring-1 ring-rose-500' : ''}`}
                    autoComplete="off"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-400">
                    <div className="transform rotate-90">
                        <ChevronRightIcon className="w-4 h-4" />
                    </div>
                  </div>
                </div>
                
                {/* Custom Dropdown List */}
                {showCityDropdown && (
                    <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-fade-in-up">
                        {filteredCities.length > 0 ? (
                            filteredCities.map((city) => (
                                <li 
                                    key={city}
                                    onMouseDown={(e) => {
                                        e.preventDefault(); // Prevents blur before click
                                        setCidade(city);
                                        setShowCityDropdown(false);
                                        setCityError(null);
                                    }}
                                    className="px-4 py-2.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 border-b border-slate-50 last:border-0 flex items-center justify-between group"
                                >
                                    {city}
                                    {normalizeText(city) === normalizeText(cidade) && <span className="text-emerald-500 font-bold text-xs">✓</span>}
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-3 text-xs text-slate-400 text-center italic">
                                Nenhuma cidade encontrada.
                            </li>
                        )}
                    </ul>
                )}

                {cityError && <p className="text-rose-500 text-[10px] font-bold mt-1 ml-1 animate-fade-in">{cityError}</p>}
              </div>
            </div>

            {/* Campos Específicos de Incidente */}
            {tipoAgendamento === 'INCIDENTE' && (
                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100 space-y-4 animate-fade-in-up">
                    <h4 className="text-xs font-bold text-rose-700 uppercase tracking-wide border-b border-rose-200 pb-2 mb-2">Detalhes da Ocorrência</h4>
                    
                    <div>
                        <label className={labelClass}>Endereço Completo</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                required
                                className={`${inputClass} focus:ring-rose-500 pl-9`}
                                placeholder="Rua, Número, Bairro..."
                                value={incidenteEndereco}
                                onChange={(e) => setIncidenteEndereco(e.target.value)}
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-rose-400">
                                <MapPinIcon className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    <label className="flex items-center gap-3 cursor-pointer group pt-2">
                        <input 
                            type="checkbox" 
                            className="w-5 h-5 text-rose-600 rounded border-gray-300 focus:ring-rose-500"
                            checked={incidenteVisivel}
                            onChange={(e) => setIncidenteVisivel(e.target.checked)}
                        />
                        <span className="text-sm font-medium text-slate-700 group-hover:text-rose-700 transition-colors">Cliente viu técnicos no poste?</span>
                    </label>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className={labelClass}>Horário Avistado (Aprox)</label>
                            <input 
                                type="time" 
                                className={`${inputClass} focus:ring-rose-500`}
                                value={incidenteHora}
                                onChange={(e) => setIncidenteHora(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className={labelClass}>Descrição (Carro/Uniforme)</label>
                            <input 
                                type="text" 
                                className={`${inputClass} focus:ring-rose-500`}
                                placeholder="Ex: Escada amarela, carro branco..."
                                value={incidenteDesc}
                                onChange={(e) => setIncidenteDesc(e.target.value)}
                            />
                        </div>
                    </div>
                </div>
            )}

            {tipoAgendamento !== 'INCIDENTE' && (
                <div>
                    <label className={labelClass}>Tipo de Atividade</label>
                    <div className="relative">
                        <select
                        required
                        value={atividade}
                        onChange={(e) => setAtividade(e.target.value)}
                        className={`${inputClass} appearance-none`}
                        >
                        <option value="">Selecione a atividade...</option>
                        {availableActivities.map(ativ => <option key={ativ} value={ativ}>{ativ}</option>)}
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                            <div className="transform rotate-90"><ChevronRightIcon className="w-4 h-4" /></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data da Ocorrência / Visita</label>
                <div className="relative">
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className={`${inputClass} focus:ring-${themeClass}-500`}
                    />
                     <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <CalendarIcon className="w-4 h-4" />
                    </div>
                </div>
              </div>

              {tipoAgendamento !== 'INCIDENTE' && (
              <div>
                <label className={labelClass}>Período</label>
                 <div className="relative">
                    <select
                        required
                        value={periodo}
                        onChange={(e) => setPeriodo(e.target.value as Periodo)}
                        className={`${inputClass} appearance-none focus:ring-${themeClass}-500`}
                        disabled={!data || availablePeriods.length === 0}
                    >
                        {availablePeriods.map(p => <option key={p} value={p}>{p}</option>)}
                        {data && availablePeriods.length === 0 && <option value="">Sem vagas nesta data</option>}
                        {!data && <option value="">Selecione a data primeiro</option>}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                         <div className="transform rotate-90"><ChevronRightIcon className="w-4 h-4" /></div>
                    </div>
                 </div>
              </div>
              )}
            </div>

            {/* WIDGET CLIMA CONTEXTUAL NO FORMULÁRIO */}
            {weather && cidade && data && (
                <div className={`mt-2 p-3 rounded-xl border flex items-center gap-4 animate-fade-in ${
                    weather.operationalImpact === 'Alto' ? 'bg-violet-50 border-violet-200' :
                    weather.operationalImpact === 'Médio' ? 'bg-blue-50 border-blue-200' :
                    'bg-orange-50 border-orange-200'
                }`}>
                    <div className="shrink-0 p-1.5 bg-white/50 rounded-full shadow-sm">
                        {getWeatherIcon(weather.condition)}
                    </div>
                    <div className="flex-1">
                        <div className="flex justify-between items-start">
                             <h4 className={`text-xs font-bold uppercase tracking-wide ${
                                weather.operationalImpact === 'Alto' ? 'text-violet-700' :
                                weather.operationalImpact === 'Médio' ? 'text-blue-700' :
                                'text-orange-700'
                            }`}>
                                Previsão: {weather.condition}
                             </h4>
                             <span className="text-sm font-bold text-slate-700">{weather.temperature}°C</span>
                        </div>
                        <p className="text-xs text-slate-600 leading-tight mt-0.5">
                            Vento: {weather.windSpeed}km/h • Umidade: {weather.humidity}%
                        </p>
                        
                        {(weather.operationalImpact === 'Alto' || weather.operationalImpact === 'Médio') && (
                            <div className="mt-2 flex items-start gap-1.5 bg-white/60 p-2 rounded-lg">
                                <AlertIcon className={`w-3.5 h-3.5 mt-0.5 ${weather.operationalImpact === 'Alto' ? 'text-violet-600' : 'text-blue-600'}`} />
                                <span className={`text-[10px] font-bold leading-tight ${weather.operationalImpact === 'Alto' ? 'text-violet-800' : 'text-blue-800'}`}>
                                    {weather.operationalImpact === 'Alto' 
                                        ? 'ALERTA: Risco alto de cancelamento para serviços externos (postes).' 
                                        : 'Atenção: Chuva pode dificultar instalação externa.'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {duplicityError && (
                <div className="bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-xl shadow-md flex items-start gap-3 animate-fade-in my-4 ring-1 ring-rose-200">
                    <div className="bg-rose-100 p-2 rounded-full text-rose-600 shrink-0">
                        <AlertIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-rose-800 text-sm mb-1 uppercase tracking-wide">Duplicidade Detectada</h4>
                        <p className="text-rose-700 text-xs leading-relaxed font-medium">{duplicityError}</p>
                    </div>
                </div>
            )}

            {tipoAgendamento !== 'INCIDENTE' && (
                <div>
                    <label className={labelClass}>Técnico Disponível</label>
                    {availableTechs.length > 0 ? (
                        <div className="grid grid-cols-1 gap-2">
                            {availableTechs.map(tech => (
                                <label key={tech.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${tecnicoId === tech.id ? `bg-${themeClass}-50 border-${themeClass}-500 ring-1 ring-${themeClass}-500` : `bg-white border-slate-200 hover:border-${themeClass}-200 hover:bg-slate-50`}`}>
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="radio" 
                                            name="tecnico" 
                                            value={tech.id} 
                                            checked={tecnicoId === tech.id}
                                            onChange={(e) => setTecnicoId(e.target.value)}
                                            className={`w-4 h-4 text-${themeClass}-600 focus:ring-${themeClass}-500 border-gray-300`}
                                        />
                                        <div>
                                            <div className="font-bold text-slate-700 text-sm">{tech.nome}</div>
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                                                {tech.cidades.slice(0, 3).join(', ')}{tech.cidades.length > 3 ? '...' : ''}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold text-${themeClass}-600 text-sm`}>{tech.vagasRestantes} vagas</div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center p-6 bg-slate-50 border border-slate-100 rounded-xl text-slate-400 text-sm">
                            {cidade && data && availablePeriods.includes(periodo) ? 'Nenhum técnico com vagas disponíveis.' : 'Selecione cidade, data e período para ver técnicos.'}
                        </div>
                    )}
                </div>
            )}

            <div>
              <label className={labelClass}>Observações Adicionais</label>
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder={tipoAgendamento === 'INCIDENTE' ? "Detalhes extras sobre a queda de sinal..." : "Ex: Ligar antes de ir, cliente só está em casa após as 14h..."}
                className={`${inputClass} min-h-[80px] resize-none focus:ring-${themeClass}-500`}
              />
            </div>

            <div className="pt-2">
                {tipoAgendamento === 'INCIDENTE' ? (
                    <div className="space-y-3">
                        {verificationResult === 'idle' && (
                            <button
                                type="button"
                                onClick={handleVerifyPresence}
                                className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg bg-slate-800 hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                            >
                                <SparklesIcon className="w-5 h-5" />
                                Verificar Presença Técnica
                            </button>
                        )}

                        {verificationResult === 'checking' && (
                            <button disabled className="w-full py-3.5 rounded-xl font-bold text-white bg-slate-400 cursor-wait flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Consultando Escala...
                            </button>
                        )}

                        {verificationResult === 'found' && (
                            <div className="animate-fade-in-up">
                                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-3">
                                    <h4 className="text-sm font-bold text-emerald-800 flex items-center gap-2 mb-1">
                                        <span className="text-lg">✅</span> Equipe Confirmada
                                    </h4>
                                    <p className="text-xs text-emerald-700">
                                        Os seguintes técnicos trabalharam em <strong>{cidade}</strong> nesta data:
                                    </p>
                                    <ul className="mt-2 text-xs font-bold text-slate-700 bg-white/50 p-2 rounded border border-emerald-100">
                                        {verifiedTechs.map(t => <li key={t}>• {t}</li>)}
                                    </ul>
                                </div>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="w-full py-3.5 rounded-xl font-bold text-white shadow-lg bg-emerald-600 hover:bg-emerald-700 transition-all flex items-center justify-center gap-2"
                                >
                                    <AlertIcon className="w-5 h-5" />
                                    Abrir Chamado de Averiguação
                                </button>
                            </div>
                        )}

                        {verificationResult === 'not_found' && (
                            <div className="animate-fade-in-up">
                                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-3">
                                    <h4 className="text-sm font-bold text-amber-800 flex items-center gap-2 mb-1">
                                        <span className="text-lg">⚠️</span> Nenhum Registro Encontrado
                                    </h4>
                                    <p className="text-xs text-amber-700 leading-relaxed">
                                        Não consta nenhum técnico da nossa empresa trabalhando em <strong>{cidade}</strong> nesta data.
                                        <br/><br/>
                                        <strong>Possibilidade:</strong> Manutenção de terceiros ou outra operadora.
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setVerificationResult('idle')}
                                        className="flex-1 py-3 rounded-xl font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-all text-xs"
                                    >
                                        Voltar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 rounded-xl font-bold text-white shadow bg-rose-600 hover:bg-rose-700 transition-all text-xs"
                                    >
                                        Forçar Registro
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <button
                        type="submit"
                        disabled={isSubmitting || !tecnicoId || !!duplicityError || !!cityError}
                        className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                            isSubmitting || !tecnicoId || !!duplicityError || !!cityError
                            ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                            : tipoAgendamento === 'PRE_AGENDAMENTO'
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200'
                                : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200'
                        }`}
                    >
                        {isSubmitting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Processando...</span>
                            </>
                        ) : (
                            <>
                                <SaveIcon className="w-5 h-5" />
                                <span>{tipoAgendamento === 'PRE_AGENDAMENTO' ? 'Reservar Vaga' : 'Confirmar Agendamento'}</span>
                            </>
                        )}
                    </button>
                )}
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default BookingForm;
