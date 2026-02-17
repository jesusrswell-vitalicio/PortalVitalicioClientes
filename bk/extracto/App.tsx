
import React, { useState, useEffect } from 'react';
import { User, UserRole, Document, Comment, LogEntry } from './types';
import Layout from './components/Layout';
import { UI_CONFIG } from './constants';
import SignaturePad from './components/SignaturePad';
import { explainDocument } from './services/geminiService';
import { driveService, DriveFolder } from './services/driveService';

// IMPORTANTE: Este Client ID debe tener la URL actual de la aplicación 
// en "Orígenes de JavaScript autorizados" en la consola de Google Cloud.
const GOOGLE_CLIENT_ID = '483714227791-od4sq0uq140cdtmvr7heq0qt3q89p74u.apps.googleusercontent.com';

const ADMIN_EMAIL = 'jmartinez@grupovitalicio.es';
const ADMIN_PASS_INITIAL = 'Vitalicio@2020';

const PRIVACY_POLICY_TEXT = `
Mediante el presente aviso legal y política de privacidad, GRUPO VITALICIO con domicilio social en CALLE ZURBANO 45, 1ª PLANTA, 28010 DE MADRID, informa a los usuarios del sitio webs grupovitalicio.es, Crm.grupovitalicio.es, y este portal de clientes, de su Política de Privacidad, y describe qué datos recoge, cómo los utiliza, las opciones de los usuarios en relación a estos datos, sus derechos (conocidos como derechos ARCO, Acceso, Rectificación, Cancelación y Oposición y los nuevos introducidos por el RGPD, derecho al olvido, derecho al olvido, derecho a la portabilidad de los datos personales y el derecho a la limitación en el tratamiento), la seguridad de sus datos, y la modificación de la política de confidencialidad.

La utilización del sitio web de GRUPO VITALICIO y de cualquiera de los servicios que se incorporan en él, supone la plena aceptación de las condiciones que se presentan a continuación Política de Privacidad.
`;

const INITIAL_USERS: User[] = [
  { id: 'admin_1', name: 'J. Martínez', email: ADMIN_EMAIL, role: UserRole.ADMIN, status: 'ACTIVE', driveFolderPath: '', privacySigned: true },
  { id: 'v_1', name: 'Antonio García', email: 'antonio@gmail.com', role: UserRole.SELLER, status: 'ACTIVE', driveFolderPath: '', privacySigned: false }
];

const INITIAL_PASSWORDS: Record<string, string> = {
  [ADMIN_EMAIL]: ADMIN_PASS_INITIAL,
  'antonio@gmail.com': '123456'
};

const INITIAL_DOCS: Document[] = [
  { id: 'd1', name: 'Contrato Vitalicio Antonio', type: 'CONTRACT', url: '', status: 'PENDING', uploadDate: '20/05/2024', ownerId: 'v_1', folderPath: '' },
];

const DrivePickerModal: React.FC<{ 
  onSelect: (id: string) => void; 
  onCancel: () => void;
  googleToken: string | null; 
}> = ({ onSelect, onCancel, googleToken }) => {
  const [folders, setFolders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    if (!googleToken) {
      setLoading(false);
      return;
    }

    driveService.fetchFolders(googleToken)
      .then(data => {
        setFolders(data);
        setLoading(false);
      })
      .catch(err => {
        console.error("Error en modal:", err);
        setLoading(false);
      });
  }, [googleToken]);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-6">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn">
        <div className="bg-[#4285F4] p-8 text-white flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Seleccionar Carpeta Raíz</h3>
            <p className="text-sm opacity-90 mt-1">Navega por Google Drive</p>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl">
            <span className="text-3xl">📂</span>
          </div>
        </div>
        
        <div className="p-8">
          <div className="bg-slate-50 border rounded-2xl h-80 overflow-y-auto mb-6">
            {loading ? (
               <div className="h-full flex items-center justify-center font-bold text-gray-400">Cargando carpetas...</div>
            ) : (
              <div className="p-2">
                {folders.length === 0 ? (
                  <p className="text-center py-10 text-gray-400 font-bold">No se encontraron carpetas. Asegúrate de tener carpetas en tu Drive.</p>
                ) : folders.map(folder => (
                  <button 
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.id)} 
                    className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all ${
                      selectedFolder === folder.id ? 'bg-blue-50 border-blue-200 border-2' : 'hover:bg-white'
                    }`}
                  >
                    <span className="text-2xl">📁</span>
                    <div className="flex-1">
                      <p className={`font-bold ${selectedFolder === folder.id ? 'text-blue-600' : 'text-gray-700'}`}>
                        {folder.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{folder.id}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={onCancel} className="flex-1 py-4 font-bold text-gray-400">Cancelar</button>
            <button 
              onClick={() => selectedFolder && onSelect(selectedFolder)} 
              disabled={!selectedFolder}
              className={`flex-1 py-4 rounded-2xl font-bold shadow-xl transition-all ${
                selectedFolder ? 'bg-[#4285F4] text-white' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Establecer como Raíz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... Auditoría y Comentarios se mantienen igual para brevedad ...
const AuditModal: React.FC<{ logs: LogEntry[], onCancel: () => void }> = ({ logs, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[200] p-6">
      <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn flex flex-col max-h-[85vh]">
        <div className="bg-[#a12d34] p-8 text-white flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-2xl font-bold">Auditoría de Actividad</h3>
            <p className="text-sm opacity-90 mt-1 uppercase tracking-widest font-bold">Registro de Eventos Críticos</p>
          </div>
          <button onClick={onCancel} className="text-3xl hover:scale-110 transition-transform">×</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-8 bg-slate-50">
          <div className="space-y-4">
            {logs.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-400 font-bold italic">No hay registros de auditoría disponibles.</p>
              </div>
            ) : (
              logs.slice().reverse().map(log => (
                <div key={log.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4 hover:border-[#a12d34]/20 transition-colors">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                    log.action === 'DELETE' ? 'bg-red-50' : 
                    log.action === 'UPLOAD' ? 'bg-blue-50' : 
                    'bg-green-50'
                  }`}>
                    {log.action === 'UPLOAD' && '📤'}
                    {log.action === 'DELETE' && '🗑️'}
                    {log.action === 'SIGNATURE' && '✍️'}
                    {log.action === 'PRIVACY_ACCEPTANCE' && '⚖️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <p className="font-bold text-gray-800">
                        {log.action === 'UPLOAD' ? 'Archivo Sincronizado' : 
                         log.action === 'DELETE' ? 'Eliminación Directa' : 
                         log.action === 'SIGNATURE' ? 'Firma de Documento' : 
                         'Aceptación Política Privacidad'}
                      </p>
                      <span className="text-[10px] text-gray-400 font-bold font-mono shrink-0 ml-2">{log.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate mt-0.5">Elemento: <span className="font-bold">{log.fileName}</span></p>
                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-tighter">Ejecutado por: <span className="text-[#a12d34] font-bold">{log.authorName}</span></p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        
        <div className="p-6 bg-white border-t flex justify-end shrink-0">
          <button onClick={onCancel} className="bg-slate-100 hover:bg-slate-200 text-gray-700 px-8 py-3 rounded-xl font-bold transition-all">
            Cerrar Informe
          </button>
        </div>
      </div>
    </div>
  );
};

const CommentsSection: React.FC<{ 
  sellerId: string, 
  comments: Comment[], 
  user: User, 
  onAddComment: (text: string, sellerId: string) => void 
}> = ({ sellerId, comments, user, onAddComment }) => {
  const [localText, setLocalText] = useState('');
  const sellerComments = comments.filter(c => c.sellerId === sellerId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!localText.trim()) return;
    onAddComment(localText, sellerId);
    setLocalText('');
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100">
      <h3 className="text-xl font-bold text-[#a12d34] mb-6 flex items-center gap-2">
        <span>💬</span> Bitácora del Expediente
      </h3>
      <div className="space-y-4 max-h-60 overflow-y-auto mb-6 pr-2">
        {sellerComments.length === 0 ? (
          <p className="text-gray-400 text-sm italic text-center py-4">No hay notas registradas.</p>
        ) : (
          sellerComments.map(c => (
            <div key={c.id} className="bg-slate-50 p-4 rounded-2xl border-l-4 border-[#C5A059] animate-fadeIn">
              <div className="flex justify-between items-start mb-1">
                <span className="font-bold text-[#a12d34] text-sm">{c.authorName}</span>
                <span className="text-[10px] text-gray-400 font-bold">{c.timestamp}</span>
              </div>
              <p className="text-sm text-gray-600">{c.text}</p>
            </div>
          ))
        )}
      </div>
      <form onSubmit={handleSubmit} className="flex gap-3">
        <input 
          type="text" 
          value={localText} 
          onChange={e => setLocalText(e.target.value)} 
          className={`${UI_CONFIG.inputClass} text-sm py-3`} 
          placeholder="Añadir nota al expediente..." 
          required 
        />
        <button type="submit" className="bg-[#a12d34] text-white px-6 py-3 rounded-xl font-bold text-sm shadow-md transition-all active:scale-95">
          Publicar
        </button>
      </form>
    </div>
  );
};

const ActivityLog: React.FC<{ sellerId: string, logs: LogEntry[] }> = ({ sellerId, logs }) => {
  const sellerLogs = logs.filter(l => l.sellerId === sellerId).reverse();
  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-lg border border-gray-100 mt-6">
      <h3 className="text-xl font-bold text-[#a12d34] mb-6 flex items-center gap-2">
        <span>📋</span> Historial de Actividad
      </h3>
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 text-xs">
        {sellerLogs.length === 0 ? (
          <p className="text-gray-400 italic text-center py-4">Sin actividad reciente.</p>
        ) : (
          sellerLogs.map(l => (
            <div key={l.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
              <div className="text-lg">
                {l.action === 'UPLOAD' && '📤'}
                {l.action === 'DELETE' && '🗑️'}
                {l.action === 'SIGNATURE' && '✍️'}
                {l.action === 'PRIVACY_ACCEPTANCE' && '⚖️'}
              </div>
              <div className="flex-1">
                <p className="font-bold text-gray-700">
                  {l.action === 'UPLOAD' ? 'Subida' : 
                   l.action === 'DELETE' ? 'Eliminación' : 
                   l.action === 'SIGNATURE' ? 'Firma Documento' : 
                   'Aceptación Política Privacidad'}: {l.fileName}
                </p>
                <p className="text-gray-400 font-medium">{l.authorName} • {l.timestamp}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [captchaValue, setCaptchaValue] = useState('');
  const [userCaptchaInput, setUserCaptchaInput] = useState('');
  const [loginError, setLoginError] = useState('');
  
  // Drive Connection State
  const [isDriveConnected, setIsDriveConnected] = useState(() => localStorage.getItem('gv_drive_connected') === 'true');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [driveSyncing, setDriveSyncing] = useState(false);
  const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('gv_token'));

  // Privacy Acceptance State
  const [userDniInput, setUserDniInput] = useState('');
  const [dniError, setDniError] = useState('');

  // Password Change State
  const [passCurrent, setPassCurrent] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passMessage, setPassMessage] = useState({ text: '', type: '' });

  const [docs, setDocs] = useState<Document[]>(() => {
    const saved = localStorage.getItem('gv_docs');
    return saved ? JSON.parse(saved) : INITIAL_DOCS;
  });
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('gv_users');
    return saved ? JSON.parse(saved) : INITIAL_USERS;
  });
  const [userPasswords, setUserPasswords] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('gv_passwords');
    return saved ? JSON.parse(saved) : INITIAL_PASSWORDS;
  });
  const [mainDriveFolder, setMainDriveFolder] = useState(() => {
    return localStorage.getItem('gv_main_drive') || '';
  });
  const [comments, setComments] = useState<Comment[]>(() => {
    const saved = localStorage.getItem('gv_comments');
    return saved ? JSON.parse(saved) : [];
  });
  const [logs, setLogs] = useState<LogEntry[]>(() => {
    const saved = localStorage.getItem('gv_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showPrivacySignature, setShowPrivacySignature] = useState(false);
  
  const [newSellerName, setNewSellerName] = useState('');
  const [newSellerEmail, setNewSellerEmail] = useState('');
  const [newSellerPass, setNewSellerPass] = useState('');

  const generateCaptcha = () => {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    setCaptchaValue(code);
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    localStorage.setItem('gv_users', JSON.stringify(allUsers));
    localStorage.setItem('gv_passwords', JSON.stringify(userPasswords));
    localStorage.setItem('gv_docs', JSON.stringify(docs));
    localStorage.setItem('gv_main_drive', mainDriveFolder);
    localStorage.setItem('gv_comments', JSON.stringify(comments));
    localStorage.setItem('gv_logs', JSON.stringify(logs));
    localStorage.setItem('gv_drive_connected', String(isDriveConnected));
  }, [allUsers, userPasswords, docs, mainDriveFolder, comments, logs, isDriveConnected]);

  const handleDriveConnection = () => {
    const google = (window as any).google;
    if (!google || !google.accounts || !google.accounts.oauth2) {
        alert("El sistema de Google no se ha cargado correctamente. Recarga la página.");
        return;
    }

    setDriveSyncing(true);
    try {
        const client = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.metadata.readonly',
            ux_mode: 'popup', // Obligamos a popup para evitar redirecciones raras en sandboxes
            callback: (response: any) => {
                setDriveSyncing(false);
                if (response.access_token) {
                    setGoogleToken(response.access_token);
                    localStorage.setItem('gv_token', response.access_token);
                    setIsDriveConnected(true);
                    setShowDrivePicker(true);
                } else if (response.error) {
                    console.error("GSI Response Error:", response.error);
                    alert("Error al obtener token de Google. Verifica los orígenes en la consola de Cloud.");
                }
            },
            error_callback: (err: any) => {
                setDriveSyncing(false);
                console.error("GSI Error Callback:", err);
                alert("Error de conexión con Google. Revisa que tu URL esté en 'Orígenes de JavaScript autorizados'.");
            }
        });
        client.requestAccessToken({ prompt: 'consent' });
    } catch (e) {
        setDriveSyncing(false);
        console.error("Critical GSI Init Error:", e);
    }
  };

  const onDriveFolderSelected = (id: string) => {
    setMainDriveFolder(id);
    setShowDrivePicker(false);
    alert(`Portal configurado correctamente con ID: ${id}`);
  };

  const addLog = (sellerId: string, action: LogEntry['action'], fileName: string) => {
    const newLog: LogEntry = {
      id: 'l_' + Date.now(),
      sellerId,
      action,
      fileName,
      authorName: user?.name || 'Sistema',
      timestamp: new Date().toLocaleString('es-ES')
    };
    setLogs(prev => [...prev, newLog]);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (userCaptchaInput !== captchaValue) {
      setLoginError('Código de seguridad incorrecto.');
      generateCaptcha();
      return;
    }

    const foundUser = allUsers.find(u => u.email === email && u.status === 'ACTIVE');
    
    if (!foundUser || userPasswords[email] !== password) {
      setLoginError('Acceso denegado. Verifica tus credenciales.');
      generateCaptcha();
      return;
    }

    setUser(foundUser);
    localStorage.setItem('gv_current_user', JSON.stringify(foundUser));
    setActiveTab(foundUser.role === UserRole.ADMIN ? 'admin-dashboard' : 'dashboard');
  };

  const handleLogout = () => {
    setUser(null);
    setEmail('');
    setPassword('');
    setSelectedSellerId(null);
    localStorage.removeItem('gv_current_user');
  };

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mainDriveFolder || !googleToken) {
      alert("Configura la carpeta raíz de Google Drive primero.");
      return;
    }

    setIsProcessing(true);
    try {
      const driveFolder = await driveService.createSellerFolder(newSellerName, mainDriveFolder, googleToken);
      if (!driveFolder.id) throw new Error("ID de carpeta no devuelto por Drive API");

      const newId = 'v_' + Date.now();
      const newUser: User = {
        id: newId,
        name: newSellerName,
        email: newSellerEmail,
        role: UserRole.SELLER,
        status: 'ACTIVE',
        driveFolderPath: driveFolder.id,
        privacySigned: false
      };

      setAllUsers(prev => [...prev, newUser]);
      setUserPasswords(prev => ({ ...prev, [newSellerEmail]: newSellerPass }));
      setShowAddSeller(false);
      setNewSellerName('');
      setNewSellerEmail('');
      setNewSellerPass('');
      alert('Vendedor registrado y carpeta de Drive vinculada.');
    } catch (error) {
      console.error("Error creating seller:", error);
      alert("No se pudo crear la carpeta en Drive. Re-vincula tu cuenta de Google.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSeller = async (sellerId: string) => {
    if (!confirm('¿Deseas eliminar este vendedor y sus datos?')) return;
    
    setIsProcessing(true);
    setAllUsers(prev => prev.filter(u => u.id !== sellerId));
    setDocs(prev => prev.filter(d => d.ownerId !== sellerId));
    setComments(prev => prev.filter(c => c.sellerId !== sellerId));
    setLogs(prev => prev.filter(l => l.sellerId !== sellerId));
    setIsProcessing(false);
    alert('Vendedor eliminado del sistema.');
  };

  const handlePrivacyAcceptance = (signatureUrl: string) => {
    if (!user || !userDniInput.trim()) {
        setDniError('DNI obligatorio para firmar.');
        return;
    }

    const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, privacySigned: true, dni: userDniInput } : u);
    setAllUsers(updatedUsers);
    setUser({ ...user, privacySigned: true, dni: userDniInput });
    
    const privacyDoc: Document = {
        id: 'privacy_' + user.id,
        name: 'Politica_Privacidad_Firmada.pdf',
        type: 'CONTRACT',
        url: signatureUrl,
        status: 'SIGNED',
        uploadDate: new Date().toLocaleDateString('es-ES'),
        ownerId: user.id,
        folderPath: user.driveFolderPath
    };
    setDocs(prev => [...prev, privacyDoc]);
    
    addLog(user.id, 'PRIVACY_ACCEPTANCE', 'Política de Privacidad Integral');
    setShowPrivacySignature(false);
  };

  const handleFileUpload = async (e: any, type: string) => {
    const file = e.target.files?.[0];
    if (!file || !user || !googleToken) return;

    const targetUser = user.role === UserRole.ADMIN && selectedSellerId 
      ? allUsers.find(u => u.id === selectedSellerId) 
      : user;

    if (!targetUser || !targetUser.driveFolderPath) {
        alert("El usuario no tiene carpeta de Drive asignada.");
        return;
    }

    setIsProcessing(true);
    try {
      const driveRes = await driveService.syncDocument(file, targetUser.driveFolderPath, googleToken);
      const newDoc: Document = {
        id: driveRes.id,
        name: file.name,
        type: type as any,
        url: `https://drive.google.com/file/d/${driveRes.id}/view`,
        status: 'PENDING',
        uploadDate: new Date().toLocaleDateString('es-ES'),
        ownerId: targetUser.id,
        folderPath: targetUser.driveFolderPath
      };
      setDocs(prev => [...prev, newDoc]);
      addLog(targetUser.id, 'UPLOAD', file.name);
    } catch (err) {
      console.error("Upload error:", err);
      alert("Error al subir archivo a Drive.");
    } finally {
      setIsProcessing(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;

    if (doc.type === 'CONTRACT' && doc.id.startsWith('privacy_')) {
        alert("Documento obligatorio.");
        return;
    }

    if (!confirm('¿Eliminar documento?')) return;
    setDocs(prev => prev.filter(d => d.id !== docId));
    addLog(doc.ownerId, 'DELETE', doc.name);
  };

  const handleOpenDriveFolder = (folderId: string | undefined) => {
    if (folderId) window.open(driveService.getFolderViewUrl(folderId), '_blank');
  };

  const currentViewId = selectedSellerId || (user?.role === UserRole.SELLER ? user.id : null);
  const currentViewUser = allUsers.find(u => u.id === currentViewId);
  const currentDocs = docs.filter(d => d.ownerId === currentViewId);

  // Mandatory Privacy Check
  if (user && user.role === UserRole.SELLER && !user.privacySigned) {
    return (
      <div className="fixed inset-0 bg-slate-100 z-[999] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]">
          <div className="p-8 border-b bg-slate-50 rounded-t-[2.5rem] flex justify-between items-center">
             <h2 className="text-2xl font-bold text-[#a12d34]">Política de Privacidad Obligatoria</h2>
             <button onClick={handleLogout} className="text-red-500 font-bold">Cerrar Sesión</button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-6 text-sm text-gray-700">
            <div className="whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-200">
                {PRIVACY_POLICY_TEXT}
            </div>
            <div className="pt-6 border-t">
               <h3 className="text-lg font-bold text-[#a12d34] mb-4">Identificación</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase">Nombre</label>
                       <div className="p-4 bg-slate-100 rounded-xl font-bold">{user.name}</div>
                   </div>
                   <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase">DNI (*)</label>
                       <input 
                         type="text" 
                         value={userDniInput} 
                         onChange={e => { setUserDniInput(e.target.value); setDniError(''); }} 
                         className={`${UI_CONFIG.inputClass} ${dniError ? 'border-red-500' : ''}`}
                         required 
                       />
                       {dniError && <p className="text-red-500 text-[10px] font-bold">{dniError}</p>}
                   </div>
               </div>
            </div>
          </div>
          <div className="p-8 border-t flex justify-center bg-slate-50 rounded-b-[2.5rem]">
             <button 
               onClick={() => {
                 if(!userDniInput.trim()){ setDniError('Introduce tu DNI.'); return; }
                 setShowPrivacySignature(true);
               }} 
               className="bg-[#a12d34] text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-xl transition-transform active:scale-95"
             >
               Firmar Política
             </button>
          </div>
        </div>
        {showPrivacySignature && <SignaturePad onSave={handlePrivacyAcceptance} onCancel={() => setShowPrivacySignature(false)} />}
      </div>
    );
  }

  // Login View
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 overflow-hidden animate-fadeIn">
          <div className="bg-[#a12d34] p-10 text-center text-white">
            <h1 className="text-3xl font-bold tracking-tight">Grupo Vitalicio</h1>
            <p className="mt-2 opacity-80 uppercase text-[10px] tracking-widest font-bold">Portal Colaboradores</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {loginError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border-l-4 border-red-500">{loginError}</div>}
            <div className="space-y-4">
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className={UI_CONFIG.inputClass} required />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Contraseña" className={UI_CONFIG.inputClass} required />
              <div className="flex items-center gap-4">
                 <div className="bg-slate-100 px-5 py-3 rounded-xl border font-bold text-[#a12d34] text-2xl">{captchaValue}</div>
                 <input type="text" value={userCaptchaInput} onChange={e => setUserCaptchaInput(e.target.value)} placeholder="Código" className={`${UI_CONFIG.inputClass} flex-1`} maxLength={4} required />
              </div>
            </div>
            <button type="submit" className="w-full bg-[#a12d34] text-white py-5 rounded-2xl font-bold text-xl">Acceder</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      user={user} 
      onLogout={handleLogout} 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      viewingSellerName={currentViewUser?.name}
      onExitExpediente={() => { setSelectedSellerId(null); setActiveTab('admin-sellers'); }}
    >
      {/* PANEL ADMIN */}
      {activeTab === 'admin-dashboard' && user.role === UserRole.ADMIN && (
        <div className="space-y-8 animate-fadeIn">
          <h2 className={UI_CONFIG.headingClass}>Panel Global</h2>
          {!isDriveConnected ? (
            <div className="bg-blue-50 border-2 border-blue-200 p-10 rounded-[2.5rem] flex items-center gap-8 shadow-xl">
              <span className="text-4xl">📂</span>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-blue-800">Sincronización con Drive</h3>
                <p className="text-sm text-blue-600">Es necesario vincular una cuenta de Google para gestionar los expedientes.</p>
              </div>
              <button 
                onClick={handleDriveConnection}
                disabled={driveSyncing}
                className="bg-[#4285F4] text-white px-10 py-5 rounded-2xl font-bold disabled:opacity-50"
              >
                {driveSyncing ? 'Iniciando...' : 'Vincular Drive'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={UI_CONFIG.cardClass}>
                    <h3 className="font-bold text-gray-500 uppercase text-[10px] mb-2">Drive Conectado</h3>
                    <p className="text-xs truncate">{mainDriveFolder || 'Sin carpeta raíz'}</p>
                    <button onClick={() => setShowDrivePicker(true)} className="mt-3 text-[#4285F4] font-bold text-[10px] underline">CAMBIAR RAÍZ</button>
                </div>
                <div className={UI_CONFIG.cardClass}>
                    <h3 className="font-bold text-gray-500 uppercase text-[10px] mb-2">Colaboradores</h3>
                    <p className="text-2xl font-bold">{allUsers.filter(u => u.role === UserRole.SELLER).length}</p>
                </div>
                <div className={UI_CONFIG.cardClass}>
                    <h3 className="font-bold text-gray-500 uppercase text-[10px] mb-2">Auditoría</h3>
                    <button onClick={() => setShowAuditModal(true)} className="mt-1 bg-slate-100 w-full py-2 rounded font-bold text-[10px]">VER REGISTROS</button>
                </div>
            </div>
          )}
        </div>
      )}

      {/* VENDEDORES ADMIN */}
      {activeTab === 'admin-sellers' && user.role === UserRole.ADMIN && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center">
             <h2 className={UI_CONFIG.headingClass}>Vendedores</h2>
             <button onClick={() => setShowAddSeller(true)} className="bg-[#C5A059] text-white px-6 py-2 rounded-xl font-bold shadow-md">+ Nuevo</button>
          </div>
          <div className="space-y-4">
             {allUsers.filter(u => u.role === UserRole.SELLER).map(s => (
                <div key={s.id} className="bg-white p-6 rounded-[2rem] shadow-sm flex justify-between items-center border border-gray-100">
                   <div>
                      <h3 className="font-bold text-lg">{s.name}</h3>
                      <p className="text-xs text-gray-400">{s.email}</p>
                   </div>
                   <div className="flex gap-3">
                      <button onClick={() => { setSelectedSellerId(s.id); setActiveTab('dashboard'); }} className="bg-[#a12d34] text-white px-4 py-2 rounded-lg text-xs font-bold">Ver Expediente</button>
                      <button onClick={() => handleDeleteSeller(s.id)} className="p-2 text-red-300">🗑️</button>
                   </div>
                </div>
             ))}
          </div>
        </div>
      )}

      {/* EXPEDIENTE (VISTAS COMUNES) */}
      {(activeTab === 'dashboard' || activeTab === 'docs' || activeTab === 'photos') && (
        <div className="space-y-8 animate-fadeIn">
          <div className="border-b pb-6">
            <h2 className="text-3xl font-bold text-gray-800">{currentViewUser?.name}</h2>
            {currentViewUser?.driveFolderPath && (
                <button onClick={() => handleOpenDriveFolder(currentViewUser.driveFolderPath)} className="text-[10px] text-blue-500 font-bold mt-1">ABRIR CARPETA EN DRIVE ↗️</button>
            )}
          </div>

          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CommentsSection 
                  sellerId={currentViewId || ''} 
                  comments={comments} 
                  user={user} 
                  onAddComment={(text) => setComments(prev => [...prev, { id: 'c_'+Date.now(), sellerId: currentViewId!, authorName: user.name, text, timestamp: new Date().toLocaleString() }])} 
                />
                <ActivityLog sellerId={currentViewId || ''} logs={logs} />
             </div>
          )}

          {(activeTab === 'docs' || activeTab === 'photos') && (
            <div className="space-y-8">
               <div className="bg-white p-10 rounded-[3rem] border-4 border-dashed border-slate-100 text-center">
                  <h3 className="text-xl font-bold mb-4">{activeTab === 'docs' ? 'Subir PDF' : 'Subir Fotos'}</h3>
                  <label className="bg-[#a12d34] text-white px-8 py-3 rounded-xl font-bold cursor-pointer inline-block">
                     {isProcessing ? 'Procesando...' : 'Seleccionar archivo'}
                     <input type="file" className="hidden" accept={activeTab === 'docs' ? '.pdf' : 'image/*'} onChange={e => handleFileUpload(e, activeTab === 'docs' ? 'PDF' : 'IMAGE')} disabled={isProcessing} />
                  </label>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {currentDocs.filter(d => activeTab === 'docs' ? (d.type === 'PDF' || d.type === 'CONTRACT') : d.type === 'IMAGE').map(doc => (
                    <div key={doc.id} className="bg-white rounded-[2rem] overflow-hidden shadow-lg border border-gray-100 flex flex-col">
                       <div className="h-40 bg-slate-100 flex items-center justify-center relative">
                          {doc.type === 'IMAGE' ? <img src={doc.url} className="w-full h-full object-cover" /> : <span className="text-4xl">📄</span>}
                          <button onClick={() => handleDeleteDoc(doc.id)} className="absolute top-3 right-3 text-red-500 bg-white/80 p-1 rounded-full">🗑️</button>
                       </div>
                       <div className="p-4">
                          <p className="font-bold text-sm truncate">{doc.name}</p>
                          <div className="flex justify-between mt-3">
                             <button onClick={() => window.open(doc.url, '_blank')} className="text-[10px] font-bold text-[#a12d34]">VER</button>
                             <span className="text-[9px] text-gray-400 font-bold uppercase">{doc.uploadDate}</span>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL NUEVO VENDEDOR */}
      {showAddSeller && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleAddSeller} className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-4 animate-scaleIn">
            <h3 className="text-2xl font-bold text-center mb-4">Alta Colaborador</h3>
            <input type="text" value={newSellerName} onChange={e => setNewSellerName(e.target.value)} placeholder="Nombre completo" className={UI_CONFIG.inputClass} required />
            <input type="email" value={newSellerEmail} onChange={e => setNewSellerEmail(e.target.value)} placeholder="Email" className={UI_CONFIG.inputClass} required />
            <input type="password" value={newSellerPass} onChange={e => setNewSellerPass(e.target.value)} placeholder="Contraseña inicial" className={UI_CONFIG.inputClass} required />
            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setShowAddSeller(false)} className="flex-1 font-bold text-gray-400">Cancelar</button>
              <button type="submit" className="flex-1 bg-[#a12d34] text-white py-4 rounded-2xl font-bold shadow-xl" disabled={isProcessing}>{isProcessing ? 'Guardando...' : 'Crear'}</button>
            </div>
          </form>
        </div>
      )}

      {showDrivePicker && <DrivePickerModal onSelect={onDriveFolderSelected} onCancel={() => setShowDrivePicker(false)} googleToken={googleToken} />}
      {showAuditModal && <AuditModal logs={logs} onCancel={() => setShowAuditModal(false)} />}
    </Layout>
  );
};

export default App;
