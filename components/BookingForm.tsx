
import React, { useState, useEffect } from 'react';
import { getAvailableTechnicians, getUniqueCities, addAgendamento, getAtividades, getUsuarios } from '../services/mockSheetService';
import { Agendamento, Periodo, TecnicoDisponivel } from '../types';
import { CalendarIcon, SaveIcon, SparklesIcon, AlertIcon } from './Icons';

const BookingForm = () => {
  const [cities, setCities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [availableTechs, setAvailableTechs] = useState<TecnicoDisponivel[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [atividade, setAtividade] = useState('');
  const [data, setData] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>(Periodo.MANHA);
  const [nomeUsuario, setNomeUsuario] = useState(''); 
  const [tecnicoId, setTecnicoId] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  useEffect(() => {
    setCities(getUniqueCities());
    setAvailableActivities(getAtividades());
    setAllowedUsers(getUsuarios());
  }, []);

  useEffect(() => {
    setTecnicoId('');
    if (cidade && data) {
      const techs = getAvailableTechnicians(cidade, data, periodo);
      setAvailableTechs(techs);
    } else {
      setAvailableTechs([]);
    }
  }, [cidade, data, periodo]);

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

    const userExists = allowedUsers.some(u => u.trim().toLowerCase() === nomeUsuario.trim().toLowerCase());

    if (!userExists) {
        setUserError('Acesso Negado: Este nome não está cadastrado na aba "Usuários" da planilha.');
        return;
    }

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
      nomeUsuario: nomeUsuario
    };

    setTimeout(async () => {
      addAgendamento(newBooking);
      const msg = `Agendamento confirmado!\n\nTécnico: ${newBooking.tecnicoNome}\nData: ${newBooking.data.split('-').reverse().join('/')} - ${newBooking.periodo}\nLocal: ${newBooking.cidade}`;
      setSuccessMessage(msg);
      setIsSubmitting(false);
      setNome('');
      setTelefone('');
      setTecnicoId('');
      setAtividade('');
    }, 800);
  };

  const selectedTechData = availableTechs.find(t => t.id === tecnicoId);

  // Helper styles - Inputs mais compactos (py-2.5) e texto menor (text-sm)
  const inputClass = "w-full px-3 py-2.5 rounded-lg bg-slate-50 border-0 ring-1 ring-slate-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all placeholder:text-slate-400 text-slate-700 font-medium text-sm";
  const labelClass = "block text-xs font-bold text-slate-600 mb-1 ml-1 uppercase tracking-wide";

  return (
    <div className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden max-w-2xl mx-auto relative">
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500 to-violet-500"></div>

      {/* Padding reduzido no mobile (p-5) e normal no desktop (sm:p-10) */}
      <div className="p-5 sm:p-10">
        {successMessage ? (
          <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 sm:p-8 text-center animate-fade-in flex flex-col items-center">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-sm">
               <SparklesIcon className="w-8 h-8 sm:w-10 sm:h-10 text-emerald-600" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-emerald-900 mb-2 tracking-tight">Agendamento Realizado!</h3>
            <p className="text-sm sm:text-base text-emerald-700/80 mb-8 whitespace-pre-line leading-relaxed max-w-sm">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="bg-emerald-600 text-white px-8 py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 font-bold transform hover:-translate-y-0.5 w-full sm:w-auto"
            >
              Novo Agendamento
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
            
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

            <div className="p-4 sm:p-6 bg-slate-50/80 rounded-xl border border-slate-100 space-y-4">
                {/* Lógica: grid-cols-2 sempre (mesmo no mobile) para ficarem lado a lado */}
                <div className="grid grid-cols-2 gap-3 sm:gap-6">
                    <div>
                        <label className={labelClass}>Data</label>
                        <input
                        type="date"
                        required
                        min={minDate}
                        value={data}
                        onChange={(e) => setData(e.target.value)}
                        className={`${inputClass} min-w-0`} // min-w-0 evita overflow
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Período</label>
                        <div className="relative">
                        <select
                            value={periodo}
                            onChange={(e) => setPeriodo(e.target.value as Periodo)}
                            className={`${inputClass} appearance-none pr-8 text-xs sm:text-sm`} // Texto menor no mobile
                        >
                            <option value={Periodo.MANHA}>Manhã (08-12h)</option>
                            <option value={Periodo.TARDE}>Tarde (13-17h)</option>
                            <option value={Periodo.NOITE}>Especial (18h)</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 sm:px-3 pointer-events-none text-slate-500">
                            <svg className="w-3 h-3 sm:w-4 sm:h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                        </div>
                    </div>
                </div>

                <div>
                    <label className={labelClass}>Técnico Disponível</label>
                    <div className="relative">
                        <select
                            required
                            value={tecnicoId}
                            onChange={(e) => setTecnicoId(e.target.value)}
                            disabled={!cidade || !data}
                            className={`${inputClass} appearance-none ${
                            (!cidade || !data) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : ''
                            }`}
                        >
                            <option value="">
                            {!cidade || !data 
                                ? 'Aguardando data/local...' 
                                : availableTechs.length === 0 
                                ? '⚠️ Indisponível' 
                                : 'Selecione o técnico...'}
                            </option>
                            {availableTechs.map(tech => (
                            <option key={tech.id} value={tech.id}>
                                {tech.nome}
                            </option>
                            ))}
                        </select>
                         <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-slate-500">
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd"></path></svg>
                        </div>
                    </div>
                    
                    {tecnicoId && selectedTechData && (
                        <div className="flex items-center gap-2 mt-2 animate-fade-in bg-emerald-50/80 p-2.5 rounded-lg border border-emerald-100">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-300"></div>
                            <span className="text-emerald-800 font-semibold text-xs">
                                {periodo === Periodo.NOITE 
                                ? "Vaga Única (Fechamento)" 
                                : `${selectedTechData.vagasRestantes} ${selectedTechData.vagasRestantes === 1 ? 'vaga' : 'vagas'}`
                                }
                            </span>
                        </div>
                    )}
                </div>
            </div>

            <div>
              <label className={labelClass}>Agendado por</label>
              <input
                type="text"
                required
                value={nomeUsuario}
                onChange={(e) => {
                    setNomeUsuario(e.target.value);
                    if (userError) setUserError(null);
                }}
                onBlur={() => {
                     if (nomeUsuario && !allowedUsers.some(u => u.trim().toLowerCase() === nomeUsuario.trim().toLowerCase())) {
                         setUserError('Usuário não encontrado.');
                     }
                }}
                placeholder="Seu nome"
                className={`${inputClass} ${
                    userError 
                    ? 'ring-2 ring-red-200 bg-red-50 text-red-700' 
                    : ''
                }`}
              />
              {userError && (
                  <div className="flex items-center gap-2 text-red-500 text-[10px] sm:text-xs font-semibold mt-2 animate-pulse bg-red-50 w-fit px-3 py-1 rounded-full">
                      <AlertIcon className="w-3 h-3" />
                      <span>{userError}</span>
                  </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !tecnicoId || !!userError}
              className={`w-full py-3.5 rounded-xl font-bold text-base sm:text-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5 ${
                isSubmitting || !tecnicoId || !!userError
                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2 text-sm">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processando...
                </span>
              ) : (
                <>
                  <SaveIcon className="w-5 h-5" />
                  CONFIRMAR
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
