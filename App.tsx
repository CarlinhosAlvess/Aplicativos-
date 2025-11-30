
import React, { useState } from 'react';
import BookingForm from './components/BookingForm';
import SheetEditor from './components/SheetEditor';
import Dashboard from './components/Dashboard';
import { TableIcon, EditIcon, ChartIcon } from './components/Icons';

function App() {
  const [view, setView] = useState<'form' | 'sheet' | 'dashboard'>('form');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20 relative font-sans">
      {/* Navbar Clean & Modern - Mais compacta no mobile (h-16) */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 sm:h-20 items-center">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center font-bold text-base sm:text-lg shadow-lg shadow-indigo-200">
                A
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-lg sm:text-xl tracking-tight text-slate-800 leading-tight">
                  Agendamento
                </span>
                <span className="text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-400 font-semibold hidden sm:inline-block">
                  Gestão Inteligente
                </span>
              </div>
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100/50 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setView('form')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  view === 'form' 
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <EditIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Agendamento</span>
              </button>

              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  view === 'dashboard' 
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <ChartIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>

              <button
                onClick={() => setView('sheet')}
                className={`flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 ${
                  view === 'sheet' 
                  ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200' 
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                }`}
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Planilha</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content - Padding reduzido no mobile */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        {view === 'form' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-6 sm:mb-8">
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight sm:text-4xl">
                Novo Agendamento
              </h1>
            </div>
            <BookingForm />
          </div>
        )}

        {view === 'sheet' && (
          <div className="animate-fade-in-up">
            <div className="mb-6 sm:mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 tracking-tight">Base de Dados</h1>
                    <p className="text-slate-500 mt-1 text-sm sm:text-base">Gerenciamento centralizado de técnicos e recursos.</p>
                </div>
            </div>
            <SheetEditor />
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
