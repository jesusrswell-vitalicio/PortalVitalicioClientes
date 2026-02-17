
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User, UserRole, Document, LogEntry, Note } from './types';
import Layout from './components/Layout';
import SignaturePad from './components/SignaturePad';
import { UI_CONFIG } from './constants';
import { driveService, DriveFolder } from './services/driveService';

const GOOGLE_CLIENT_ID = '483714227791-od4sq0uq140cdtmvr7heq0qt3q89p74u.apps.googleusercontent.com';

const App: React.FC = () => {
  // --- ESTADO PERSISTENTE ---
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('gv_users');
    return saved ? JSON.parse(saved) : [
      { id: 'admin_1', name: 'Admin Principal', email: 'jmartinez@grupovitalicio.es', password: 'Vitalicio@2020', role: UserRole.ADMIN, status: 'ACTIVE', driveFolderPath: '', privacySigned: true }
    ];
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('gv_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    const saved = localStorage.getItem('gv_notes');
    return saved ? JSON.parse(saved) : [];
  });

  // --- ESTADO SESION ---
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gv_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginError, setLoginError] = useState('');
  
  // CAPTCHA
  const captchaQuest = useMemo(() => ({ a: Math.floor(Math.random()*9), b: Math.floor(Math.random()*9) }), [loginError, user]);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // DRIVE
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('gv_token'));
  const [mainDriveFolder, setMainDriveFolder] = useState(() => localStorage.getItem('gv_main_drive') || '');
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // UI
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [previewFile, setPreviewFile] = useState<any | null>(null);

  // --- PERSISTENCIA ---
  useEffect(() => {
    localStorage.setItem('gv_users', JSON.stringify(allUsers));
    localStorage.setItem('gv_logs', JSON.stringify(logs));
    localStorage.setItem('gv_notes', JSON.stringify(notes));
    localStorage.setItem('gv_main_drive', mainDriveFolder);
    if (user) localStorage.setItem('gv_current_user', JSON.stringify(user));
  }, [allUsers, logs, notes, mainDriveFolder, user]);

  // --- LOGICA DE DRIVE ---
  const refreshFiles = useCallback(async () => {
    if (!googleToken) return;
    const targetFolder = user?.role === UserRole.ADMIN && selectedSellerId 
      ? allUsers.find(u => u.id === selectedSellerId)?.driveFolderPath 
      : user?.driveFolderPath;
    
    if (targetFolder) {
      try {
        const files = await driveService.fetchFilesFromFolder(googleToken, targetFolder);
        setDriveFiles(files);
      } catch (err) { console.error(err); }
    }
  }, [googleToken, user, selectedSellerId, allUsers]);

  useEffect(() => { if (user) refreshFiles(); }, [user, selectedSellerId, refreshFiles]);

  const addLog = (action: LogEntry['action'], description: string, sellerId?: string) => {
    const newLog: LogEntry = {
      id: 'log_'+Date.now(),
      sellerId,
      action,
      description,
      authorName: user?.name || 'Sistema',
      timestamp: new Date().toLocaleString()
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // --- ACCIONES ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (parseInt(captchaAnswer) !== (captchaQuest.a + captchaQuest.b)) {
      setLoginError('Suma incorrecta. Inténtelo de nuevo.');
      return;
    }
    const found = allUsers.find(u => u.email === email && u.password === password && u.status === 'ACTIVE');
    if (!found) {
      setLoginError('Email o clave incorrectos.');
      return;
    }
    setUser(found);
    addLog('LOGIN', `Inicio de sesión exitoso: ${found.email}`);
    setActiveTab(found.role === UserRole.ADMIN ? 'admin-dashboard' : 'dashboard');
  };

  const handleUpdatePassword = (newPass: string, targetUserId?: string) => {
    const uid = targetUserId || user?.id;
    if (!uid) return;
    setAllUsers(prev => prev.map(u => u.id === uid ? { ...u, password: newPass } : u));
    addLog('PASSWORD_CHANGE', `Cambio de contraseña para usuario ID: ${uid}`);
    alert("Contraseña actualizada con éxito.");
  };

  const handleSignPrivacy = (signature: string) => {
    if (!user) return;
    setAllUsers(prev => prev.map(u => u.id === user.id ? { ...u, privacySigned: true } : u));
    setUser({ ...user, privacySigned: true });
    addLog('PRIVACY_SIGN', "Firma de aceptación de privacidad completada.");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !googleToken) return;
    const targetUser = user?.role === UserRole.ADMIN && selectedSellerId 
      ? allUsers.find(u => u.id === selectedSellerId) 
      : user;
    if (!targetUser?.driveFolderPath) return alert("Error: Sin carpeta vinculada.");

    setIsProcessing(true);
    try {
      await driveService.syncDocument(file, targetUser.driveFolderPath, googleToken);
      addLog('UPLOAD', `Subida de archivo: ${file.name}`, targetUser.id);
      refreshFiles();
    } catch (err) { alert("Error al subir"); }
    finally { setIsProcessing(false); e.target.value = ''; }
  };

  const handleDeleteFile = async (id: string, name: string) => {
    if (!confirm(`¿Seguro que desea eliminar ${name}?`) || !googleToken) return;
    try {
      await driveService.deleteFile(id, googleToken);
      addLog('DELETE', `Eliminado archivo: ${name}`);
      refreshFiles();
      setPreviewFile(null);
    } catch (err) { alert("Error al eliminar"); }
  };

  const handleAddNote = (text: string) => {
    if (!text.trim() || !user) return;
    const targetSellerId = selectedSellerId || (user.role === UserRole.SELLER ? user.id : null);
    if (!targetSellerId) return;

    const newNote: Note = {
      id: 'n_'+Date.now(),
      sellerId: targetSellerId,
      authorId: user.id,
      authorName: user.name,
      text,
      timestamp: new Date().toLocaleString()
    };
    setNotes(prev => [...prev, newNote]);
    addLog('NOTE_ADD', "Añadida nota al expediente", targetSellerId);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f1f5f9]">
        <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border-t-[12px] border-[#a12d34] animate-slideUp">
          <div className="p-10 text-center border-b">
            <h1 className="text-4xl font-bold text-[#a12d34]">Grupo Vitalicio</h1>
            <p className="mt-2 text-gray-500 font-bold uppercase text-[10px]">Portal Senior de Producción</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo Electrónico" className={UI_CONFIG.inputClass} required />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Clave Personal" className={UI_CONFIG.inputClass} required />
            
            <div className="bg-slate-50 p-6 rounded-3xl border-2 border-dashed border-gray-200 text-center">
              <p className="text-senior font-bold mb-3">Reto de Seguridad:</p>
              <p className="text-3xl font-black text-[#a12d34] mb-4">{captchaQuest.a} + {captchaQuest.b} = ?</p>
              <input type="number" value={captchaAnswer} onChange={e => setCaptchaAnswer(e.target.value)} placeholder="Resultado" className={`${UI_CONFIG.inputClass} text-center`} required />
            </div>

            {loginError && <p className="text-red-600 font-bold text-center">{loginError}</p>}
            <button type="submit" className="w-full bg-[#a12d34] text-white py-6 rounded-3xl font-bold text-2xl shadow-xl active:scale-95 transition-all">ENTRAR AL PORTAL</button>
          </form>
        </div>
      </div>
    );
  }

  // --- PANTALLA DE FIRMA OBLIGATORIA ---
  if (user.role === UserRole.SELLER && !user.privacySigned) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
         <div className="max-w-2xl text-center space-y-8">
            <span className="text-8xl">📑</span>
            <h2 className="text-4xl font-bold text-gray-800">Compromiso de Privacidad</h2>
            <div className="bg-slate-50 p-10 rounded-[3rem] text-left text-senior text-gray-600 leading-relaxed max-h-[40vh] overflow-y-auto border-2">
               <p className="font-bold mb-4">GRUPO VITALICIO - PROTECCIÓN DE DATOS</p>
               <p>Como colaborador externo, usted se compromete a tratar toda la información de los clientes con absoluta confidencialidad. Queda terminantemente prohibido el uso de fotos o documentos fuera de esta plataforma segura. Sus acciones quedan registradas para auditoría legal.</p>
               <p className="mt-4">Al firmar abajo, usted acepta los términos y condiciones de uso del portal.</p>
            </div>
            <p className="text-red-600 font-bold">Debe firmar para poder empezar a trabajar.</p>
            <SignaturePad onSave={handleSignPrivacy} onCancel={() => setUser(null)} />
         </div>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      onLogout={() => { setUser(null); localStorage.removeItem('gv_current_user'); }} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      viewingSellerName={allUsers.find(u => u.id === selectedSellerId)?.name}
      onExitExpediente={() => { setSelectedSellerId(null); setActiveTab('admin-sellers'); }}
    >
      
      {/* --- DASHBOARD ADMIN --- */}
      {activeTab === 'admin-dashboard' && (
        <div className="space-y-10 animate-slideUp">
           <div className="flex justify-between items-center">
              <h2 className="text-4xl font-bold text-gray-800">Panel Global</h2>
              <button onClick={() => { addLog('LOGIN', 'Exportación de Logs'); alert("Logs exportados a consola para auditoría"); console.table(logs); }} className="bg-slate-800 text-white px-8 py-3 rounded-2xl font-bold text-xs uppercase">Exportar Bitácora</button>
           </div>
           
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white p-10 rounded-[3rem] shadow-xl border-l-[12px] border-[#a12d34]">
                 <h3 className="text-xl font-bold mb-6 flex items-center gap-3">📋 Últimos Movimientos <span className="text-[10px] bg-red-100 text-[#a12d34] px-2 py-1 rounded">Bitácora en Vivo</span></h3>
                 <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4">
                    {logs.slice(0, 20).map(log => (
                       <div key={log.id} className="p-4 bg-slate-50 rounded-2xl border flex justify-between items-start">
                          <div>
                             <p className="font-bold text-sm text-gray-700">{log.description}</p>
                             <p className="text-[10px] text-gray-400 font-bold uppercase">{log.authorName} • {log.action}</p>
                          </div>
                          <p className="text-[9px] font-black text-gray-400">{log.timestamp.split(',')[1]}</p>
                       </div>
                    ))}
                 </div>
              </div>

              <div className="bg-[#4285F4] p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
                 <div className="relative z-10">
                    <h3 className="text-3xl font-bold mb-4">Estado de Google Drive</h3>
                    <p className="opacity-80 mb-8">Conectado a la carpeta raíz: <strong>{mainDriveFolder || 'Ninguna'}</strong></p>
                    <button onClick={() => setShowDrivePicker(true)} className="bg-white text-[#4285F4] px-10 py-4 rounded-full font-bold shadow-xl active:scale-95">Cambiar Estructura</button>
                 </div>
                 <span className="absolute -bottom-10 -right-10 text-[12rem] opacity-10">🌩️</span>
              </div>
           </div>
        </div>
      )}

      {/* --- GESTION DE VENDEDORES (ADMIN) --- */}
      {activeTab === 'admin-sellers' && (
        <div className="space-y-8 animate-slideUp">
           <div className="flex justify-between items-center">
              <h2 className="text-4xl font-bold text-gray-800">Vendedores Externos</h2>
              <button onClick={() => setShowAddSeller(true)} className="bg-[#C5A059] text-white px-10 py-4 rounded-3xl font-bold shadow-xl">+ Nuevo Alta</button>
           </div>
           <div className="grid grid-cols-1 gap-6">
              {allUsers.filter(u => u.role === UserRole.SELLER).map(s => (
                 <div key={s.id} className="bg-white p-8 rounded-[3rem] shadow-md border-l-[12px] border-[#a12d34] flex flex-wrap justify-between items-center">
                    <div className="flex items-center gap-6">
                       <div className="w-20 h-20 bg-red-50 rounded-[2.2rem] flex items-center justify-center text-3xl font-bold text-[#a12d34]">{s.name.charAt(0)}</div>
                       <div>
                          <h3 className="text-2xl font-bold text-gray-800">{s.name}</h3>
                          <p className="text-senior text-gray-400 font-medium">{s.email}</p>
                       </div>
                    </div>
                    <div className="flex gap-4">
                       <button onClick={() => { const p = prompt("Nueva clave:"); if(p) handleUpdatePassword(p, s.id); }} className="px-6 py-4 rounded-3xl text-xs font-bold bg-slate-100 text-gray-500">Reset Clave</button>
                       <button onClick={() => { setSelectedSellerId(s.id); setActiveTab('dashboard'); }} className="bg-[#a12d34] text-white px-10 py-4 rounded-3xl font-bold text-senior shadow-lg btn-shadow">ABRIR EXPEDIENTE</button>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      )}

      {/* --- GESTION DE ARCHIVOS Y NOTAS (EXPEDIENTE) --- */}
      {(activeTab === 'dashboard' || activeTab === 'docs' || activeTab === 'photos') && (
         <div className="space-y-10 animate-slideUp">
            {/* Cabecera del expediente */}
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border-b-8 border-[#C5A059] flex flex-wrap justify-between items-center gap-6">
               <div className="space-y-1">
                  <p className="text-[10px] font-bold text-[#a12d34] uppercase tracking-widest">Documentación en Nube</p>
                  <h2 className="text-3xl font-bold text-gray-800">Gestión de Archivos</h2>
               </div>
               <label className="bg-[#a12d34] text-white px-12 py-5 rounded-full font-bold text-xl cursor-pointer shadow-xl btn-shadow">
                  {isProcessing ? 'SINCRO...' : 'SUBIR ARCHIVO'}
                  <input type="file" className="hidden" onChange={handleFileUpload} disabled={isProcessing} />
               </label>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
               {/* Listado de Archivos */}
               <div className="xl:col-span-2 space-y-6">
                  <h3 className="text-2xl font-bold text-gray-700">Archivos Recientes</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                     {driveFiles.map(file => (
                        <div key={file.id} className="bg-white p-6 rounded-[2.5rem] shadow-lg border-2 border-transparent hover:border-[#a12d34]/20 transition-all flex items-center gap-4 group">
                           <div onClick={() => setPreviewFile(file)} className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-4xl cursor-pointer overflow-hidden border">
                              {file.mimeType.includes('image') ? <img src={file.thumbnailLink} className="w-full h-full object-cover" /> : '📄'}
                           </div>
                           <div className="flex-1 min-w-0">
                              <p className="font-bold text-gray-800 truncate">{file.name}</p>
                              <p className="text-[10px] font-bold text-gray-400 uppercase">{file.mimeType.split('/')[1]}</p>
                           </div>
                           <button onClick={() => handleDeleteFile(file.id, file.name)} className="opacity-0 group-hover:opacity-100 p-4 text-red-500 text-xl transition-all">🗑️</button>
                        </div>
                     ))}
                     {driveFiles.length === 0 && <p className="text-gray-400 font-bold col-span-2 py-20 text-center">No hay archivos en este expediente.</p>}
                  </div>
               </div>

               {/* CHAT / NOTAS */}
               <div className="bg-white rounded-[3rem] shadow-2xl flex flex-col h-[600px] border">
                  <div className="p-8 border-b bg-slate-50 rounded-t-[3rem]">
                     <h3 className="text-xl font-bold">Buzón de Notas</h3>
                     <p className="text-[10px] font-bold text-gray-400 uppercase">Comunicación Admin - Asesor</p>
                  </div>
                  <div className="flex-1 overflow-y-auto p-8 space-y-6">
                     {notes.filter(n => n.sellerId === (selectedSellerId || user.id)).map(note => (
                        <div key={note.id} className={`max-w-[85%] ${note.authorId === user.id ? 'ml-auto' : 'mr-auto'}`}>
                           <p className="text-[9px] font-bold text-gray-400 mb-1 px-2">{note.authorName} • {note.timestamp.split(',')[1]}</p>
                           <div className={`p-5 rounded-[2rem] shadow-sm text-senior font-medium ${note.authorId === user.id ? 'bg-[#a12d34] text-white rounded-tr-none' : 'bg-slate-100 text-gray-700 rounded-tl-none'}`}>
                              {note.text}
                           </div>
                        </div>
                     ))}
                  </div>
                  <div className="p-8 border-t flex gap-3">
                     <input id="noteInput" type="text" placeholder="Escribe algo..." className="flex-1 p-5 bg-slate-50 border-2 rounded-2xl text-lg focus:border-[#a12d34] outline-none" onKeyDown={e => e.key === 'Enter' && (handleAddNote((e.target as HTMLInputElement).value), (e.target as HTMLInputElement).value = '')} />
                     <button onClick={() => { const i = document.getElementById('noteInput') as HTMLInputElement; handleAddNote(i.value); i.value = ''; }} className="bg-[#a12d34] text-white w-16 h-16 rounded-2xl flex items-center justify-center text-2xl shadow-lg active:scale-95 transition-all">➔</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- AJUSTES --- */}
      {activeTab === 'settings' && (
         <div className="max-w-2xl mx-auto space-y-10 animate-slideUp">
            <h2 className="text-4xl font-bold text-gray-800">Mi Cuenta</h2>
            <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border-t-[10px] border-[#C5A059]">
               <div className="flex items-center gap-6 mb-12">
                  <div className="w-24 h-24 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-4xl">👤</div>
                  <div>
                     <p className="text-3xl font-bold text-gray-800">{user.name}</p>
                     <p className="text-lg text-gray-400">{user.email}</p>
                  </div>
               </div>
               
               <div className="space-y-8">
                  <h3 className="text-xl font-bold text-[#a12d34]">Seguridad</h3>
                  <div className="space-y-4">
                     <p className="text-senior text-gray-500 font-bold">Cambiar Contraseña:</p>
                     <input id="newPass" type="password" placeholder="Nueva clave" className={UI_CONFIG.inputClass} />
                     <button onClick={() => { const p = document.getElementById('newPass') as HTMLInputElement; if(p.value) handleUpdatePassword(p.value); p.value = ''; }} className="bg-slate-800 text-white px-10 py-4 rounded-3xl font-bold w-full shadow-lg">Guardar Cambios</button>
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- MODALES --- */}
      {previewFile && (
         <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[300] flex flex-col p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-white text-2xl font-bold truncate">{previewFile.name}</h3>
               <button onClick={() => setPreviewFile(null)} className="text-white text-6xl leading-none">×</button>
            </div>
            <div className="flex-1 bg-white rounded-[3rem] overflow-hidden shadow-2xl">
               {previewFile.mimeType.includes('pdf') ? (
                  <iframe src={previewFile.webViewLink.replace('/view', '/preview')} className="w-full h-full border-none" />
               ) : previewFile.mimeType.includes('image') ? (
                  <div className="w-full h-full flex items-center justify-center p-10">
                     <img src={previewFile.thumbnailLink.replace('=s220', '=s2000')} className="max-w-full max-h-full object-contain shadow-2xl rounded-2xl" />
                  </div>
               ) : (
                  <div className="flex flex-col items-center justify-center h-full gap-6">
                     <span className="text-9xl">📁</span>
                     <p className="text-2xl font-bold text-gray-400">Tipo de archivo no visualizable directamente.</p>
                     <button onClick={() => window.open(previewFile.webViewLink, '_blank')} className="bg-[#a12d34] text-white px-10 py-4 rounded-full font-bold">Abrir en Google Drive</button>
                  </div>
               )}
            </div>
            <div className="mt-8 flex justify-center gap-6">
               <button onClick={() => handleDeleteFile(previewFile.id, previewFile.name)} className="bg-red-600 text-white px-12 py-4 rounded-full font-bold shadow-xl">Eliminar Archivo</button>
               <button onClick={() => window.open(previewFile.webViewLink, '_blank')} className="bg-blue-600 text-white px-12 py-4 rounded-full font-bold shadow-xl">Expandir ↗</button>
            </div>
         </div>
      )}

      {showAddSeller && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
           <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl animate-slideUp">
              <h3 className="text-3xl font-bold text-center mb-10">Alta de Vendedor</h3>
              <div className="space-y-6">
                 <input id="sellerName" type="text" placeholder="Nombre Completo" className={UI_CONFIG.inputClass} />
                 <input id="sellerEmail" type="email" placeholder="Email Corporativo" className={UI_CONFIG.inputClass} />
                 <input id="sellerPass" type="password" placeholder="Clave Inicial" className={UI_CONFIG.inputClass} defaultValue="123456" />
              </div>
              <div className="flex gap-6 mt-12">
                 <button onClick={() => setShowAddSeller(false)} className="flex-1 text-senior font-bold text-gray-400">Cancelar</button>
                 <button onClick={() => {
                    const n = (document.getElementById('sellerName') as HTMLInputElement).value;
                    const e = (document.getElementById('sellerEmail') as HTMLInputElement).value;
                    const p = (document.getElementById('sellerPass') as HTMLInputElement).value;
                    if(n && e && p) {
                       setIsProcessing(true);
                       driveService.createSellerFolder(n, mainDriveFolder, googleToken!)
                        .then(folder => {
                           const nu: User = { id: 'v_'+Date.now(), name: n, email: e, password: p, role: UserRole.SELLER, status: 'ACTIVE', driveFolderPath: folder.id, privacySigned: false };
                           setAllUsers(prev => [...prev, nu]);
                           setShowAddSeller(false);
                           addLog('LOGIN', `Creado nuevo vendedor: ${n}`);
                           alert("Vendedor registrado.");
                        })
                        .finally(() => setIsProcessing(false));
                    }
                 }} className="flex-1 bg-[#a12d34] text-white py-5 rounded-3xl font-bold text-xl shadow-xl active:scale-95 btn-shadow" disabled={isProcessing}>
                    {isProcessing ? 'CREANDO...' : 'REGISTRAR'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {showDrivePicker && (
        <DrivePickerModal googleToken={googleToken} onCancel={() => setShowDrivePicker(false)} onSelect={(id) => { setMainDriveFolder(id); setShowDrivePicker(false); addLog('LOGIN', `Actualizada carpeta raíz Drive: ${id}`); }} />
      )}
    </Layout>
  );
};

const DrivePickerModal: React.FC<{ 
  googleToken: string | null; 
  onCancel: () => void; 
  onSelect: (id: string) => void;
}> = ({ googleToken, onCancel, onSelect }) => {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [currentId, setCurrentId] = useState('root');
  const [history, setHistory] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (token: string, id: string) => {
    setLoading(true);
    try {
      const data = await driveService.fetchFolders(token, id);
      setFolders(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (googleToken) load(googleToken, currentId); }, [googleToken, currentId, load]);

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[400] p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3.5rem] overflow-hidden shadow-2xl">
        <div className="bg-[#4285F4] p-10 text-white flex justify-between items-center">
           <h3 className="text-3xl font-bold">Selector de Raíz</h3>
           <button onClick={onCancel} className="text-5xl">×</button>
        </div>
        <div className="p-10">
           <div className="h-[40vh] overflow-y-auto mb-10 space-y-4">
              {loading ? <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mt-20" /> :
                folders.map(f => (
                   <div key={f.id} onClick={() => setSelectedId(f.id)} className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center gap-4 ${selectedId === f.id ? 'bg-blue-50 border-blue-400' : 'bg-white border-transparent hover:bg-slate-50'}`}>
                      <span className="text-4xl">📁</span>
                      <span className="text-2xl font-bold text-gray-700">{f.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); setHistory([...history, currentId]); setCurrentId(f.id); setSelectedId(null); }} className="ml-auto bg-slate-100 px-4 py-2 rounded-xl text-xs font-bold">ABRIR</button>
                   </div>
                ))
              }
           </div>
           <div className="flex gap-4">
              <button onClick={() => { const p = history.pop(); if(p !== undefined) { setCurrentId(p); setHistory([...history]); } }} className="flex-1 font-bold text-gray-400">Atrás</button>
              <button onClick={() => selectedId && onSelect(selectedId)} className={`flex-1 py-6 rounded-3xl font-bold text-2xl shadow-xl ${selectedId ? 'bg-[#4285F4] text-white' : 'bg-gray-200 text-gray-400'}`}>CONFIRMAR</button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default App;
