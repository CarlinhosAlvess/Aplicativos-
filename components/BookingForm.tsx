
import React, { useState, useEffect } from 'react';
import { getAvailableTechnicians, getUniqueCities, addAgendamento, getAtividades, getUsuarios } from '../services/mockSheetService';
import { Agendamento, Periodo, TecnicoDisponivel } from '../types';
import { CalendarIcon, SaveIcon, SparklesIcon, AlertIcon } from './Icons';

const BookingForm = () => {
  const [cities, setCities] = useState<string[]>([]);
  const [availableActivities, setAvailableActivities] = useState<string[]>([]);
  const [availableTechs, setAvailableTechs] = useState<TecnicoDisponivel[]>([]);
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]); // Lista de usuários permitidos
  
  // Form State
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [atividade, setAtividade] = useState('');
  const [data, setData] = useState('');
  const [periodo, setPeriodo] = useState<Periodo>(Periodo.MANHA);
  const [nomeUsuario, setNomeUsuario] = useState(''); 
  const [tecnicoId, setTecnicoId] = useState('');
  
  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userError, setUserError] = useState<string | null>(null); // Estado para erro de validação de usuário

  // Calcula a data de hoje no formato YYYY-MM-DD para o atributo 'min' do input
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  const minDate = `${yyyy}-${mm}-${dd}`;

  useEffect(() => {
    setCities(getUniqueCities());
    setAvailableActivities(getAtividades());
    setAllowedUsers(getUsuarios()); // Carrega usuários da planilha
  }, []);

  useEffect(() => {
    // Reset selected tech if city/date/period changes
    setTecnicoId('');
    if (cidade && data) {
      const techs = getAvailableTechnicians(cidade, data, periodo);
      setAvailableTechs(techs);
    } else {
      setAvailableTechs([]);
    }
  }, [cidade, data, periodo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tecnicoId) return;

    // --- VALIDAÇÃO DE USUÁRIO ---
    // Verifica se o nome digitado existe na lista de permitidos (Case Insensitive)
    const userExists = allowedUsers.some(u => u.trim().toLowerCase() === nomeUsuario.trim().toLowerCase());

    if (!userExists) {
        setUserError('Acesso Negado: Este nome não está cadastrado na aba "Usuários" da planilha.');
        return;
    }
    // ----------------------------

    setIsSubmitting(true);
    
    const selectedTech = availableTechs.find(t => t.id === tecnicoId);
    
    // Define o status: Se for 18h (NOITE), considera Encerrado/Fechamento
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
      statusExecucao: 'Pendente', // Inicializa como Pendente
      motivoNaoConclusao: '',
      nomeUsuario: nomeUsuario // Salva o nome do usuário digitado
    };

    // Simulate network delay and save
    setTimeout(async () => {
      addAgendamento(newBooking);
      
      // Confirmation message without AI
      const msg = `Agendamento confirmado!\n\nTécnico: ${newBooking.tecnicoNome}\nData: ${newBooking.data.split('-').reverse().join('/')} - ${newBooking.periodo}\nLocal: ${newBooking.cidade}`;
      
      setSuccessMessage(msg);
      setIsSubmitting(false);
      
      // Reset form
      setNome('');
      setTelefone('');
      setTecnicoId('');
      setAtividade('');
      // Não resetamos o nomeUsuario para facilitar múltiplos agendamentos da mesma pessoa
    }, 800);
  };

  const selectedTechData = availableTechs.find(t => t.id === tecnicoId);

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl mx-auto border border-gray-100">
      <div className="bg-blue-600 p-6 flex items-center gap-3">
        <CalendarIcon className="text-white w-8 h-8" />
        <h2 className="text-2xl font-bold text-white">Agendamento de Visitas</h2>
      </div>

      <div className="p-8">
        {successMessage ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center animate-fade-in">
            <div className="flex justify-center mb-4">
               <SparklesIcon className="w-12 h-12 text-green-600" />
            </div>
            <h3 className="text-xl font-bold text-green-800 mb-2">Agendamento Realizado!</h3>
            <p className="text-green-700 mb-4 whitespace-pre-line">{successMessage}</p>
            <button 
              onClick={() => setSuccessMessage(null)}
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Novo Agendamento
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Nome do Cliente:</label>
              <input
                type="text"
                required
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Nome completo"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Telefone:</label>
                <input
                  type="tel"
                  required
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  placeholder="Somente números"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Cidade:</label>
                <select
                  required
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                >
                  <option value="">Selecione...</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Tipo de Atividade:</label>
                <select
                  required
                  value={atividade}
                  onChange={(e) => setAtividade(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white"
                >
                  <option value="">Selecione a atividade...</option>
                  {availableActivities.map(ativ => <option key={ativ} value={ativ}>{ativ}</option>)}
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Data da Visita:</label>
                <input
                  type="date"
                  required
                  min={minDate}
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-semibold text-gray-700">Período:</label>
                <div className="relative">
                  <select
                    value={periodo}
                    onChange={(e) => setPeriodo(e.target.value as Periodo)}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none bg-white"
                  >
                    <option value={Periodo.MANHA}>☀️ Manhã</option>
                    <option value={Periodo.TARDE}>🌤️ Tarde</option>
                    <option value={Periodo.NOITE}>🌙 Especial (18:00) - Fechamento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Modificado: Input de texto com validação na lista de usuários */}
            <div className="space-y-1">
              <label className="block text-sm font-semibold text-gray-700">Identificação do Agendador (Quem está agendando):</label>
              <input
                type="text"
                required
                value={nomeUsuario}
                onChange={(e) => {
                    setNomeUsuario(e.target.value);
                    if (userError) setUserError(null); // Limpa o erro ao digitar
                }}
                onBlur={() => {
                     // Validação UX opcional no onBlur para feedback rápido
                     if (nomeUsuario && !allowedUsers.some(u => u.trim().toLowerCase() === nomeUsuario.trim().toLowerCase())) {
                         setUserError('Usuário não encontrado.');
                     }
                }}
                placeholder="Digite seu nome..."
                className={`w-full px-4 py-3 rounded-lg border focus:ring-2 outline-none transition-all ${
                    userError 
                    ? 'border-red-500 focus:ring-red-200 focus:border-red-500 bg-red-50' 
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
              />
              {userError && (
                  <div className="flex items-center gap-2 text-red-600 text-sm mt-1 animate-pulse">
                      <AlertIcon className="w-4 h-4" />
                      <span>{userError}</span>
                  </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Técnico Disponível:</label>
              <select
                required
                value={tecnicoId}
                onChange={(e) => setTecnicoId(e.target.value)}
                disabled={!cidade || !data}
                className={`w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-white ${
                  (!cidade || !data) ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
              >
                <option value="">
                  {!cidade || !data 
                    ? 'Selecione data e cidade primeiro...' 
                    : availableTechs.length === 0 
                      ? 'Nenhum técnico disponível neste horário' 
                      : 'Selecione o técnico...'}
                </option>
                {availableTechs.map(tech => (
                  <option key={tech.id} value={tech.id}>
                    {tech.nome}
                  </option>
                ))}
              </select>
              
              {/* Exibição visual das vagas em VERDE */}
              {tecnicoId && selectedTechData && (
                 <div className="flex items-center gap-2 mt-2 animate-fade-in bg-green-50 p-2 rounded-md border border-green-100">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-green-700 font-bold text-sm">
                        {periodo === Periodo.NOITE 
                          ? "Vaga Única - Fechamento do dia" 
                          : `${selectedTechData.vagasRestantes} ${selectedTechData.vagasRestantes === 1 ? 'vaga restante' : 'vagas restantes'} para este horário`
                        }
                    </span>
                 </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !tecnicoId || !!userError}
              className={`w-full py-4 rounded-lg font-bold text-white text-lg flex items-center justify-center gap-2 shadow-md transition-all transform hover:-translate-y-0.5 ${
                isSubmitting || !tecnicoId || !!userError
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-700 hover:bg-blue-800'
              }`}
            >
              {isSubmitting ? (
                <span>Processando...</span>
              ) : (
                <>
                  <SaveIcon className="w-6 h-6" />
                  CONFIRMAR AGENDAMENTO
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
