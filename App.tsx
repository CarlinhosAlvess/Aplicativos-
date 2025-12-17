
import React, { useState, useEffect, useRef } from 'react';
import BookingForm from './components/BookingForm';
import SheetEditor from './components/SheetEditor';
import Dashboard from './components/Dashboard';
import { TableIcon, EditIcon, ChartIcon, AlertIcon, LockIcon } from './components/Icons';
import { loadFromCloud, saveToCloud, isValidUrl } from './services/cloudService';
import { getSheetData, setFullData, removeAgendamento, confirmarPreAgendamento, expirePreBookings, addLog, getUniqueCities } from './services/mockSheetService';
import { UserProfile, UsuarioPermissoes } from './types';

// --- BRANDING COMPONENT ---
const BrayoLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Circle Base */}
    <circle cx="50" cy="50" r="48" fill="#4F46E5" />
    
    {/* Main Text */}
    <text x="50" y="52" textAnchor="middle" fill="white" fontSize="26" fontWeight="900" fontFamily="sans-serif" letterSpacing="-1">Brayo</text>
    
    {/* Orange Line Detail */}
    <path d="M25 62 L75 62" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
    
    {/* Subtitle */}
    <text x="50" y="76" textAnchor="middle" fill="white" fontSize="9" fontWeight="bold" fontFamily="sans-serif" letterSpacing="1">INTERNET</text>
    
    {/* Speed/Signal decorative lines */}
    <path d="M72 32 Q80 28 85 20" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
    <path d="M78 36 Q84 34 88 28" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
  </svg>
);

// Componente simples de Toast para notificação
const Toast = ({ title, message, type, onAction, actionLabel, onClose }: { title: string, message: string, type: 'warning' | 'error' | 'success', onAction?: () => void, actionLabel?: string, onClose: () => void }) => (
    <div className={`fixed bottom-4 right-4 z-[100] max-w-sm w-[90%] mx-auto sm:w-full bg-white rounded-xl shadow-2xl border-l-4 p-4 animate-fade-in-up ${
        type === 'warning' ? 'border-amber-500' : 
        type === 'success' ? 'border-emerald-500' : 
        'border-rose-500'
    }`}>
        <div className="flex gap-3">
            <div className={`mt-0.5 ${
                type === 'warning' ? 'text-amber-500' : 
                type === 'success' ? 'text-emerald-500' : 
                'text-rose-500'
            }`}>
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
const playNotificationSound = (type: 'warning' | 'error' | 'success') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const masterGain = ctx.createGain();
        masterGain.connect(ctx.destination);
        // Volume master seguro
        masterGain.gain.setValueAtTime(0.15, ctx.currentTime);

        if (type === 'success') {
             // Som de Sucesso (Acorde maior ascendente)
             const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
             frequencies.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(masterGain);
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + (i * 0.1));
                gain.gain.setValueAtTime(0, ctx.currentTime + (i * 0.1));
                gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + (i * 0.1) + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + (i * 0.1) + 0.4);
                osc.start(ctx.currentTime + (i * 0.1));
                osc.stop(ctx.currentTime + (i * 0.1) + 0.5);
             });
        } else if (type === 'warning') {
            // Som de "Carrilhão" / Atenção (Dois tons harmônicos)
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(masterGain);
            
            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(880, ctx.currentTime); 
            
            gain1.gain.setValueAtTime(0, ctx.currentTime);
            gain1.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
            gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
            
            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.6);

            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(masterGain);
            
            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15);
            
            gain2.gain.setValueAtTime(0, ctx.currentTime + 0.15);
            gain2.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.2);
            gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);

            osc2.start(ctx.currentTime + 0.15);
            osc2.stop(ctx.currentTime + 0.8);

        } else {
            // Som de "Falha" / "Power Down"
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(masterGain);

            osc.type = 'sawtooth';
            
            osc.frequency.setValueAtTime(150, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.4);

            gain.gain.setValueAtTime(0.3, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.5);
        }

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
    permissoes: UsuarioPermissoes;
}

function App() {
  const [currentUser, setCurrentUser] = useState<UserSession | null>(null);
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const [view, setView] = useState<'form' | 'sheet' | 'dashboard'>('form');
  const [isTransitioning, setIsTransitioning] = useState(false);

  const [showCloudModal, setShowCloudModal] = useState(false);
  const [cloudUrl, setCloudUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  
  const isSyncingRef = useRef(false);

  // Estados de notificação
  const [notification, setNotification] = useState<{id: string, title: string, message: string, type: 'warning' | 'error' | 'success', actionId?: string} | null>(null);
  const notifiedIds = useRef<Set<string>>(new Set());

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

  const handleViewChange = (newView: 'form' | 'sheet' | 'dashboard') => {
      if (view === newView) return;
      setIsTransitioning(true);
      
      // Delay the actual view switch to allow the fade-out to happen
      setTimeout(() => {
          setView(newView);
          // Wait a tiny bit before fading in to ensure React has rendered the new component
          setTimeout(() => {
              setIsTransitioning(false);
          }, 50);
      }, 300); // 300ms matches the duration-300 in the className
  };

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      const db = getSheetData();
      
      const inputUser = loginUser.trim();
      const inputPass = loginPass.trim();

      const user = db.usuarios.find(u => u.nome.toLowerCase() === inputUser.toLowerCase());

      if (user && user.senha === inputPass) {
          const session: UserSession = { 
              nome: user.nome, 
              perfil: user.perfil || 'user',
              permissoes: user.permissoes || { agendamento: true, dashboard: true, planilha: false }
          };
          setCurrentUser(session);
          sessionStorage.setItem('app_global_session', JSON.stringify(session));
          setLoginError('');
          
          // Redireciona para a primeira view permitida
          if (session.permissoes.agendamento) setView('form');
          else if (session.permissoes.dashboard) setView('dashboard');
          else if (session.permissoes.planilha) setView('sheet');
          
          addLog(user.nome, 'Login', 'Usuário acessou o sistema');
      } else {
          setLoginError('Credenciais inválidas. Verifique usuário e senha.');
      }
  }

  const handleLogout = () => {
      if (currentUser) {
          addLog(currentUser.nome, 'Logout', 'Usuário saiu do sistema');
      }
      setIsTransitioning(true);
      setTimeout(() => {
          setCurrentUser(null);
          setLoginUser('');
          setLoginPass('');
          sessionStorage.removeItem('app_global_session');
          setView('form');
          setIsTransitioning(false);
      }, 300);
  }

  const handleSync = async (url: string, forceUpload: boolean = false) => {
      if (!url) return;
      setIsSyncing(true);
      isSyncingRef.current = true;
      
      try {
        if (forceUpload) {
            const localData = getSheetData();
            const success = await saveToCloud(url, localData);
            if (success) {
                setNotification({
                    id: Date.now().toString(),
                    title: "Sucesso",
                    message: "Dados enviados para a nuvem Google.",
                    type: 'success'
                });
                playNotificationSound('success');
            } else {
                throw new Error("Não foi possível enviar os dados (Erro de rede ou URL).");
            }
        } else {
            const cloudData = await loadFromCloud(url);
            if (cloudData) {
                setFullData(cloudData);
                if (!localStorage.getItem('app_initial_load_complete')) {
                     setNotification({
                        id: Date.now().toString(),
                        title: "Conectado",
                        message: "Dados carregados da planilha com sucesso.",
                        type: 'success'
                    });
                    localStorage.setItem('app_initial_load_complete', 'true');
                }
            } else {
                // Se load retorna null (e não erro), significa que algo falhou silenciosamente ou está vazio? 
                // Com o novo cloudService, ele joga erro, então cairá no catch.
            }
        }
        setLastSync(new Date().toLocaleTimeString());
      } catch (e: any) {
          console.error(e);
          // Show Toast Error
          const msg = e.message || 'Erro desconhecido ao sincronizar.';
          setNotification({
              id: Date.now().toString(),
              title: "Erro de Conexão",
              message: msg,
              type: 'error'
          });
          playNotificationSound('error');
      } finally {
          setIsSyncing(false);
          setTimeout(() => { isSyncingRef.current = false; }, 500);
      }
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }

    const savedUrl = localStorage.getItem('app_cloud_url');
    if (savedUrl) {
        setCloudUrl(savedUrl);
        handleSync(savedUrl, false); 
    }

    const handleLocalChange = () => {
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
    
    const checkPreBookings = () => {
        const data = getSheetData();
        const now = Date.now();
        
        data.agendamentos.forEach(ag => {
            if (ag.tipo === 'PRE_AGENDAMENTO' && ag.criadoEm) {
                const createdTime = new Date(ag.criadoEm).getTime();
                const diffMs = now - createdTime;
                const diffMinutes = diffMs / (1000 * 60);
                
                const warningKey = `${ag.id}-warning`;

                if (diffMinutes >= 29 && diffMinutes < 30) {
                    if (!notifiedIds.current.has(warningKey)) {
                        const title = "Pré-Agendamento Expirando!";
                        const msg = `A reserva de ${ag.cliente} expira em menos de 1 minuto.`;
                        
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

        const expiredItems = expirePreBookings();
        
        if (expiredItems.length > 0) {
             expiredItems.forEach((ag, idx) => {
                const title = "Reserva Expirada";
                const msg = `O pré-agendamento de ${ag.cliente} foi cancelado automaticamente.`;
                
                setNotification({
                    id: `${Date.now()}-${idx}`,
                    title: title,
                    message: msg,
                    type: 'error'
                });
                
                playNotificationSound('error');
                sendNativeNotification(title, msg);
             });
        }
    };

    const intervalId = setInterval(() => {
        checkPreBookings();
        const currentUrl = localStorage.getItem('app_cloud_url');
        if (currentUrl && !isSyncingRef.current) {
            // Sincronização periódica silenciosa (não força upload, apenas baixa se necessário ou mantém vivo)
            // handleSync(currentUrl, false); 
            // Comentado para evitar "Failed to fetch" spam se a URL estiver errada.
            // O usuário deve iniciar ou o save dispara.
        }
    }, 10000);

    return () => {
        window.removeEventListener('localDataChanged', handleLocalChange);
        clearInterval(intervalId);
    };
  }, []); 

  const saveCloudConfig = () => {
      const cleanUrl = cloudUrl.trim();
      
      if (!isValidUrl(cleanUrl)) {
          alert('URL Inválida! Certifique-se de que o link termina em "/exec" e pertence ao script.google.com');
          return;
      }

      localStorage.setItem('app_cloud_url', cleanUrl);
      setShowCloudModal(false);
      handleSync(cleanUrl, false);
      // Feedback imediato via Toast será dado pelo handleSync
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

  if (!currentUser) {
      return (
          <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
                   <svg width="100%" height="100%">
                       <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                           <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="1"/>
                       </pattern>
                       <rect width="100%" height="100%" fill="url(#grid)" />
                   </svg>
               </div>

               <div className="flex flex-col items-center justify-center w-full max-w-md bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl shadow-slate-300/60 border border-white/50 p-8 sm:p-12 z-10">
                  <div className="mb-6 transform hover:scale-105 transition-transform duration-500">
                    <BrayoLogo className="w-24 h-24 drop-shadow-xl" />
                  </div>
                  
                  <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">Brayo</h1>
                  <p className="text-xs text-indigo-500 font-bold uppercase tracking-widest mb-8">Gestão de Visitas</p>
                  
                  <form onSubmit={handleLogin} className="space-y-5 w-full">
                      <div className="text-left group">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">Usuário</label>
                          <input 
                             type="text"
                             className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-700 font-medium transition-all"
                             placeholder="Seu usuário de acesso"
                             value={loginUser}
                             onChange={(e) => setLoginUser(e.target.value)}
                             required
                          />
                      </div>
                      <div className="text-left group">
                          <label className="block text-[10px] font-bold text-slate-500 mb-1.5 uppercase tracking-wide group-focus-within:text-indigo-600 transition-colors">Senha</label>
                          <input 
                            type="password" 
                            className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none text-slate-700 font-medium transition-all"
                            placeholder="••••••"
                            value={loginPass}
                            onChange={(e) => setLoginPass(e.target.value)}
                            required
                          />
                      </div>
                      
                      {loginError && (
                          <div className="text-rose-600 text-xs font-bold bg-rose-50 p-3 rounded-xl border border-rose-100 text-center flex items-center justify-center gap-2">
                              <AlertIcon className="w-4 h-4" />
                              {loginError}
                          </div>
                      )}

                      <button type="submit" className="w-full bg-slate-900 hover:bg-indigo-600 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/30 transform active:scale-95 mt-4">
                          Acessar Plataforma
                      </button>
                  </form>
                  <p className="mt-8 text-[10px] text-slate-400 text-center">
                      <span className="block mb-1">Padrão: <strong className="text-slate-500">Administrador / 1234</strong></span>
                      <span className="block">ou <strong className="text-slate-500">admin / admin</strong></span>
                  </p>
               </div>
          </div>
      );
  }

  const isAdmin = currentUser.perfil === 'admin';
  const perms = currentUser.permissoes;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative font-sans">
      
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
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                   {cloudUrl && !isValidUrl(cloudUrl) && (
                      <div className="text-xs text-rose-600 bg-rose-50 p-2 rounded mb-4 border border-rose-100 font-bold">
                          ⚠️ A URL deve terminar com "/exec" e pertencer ao script.google.com
                      </div>
                  )}
                  <div className="flex justify-end gap-3">
                      <button onClick={() => setShowCloudModal(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg">Cancelar</button>
                      <button onClick={saveCloudConfig} className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700">Salvar e Conectar</button>
                  </div>
              </div>
          </div>
      )}

      {/* Navbar Clean & Modern - REDUCED HEIGHT */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="w-full px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            
            {/* Logo Section - SLIGHTLY SMALLER */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <BrayoLogo className="w-8 h-8 sm:w-10 sm:h-10 shadow-sm rounded-full" />
              <div className="flex flex-col justify-center">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 leading-none">
                  Brayo
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-indigo-500 leading-none mt-0.5">
                    Gestão
                </span>
              </div>
            </div>
            
            {/* Navigation Buttons - COMPACT */}
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="hidden md:flex flex-col items-end mr-3 border-r border-slate-100 pr-3">
                 <span className="text-xs font-bold text-slate-700">{currentUser.nome}</span>
                 <span className="text-[10px] text-slate-400 uppercase">{isAdmin ? 'Admin' : 'User'}</span>
              </div>

              <button
                onClick={() => perms.agendamento && handleViewChange('form')}
                disabled={!perms.agendamento}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  !perms.agendamento ? 'opacity-30 cursor-not-allowed hidden' : 
                  view === 'form' 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <EditIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Agenda</span>
              </button>

              <button
                onClick={() => perms.dashboard && handleViewChange('dashboard')}
                disabled={!perms.dashboard}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                  !perms.dashboard ? 'opacity-30 cursor-not-allowed hidden' :
                  view === 'dashboard' 
                  ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <ChartIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Dash</span>
              </button>

              <button
                onClick={() => perms.planilha && handleViewChange('sheet')}
                disabled={!perms.planilha}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    !perms.planilha 
                    ? 'opacity-50 cursor-not-allowed text-slate-400'
                    : view === 'sheet' 
                        ? 'bg-slate-900 text-white shadow-md shadow-slate-200' 
                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
                title={!perms.planilha ? "Acesso restrito" : "Planilha"}
              >
                {!perms.planilha ? <LockIcon className="w-3 h-3" /> : <TableIcon className="w-4 h-4" />}
                <span className="hidden sm:inline">Planilha</span>
              </button>

              <button 
                onClick={handleLogout}
                className="ml-1 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Sair"
              >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - REDUCED PADDING */}
      <main className="w-full px-2 sm:px-6 lg:px-8 py-3 sm:py-6">
        <div className={`transition-all duration-300 ease-in-out transform ${isTransitioning ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}>
            {view === 'form' && perms.agendamento && (
            <div>
                <div className="text-center mb-4 sm:mb-6">
                <h1 className="text-lg sm:text-2xl font-extrabold text-slate-800 tracking-tight">
                    Novo Agendamento
                </h1>
                <p className="text-slate-500 text-xs mt-1">Preencha os dados abaixo para reservar uma visita técnica.</p>
                </div>
                <BookingForm currentUser={currentUser} />
            </div>
            )}

            {view === 'sheet' && perms.planilha && (
            <div className="h-[calc(100vh-100px)] sm:h-auto">
                <div className="mb-2 sm:mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Base de Dados</h1>
                        <p className="text-slate-500 mt-0.5 text-[10px] sm:text-xs hidden sm:block">Gerenciamento centralizado de técnicos e recursos.</p>
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

            {view === 'dashboard' && perms.dashboard && (
            <div>
                <Dashboard />
            </div>
            )}
        </div>
      </main>
    </div>
  );
}

export default App;
