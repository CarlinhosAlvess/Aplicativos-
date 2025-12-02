import React, { useState, useEffect } from 'react';
import { getAvailableTechnicians, getUniqueCities, addAgendamento, getAtividades, getAvailablePeriods, addLog, getSheetData } from '../services/mockSheetService';
import { Agendamento, Periodo, TecnicoDisponivel } from '../types';
import { CalendarIcon, SaveIcon, SparklesIcon, AlertIcon } from './Icons';

interface BookingFormProps {
    currentUser: { nome: string, perfil: string };
}

const BookingForm = ({ currentUser }: BookingFormProps) => {
  const [cities, setCities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [availableTechs, setAvailableTechs] = useState<TecnicoDisponivel[]>([]);
  
  // New state for dynamic period filtering
  const [availablePeriods, setAvailablePeriods] = useState<Periodo[]>([]);
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [atividade, setAtividade] = useState('');
  const [data, setData] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>(Periodo.MANHA);
  const [tecnicoId, setTecnicoId] = useState('');
  const [tipoAgendamento, setTipoAgendamento] = useState<'PADRAO' | 'PRE_AGENDAMENTO'>('PADRAO');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [duplicityError, setDuplicityError] = useState<string | null>(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  useEffect(() => {
    setCities(getUniqueCities());
    setAvailableActivities(getAtividades());
  }, []);

  // Update available periods when city or data changes
  useEffect(() => {
    if (cidade && data) {
        const validPeriods = getAvailablePeriods(cidade, data);
        setAvailablePeriods(validPeriods);
        
        // If the currently selected period is not valid (full), switch to the first available one
        if (validPeriods.length > 0 && !validPeriods.includes(periodo)) {
            setPeriodo(validPeriods[0]);
        }
    } else {
        // Reset or show default if no city/date selected
        setAvailablePeriods([Periodo.MANHA, Periodo.TARDE, Periodo.NOITE]);
    }
    
    // Check duplicity
    checkDuplicity(nome, cidade, data);

  }, [cidade, data]);

  useEffect(() => {
      checkDuplicity(nome, cidade, data);
  }, [nome]);

  useEffect(() => {
    setTecnicoId('');
    if (cidade && data) {
      // Only fetch techs if the period is actually valid
      if (availablePeriods.includes(periodo)) {
        const techs = getAvailableTechnicians(cidade, data, periodo);
        setAvailableTechs(techs);
      } else {
        setAvailableTechs([]);
      }
    } else {
      setAvailableTechs([]);
    }
  }, [cidade, data, periodo, availablePeriods]);

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
          setDuplicityError(`Atenção: Já existe um agendamento para "${cName}" em ${cCity} nesta data.`);
      } else {
          setDuplicityError(null);
      }
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, ""); // Remove tudo que não é dígito
    
    // Limita a 11 dígitos (DDD + 9 números) para cobrir celular, mas funciona com 10 (DDD + 8)
    if (value.length > 11) value = value.slice(0, 11);

    // Aplica a máscara
    if (value.length > 10) {
        // (XX) XXXXX-XXXX (Celular 9 dígitos)
        value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
    } else if (value.length > 6) {
        // (XX) XXXX-XXXX (Fixo 8 dígitos)
        value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
    } else if (value.length > 2) {
        // (XX) XXXX...
        value = value.replace(/^(\d{2})(\d{0,5}).*/, "($1) $2");
    } else if (value.length > 0) {
        // (XX...
        value = value.replace(/^(\d*)/, "($1");
    }
    
    setTelefone(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoId) return;
    if (duplicityError) return;

    setIsSubmitting(true);
    
    const selectedTech = availableTechs.find(t => t.id === tecnicoId);
    const statusAgendamento = periodo === Periodo.NOITE ? 'Encerrado' : 'Confirmado';

    const newBooking: Agendamento = {
      id: crypto.randomUUID(),
      cliente: nome,
      telefone,
      cidade,
      atividade,
      data,
      periodo,
      tecnicoId,
      tecnicoNome: selectedTech?.nome || 'Desconhecido',
      status: statusAgendamento as 'Confirmado' | 'Encerrado',
      statusExecucao: 'Pendente',
      motivoNaoConclusao: '',
      nomeUsuario: currentUser.nome,
      tipo: tipoAgendamento,
      criadoEm: new Date().toISOString()
    };

    setTimeout(async () => {
      addAgendamento(newBooking);
      addLog(currentUser.nome, 'Criar Agendamento', `Cliente: ${nome}, Técnico: ${newBooking.tecnicoNome}, Tipo: ${tipoAgendamento}`);
      
      let msg = '';
      if (tipoAgendamento === 'PRE_AGENDAMENTO') {
          msg = `⏱️ Pré-Agendamento Iniciado!\n\nA vaga está reservada por 30 minutos.\nVocê deve confirmar no app antes que expire.`;
      } else {
          msg = `Agendamento confirmado!\n\nTécnico: ${newBooking.tecnicoNome}\nData: ${newBooking.data.split('-').reverse().join('/')} - ${newBooking.periodo}\nLocal: ${newBooking.cidade}`;
      }
      setSuccessMessage(msg);
      setIsSubmitting(false);
      setNome('');
      setTelefone('');
      setTecnicoId('');
      setAtividade('');
      setTipoAgendamento('PADRAO'); // Reset
    }, 800);
  };

  const selectedTechData = availableTechs.find(t => t.id === tecnicoId);
  const totalVagasGeral = availableTechs.reduce((acc, curr) => acc + curr.vagasRestantes, 0);

  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium text-sm";
  const labelClass = "block text-xs font-bold text-slate-600 mb-1 ml-1 uppercase tracking-wide";

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-w-2xl mx-auto relative">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500"></div>

      <div className="p-4 sm:p-10">
        {successMessage ? (
          <div className={`bg-emerald-50 border border-emerald-100 rounded-2xl p-6 sm:p-8 text-center animate-fade-in flex flex-col items-center`}>
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
               <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-2 tracking-tight">
                {successMessage.includes('Pré-Agendamento') ? 'Reserva Temporária Criada!' : 'Agendamento Realizado!'}
            </h3>
            <p className="text-sm sm:text-base text-emerald-700/80 mb-8 whitespace-pre-line leading-relaxed max-w-sm">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-bold transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Novo Agendamento
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex gap-2">
                <button
                    type="button"
                    onClick={() => setTipoAgendamento('PADRAO')}
                    className={`flex-1 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
                        tipoAgendamento === 'PADRAO' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-200' 
                        : 'text-slate-500 hover:bg-white/50'
                    }`}
                >
                    Agendar Agora
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
                    Pré-Agendar (30min)
                </button>
            </div>

            {tipoAgendamento === 'PRE_AGENDAMENTO' && (
                <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg border border-amber-100 flex gap-2 items-center animate-fade-in">
                    <span className="text-lg">⏱️</span>
                    <p>Esta vaga ficará reservada por <strong>29 minutos</strong>. Se não for confirmada no app após 30 minutos, será excluída automaticamente.</p>
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
                    className={inputClass}
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
                  className={inputClass}
                />
              </div>

              <div>
                <label className={labelClass}>Cidade</label>
                <div className="relative">
                  <select
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className={`${inputClass} appearance-none`}
                  >
                    <option value="">Selecione...</option>
                    {cities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                  </div>
                </div>
              </div>
            </div>

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
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Data do Serviço</label>
                <div className="relative">
                    <input
                      type="date"
                      required
                      min={minDate}
                      value={data}
                      onChange={(e) => setData(e.target.value)}
                      className={inputClass}
                    />
                     <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <CalendarIcon className="w-4 h-4" />
                    </div>
                </div>
              </div>

              <div>
                <label className={labelClass}>Período</label>
                 <div className="relative">
                    <select
                        required
                        value={periodo}
                        onChange={(e) => setPeriodo(e.target.value as Periodo)}
                        className={`${inputClass} appearance-none`}
                        disabled={!data || availablePeriods.length === 0}
                    >
                        {availablePeriods.map(p => <option key={p} value={p}>{p}</option>)}
                        {data && availablePeriods.length === 0 && <option value="">Sem vagas nesta data</option>}
                        {!data && <option value="">Selecione a data primeiro</option>}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                        <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                    </div>
                 </div>
              </div>
            </div>

            {duplicityError && (
                <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-lg border border-amber-100 flex gap-2 items-center animate-fade-in">
                    <AlertIcon className="w-4 h-4 shrink-0" />
                    <p>{duplicityError}</p>
                </div>
            )}

            <div>
                <label className={labelClass}>Técnico Disponível</label>
                {availableTechs.length > 0 ? (
                    <div className="grid grid-cols-1 gap-2">
                        {availableTechs.map(tech => (
                            <label key={tech.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${tecnicoId === tech.id ? 'bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500' : 'bg-white border-slate-200 hover:border-indigo-200 hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="radio" 
                                        name="tecnico" 
                                        value={tech.id} 
                                        checked={tecnicoId === tech.id}
                                        onChange={(e) => setTecnicoId(e.target.value)}
                                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                                    />
                                    <div>
                                        <div className="font-bold text-slate-700 text-sm">{tech.nome}</div>
                                        <div className="text-[10px] text-slate-500 uppercase tracking-wide">
                                            {tech.cidades.slice(0, 3).join(', ')}{tech.cidades.length > 3 ? '...' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-indigo-600 text-sm">{tech.vagasRestantes} vagas</div>
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

            <div className="pt-2">
                <button
                    type="submit"
                    disabled={isSubmitting || !tecnicoId || !!duplicityError}
                    className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2 ${
                        isSubmitting || !tecnicoId || !!duplicityError
                        ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                        : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 shadow-indigo-200 hover:shadow-indigo-300'
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
                            <span>Confirmar Agendamento</span>
                        </>
                    )}
                </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

export default BookingForm;
