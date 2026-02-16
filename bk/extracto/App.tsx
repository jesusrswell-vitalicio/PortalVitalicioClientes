
import React, { useState, useEffect } from 'react';
import { User, UserRole, Document, Comment, LogEntry } from './types';
import Layout from './components/Layout';
import { UI_CONFIG } from './constants';
import SignaturePad from './components/SignaturePad';
import { explainDocument } from './services/geminiService';
import { driveService } from './services/driveService';

const ADMIN_EMAIL = 'jmartinez@grupovitalicio.es';
const ADMIN_PASS_INITIAL = 'Vitalicio@2020';

const INITIAL_USERS: User[] = [
  { id: 'admin_1', name: 'J. Martínez', email: ADMIN_EMAIL, role: UserRole.ADMIN, status: 'ACTIVE', driveFolderPath: 'Mi Unidad/VendedoresExternos/Admin', privacySigned: true },
  { id: 'v_1', name: 'Antonio García', email: 'antonio@gmail.com', role: UserRole.SELLER, status: 'ACTIVE', driveFolderPath: 'Mi Unidad/VendedoresExternos/Antonio García', privacySigned: false }
];

const INITIAL_PASSWORDS: Record<string, string> = {
  [ADMIN_EMAIL]: ADMIN_PASS_INITIAL,
  'antonio@gmail.com': '123456'
};

const INITIAL_DOCS: Document[] = [
  { id: 'd1', name: 'Contrato Vitalicio Antonio', type: 'CONTRACT', url: '', status: 'PENDING', uploadDate: '2024-05-20', ownerId: 'v_1', folderPath: 'Mi Unidad/VendedoresExternos/Antonio García' },
];

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
  const [showAdminRecoveryOption, setShowAdminRecoveryOption] = useState(false);

  // Password Change Form State
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
    return localStorage.getItem('gv_main_drive') || 'Mi Unidad/VendedoresExternos';
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
  }, [allUsers, userPasswords, docs, mainDriveFolder, comments, logs]);

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
      if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
        setLoginError('Credenciales de administrador incorrectas.');
        setShowAdminRecoveryOption(true);
      } else {
        setLoginError('Error de acceso. Contacte con soporte: 663 04 04 04');
      }
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
    setIsProcessing(true);
    try {
      const drivePath = await driveService.createSellerFolder(newSellerName);
      const newId = 'v_' + Date.now();
      const newUser: User = {
        id: newId,
        name: newSellerName,
        email: newSellerEmail,
        role: UserRole.SELLER,
        status: 'ACTIVE',
        driveFolderPath: drivePath,
        privacySigned: false
      };
      setAllUsers(prev => [...prev, newUser]);
      setUserPasswords(prev => ({ ...prev, [newSellerEmail]: newSellerPass }));
      setShowAddSeller(false);
      setNewSellerName('');
      setNewSellerEmail('');
      setNewSellerPass('');
      alert('Vendedor creado y carpeta sincronizada en Drive.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteSeller = async (sellerId: string) => {
    if (!confirm('¿Seguro que desea eliminar permanentemente este vendedor y sus archivos asociados?')) return;
    const seller = allUsers.find(u => u.id === sellerId);
    if (!seller) return;
    
    setIsProcessing(true);
    try {
      await driveService.moveFolderToDeleted(seller.driveFolderPath);
      setAllUsers(prev => prev.filter(u => u.id !== sellerId));
      setDocs(prev => prev.filter(d => d.ownerId !== sellerId));
      setComments(prev => prev.filter(c => c.sellerId !== sellerId));
      setLogs(prev => prev.filter(l => l.sellerId !== sellerId));
      alert('Vendedor y expedientes eliminados de la base de datos.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrivacyAcceptance = (signatureUrl: string) => {
    if (!user) return;
    const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, privacySigned: true } : u);
    setAllUsers(updatedUsers);
    setUser({ ...user, privacySigned: true });
    addLog(user.id, 'PRIVACY_ACCEPTANCE', 'Política de Privacidad Integral');
    setShowPrivacySignature(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    const targetUser = user.role === UserRole.ADMIN && selectedSellerId 
      ? allUsers.find(u => u.id === selectedSellerId) 
      : user;

    if (!targetUser) return;

    setIsProcessing(true);
    try {
      await driveService.syncDocument(file.name, targetUser.driveFolderPath);
      const newDoc: Document = {
        id: 'd_' + Date.now(),
        name: file.name,
        type: type,
        url: URL.createObjectURL(file),
        status: 'PENDING',
        uploadDate: new Date().toLocaleDateString(),
        ownerId: targetUser.id,
        folderPath: targetUser.driveFolderPath
      };
      setDocs(prev => [...prev, newDoc]);
      addLog(targetUser.id, 'UPLOAD', file.name);
    } finally { 
      setIsProcessing(false); 
      e.target.value = '';
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    const doc = docs.find(d => d.id === docId);
    if (!doc) return;
    if (!confirm(`¿Eliminar "${doc.name}" permanentemente?`)) return;

    setDocs(prev => prev.filter(d => d.id !== docId));
    addLog(doc.ownerId, 'DELETE', doc.name);
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage({ text: '', type: '' });

    if (!user) return;

    // Check if it's an admin resetting a seller's password
    const isAdminReset = user.role === UserRole.ADMIN && selectedSellerId;
    const targetUser = isAdminReset 
      ? allUsers.find(u => u.id === selectedSellerId) 
      : user;

    if (!targetUser) return;

    // Verify current password only if it's NOT an admin reset
    if (!isAdminReset && userPasswords[user.email] !== passCurrent) {
      setPassMessage({ text: 'La contraseña actual es incorrecta.', type: 'error' });
      return;
    }

    // Verify new passwords match
    if (passNew !== passConfirm) {
      setPassMessage({ text: 'Las nuevas contraseñas no coinciden.', type: 'error' });
      return;
    }

    // Minimum length validation
    if (passNew.length < 6) {
      setPassMessage({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    // Update password
    setUserPasswords(prev => ({ ...prev, [targetUser.email]: passNew }));
    setPassMessage({ 
      text: isAdminReset ? `¡Contraseña de ${targetUser.name} actualizada!` : '¡Contraseña actualizada con éxito!', 
      type: 'success' 
    });
    
    // Reset form
    setPassCurrent('');
    setPassNew('');
    setPassConfirm('');
  };

  const currentViewId = selectedSellerId || (user?.role === UserRole.SELLER ? user.id : null);
  const currentViewUser = allUsers.find(u => u.id === currentViewId);
  const currentDocs = docs.filter(d => d.ownerId === currentViewId);

  // Mandatory Privacy Check for Sellers
  if (user && user.role === UserRole.SELLER && !user.privacySigned) {
    return (
      <div className="fixed inset-0 bg-slate-100 z-[999] flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl flex flex-col max-h-[90vh]">
          <div className="p-8 border-b bg-slate-50 rounded-t-[2.5rem] flex justify-between items-center">
             <h2 className="text-2xl font-bold text-[#a12d34]">Aceptación de Privacidad</h2>
             <button onClick={handleLogout} className="text-red-500 font-bold">Cerrar Sesión</button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-6 text-sm leading-relaxed text-gray-700">
            <p className="font-bold uppercase">GRUPO VITALICIO VIVIENDA E INVERSIONES S.L</p>
            <p>Este portal es una herramienta profesional para la gestión de activos inmobiliarios e inversiones. Al acceder, usted reconoce que toda la información subida (fotos de inmuebles, DNIs de clientes, contratos firmados) será tratada bajo el Reglamento General de Protección de Datos (RGPD).</p>
            <p>Los archivos se almacenan en una infraestructura segura en la nube (Google Drive corporativo) gestionada por Grupo Vitalicio. Usted tiene derecho a acceder, rectificar o suprimir sus datos en cualquier momento contactando con dpo@grupovitalicio.es.</p>
            <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100">
               <p className="text-xs font-bold text-yellow-800">⚠️ IMPORTANTE: Como colaborador externo, es su responsabilidad asegurar que las fotos y documentos subidos corresponden al expediente correcto para evitar fugas de información.</p>
            </div>
          </div>
          <div className="p-8 border-t flex justify-center">
             <button onClick={() => setShowPrivacySignature(true)} className="bg-[#a12d34] text-white px-12 py-4 rounded-2xl font-bold text-xl shadow-xl transition-transform active:scale-95">Proceder a la Firma</button>
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
            <div className="bg-white/20 w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl">🏠</div>
            <h1 className="text-3xl font-bold font-montserrat tracking-tight">Grupo Vitalicio</h1>
            <p className="mt-2 opacity-80 uppercase text-[10px] tracking-widest font-bold">Portal de Colaboradores</p>
          </div>
          <form onSubmit={handleLogin} className="p-10 space-y-6">
            {loginError && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border-l-4 border-red-500 animate-fadeIn">
                {loginError}
              </div>
            )}
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email Corporativo</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ejemplo@grupovitalicio.es" className={UI_CONFIG.inputClass} required />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Contraseña</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={UI_CONFIG.inputClass} required />
              </div>
              <div className="pt-2">
                <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Código de Seguridad</label>
                <div className="flex items-center gap-4 mt-1">
                   <div className="bg-slate-100 px-5 py-3 rounded-xl border font-bold text-[#a12d34] tracking-widest text-2xl italic select-none shadow-inner">{captchaValue}</div>
                   <input type="text" value={userCaptchaInput} onChange={e => setUserCaptchaInput(e.target.value)} placeholder="0000" className={`${UI_CONFIG.inputClass} flex-1 text-center font-mono`} maxLength={4} required />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#a12d34] text-white py-5 rounded-2xl font-bold text-xl shadow-xl transition-all active:scale-95 hover:bg-[#8e272d]">Acceder</button>
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
      {/* VISTA: PANEL GLOBAL ADMIN */}
      {activeTab === 'admin-dashboard' && user.role === UserRole.ADMIN && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center">
            <h2 className={UI_CONFIG.headingClass}>Panel de Control</h2>
            <div className="bg-white px-4 py-2 rounded-xl shadow-sm border text-xs font-bold text-gray-500">
              ID Sesión: <span className="text-[#a12d34]">{user.id}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className={UI_CONFIG.cardClass}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-xl">⚙️</div>
                  <h3 className="font-bold text-gray-800">Infraestructura</h3>
                </div>
                <div className="space-y-4">
                   <p className="text-xs text-gray-400">Raíz Drive: <span className="font-bold text-gray-600 block mt-1">{mainDriveFolder}</span></p>
                   <div className="flex items-center gap-2">
                     <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                     <p className="text-xs text-green-600 font-bold uppercase tracking-widest">Drive Conectado</p>
                   </div>
                </div>
             </div>
             
             <div className={UI_CONFIG.cardClass}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-xl">📈</div>
                  <h3 className="font-bold text-gray-800">Actividad Global</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="bg-slate-50 p-4 rounded-xl text-center">
                      <p className="text-3xl font-bold text-[#a12d34]">{allUsers.filter(u => u.role === UserRole.SELLER).length}</p>
                      <p className="text-[9px] uppercase font-bold text-gray-400 mt-1">Vendedores</p>
                   </div>
                   <div className="bg-slate-50 p-4 rounded-xl text-center">
                      <p className="text-3xl font-bold text-[#C5A059]">{docs.length}</p>
                      <p className="text-[9px] uppercase font-bold text-gray-400 mt-1">Archivos</p>
                   </div>
                </div>
             </div>

             <div className={`${UI_CONFIG.cardClass} md:col-span-2 lg:col-span-1`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center text-xl">🛡️</div>
                  <h3 className="font-bold text-gray-800">Seguridad</h3>
                </div>
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Todas las operaciones de subida y borrado son auditadas y quedan registradas en el historial de cada expediente.</p>
                <button className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors">Ver Auditoría de Drive</button>
             </div>
          </div>
        </div>
      )}

      {/* VISTA: LISTA DE VENDEDORES (ADMIN) */}
      {activeTab === 'admin-sellers' && user.role === UserRole.ADMIN && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className={UI_CONFIG.headingClass}>Colaboradores Externos</h2>
            <button onClick={() => setShowAddSeller(true)} className="bg-[#C5A059] hover:bg-[#b08e4d] text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all active:scale-95">
              + Nuevo Colaborador
            </button>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {allUsers.filter(u => u.role === UserRole.SELLER && u.status === 'ACTIVE').length === 0 ? (
              <div className="bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-gray-100">
                 <span className="text-5xl block mb-4">👥</span>
                 <p className="text-gray-400 font-bold">No hay vendedores registrados.</p>
                 <button onClick={() => setShowAddSeller(true)} className="mt-4 text-[#a12d34] font-bold underline">Añadir el primero</button>
              </div>
            ) : (
              allUsers.filter(u => u.role === UserRole.SELLER && u.status === 'ACTIVE').map(s => (
                <div key={s.id} className="bg-white p-6 rounded-[2.5rem] shadow-md border-l-8 border-[#a12d34] flex flex-wrap justify-between items-center hover:shadow-xl transition-all duration-300">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-2xl font-bold text-[#a12d34] shadow-sm">
                       {s.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-800">{s.name}</h3>
                      <p className="text-sm text-gray-500">{s.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`w-2 h-2 rounded-full ${s.privacySigned ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tighter">
                          {s.privacySigned ? 'Privacidad Firmada' : 'Pendiente de Firma'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 mt-4 sm:mt-0">
                    <button 
                      onClick={() => { setSelectedSellerId(s.id); setActiveTab('dashboard'); }} 
                      className="px-6 py-3 bg-[#a12d34] text-white rounded-xl font-bold text-xs shadow-md hover:bg-[#8e272d] transition-colors"
                    >
                      Ver Expediente
                    </button>
                    <button 
                      onClick={() => handleDeleteSeller(s.id)} 
                      className="p-3 bg-red-50 text-red-300 hover:text-red-600 hover:bg-red-100 rounded-xl transition-all"
                      title="Eliminar Vendedor"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* VISTA COMÚN: EXPEDIENTE (DASHBOARD / DOCS / PHOTOS) */}
      {(activeTab === 'dashboard' || activeTab === 'docs' || activeTab === 'photos' || activeTab === 'settings') && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header de Expediente */}
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-gray-100 pb-6">
            <div>
              <div className="flex items-center gap-3">
                 <h2 className="text-3xl font-bold text-gray-800">{currentViewUser?.name}</h2>
                 <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Activo</span>
              </div>
              <p className="text-sm text-gray-400 mt-1 font-medium">
                {activeTab === 'dashboard' && '🔍 Auditoría de Comentarios y Logs'}
                {activeTab === 'docs' && '📄 Gestión de Documentación PDF'}
                {activeTab === 'photos' && '📸 Galería Fotográfica de Activos'}
                {activeTab === 'settings' && '⚙️ Configuración del Perfil'}
              </p>
            </div>
            
            <div className="flex gap-3">
               <div className="text-right hidden sm:block">
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest">Ruta Drive</p>
                  <p className="text-[10px] text-[#a12d34] font-mono font-bold truncate max-w-[200px]">{currentViewUser?.driveFolderPath}</p>
               </div>
            </div>
          </div>

          {/* Sub-vista: Dashboard (Comentarios y Logs) */}
          {activeTab === 'dashboard' && (
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <CommentsSection 
                  sellerId={currentViewId || ''} 
                  comments={comments} 
                  user={user} 
                  onAddComment={(text) => {
                    const newC: Comment = { 
                      id: 'c_'+Date.now(), 
                      sellerId: currentViewId!, 
                      authorName: user.name, 
                      text, 
                      timestamp: new Date().toLocaleString('es-ES') 
                    };
                    setComments(prev => [...prev, newC]);
                  }} 
                />
                <ActivityLog sellerId={currentViewId || ''} logs={logs} />
             </div>
          )}

          {/* Sub-vista: Documentos o Fotos */}
          {(activeTab === 'docs' || activeTab === 'photos') && (
            <div className="space-y-8">
               {/* Zona de Subida */}
               <div className="bg-white p-12 rounded-[3rem] shadow-xl border-4 border-dashed border-slate-100 flex flex-col items-center text-center group hover:border-[#a12d34]/20 transition-all">
                  <div className="w-24 h-24 bg-slate-50 group-hover:bg-red-50 rounded-full flex items-center justify-center text-4xl mb-6 transition-colors">
                     {activeTab === 'docs' ? '📄' : '📸'}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">
                    {activeTab === 'docs' ? 'Subir Documentación' : 'Añadir Fotos'}
                  </h3>
                  <p className="text-sm text-gray-400 max-w-sm mb-8">
                    {activeTab === 'docs' 
                      ? 'Formatos aceptados: PDF. El archivo se guardará directamente en la carpeta de Drive del vendedor.' 
                      : 'Capture las fotos de la vivienda o suba archivos JPG/PNG. Se sincronizarán automáticamente.'}
                  </p>
                  
                  <label className={`
                    ${UI_CONFIG.buttonClass} bg-[#a12d34] text-white px-12 py-5 rounded-2xl text-xl cursor-pointer hover:shadow-2xl hover:-translate-y-1
                    ${isProcessing ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}
                  `}>
                     {isProcessing ? '🔄 Sincronizando con Drive...' : `Seleccionar ${activeTab === 'docs' ? 'PDF' : 'Imágenes'}`}
                     <input 
                       type="file" 
                       className="hidden" 
                       accept={activeTab === 'docs' ? '.pdf' : 'image/*'} 
                       onChange={e => handleFileUpload(e, activeTab === 'docs' ? 'PDF' : 'IMAGE')} 
                       disabled={isProcessing} 
                       multiple={activeTab === 'photos'}
                     />
                  </label>
               </div>

               {/* Grid de Archivos */}
               <div>
                  <h4 className="text-lg font-bold text-gray-700 mb-6 flex items-center gap-2">
                    <span>📂</span> {activeTab === 'docs' ? 'Documentos del Expediente' : 'Galería de Imágenes'}
                  </h4>
                  
                  {currentDocs.filter(d => activeTab === 'docs' ? d.type === 'PDF' : d.type === 'IMAGE').length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                       <p className="text-gray-400 font-bold italic">No hay archivos en esta categoría.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentDocs.filter(d => activeTab === 'docs' ? d.type === 'PDF' : d.type === 'IMAGE').map(doc => (
                        <div key={doc.id} className="bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-100 flex flex-col group">
                           <div className="h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                              {doc.type === 'IMAGE' && doc.url ? (
                                <img src={doc.url} alt={doc.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <span className="text-6xl group-hover:scale-125 transition-transform duration-300">📕</span>
                              )}
                              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 <button 
                                  onClick={() => handleDeleteDoc(doc.id)} 
                                  className="w-10 h-10 bg-white/90 text-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                 >
                                    🗑️
                                 </button>
                              </div>
                           </div>
                           <div className="p-6">
                              <p className="font-bold text-gray-800 truncate" title={doc.name}>{doc.name}</p>
                              <div className="flex justify-between items-center mt-4">
                                 <span className="text-[10px] bg-slate-100 px-3 py-1 rounded-full text-gray-500 font-bold uppercase tracking-wider">{doc.uploadDate}</span>
                                 <button className="text-[10px] font-bold text-[#a12d34] hover:underline uppercase tracking-widest">Descargar 💾</button>
                              </div>
                           </div>
                        </div>
                      ))}
                    </div>
                  )}
               </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
               {/* Información General */}
               <div className="bg-white p-10 rounded-[3rem] shadow-lg border border-gray-100">
                  <h3 className="text-2xl font-bold text-[#a12d34] mb-8">Información de la Cuenta</h3>
                  <div className="space-y-6">
                     <div className="grid grid-cols-2 gap-6">
                       <div>
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Nombre Completo</label>
                         <div className="bg-slate-50 p-4 rounded-xl font-bold text-gray-700 border border-slate-100">{currentViewUser?.name}</div>
                       </div>
                       <div>
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Rol en Sistema</label>
                         <div className="bg-slate-50 p-4 rounded-xl font-bold text-[#a12d34] border border-slate-100 uppercase text-[10px]">{currentViewUser?.role}</div>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Email de Acceso</label>
                       <div className="bg-slate-50 p-4 rounded-xl font-bold text-gray-700 border border-slate-100">{currentViewUser?.email}</div>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Directorio Drive Sincronizado</label>
                       <div className="bg-slate-50 p-4 rounded-xl font-mono text-[10px] text-gray-500 border border-slate-100">{currentViewUser?.driveFolderPath}</div>
                     </div>
                     
                     {user.role === UserRole.ADMIN && selectedSellerId && (
                       <div className="pt-8 border-t border-dashed border-gray-100">
                          <p className="text-xs text-amber-600 font-bold mb-4">⚠️ Zona de Gestión Administrativa</p>
                          <button 
                           onClick={() => handleDeleteSeller(selectedSellerId)}
                           className="w-full py-4 bg-red-50 text-red-600 rounded-2xl font-bold border border-red-100 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                          >
                            Eliminar Expediente del Sistema
                          </button>
                       </div>
                     )}
                  </div>
               </div>

               {/* Cambio de Contraseña / Restablecimiento */}
               {(user.role === UserRole.ADMIN || !selectedSellerId) && (
                  <div className="bg-white p-10 rounded-[3rem] shadow-lg border border-gray-100 animate-fadeIn">
                     <h3 className="text-2xl font-bold text-[#a12d34] mb-8">
                       {selectedSellerId ? `Restablecer Clave: ${currentViewUser?.name}` : 'Seguridad y Acceso'}
                     </h3>
                     <form onSubmit={handleChangePassword} className="space-y-6">
                        {passMessage.text && (
                           <div className={`p-4 rounded-xl text-sm font-bold border-l-4 animate-fadeIn ${
                              passMessage.type === 'success' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-red-50 border-red-500 text-red-700'
                           }`}>
                              {passMessage.text}
                           </div>
                        )}
                        
                        {/* Solo pedimos la clave actual si el usuario está en su propio perfil (no es admin reseteando a vendedor) */}
                        {!selectedSellerId && (
                           <div>
                              <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Contraseña Actual</label>
                              <input 
                                 type="password" 
                                 value={passCurrent} 
                                 onChange={e => setPassCurrent(e.target.value)} 
                                 placeholder="Introduzca su clave actual" 
                                 className={UI_CONFIG.inputClass} 
                                 required 
                              />
                           </div>
                        )}

                        <div className={!selectedSellerId ? "pt-4 border-t border-slate-50" : ""}>
                           <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Nueva Contraseña</label>
                           <input 
                              type="password" 
                              value={passNew} 
                              onChange={e => setPassNew(e.target.value)} 
                              placeholder="Mínimo 6 caracteres" 
                              className={UI_CONFIG.inputClass} 
                              required 
                           />
                        </div>
                        <div>
                           <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Confirmar Nueva Contraseña</label>
                           <input 
                              type="password" 
                              value={passConfirm} 
                              onChange={e => setPassConfirm(e.target.value)} 
                              placeholder="Repita la nueva clave" 
                              className={UI_CONFIG.inputClass} 
                              required 
                           />
                        </div>
                        <button 
                           type="submit" 
                           className="w-full bg-[#C5A059] text-white py-4 rounded-2xl font-bold shadow-lg hover:bg-[#b08e4d] transition-all active:scale-95"
                        >
                           {selectedSellerId ? 'Restablecer Clave Vendedor' : 'Actualizar Contraseña'}
                        </button>
                        <p className="text-[10px] text-center text-gray-400 font-medium">
                           {selectedSellerId 
                             ? 'El vendedor podrá entrar con esta nueva clave inmediatamente.' 
                             : 'Por seguridad, use una contraseña que no use en otros servicios.'}
                        </p>
                     </form>
                  </div>
               )}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ALTA DE VENDEDOR (ADMIN) */}
      {showAddSeller && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleAddSeller} className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 animate-scaleIn shadow-[0_30px_60px_-12px_rgba(0,0,0,0.25)] border border-gray-100">
            <div className="text-center mb-8">
               <div className="w-16 h-16 bg-red-50 text-[#a12d34] rounded-2xl mx-auto flex items-center justify-center text-3xl mb-4">➕</div>
               <h3 className="text-2xl font-bold text-gray-800">Alta de Colaborador</h3>
               <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">Nuevo Expediente Drive</p>
            </div>
            
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nombre y Apellidos</label>
                  <input type="text" value={newSellerName} onChange={e => setNewSellerName(e.target.value)} placeholder="Ej: Juan Pérez" className={UI_CONFIG.inputClass} required />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Email Profesional</label>
                  <input type="email" value={newSellerEmail} onChange={e => setNewSellerEmail(e.target.value)} placeholder="jperez@grupovitalicio.es" className={UI_CONFIG.inputClass} required />
               </div>
               <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Clave de Acceso Inicial</label>
                  <input type="password" value={newSellerPass} onChange={e => setNewSellerPass(e.target.value)} placeholder="••••••••" className={UI_CONFIG.inputClass} required />
               </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setShowAddSeller(false)} className="flex-1 font-bold text-gray-400 hover:text-gray-600 transition-colors">Cancelar</button>
              <button 
                type="submit" 
                className="flex-1 bg-[#a12d34] text-white py-4 rounded-2xl font-bold shadow-xl hover:bg-[#8e272d] transition-all disabled:opacity-50"
                disabled={isProcessing}
              >
                {isProcessing ? 'Sincronizando...' : 'Dar de Alta'}
              </button>
            </div>
            
            <p className="text-[9px] text-center text-gray-400 italic">Al confirmar, se creará una carpeta sincronizada en Google Drive con el nombre del colaborador.</p>
          </form>
        </div>
      )}
    </Layout>
  );
};

export default App;
