
import React, { useState, useEffect, useCallback } from 'react';
import { User, UserRole, Document, Comment, LogEntry } from './types';
import Layout from './components/Layout';
import { UI_CONFIG } from './constants';
import SignaturePad from './components/SignaturePad';
import { driveService, DriveFolder } from './services/driveService';

// ID DE CLIENTE OFICIAL PROPORCIONADO
const GOOGLE_CLIENT_ID = '483714227791-od4sq0uq140cdtmvr7heq0qt3q89p74u.apps.googleusercontent.com';

const ADMIN_EMAIL = 'jmartinez@grupovitalicio.es';
const ADMIN_PASS_INITIAL = 'Vitalicio@2020';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('gv_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginError, setLoginError] = useState('');
  
  // Google Drive State
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('gv_token'));
  const [mainDriveFolder, setMainDriveFolder] = useState(() => localStorage.getItem('gv_main_drive') || '');
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [showDrivePicker, setShowDrivePicker] = useState(false);

  // Persistence State
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('gv_users');
    return saved ? JSON.parse(saved) : [
      { id: 'admin_1', name: 'J. Martínez', email: ADMIN_EMAIL, role: UserRole.ADMIN, status: 'ACTIVE', driveFolderPath: '', privacySigned: true },
      { id: 'v_1', name: 'Antonio García', email: 'antonio@gmail.com', role: UserRole.SELLER, status: 'ACTIVE', driveFolderPath: '', privacySigned: false }
    ];
  });

  const [docs, setDocs] = useState<Document[]>(() => {
    const saved = localStorage.getItem('gv_docs');
    return saved ? JSON.parse(saved) : [];
  });

  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('gv_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showAddSeller, setShowAddSeller] = useState(false);

  // Sincronización con LocalStorage
  useEffect(() => {
    localStorage.setItem('gv_users', JSON.stringify(allUsers));
    localStorage.setItem('gv_docs', JSON.stringify(docs));
    localStorage.setItem('gv_logs', JSON.stringify(logs));
    localStorage.setItem('gv_main_drive', mainDriveFolder);
    if (user) localStorage.setItem('gv_current_user', JSON.stringify(user));
  }, [allUsers, docs, logs, mainDriveFolder, user]);

  const handleDriveError = useCallback((err: any) => {
    if (err.message === "SESION_EXPIRED") {
        setGoogleToken(null);
        alert("Su conexión con Google ha caducado. Por favor, pulse 'Vincular Drive' de nuevo para continuar.");
    } else {
        alert("Error de Google: " + err.message);
    }
  }, []);

  const handleDriveConnection = () => {
    const google = (window as any).google;
    if (!google?.accounts?.oauth2) {
        alert("El sistema de Google se está cargando. Por favor, espere 2 segundos y vuelva a intentarlo.");
        return;
    }

    setDriveSyncing(true);
    try {
      const client = google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly',
          ux_mode: 'popup',
          callback: (response: any) => {
              setDriveSyncing(false);
              if (response.access_token) {
                  setGoogleToken(response.access_token);
                  localStorage.setItem('gv_token', response.access_token);
                  setShowDrivePicker(true);
              } else if (response.error) {
                  console.error("GSI Error:", response.error);
                  alert("Error al conectar con Google. Compruebe los permisos.");
              }
          },
          error_callback: (err: any) => {
              setDriveSyncing(false);
              alert("Error de red con Google Identity Services.");
          }
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
      setDriveSyncing(false);
      console.error("Critical GSI Auth Error:", e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const foundUser = allUsers.find(u => u.email === email && u.status === 'ACTIVE');
    if (!foundUser || (email === ADMIN_EMAIL && password !== ADMIN_PASS_INITIAL) || (email !== ADMIN_EMAIL && password !== '123456')) {
      setLoginError('Correo o clave incorrectos. Inténtelo de nuevo.');
      return;
    }
    setUser(foundUser);
    setActiveTab(foundUser.role === UserRole.ADMIN ? 'admin-dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('gv_current_user');
  };

  const handleCreateSeller = async (name: string, email: string) => {
    if (!mainDriveFolder || !googleToken) {
      alert("Primero debe vincular una carpeta raíz de Google Drive.");
      return;
    }
    setIsProcessing(true);
    try {
      const folder = await driveService.createSellerFolder(name, mainDriveFolder, googleToken);
      const newUser: User = {
        id: 'v_' + Date.now(),
        name,
        email,
        role: UserRole.SELLER,
        status: 'ACTIVE',
        driveFolderPath: folder.id,
        privacySigned: false
      };
      setAllUsers(prev => [...prev, newUser]);
      setShowAddSeller(false);
      alert(`Vendedor ${name} creado con éxito. Carpeta de Drive: ${folder.id}`);
    } catch (err) {
      handleDriveError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'PDF' | 'IMAGE') => {
    const file = e.target.files?.[0];
    if (!file || !googleToken) return;

    const targetUser = user?.role === UserRole.ADMIN && selectedSellerId 
        ? allUsers.find(u => u.id === selectedSellerId) 
        : user;

    if (!targetUser?.driveFolderPath) {
        alert("Este expediente no tiene una carpeta de Drive asignada.");
        return;
    }

    setIsProcessing(true);
    try {
      const res = await driveService.syncDocument(file, targetUser.driveFolderPath, googleToken);
      const newDoc: Document = {
        id: res.id,
        name: file.name,
        type,
        url: `https://drive.google.com/file/d/${res.id}/view`,
        status: 'PENDING',
        uploadDate: new Date().toLocaleDateString(),
        ownerId: targetUser.id,
        folderPath: targetUser.driveFolderPath
      };
      setDocs(prev => [...prev, newDoc]);
      setLogs(prev => [...prev, {
        id: 'l_'+Date.now(), sellerId: targetUser.id, action: 'UPLOAD', fileName: file.name, authorName: user!.name, timestamp: new Date().toLocaleString()
      }]);
    } catch (err) {
      handleDriveError(err);
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("¿Desea eliminar este archivo de forma permanente de Drive?") || !googleToken) return;
    setIsProcessing(true);
    try {
      await driveService.deleteFile(docId, googleToken);
      setDocs(prev => prev.filter(d => d.id !== docId));
    } catch (err) {
      handleDriveError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const currentViewId = selectedSellerId || (user?.role === UserRole.SELLER ? user.id : null);
  const currentDocs = docs.filter(d => d.ownerId === currentViewId);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f8fafc]">
        <div className="w-full max-w-md bg-white rounded-[3rem] shadow-2xl border-t-[12px] border-[#a12d34] overflow-hidden animate-slideUp">
          <div className="p-10 text-center bg-slate-50">
            <h1 className="text-4xl font-bold text-[#a12d34] tracking-tight">Grupo Vitalicio</h1>
            <p className="mt-2 text-gray-500 font-bold uppercase text-xs tracking-widest">Acceso Colaboradores</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            <div className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Correo Electrónico" className={UI_CONFIG.inputClass} required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" className={UI_CONFIG.inputClass} required />
            </div>
            {loginError && <p className="text-red-600 font-bold text-center text-senior">{loginError}</p>}
            <button type="submit" className="w-full bg-[#a12d34] text-white py-6 rounded-3xl font-bold text-2xl shadow-xl active:scale-95 transition-all">ENTRAR AL PORTAL</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout} activeTab={activeTab} setActiveTab={setActiveTab} viewingSellerName={allUsers.find(u => u.id === selectedSellerId)?.name} onExitExpediente={() => { setSelectedSellerId(null); setActiveTab('admin-sellers'); }}>
      
      {activeTab === 'admin-dashboard' && (
        <div className="space-y-10 animate-slideUp">
          <h2 className="text-4xl font-bold text-gray-800">Control de Expedientes</h2>
          
          {!mainDriveFolder ? (
            <div className="bg-white p-16 rounded-[4rem] border-4 border-dashed border-[#4285F4] text-center shadow-xl">
              <span className="text-8xl block mb-8">🌩️</span>
              <h3 className="text-3xl font-bold text-gray-800 mb-4">Conecte su Google Drive</h3>
              <p className="text-senior text-gray-500 mb-12 max-w-lg mx-auto leading-relaxed">Debe vincular su cuenta y elegir la carpeta raíz donde se guardarán todas las fichas de los vendedores.</p>
              <button onClick={handleDriveConnection} disabled={driveSyncing} className="bg-[#4285F4] text-white px-16 py-6 rounded-full font-bold text-2xl shadow-2xl hover:bg-blue-600 transition-all flex items-center gap-4 mx-auto btn-shadow">
                {driveSyncing ? 'Abriendo Google...' : 'VINCULAR DRIVE AHORA'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
               <div className="bg-white p-10 rounded-[3rem] shadow-lg border-l-[12px] border-blue-500">
                  <p className="text-gray-400 font-bold uppercase text-xs mb-2 tracking-widest">Google Drive</p>
                  <p className="text-2xl font-bold text-green-600">🟢 Conectado</p>
                  <button onClick={() => setShowDrivePicker(true)} className="mt-6 text-senior font-bold text-blue-500 underline uppercase tracking-widest">Cambiar Raíz</button>
               </div>
               <div className="bg-white p-10 rounded-[3rem] shadow-lg border-l-[12px] border-[#a12d34]">
                  <p className="text-gray-400 font-bold uppercase text-xs mb-2 tracking-widest">Asesores</p>
                  <p className="text-5xl font-bold text-gray-800">{allUsers.filter(u => u.role === UserRole.SELLER).length}</p>
               </div>
               <div className="bg-white p-10 rounded-[3rem] shadow-lg border-l-[12px] border-[#C5A059]">
                  <p className="text-gray-400 font-bold uppercase text-xs mb-2 tracking-widest">Documentos</p>
                  <p className="text-5xl font-bold text-gray-800">{docs.length}</p>
               </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'admin-sellers' && (
        <div className="space-y-8 animate-slideUp">
          <div className="flex justify-between items-center">
             <h2 className="text-4xl font-bold text-gray-800">Gestión de Vendedores</h2>
             <button onClick={() => setShowAddSeller(true)} className="bg-[#C5A059] text-white px-10 py-4 rounded-3xl font-bold shadow-xl hover:bg-[#b08e4d]">+ Nuevo Alta</button>
          </div>
          <div className="grid grid-cols-1 gap-6">
             {allUsers.filter(u => u.role === UserRole.SELLER).map(s => (
                <div key={s.id} className="bg-white p-8 rounded-[3rem] shadow-md border-l-[12px] border-[#a12d34] flex flex-wrap justify-between items-center hover:shadow-2xl transition-all">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center text-3xl font-bold text-[#a12d34]">{s.name.charAt(0)}</div>
                      <div>
                         <h3 className="text-2xl font-bold text-gray-800">{s.name}</h3>
                         <p className="text-senior text-gray-400 font-medium">{s.email}</p>
                      </div>
                   </div>
                   <div className="flex gap-4">
                      <button onClick={() => { setSelectedSellerId(s.id); setActiveTab('dashboard'); }} className="bg-[#a12d34] text-white px-10 py-4 rounded-3xl font-bold text-senior shadow-lg btn-shadow">ABRIR EXPEDIENTE</button>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {(activeTab === 'docs' || activeTab === 'photos') && (
        <div className="space-y-10 animate-slideUp">
           <div className="bg-white p-16 rounded-[4rem] border-4 border-dashed border-slate-200 text-center hover:border-[#a12d34]/30 transition-all shadow-sm">
              <span className="text-7xl block mb-6">{activeTab === 'docs' ? '📄' : '📸'}</span>
              <h3 className="text-3xl font-bold mb-4">{activeTab === 'docs' ? 'Subir Contrato o Acta' : 'Subir Reportaje Fotográfico'}</h3>
              <p className="text-senior text-gray-400 mb-10">Los archivos se guardarán directamente en la carpeta de Drive del vendedor.</p>
              <label className="bg-[#a12d34] text-white px-16 py-6 rounded-full font-bold text-2xl cursor-pointer inline-block shadow-2xl btn-shadow">
                 {isProcessing ? 'SINCRONIZANDO...' : 'ELEGIR ARCHIVO'}
                 <input type="file" className="hidden" accept={activeTab === 'docs' ? '.pdf' : 'image/*'} onChange={e => handleFileUpload(e, activeTab === 'docs' ? 'PDF' : 'IMAGE')} disabled={isProcessing} />
              </label>
           </div>
           
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10">
              {currentDocs.filter(d => activeTab === 'docs' ? d.type === 'PDF' : d.type === 'IMAGE').map(doc => (
                <div key={doc.id} className="bg-white rounded-[3rem] overflow-hidden shadow-xl border border-gray-100 flex flex-col group hover:-translate-y-2 transition-all">
                   <div className="h-60 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                      {doc.type === 'IMAGE' ? <img src={doc.url} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" /> : <span className="text-8xl">📑</span>}
                      <button onClick={() => handleDeleteDoc(doc.id)} className="absolute top-6 right-6 bg-white/90 p-4 rounded-full text-red-500 shadow-xl opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                   </div>
                   <div className="p-8">
                      <p className="font-bold text-xl text-gray-800 truncate mb-6">{doc.name}</p>
                      <div className="flex justify-between items-center border-t pt-6">
                         <button onClick={() => window.open(doc.url, '_blank')} className="text-senior font-bold text-[#a12d34] underline">Ver en Drive</button>
                         <span className="text-xs font-bold text-gray-400 uppercase">{doc.uploadDate}</span>
                      </div>
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {showAddSeller && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
           <div className="bg-white w-full max-w-lg rounded-[4rem] p-12 shadow-2xl animate-slideUp">
              <h3 className="text-3xl font-bold text-center mb-10">Alta de Nuevo Asesor</h3>
              <div className="space-y-6">
                 <input id="sellerName" type="text" placeholder="Nombre y Apellidos" className={UI_CONFIG.inputClass} />
                 <input id="sellerEmail" type="email" placeholder="Email @corporativo" className={UI_CONFIG.inputClass} />
              </div>
              <div className="flex gap-6 mt-12">
                 <button onClick={() => setShowAddSeller(false)} className="flex-1 text-senior font-bold text-gray-400">Cerrar</button>
                 <button onClick={() => handleCreateSeller((document.getElementById('sellerName') as HTMLInputElement).value, (document.getElementById('sellerEmail') as HTMLInputElement).value)} className="flex-1 bg-[#a12d34] text-white py-5 rounded-3xl font-bold text-xl shadow-xl active:scale-95" disabled={isProcessing}>
                    {isProcessing ? 'CREANDO...' : 'REGISTRAR'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {showDrivePicker && (
        <DrivePickerModal 
          googleToken={googleToken} 
          onCancel={() => setShowDrivePicker(false)} 
          onSelect={(id) => {
            setMainDriveFolder(id);
            setShowDrivePicker(false);
          }} 
        />
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

  useEffect(() => {
    if (!googleToken) return;
    setLoading(true);
    driveService.fetchFolders(googleToken, currentId)
      .then(setFolders)
      .finally(() => setLoading(false));
  }, [googleToken, currentId]);

  const handleBack = () => {
    const prev = history.pop();
    if (prev) {
        setCurrentId(prev);
        setHistory([...history]);
        setSelectedId(null);
    }
  };

  const handleEnter = (folderId: string) => {
    setHistory([...history, currentId]);
    setCurrentId(folderId);
    setSelectedId(null);
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl animate-slideUp">
        <div className="bg-[#4285F4] p-8 text-white">
          <div className="flex justify-between items-center">
            <h3 className="text-3xl font-bold">Explorador de Drive</h3>
            <button onClick={onCancel} className="text-white text-2xl">×</button>
          </div>
          <p className="text-senior opacity-90 mt-2 tracking-wide">Navegue y elija la carpeta principal del proyecto.</p>
        </div>
        <div className="p-8">
          <div className="flex items-center gap-4 mb-4">
            <button 
              onClick={handleBack} 
              disabled={currentId === 'root'} 
              className={`px-4 py-2 rounded-xl font-bold text-sm ${currentId === 'root' ? 'bg-gray-100 text-gray-300' : 'bg-blue-100 text-blue-600'}`}
            >
              ⬅ Volver
            </button>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              Ubicación: {currentId === 'root' ? 'Mi Unidad' : 'Subcarpeta'}
            </span>
          </div>

          <div className="bg-slate-50 border-2 border-slate-200 rounded-[2rem] h-[45vh] overflow-y-auto mb-8 p-4">
            {loading ? <div className="flex flex-col items-center justify-center h-full gap-4"><div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div><p className="font-bold text-gray-400">Consultando Drive...</p></div> : 
              folders.length === 0 ? <p className="text-center py-20 text-gray-400 font-bold">No se encontraron carpetas aquí.</p> :
              folders.map(f => (
                <div key={f.id} onClick={() => setSelectedId(f.id)} className={`flex items-center gap-4 p-5 rounded-2xl cursor-pointer border-2 mb-3 transition-all ${selectedId === f.id ? 'bg-blue-50 border-blue-400' : 'bg-white border-transparent hover:border-slate-200'}`}>
                  <span className="text-4xl">📁</span>
                  <div className="flex-1 font-bold text-lg text-gray-700 truncate">{f.name}</div>
                  <button onClick={(e) => { e.stopPropagation(); handleEnter(f.id); }} className="px-4 py-2 bg-slate-100 rounded-xl text-[10px] font-black uppercase tracking-tighter hover:bg-slate-200">Entrar</button>
                </div>
              ))
            }
          </div>
          <div className="flex gap-6">
            <button onClick={onCancel} className="flex-1 font-bold text-gray-400 text-lg">Cancelar</button>
            <button onClick={() => selectedId && onSelect(selectedId)} disabled={!selectedId} className={`flex-1 py-5 rounded-3xl font-bold text-xl shadow-xl transition-all ${selectedId ? 'bg-[#4285F4] text-white active:scale-95' : 'bg-gray-200 text-gray-400'}`}>
              ELEGIR ESTA CARPETA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
