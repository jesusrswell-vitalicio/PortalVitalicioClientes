tsx
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, UserRole, Document, Comment, LogEntry } from './types';
import Layout from './components/Layout';
import { UI_CONFIG } from './constants';
import SignaturePad from './components/SignaturePad';
import { driveService, DriveFolder } from './services/driveService';

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ADMIN_EMAIL = 'jmartinez@grupovitalicio.es';
const PRIVACY_POLICY_TEXT = `... (Tu texto legal completo aquí) ...`;

// --- COMPONENTES AUXILIARES ---
const DrivePickerModal: React.FC<{ onSelect: (path: string) => void; onCancel: () => void }> = ({ onSelect, onCancel }) => {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  useEffect(() => { driveService.fetchFolders().then(data => { setFolders(data); setLoading(false); }); }, []);
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-6">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn">
        <div className="bg-[#4285F4] p-8 text-white flex justify-between items-center">
          <div><h3 className="text-2xl font-bold">Seleccionar Carpeta Raíz</h3><p className="text-sm opacity-90 mt-1">Google Drive: sguillen@grupovitalicio.es</p></div>
        </div>
        <div className="p-8">
          <div className="bg-slate-50 border rounded-2xl h-80 overflow-y-auto mb-6">
            {loading ? <div className="h-full flex items-center justify-center">Cargando...</div> : 
              <div className="p-2">{folders.map(f => (
                <button key={f.id} onClick={() => setSelectedFolder(f.path)} className={`w-full text-left p-4 rounded-xl flex items-center gap-4 ${selectedFolder === f.path ? 'bg-blue-50 border-blue-200 border-2' : ''}`}>
                  <span>📁</span><div><p className="font-bold">{f.name}</p><p className="text-[10px] text-gray-400">{f.path}</p></div>
                </button>
              ))}</div>}
          </div>
          <div className="flex gap-4">
            <button onClick={onCancel} className="flex-1 py-4 font-bold text-gray-400">Cancelar</button>
            <button onClick={() => selectedFolder && onSelect(selectedFolder)} disabled={!selectedFolder} className="flex-1 py-4 bg-[#4285F4] text-white rounded-2xl font-bold">Establecer Raíz</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... (Aquí incluirías los componentes AuditModal, CommentsSection y ActivityLog tal cual los tenías en tus partes 3 y 4) ...

const App: React.FC = () => {
  // --- ESTADOS PRINCIPALES ---
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Datos desde Supabase
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [docs, setDocs] = useState<Document[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // UI States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaValue, setCaptchaValue] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [showPrivacySignature, setShowPrivacySignature] = useState(false);
  const [userDniInput, setUserDniInput] = useState('');
  const [mainDriveFolder, setMainDriveFolder] = useState(() => localStorage.getItem('gv_main_drive') || '');
  const [isDriveConnected, setIsDriveConnected] = useState(() => localStorage.getItem('gv_drive_connected') === 'true');

  // --- LÓGICA DE AUTENTICACIÓN (SUPABASE) ---
  useEffect(() => {
    generateCaptcha();
    // Suscripción al estado de Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await loadUserData(session.user.id);
      } else {
        setUser(null);
        setLoading(false);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (userId: string) => {
    setLoading(true);
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
      const formattedUser: User = { ...profile, role: profile.role as UserRole, privacySigned: profile.privacy_signed, driveFolderPath: profile.drive_folder_path };
      setUser(formattedUser);
      // Cargar datos globales
      await refreshGlobalData();
    }
    setLoading(false);
  };

  const refreshGlobalData = async () => {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: documents } = await supabase.from('documents').select('*');
    if (profiles) setAllUsers(profiles.map(p => ({ ...p, role: p.role as UserRole, privacySigned: p.privacy_signed, driveFolderPath: p.drive_folder_path })));
    if (documents) setDocs(documents);
  };

  const generateCaptcha = () => setCaptchaValue(Math.floor(1000 + Math.random() * 9000).toString());

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userCaptchaInput !== captchaValue) { setLoginError('Captcha incorrecto'); generateCaptcha(); return; }
    
    setIsProcessing(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setLoginError('Acceso denegado: ' + error.message); generateCaptcha(); }
    setIsProcessing(false);
  };

  const handleLogout = () => supabase.auth.signOut();

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // 1. Crear en Supabase Auth
    const { data, error } = await supabase.auth.signUp({ 
        email: email, 
        password: password, 
        options: { data: { name: 'Nombre Vendedor', role: 'SELLER' } } 
    });
    if (data.user) {
        const drivePath = await driveService.createSellerFolder('Nombre Vendedor', mainDriveFolder);
        await supabase.from('profiles').update({ drive_folder_path: drivePath }).eq('id', data.user.id);
        await refreshGlobalData();
        setShowAddSeller(false);
    }
    setIsProcessing(false);
  };

  // --- RENDERIZADO CONDICIONAL ---
  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-[#a12d34]">GRUPO VITALICIO: Cargando...</div>;

  if (!user) {
    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
            {/* Aquí va tu diseño de Login (Parte 8) */}
            <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md">
                <h1 className="text-2xl font-bold text-[#a12d34] mb-6">Acceso Portal</h1>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={UI_CONFIG.inputClass} placeholder="Email" required />
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className={`${UI_CONFIG.inputClass} mt-4`} placeholder="Contraseña" required />
                <button type="submit" disabled={isProcessing} className="w-full bg-[#a12d34] text-white py-4 rounded-xl mt-6 font-bold">
                    {isProcessing ? 'Entrando...' : 'Acceder'}
                </button>
            </form>
        </div>
    );
  }

  // --- DASHBOARD PRINCIPAL ---
  const currentViewUser = selectedSellerId ? allUsers.find(u => u.id === selectedSellerId) : user;
  const currentDocs = docs.filter(d => d.ownerId === (selectedSellerId || user.id));

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      viewingSellerName={currentViewUser?.name}
      onExitExpediente={() => { setSelectedSellerId(null); setActiveTab('admin-sellers'); }}
    >
      {/* 
        AQUÍ PEGAS TODAS LAS VISTAS QUE ME ENVIASTE (Partes 9 a 13) 
        - Panel Global Admin
        - Lista de Vendedores
        - Expedientes (Docs, Photos, Settings)
      */}
      <div className="p-4">
          <h2 className="text-xl font-bold">Bienvenido, {user.name}</h2>
          <p className="text-gray-500">Rol: {user.role}</p>
          {/* Aquí se inyectan las pestañas dinámicamente según activeTab */}
          {activeTab === 'admin-sellers' && (
              /* Pega aquí el bloque de la Parte 10 */
              <div>Contenido de Vendedores...</div>
          )}
      </div>

      {/* MODALES */}
      {showAddSeller && ( /* Pega aquí el modal de la Parte 13 */ null )}
      {showDrivePicker && <DrivePickerModal onSelect={(p) => setMainDriveFolder(p)} onCancel={() => setShowDrivePicker(false)} />}
    </Layout>
  );
};

export default App;