
import React from 'react';
import { User, UserRole } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  viewingSellerName?: string;
  onExitExpediente?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  user, 
  onLogout, 
  activeTab, 
  setActiveTab, 
  viewingSellerName,
  onExitExpediente 
}) => {
  if (!user) return <>{children}</>;

  const adminTabs = [
    { id: 'admin-dashboard', label: 'Panel Global', icon: '📊' },
    { id: 'admin-sellers', label: 'Vendedores', icon: '👥' },
    { id: 'settings', label: 'Mi Cuenta', icon: '⚙️' },
  ];

  const sellerTabs = [
    { id: 'dashboard', label: 'Inicio', icon: '🏠' },
    { id: 'docs', label: 'Documentos', icon: '📄' },
    { id: 'photos', label: 'Fotos Vivienda', icon: '📸' },
    { id: 'settings', label: 'Mis Ajustes', icon: '⚙️' },
  ];

  // Si el admin está viendo un expediente, le mostramos las pestañas del vendedor para que pueda gestionar archivos
  const isViewingExpediente = user.role === UserRole.ADMIN && !!viewingSellerName;
  const tabs = isViewingExpediente ? sellerTabs : (user.role === UserRole.ADMIN ? adminTabs : sellerTabs);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 pb-20 md:pb-0">
      <header className="bg-[#a12d34] text-white p-4 shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded shadow-sm">
               <span className="text-[#a12d34] font-bold text-xl px-1">GV</span>
            </div>
            <div>
              <h1 className="text-lg font-bold font-montserrat tracking-tight leading-none">Grupo Vitalicio</h1>
              {viewingSellerName && (
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-[#C5A059] font-bold uppercase animate-pulse">
                    Expediente: {viewingSellerName}
                  </p>
                  <button 
                    onClick={onExitExpediente}
                    className="text-[9px] bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded font-bold uppercase transition-colors"
                  >
                    Salir del visor ×
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold">{user.name}</p>
              <p className="text-[10px] opacity-75 uppercase font-bold tracking-widest">
                {user.role === UserRole.ADMIN ? 'Administrador' : 'Vendedor Externo'}
              </p>
            </div>
            <button 
              onClick={onLogout}
              className="bg-[#C5A059] hover:bg-[#b08e4d] px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 max-w-7xl mx-auto w-full">
        <aside className="hidden md:flex flex-col w-64 bg-white border-r p-6 gap-3 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">
            {isViewingExpediente ? 'Gestión de Archivos' : 'Menú Principal'}
          </p>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-4 p-4 rounded-2xl font-bold transition-all ${
                activeTab === tab.id 
                  ? 'bg-[#a12d34] text-white shadow-xl translate-x-1' 
                  : 'text-gray-500 hover:bg-gray-50 hover:text-[#a12d34]'
              }`}
            >
              <span className="text-2xl">{tab.icon}</span>
              <span className="text-sm">{tab.label}</span>
            </button>
          ))}
          
          {isViewingExpediente && (
            <button
              onClick={onExitExpediente}
              className="mt-6 flex items-center gap-4 p-4 rounded-2xl font-bold text-red-500 hover:bg-red-50 transition-all border border-dashed border-red-200"
            >
              <span className="text-xl">🔙</span>
              <span className="text-sm">Volver a Vendedores</span>
            </button>
          )}
          
          <div className="mt-auto p-5 bg-[#C5A059]/5 rounded-2xl border border-[#C5A059]/10">
             <p className="text-[10px] font-bold text-[#a12d34] uppercase mb-2">Asistencia</p>
             <p className="text-[11px] font-semibold text-gray-600 mb-1 break-all">info@grupovitalicio.es</p>
             <p className="text-lg font-bold text-[#C5A059]">663 04 04 04</p>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-10 overflow-y-auto">
          {children}
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t flex justify-around p-3 z-50 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[50px] ${
              activeTab === tab.id ? 'text-[#a12d34] bg-red-50/50' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[8px] font-bold uppercase">{tab.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;
