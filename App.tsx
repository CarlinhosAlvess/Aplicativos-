
import React, { useState, useEffect, useRef } from 'react';
import BookingForm from './components/BookingForm';
import SheetEditor from './components/SheetEditor';
import Dashboard from './components/Dashboard';
import { TableIcon, EditIcon, ChartIcon, AlertIcon, LockIcon } from './components/Icons';
import { loadFromCloud, saveToCloud } from './services/cloudService';
import { getSheetData, setFullData, removeAgendamento, confirmarPreAgendamento, expirePreBookings, addLog, getUniqueCities } from './services/mockSheetService';
import { UserProfile } from './types';

// Componente simples de Toast para notificação
const Toast = ({ title, message, type, onAction, actionLabel, onClose }: { title: string, message: string, type: 'warning' | 'error', onAction?: () => void, actionLabel?: string, onClose: () => void }) => (
    <div className={`fixed bottom-4 right-4 z-[100] max-w-sm w-[90%] mx-auto sm:w-full bg-white rounded-xl shadow-2xl border-l-4 p-4 animate-fade-in-up ${type === 'warning' ? 'border-amber-500' : 'border-rose-500'}`}>
        <div className="flex gap-3">
            <div className={`mt-0.5 ${type === 'warning' ? 'text-amber-500' : 'text-rose-500'}`}>
                <AlertIcon className="w-5 h-5" />
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">{message}</p>
                
                <div className="flex gap-2 mt-3">
                    {onAction && (
                        <button 
                            onClick={onAction}
                            className="bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-indigo-700 transition"
                        >
                            {actionLabel}
                        </button>
                    )}
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xs font-bold px-2 py-1.5">Dispensar</button>
                </div>
            </div>
        </div>
    </div>
);

// Função para tocar sons aprimorados usando AudioContext
const playNotificationSound = (type: 'warning' | 'error') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        // Volume master seguro
        masterGain.gain.setValueAtTime(0.15, ctx.currentTime);

        if (type === 'warning') {
            // Som de "Carrilhão" / Atenção (Dois tons harmônicos)
            // Tom 1: Mais agudo (A5)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(masterGain);
            
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, ctx.currentTime); 
            
            // Envelope ADSR suave
            gain1.gain.setValueAtTime(0, ctx.currentTime);
            gain1.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05); // Attack
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5); // Decay
            
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.6);

            // Tom 2: Um pouco mais grave e atrasado (E5)
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(masterGain);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // Atraso de 150ms
            
            gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
            gain2.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.2);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.8);

        } else {
            // Som de "Falha" / "Power Down" (Dente de serra descendente)
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);

            osc.type = 'sawtooth'; // Som mais "áspero"
            
            // Slide de frequência para baixo (efeito de desligar)
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        }

        // Importante: Fechar o contexto após o uso para liberar recursos do navegador
        setTimeout(() => {
            if (ctx.state !== 'closed') {
                ctx.close();
            }
        }, 1200);

    } catch (e) {
        console.error("Audio error", e);
    }
};

const sendNativeNotification = (title: string, body: string) => {
    if (!("Notification" in window)) return;
    
    if (Notification.permission === "granted") {
        new Notification(title, { body });
    }
};

interface UserSession {
    nome: string;
    perfil: UserProfile;
}

function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [view, setView] = useState<'form' | 'sheet' | 'dashboard'>('form');
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  // Ref para controlar status de sincronia dentro de listeners de eventos
  const isSyncingRef = useRef(false);

  // Estados de notificação
  const [notification, setNotification] = useState<{id: string, title: string, message: string, type: 'warning' | 'error', actionId?: string} | null>(null);
  
  // Ref para rastrear quais notificações já foram disparadas
  const notifiedIds = useRef<Set<string>>(new Set());

  // Check session on load
  useEffect(() => {
      const savedSession = sessionStorage.getItem('app_global_session');
      if (savedSession) {
          try {
              setCurrentUser(JSON.parse(savedSession));
          } catch (e) {
              sessionStorage.removeItem('app_global_session');
          }
      }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const db = getSheetData();
      
      // Busca exata pelo nome (case sensitive pode ser ajustado se necessário)
      const user = db.usuarios.find(u => u.nome === loginUser);

      if (user && user.senha === loginPass) {
          const session = { nome: user.nome, perfil: user.perfil || 'user' };
          setCurrentUser(session);
          sessionStorage.setItem('app_global_session', JSON.stringify(session));
          setLoginError('');
          // Redirect to form on login
          setView('form');
          // Log login
          addLog(user.nome, 'Login', 'Usuário acessou o sistema');
      } else {
          setLoginError('Credenciais inválidas.');
      }
  }

  const handleLogout = () => {
      if (currentUser) {
          addLog(currentUser.nome, 'Logout', 'Usuário saiu do sistema');
      }
      setCurrentUser(null);
      setLoginUser('');
      setLoginPass('');
      sessionStorage.removeItem('app_global_session');
      setView('form');
  }

  // Função auxiliar de sync
  const handleSync = async (url: string, forceUpload: boolean = false) => {
      if (!url) return;
      setIsSyncing(true);
      isSyncingRef.current = true;
      
      try {
        if (forceUpload) {
            // Envia dados locais para nuvem
            const localData = getSheetData();
            await saveToCloud(url, localData);
        } else {
            // Baixa da nuvem
            const cloudData = await loadFromCloud(url);
            if (cloudData) {
                setFullData(cloudData);
            } else {
                // Se falhar o load (ex: script vazio), faz upload inicial
                const localData = getSheetData();
                await saveToCloud(url, localData);
            }
        }
        setLastSync(new Date().toLocaleTimeString());
      } catch (e) {
          console.error(e);
      } finally {
          setIsSyncing(false);
          // Pequeno delay para liberar a trava, garantindo que eventos residuais não disparem upload
          setTimeout(() => { isSyncingRef.current = false; }, 500);
      }
  };

  useEffect(() => {
    // Solicitar permissão de notificação ao iniciar
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    // Carrega URL salva
    const savedUrl = localStorage.getItem('app_cloud_url');
    if (savedUrl) {
        setCloudUrl(savedUrl);
        // Tenta sincronizar ao abrir se tiver URL
        handleSync(savedUrl, false); 
    }

    // Escuta mudanças locais para salvar na nuvem (se configurado)
    const handleLocalChange = () => {
        // IMPORTANTE: Se estamos no meio de um download da nuvem, NÃO faça upload de volta.
        if (isSyncingRef.current) return;

        const currentUrl = localStorage.getItem('app_cloud_url');
        if (currentUrl) {
            const data = getSheetData();
            saveToCloud(currentUrl, data).then(success => {
                if (success) {
                    setLastSync(new Date().toLocaleTimeString());
                }
            });
        }
    };

    window.addEventListener('localDataChanged', handleLocalChange);
    
    // --- Lógica de Verificação de Pré-Agendamento ---
    const checkPreBookings = () => {
        const data = getSheetData();
        const now = Date.now();
        
        // 1. Verificação de AVISO (29 minutos) - Apenas leitura
        data.agendamentos.forEach(ag => {
            if (ag.tipo === 'PRE_AGENDAMENTO' && ag.criadoEm) {
                const createdTime = new Date(ag.criadoEm).getTime();
                const diffMs = now - createdTime;
                const diffMinutes = diffMs / (1000 * 60);
                
                const warningKey = `${ag.id}-warning`;

                // 29 minutos: Avisar (1 minuto antes de expirar)
                if (diffMinutes >= 29 && diffMinutes < 30) {
                    // Se ainda não notificamos este aviso
                    if (!notifiedIds.current.has(warningKey)) {
                        const title = "Pré-Agendamento Expirando!";
                        const msg = `A reserva de ${ag.cliente} expira em menos de 1 minuto. Confirme agora para não perder a vaga.`;
                        
                        setNotification({
                            id: Date.now().toString(),
                            title: title,
                            message: msg,
                            type: 'warning',
                            actionId: ag.id
                        });
                        
                        playNotificationSound('warning');
                        sendNativeNotification(title, msg);
                        notifiedIds.current.add(warningKey);
                    }
                }
            }
        });

        // 2. Verificação de EXPIRAÇÃO (30 minutos) - Executa limpeza em lote via serviço
        const expiredItems = expirePreBookings();
        
        if (expiredItems.length > 0) {
             expiredItems.forEach(ag => {
                const title = "Reserva Expirada";
                const msg = `O pré-agendamento de ${ag.cliente} foi cancelado automaticamente por exceder 30 minutos.`;
                
                setNotification({
                    id: Date.now().toString(),
                    title: title,
                    message: msg,
                    type: 'error'
                });
                
                playNotificationSound('error');
                sendNativeNotification(title, msg);
             });
        }
    };

    // Robô de Verificação (Pré-agendamentos) e Sincronização Automática
    const intervalId = setInterval(() => {
        checkPreBookings();
        
        // Auto-Sync (Polling) a cada ciclo (10s)
        const currentUrl = localStorage.getItem('app_cloud_url');
        if (currentUrl && !isSyncingRef.current) {
            handleSync(currentUrl, false);
        }
    }, 10000);

    return () => {
        window.removeEventListener('localDataChanged', handleLocalChange);
        clearInterval(intervalId);
    };
  }, []); 

  const saveCloudConfig = () => {
      localStorage.setItem('app_cloud_url', cloudUrl);
      setShowCloudModal(false);
      handleSync(cloudUrl, false);
      alert('Configuração salva! Sincronização ativada.');
  };

  const handleConfirmPreBooking = () => {
      if (notification && notification.actionId) {
          const success = confirmarPreAgendamento(notification.actionId);
          if (success) {
              setNotification(null);
              alert('Agendamento confirmado com sucesso!');
              window.dispatchEvent(new Event('localDataChanged'));
          }
      }
  };

  // --- LOGIN SCREEN ---
  if (!currentUser) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
               <div className="flex flex-col items-center justify-center w-full max-w-md bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 p-8 sm:p-10">
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-2xl shadow-lg shadow-indigo-200 mb-6">
                    A
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">Bem-vindo</h2>
                  <p className="text-sm text-slate-500 mb-8 font-light text-center">Entre com suas credenciais para acessar o sistema.</p>
                  
                  <form onSubmit={handleLogin} className="space-y-5 w-full">
                      <div className="text-left">
                          <label className="block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide">Usuário</label>
                          <input 
                             type="text"
                             className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium transition-all"
                             placeholder="Digite seu usuário"
                             value={loginUser}
                             onChange={(e) => setLoginUser(e.target.value)}
                             required
                          />
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
                          <div className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-lg border border-rose-100 text-center">
                              {loginError}
                          </div>
                      )}

                      <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-xl hover:bg-slate-800 transition shadow-lg shadow-slate-200">
                          Entrar no Sistema
                      </button>
                  </form>
                  <p className="mt-8 text-xs text-slate-400 text-center max-w-xs">
                      Se você esqueceu sua senha, contate o administrador da planilha.
                  </p>
               </div>
          </div>
      );
  }

  const isAdmin = currentUser.perfil === 'admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative font-sans">
      
      {/* Toast Notification Area */}
      {notification && (
          <Toast 
            title={notification.title} 
            message={notification.message} 
            type={notification.type} 
            onClose={() => setNotification(null)}
            onAction={notification.type === 'warning' ? handleConfirmPreBooking : undefined}
            actionLabel="Confirmar Agora"
          />
      )}

      {/* Modal de Configuração da Nuvem */}
      {showCloudModal && (
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg animate-fade-in-up">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">Conectar Google Planilhas</h3>
                  <p className="text-sm text-slate-500 mb-4 leading-relaxed">
                      Cole a URL do seu <strong>Web App (Google Apps Script)</strong> abaixo para sincronizar os dados entre dispositivos.
                  </p>
                  <input 
                    type="text" 
                    value={cloudUrl}
                    onChange={(e) => setCloudUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/..."
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowCloudModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={saveCloudConfig} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Salvar e Conectar</button>
                  </div>
              </div>
          </div>
      )}

      {/* Navbar Clean & Modern */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            
            {/* Logo Section */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shadow-lg shadow-indigo-200">
                A
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-base sm:text-xl tracking-tight text-slate-800 leading-tight">
                  Agendamento
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-semibold hidden sm:inline-block">
                  {currentUser.nome} • {isAdmin ? 'Admin' : 'User'}
                </span>
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => setView('form')}
                className={`flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  view === 'form' 
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <EditIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Agendamento</span>
              </button>

              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  view === 'dashboard' 
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <ChartIcon className="w-5 h-5 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>

              <button
                onClick={() => isAdmin && setView('sheet')}
                disabled={!isAdmin}
                className={`flex items-center gap-2 px-2.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                    !isAdmin 
                    ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-50'
                    : view === 'sheet' 
                        ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
                title={!isAdmin ? "Acesso restrito a administradores" : "Planilha"}
              >
                {!isAdmin ? <LockIcon className="w-4 h-4" /> : <TableIcon className="w-5 h-5 sm:w-4 sm:h-4" />}
                <span className="hidden sm:inline">Planilha</span>
              </button>

              <div className="ml-2 pl-2 border-l border-slate-200">
                  <button 
                    onClick={handleLogout}
                    className="text-xs font-bold text-slate-400 hover:text-rose-600 uppercase tracking-wide px-2 py-1"
                  >
                      Sair
                  </button>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {view === 'form' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-xl sm:text-4xl font-extrabold text-slate-800 tracking-tight">
                Novo Agendamento
              </h1>
            </div>
            <BookingForm currentUser={currentUser} />
          </div>
        )}

        {view === 'sheet' && isAdmin && (
          <div className="animate-fade-in-up h-[calc(100vh-140px)] sm:h-auto">
            <div className="mb-4 sm:mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-xl sm:text-3xl font-bold text-slate-800 tracking-tight">Base de Dados</h1>
                    <p className="text-slate-500 mt-1 text-xs sm:text-base hidden sm:block">Gerenciamento centralizado de técnicos e recursos.</p>
                </div>
            </div>
            <SheetEditor 
                onCloudConfig={() => setShowCloudModal(true)} 
                isCloudConfigured={!!cloudUrl}
                isSyncing={isSyncing}
                currentUser={currentUser}
            />
          </div>
        )}

        {view === 'dashboard' && (
           <div className="animate-fade-in-up">
              <Dashboard />
           </div>
        )}
      </main>
    </div>
  );
}

export default App;
