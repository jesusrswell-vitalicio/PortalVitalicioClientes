import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User, UserRole, Document, Comment, LogEntry } from './types';
import Layout from './components/Layout';
import { UI_CONFIG } from './constants';
import SignaturePad from './components/SignaturePad';
import { driveService, DriveFolder } from './services/driveService';

// --- CONFIGURACIÓN SUPABASE ---
const supabaseUrl = 'https://nxgsszsdouzpstsdiloi.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54Z3NzenNkb3V6cHN0c2RpbG9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2MzYwMjcsImV4cCI6MjA4ODIxMjAyN30.99NKnWQmbvv8ssVLQ9ASvAQqJ9QmBL6647VH_anAf_E';
const supabase = createClient(supabaseUrl, supabaseKey);

const PRIVACY_POLICY_TEXT = `...`; // (Mantén aquí tu texto legal)

const App: React.FC = () => {
  // Estados de Usuario y Sesión
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estados de Datos (Ahora vienen de Supabase)
  const [docs, setDocs] = useState<Document[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Estados de UI
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // 1. Cargar sesión inicial y datos
  useEffect(() => {
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await fetchUserData(session.user.id);
      }
      setLoading(false);
    };
    initSession();
  }, []);

  const fetchUserData = async (userId: string) => {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();
    if (profile) {
      setUser(profile as User);
      if (profile.role === 'ADMIN') {
        fetchAdminData();
      } else {
        fetchSellerData(userId);
      }
    }
  };

  const fetchAdminData = async () => {
    const { data: users } = await supabase.from('profiles').select('*');
    const { data: allDocs } = await supabase.from('documents').select('*');
    const { data: allLogs } = await supabase.from('activity_logs').select('*');
    if (users) setAllUsers(users);
    if (allDocs) setDocs(allDocs);
    if (allLogs) setLogs(allLogs);
  };

  const fetchSellerData = async (sellerId: string) => {
    const { data: sDocs } = await supabase.from('documents').select('*').eq('owner_id', sellerId);
    const { data: sComments } = await supabase.from('comments').select('*').eq('seller_id', sellerId);
    if (sDocs) setDocs(sDocs);
    if (sComments) setComments(sComments);
  };

  // 2. Lógica de Autenticación
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (error) {
      alert('Error de acceso: ' + error.message);
    } else if (data.user) {
      await fetchUserData(data.user.id);
    }
    setIsProcessing(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setDocs([]);
  };

  // 3. Gestión de Documentos y Logs
  const addLog = async (sellerId: string, action: string, fileName: string) => {
    const newLog = {
      seller_id: sellerId,
      action,
      file_name: fileName,
      author_name: user?.name || 'Sistema',
      author_id: user?.id,
      timestamp: new Date().toLocaleString('es-ES')
    };
    await supabase.from('activity_logs').insert([newLog]);
    // Recargar logs localmente
    fetchAdminData();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsProcessing(true);
    // 1. Simulación o subida real a Drive aquí (tu driveService)
    const drivePath = user.driveFolderPath; 
    
    // 2. Registro en Supabase
    const { data: newDoc, error } = await supabase.from('documents').insert([{
      name: file.name,
      type: type,
      status: 'PENDING',
      upload_date: new Date().toLocaleDateString('es-ES'),
      owner_id: selectedSellerId || user.id,
      folder_path: drivePath
    }]).select().single();

    if (newDoc) {
      setDocs(prev => [...prev, newDoc as any]);
      addLog(selectedSellerId || user.id, 'UPLOAD', file.name);
    }
    setIsProcessing(false);
  };

  // --- RENDERIZADO ---
  if (loading) return <div className="flex h-screen items-center justify-center">Cargando...</div>;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <form onSubmit={handleLogin} className="bg-white p-10 rounded-[2.5rem] shadow-2xl w-full max-w-md">
          <h1 className="text-3xl font-bold text-[#a12d34] mb-6 text-center">Grupo Vitalicio</h1>
          <input type="email" placeholder="Email" className={UI_CONFIG.inputClass} value={email} onChange={e => setEmail(e.target.value)} required />
          <input type="password" placeholder="Contraseña" className={`${UI_CONFIG.inputClass} mt-4`} value={password} onChange={e => setPassword(e.target.value)} required />
          <button type="submit" disabled={isProcessing} className="w-full bg-[#a12d34] text-white py-4 rounded-xl mt-6 font-bold shadow-lg">
            {isProcessing ? 'Verificando...' : 'Acceder'}
          </button>
        </form>
      </div>
    );
  }

  // Vista Principal (Dashboard)
  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab}>
      <div className="space-y-8 animate-fadeIn">
        {/* Aquí va el resto de tu lógica de componentes (Cards, Listas, etc.) 
            usando el estado de 'docs', 'allUsers', etc., que ahora se alimenta de Supabase */}
        <h2 className="text-2xl font-bold">Bienvenido, {user.name}</h2>
        {/* ... Resto de componentes de tu App.tsx original ... */}
      </div>
    </Layout>
  );
};

export default App;