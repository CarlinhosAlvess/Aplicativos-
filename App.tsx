
import React, { useState } from 'react';
import BookingForm from './components/BookingForm';
import SheetEditor from './components/SheetEditor';
import Dashboard from './components/Dashboard';
import { TableIcon, EditIcon, ChartIcon } from './components/Icons';

function App() {
  const [view, setView] = useState<'form' | 'sheet' | 'dashboard'>('form');

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 pb-20 relative">
      {/* Navbar */}
      <nav className="shadow-sm border-b border-gray-200 sticky top-0 z-50 bg-indigo-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="bg-white text-indigo-900 w-8 h-8 rounded-lg flex items-center justify-center font-bold">
                A
              </div>
              <span className="font-bold text-xl tracking-tight text-white">
                Agendamento Técnico
              </span>
            </div>
            
            <div className="flex items-center space-x-2 md:space-x-4">
              <button
                onClick={() => setView('form')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'form' ? 'bg-indigo-700 text-white shadow-sm' : 'text-indigo-200 hover:text-white hover:bg-indigo-800'
                }`}
              >
                <EditIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Agendamento</span>
              </button>

              <button
                onClick={() => setView('dashboard')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'dashboard' ? 'bg-indigo-700 text-white shadow-sm' : 'text-indigo-200 hover:text-white hover:bg-indigo-800'
                }`}
              >
                <ChartIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </button>

              <button
                onClick={() => setView('sheet')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  view === 'sheet' ? 'bg-indigo-700 text-white shadow-sm' : 'text-indigo-200 hover:text-white hover:bg-indigo-800'
                }`}
              >
                <TableIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Planilha</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {view === 'form' && (
          <div className="animate-fade-in-up">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Portal do Colaborador</h1>
              <p className="mt-2 text-lg text-gray-600">
                Preencha os dados abaixo para agendar uma nova visita técnica.
              </p>
            </div>
            <BookingForm />
          </div>
        )}

        {view === 'sheet' && (
          <div className="animate-fade-in-up">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Gerenciamento de Dados</h1>
                    <p className="text-gray-600">Simulação da integração com Google Sheets.</p>
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
