
import React, { useState, useEffect } from 'react';
import { User, UserRole, Document, Comment, LogEntry } from './types';
import Layout from './components/Layout';
import { UI_CONFIG } from './constants';
import SignaturePad from './components/SignaturePad';
import { explainDocument } from './services/geminiService';
import { driveService, DriveFolder } from './services/driveService';

const ADMIN_EMAIL = 'jmartinez@grupovitalicio.es';
const ADMIN_PASS_INITIAL = 'Vitalicio@2020';

const PRIVACY_POLICY_TEXT = `
Mediante el presente aviso legal y política de privacidad, GRUPO VITALICIO con domicilio social en CALLE ZURBANO 45, 1ª PLANTA, 28010 DE MADRID, informa a los usuarios del sitio webs grupovitalicio.es, Crm.grupovitalicio.es, y este portal de clientes, de su Política de Privacidad, y describe qué datos recoge, cómo los utiliza, las opciones de los usuarios en relación a estos datos, sus derechos (conocidos como derechos ARCO, Acceso, Rectificación, Cancelación y Oposición y los nuevos introducidos por el RGPD, derecho al olvido, derecho a la portabilidad de los datos personales y el derecho a la limitación en el tratamiento), la seguridad de sus datos, y la modificación de la política de confidencialidad.

La utilización del sitio web de GRUPO VITALICIO y de cualquiera de los servicios que se incorporan en él, supone la plena aceptación de las condiciones que se presentan a continuación Política de Privacidad.

1. INFORMACIÓN AL USUARIO
¿Quién es el responsable del tratamiento de tus datos personales?
GRUPO VITALICIO VIVIENDA INVERSIONES, S.L. es el RESPONSABLE del tratamiento de los datos personales del USUARIO y le informa de que estos datos serán tratados de conformidad con lo dispuesto en el Reglamento (UE) 2016/679, de 27 de abril (GDPR), y la Ley Orgánica 3/2018, de 5 de diciembre (LOPDGDD)

¿Para qué tratamos tus datos personales y por qué lo hacemos?
Según el formulario donde hayamos obtenido sus datos personales, los trataremos de manera confidencial para alcanzar los siguientes fines:
En el formulario Contacto
• Dar respuesta a las consultas o cualquier tipo de petición que sea realizada por el usuario a través de cualquiera de las formas de contacto que se ponen a su disposición en la página web del responsable. (por el interés legítimo del responsable, art. 6.1.f GDPR)
• Realizar análisis estadísticos y estudios de mercado. (por el interés legítimo del responsable, art. 6.1.f GDPR)

En el formulario Solicita presupuesto y/o sube documentos asociados
• Enviar presupuestos comerciales sobre productos y servicios. (para la ejecución de un contrato o precontrato, 6.1.b GDPR)

¿Durante cuánto tiempo guardaremos tus datos personales?
Se conservarán durante no más tiempo del necesario para mantener el fin del tratamiento o existan prescripciones legales que dictaminen su custodia y cuando ya no sea necesario para ello, se suprimirán con medidas de seguridad adecuadas para garantizar la anonimización de los datos o la destrucción total de los mismos.

¿A quién facilitamos tus datos personales?
No está prevista ninguna comunicación de datos personales a terceros salvo, si fuese necesario para el desarrollo y ejecución de las finalidades del tratamiento, a nuestros proveedores de servicios relacionados con comunicaciones, con los cuales el RESPONSABLE tiene suscritos los contratos de confidencialidad y de encargado de tratamiento exigidos por la normativa vigente de privacidad.

¿Cuáles son tus derechos?
Los derechos que asisten al USUARIO son:
• Derecho a retirar el consentimiento en cualquier momento.
• Derecho de acceso, rectificación, portabilidad y supresión de sus datos, y de limitación u oposición a su tratamiento.
• Derecho a presentar una reclamación ante la autoridad de control (www.aepd.es) si considera que el tratamiento no se ajusta a la normativa vigente.

Datos de contacto para ejercer sus derechos:
GRUPO VITALICIO VIVIENDA INVERSIONES S, L. C/ ZURBANO 45, 1ª PLANTA, MADRID (Madrid). E-mail: info@grupovitalicio.es 
Datos de contacto del delegado de protección de datos TGIRALDO@GRUPOVITALICIO.ES

CARÁCTER OBLIGATORIO O FACULTATIVO DE LA INFORMACIÓN FACILITADA POR EL USUARIO
Los USUARIOS, mediante la marcación de las casillas correspondientes y la entrada de datos en los campos, marcados con un asterisco (*) en el formulario de contacto o presentados en formularios de descarga, aceptan expresamente y de forma libre e inequívoca, que sus datos son necesarios para atender su petición, por parte del prestador, siendo voluntaria la inclusión de datos en los campos restantes. El USUARIO garantiza que los datos personales facilitados al RESPONSABLE son veraces y se hace responsable de comunicar cualquier modificación de los mismos.
El RESPONSABLE informa de que todos los datos solicitados a través del sitio web son obligatorios, ya que son necesarios para la prestación de un servicio óptimo al USUARIO. En caso de que no se faciliten todos los datos, no se garantiza que la información y servicios facilitados sean completamente ajustados a sus necesidades.

3. MEDIDAS DE SEGURIDAD
Que de conformidad con lo dispuesto en las normativas vigentes en protección de datos personales, el RESPONSABLE está cumpliendo con todas las disposiciones de las normativas GDPR y LOPDGDD para el tratamiento de los datos personales de su responsabilidad, y manifiestamente con los principios descritos en el artículo 5 del GDPR, por los cuales son tratados de manera lícita, leal y transparente en relación con el interesado y adecuados, pertinentes y limitados a lo necesario en relación con los fines para los que son tratados.
El RESPONSABLE garantiza que ha implementado políticas técnicas y organizativas apropiadas para aplicar las medidas de seguridad que establecen el GDPR y la LOPDGDD con el fin de proteger los derechos y libertades de los USUARIOS y les ha comunicado la información adecuada para que puedan ejercerlos.

Para más información sobre las garantías de privacidad, puedes dirigirte al RESPONSABLE a través de:
GRUPO VITALICIO VIVIENDA INVERSIONES S.L. C/ ZURBANO 45, 1ª PLANTA – 28010 MADRID (Madrid). E-mail: info@grupovitalicio.es
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
  onSelect: (path: string) => void; 
  onCancel: () => void 
}> = ({ onSelect, onCancel }) => {
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  useEffect(() => {
    driveService.fetchFolders().then(data => {
      setFolders(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[200] p-6">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-scaleIn">
        <div className="bg-[#4285F4] p-8 text-white flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Seleccionar Carpeta Raíz</h3>
            <p className="text-sm opacity-90 mt-1">Navega por Google Drive de sguillen@grupovitalicio.es</p>
          </div>
          <div className="bg-white/20 p-3 rounded-2xl">
            <span className="text-3xl">📂</span>
          </div>
        </div>
        
        <div className="p-8">
          <div className="bg-slate-50 border rounded-2xl h-80 overflow-y-auto mb-6">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-4 border-[#4285F4] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando Drive...</p>
              </div>
            ) : (
              <div className="p-2">
                {folders.map(folder => (
                  <button 
                    key={folder.id}
                    onClick={() => setSelectedFolder(folder.path)}
                    className={`w-full text-left p-4 rounded-xl flex items-center gap-4 transition-all ${
                      selectedFolder === folder.path ? 'bg-blue-50 border-blue-200 border-2' : 'hover:bg-white'
                    }`}
                  >
                    <span className="text-2xl">📁</span>
                    <div className="flex-1">
                      <p className={`font-bold ${selectedFolder === folder.path ? 'text-blue-600' : 'text-gray-700'}`}>
                        {folder.name}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono truncate">{folder.path}</p>
                    </div>
                    {selectedFolder === folder.path && <span className="text-blue-600 font-bold">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button onClick={onCancel} className="flex-1 py-4 font-bold text-gray-400 hover:text-gray-600 transition-colors">
              Cancelar
            </button>
            <button 
              onClick={() => selectedFolder && onSelect(selectedFolder)} 
              disabled={!selectedFolder}
              className={`flex-1 py-4 rounded-2xl font-bold shadow-xl transition-all ${
                selectedFolder ? 'bg-[#4285F4] text-white hover:bg-blue-600' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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

  // Privacy Acceptance State
  const [userDniInput, setUserDniInput] = useState('');
  const [dniError, setDniError] = useState('');
  
// ESTADO PARA EL TOKEN AÑADIDO 
const [googleToken, setGoogleToken] = useState<string | null>(localStorage.getItem('gv_token'));

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
  const client = window.google.accounts.oauth2.initTokenClient({
    client_id: 'TU_CLIENT_ID_DE_GOOGLE.apps.googleusercontent.com',
    scope: 'https://www.googleapis.com',
    callback: (response: any) => {
      setGoogleToken(response.access_token);
      localStorage.setItem('gv_token', response.access_token);
      setIsDriveConnected(true);
      setShowDrivePicker(true);
    },
  });
  client.requestAccessToken();
};

  const onDriveFolderSelected = (path: string) => {
    setMainDriveFolder(path);
    setShowDrivePicker(false);
    alert(`Portal configurado correctamente en: ${path}`);
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
      setLoginError('Error de acceso. Compruebe sus datos o contacte con soporte: 663 04 04 04');
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
    if (!mainDriveFolder) {
      alert("Debe configurar primero la carpeta raíz de Google Drive en el Panel Global.");
      return;
    }
    setIsProcessing(true);
    try {
      const drivePath = await driveService.createSellerFolder(newSellerName, mainDriveFolder);
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
    if (!userDniInput.trim()) {
        setDniError('El DNI/Pasaporte es obligatorio para firmar.');
        return;
    }

    const updatedUsers = allUsers.map(u => u.id === user.id ? { ...u, privacySigned: true, dni: userDniInput } : u);
    setAllUsers(updatedUsers);
    setUser({ ...user, privacySigned: true, dni: userDniInput });
    
    // Crear el documento "Contrato de Privacidad Firmado"
    const privacyDoc: Document = {
        id: 'privacy_' + user.id,
        name: 'Política_Privacidad_Firmada.pdf',
        type: 'CONTRACT',
        url: signatureUrl, // Guardamos la firma como URL del documento para el visor
        status: 'SIGNED',
        uploadDate: new Date().toLocaleDateString('es-ES'),
        ownerId: user.id,
        folderPath: user.driveFolderPath
    };
    setDocs(prev => [...prev, privacyDoc]);
    
    addLog(user.id, 'PRIVACY_ACCEPTANCE', 'Política de Privacidad Integral');
    setShowPrivacySignature(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF') => {
  const file = e.target.files?.[0];
  
  if (!file || !user || !googleToken) {
    if (!googleToken) alert("Debe vincular su cuenta de Google Drive primero.");
    return;
  }
  
  const targetUser = user.role === UserRole.ADMIN && selectedSellerId 
    ? allUsers.find(u => u.id === selectedSellerId) 
    : user;

  if (!targetUser) return;

  setIsProcessing(true);
  try {
    // 1. Llamada al servicio
    const driveRes = await driveService.syncDocument(file, targetUser.driveFolderPath, googleToken);
    
    // 2. Crear documento
    const newDoc: Document = {
      id: driveRes.id,
      name: file.name,
      type: type,
      url: `https://drive.google.com{driveRes.id}`,
      status: 'PENDING',
      uploadDate: new Date().toLocaleDateString('es-ES'),
      ownerId: targetUser.id,
      folderPath: targetUser.driveFolderPath
    };

    // 3. Actualizar estados
    setDocs(prev => [...prev, newDoc]);
    addLog(targetUser.id, 'UPLOAD', file.name);

  } catch (err) {
    console.error("Error:", err);
    alert("Error al subir a Google Drive");
  } finally { 
    setIsProcessing(false);
    e.target.value = '';
  }
}; // <--- ESTA ES LA ÚNICA LLAVE QUE DEBE CERRAR LA FUNCIÓN
  
  const targetUser = user.role === UserRole.ADMIN && selectedSellerId 
    ? allUsers.find(u => u.id === selectedSellerId) 
    : user;

  if (!targetUser || !targetUser.driveFolderPath) {
    alert("El usuario no tiene una carpeta de Drive asignada.");
    return;
  }

  setIsProcessing(true);
  try {
    // 1. Subida real al servicio de Google
    const driveRes = await driveService.syncDocument(file, targetUser.driveFolderPath, googleToken);

    // 2. Crear el objeto con el ID real de Google Drive
    const newDoc: Document = {
      id: driveRes.id, // ID único de Google (sustituye al Date.now)
      name: file.name,
      type: type,
      url: `https://drive.google.com{driveRes.id}`, // Enlace directo para previsualizar
      status: 'PENDING',
      uploadDate: new Date().toLocaleDateString('es-ES'),
      ownerId: targetUser.id,
      folderPath: targetUser.driveFolderPath
    };

    // 3. Actualizar estados locales y logs
    setDocs(prev => [...prev, newDoc]);
    addLog(targetUser.id, 'UPLOAD', file.name);

  } catch (err) {
    console.error("Error en la sincronización:", err);
    alert("Error crítico al subir el archivo a Google Drive.");
  } finally { 
    setIsProcessing(false);
    e.target.value = ''; // Limpiar el input para permitir subir el mismo archivo otra vez
  }
};
    
    const targetUser = user.role === UserRole.ADMIN && selectedSellerId 
      ? allUsers.find(u => u.id === selectedSellerId) 
      : user;

    if (!targetUser) return;

    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileDataUrl = event.target?.result as string;
        await driveService.syncDocument(file.name, targetUser.driveFolderPath);
        const newDoc: Document = {
          id: 'd_' + Date.now(),
          name: file.name,
          type: type,
          url: fileDataUrl,
          status: 'PENDING',
          uploadDate: new Date().toLocaleDateString('es-ES'),
          ownerId: targetUser.id,
          folderPath: targetUser.driveFolderPath
        };
        setDocs(prev => [...prev, newDoc]);
        addLog(targetUser.id, 'UPLOAD', file.name);
        setIsProcessing(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setIsProcessing(false);
    } finally { 
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

  const generateContractHTML = (doc: Document, owner: User) => {
      return `
                <html>
                <head>
                    <title>${doc.name}</title>
                    <style>
                        body { font-family: 'Open Sans', sans-serif; padding: 60px; line-height: 1.6; color: #333; max-width: 800px; margin: auto; border: 1px solid #eee; background-color: #fff; }
                        h1 { color: #a12d34; border-bottom: 2px solid #a12d34; padding-bottom: 10px; text-align: center; }
                        .info-box { background: #f9f9f9; padding: 20px; border-radius: 10px; margin-bottom: 30px; border: 1px solid #ddd; }
                        .info-item { margin-bottom: 5px; }
                        .legal-text { font-size: 11px; color: #444; white-space: pre-line; border: 1px solid #eee; padding: 20px; background: #fff; margin-bottom: 40px; text-align: justify; }
                        .signature-container { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; }
                        .signature-box { border-bottom: 2px solid #000; width: 320px; text-align: center; padding-bottom: 10px; }
                        .signature-img { width: 280px; max-height: 120px; object-fit: contain; }
                        @media print {
                            body { border: none; padding: 0; }
                            .legal-text { height: auto; border: none; }
                        }
                    </style>
                </head>
                <body>
                    <h1>Grupo Vitalicio - Política de Privacidad Firmada</h1>
                    
                    <div class="info-box">
                        <div class="info-item"><strong>Nombre Completo:</strong> ${owner.name}</div>
                        <div class="info-item"><strong>DNI / Pasaporte:</strong> ${owner.dni || 'N/A'}</div>
                        <div class="info-item"><strong>Email Corporativo:</strong> ${owner.email}</div>
                        <div class="info-item"><strong>Fecha y Hora de Firma:</strong> ${doc.uploadDate}</div>
                    </div>

                    <h3>Declaración de Conformidad:</h3>
                    <div class="legal-text">${PRIVACY_POLICY_TEXT}</div>

                    <div class="signature-container">
                        <div class="signature-box">
                            <img src="${doc.url}" class="signature-img" /><br/>
                            <strong>Firma del Colaborador Externo</strong>
                        </div>
                        <div style="text-align: right;">
                             <img src="https://grupovitalicio.es/wp-content/uploads/2021/04/cropped-Logo-Vitalicio-1.png" style="height: 45px; margin-bottom: 10px;" /><br/>
                             <small>Documento Generado Automáticamente<br/>Sistema de Gestión de Grupo Vitalicio</small>
                        </div>
                    </div>
                </body>
                </html>
            `;
  }

  const handleDownloadDoc = (doc: Document) => {
    if (!doc.url) {
        alert("El archivo no tiene una URL válida para descargar.");
        return;
    }

    if (doc.type === 'CONTRACT' && doc.id.startsWith('privacy_')) {
        const owner = allUsers.find(u => u.id === doc.ownerId);
        if (!owner) return;
        
        const htmlContent = generateContractHTML(doc, owner);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = doc.name.replace('.pdf', '') + '.html'; 
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(blobUrl);
        return;
    }

    const link = document.createElement('a');
    link.href = doc.url;
    link.download = doc.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleViewDoc = (doc: Document) => {
    const docOwner = allUsers.find(u => u.id === doc.ownerId);

    if (doc.type === 'CONTRACT' && doc.id.startsWith('privacy_')) {
        const win = window.open("", "_blank");
        if (win && docOwner) {
            win.document.write(generateContractHTML(doc, docOwner));
            win.document.close();
        }
        return;
    }

    if (doc.url.startsWith('data:')) {
        const win = window.open();
        if (win) {
            if (doc.type === 'IMAGE') {
                win.document.write(`<img src="${doc.url}" style="max-width:100%; height:auto;">`);
            } else if (doc.type === 'PDF') {
                win.document.write(`<iframe src="${doc.url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
            }
        }
    } else {
        window.open(doc.url, '_blank');
    }
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage({ text: '', type: '' });

    if (!user) return;

    const isAdminReset = user.role === UserRole.ADMIN && selectedSellerId;
    const targetUser = isAdminReset 
      ? allUsers.find(u => u.id === selectedSellerId) 
      : user;

    if (!targetUser) return;

    if (!isAdminReset && userPasswords[user.email] !== passCurrent) {
      setPassMessage({ text: 'La contraseña actual es incorrecta.', type: 'error' });
      return;
    }

    if (passNew !== passConfirm) {
      setPassMessage({ text: 'Las nuevas contraseñas no coinciden.', type: 'error' });
      return;
    }

    if (passNew.length < 6) {
      setPassMessage({ text: 'La nueva contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return;
    }

    setUserPasswords(prev => ({ ...prev, [targetUser.email]: passNew }));
    setPassMessage({ 
      text: isAdminReset ? `¡Contraseña de ${targetUser.name} actualizada!` : '¡Contraseña actualizada con éxito!', 
      type: 'success' 
    });
    
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
             <h2 className="text-2xl font-bold text-[#a12d34]">Política de Privacidad Obligatoria</h2>
             <button onClick={handleLogout} className="text-red-500 font-bold">Cerrar Sesión</button>
          </div>
          <div className="flex-1 overflow-y-auto p-10 space-y-6 text-sm leading-relaxed text-gray-700 font-medium">
            <div className="whitespace-pre-line bg-slate-50 p-6 rounded-2xl border border-slate-200">
                {PRIVACY_POLICY_TEXT}
            </div>
            
            <div className="pt-6 border-t">
               <h3 className="text-lg font-bold text-[#a12d34] mb-4">Identificación del Firmante</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Nombre Completo</label>
                       <div className="p-4 bg-slate-100 rounded-xl text-gray-500 font-bold">{user.name}</div>
                   </div>
                   <div>
                       <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">DNI / Pasaporte (*)</label>
                       <input 
                         type="text" 
                         value={userDniInput} 
                         onChange={e => { setUserDniInput(e.target.value); setDniError(''); }} 
                         placeholder="Ej: 12345678X" 
                         className={`${UI_CONFIG.inputClass} ${dniError ? 'border-red-500' : ''}`}
                         required 
                       />
                       {dniError && <p className="text-red-500 text-[10px] font-bold mt-1 ml-1">{dniError}</p>}
                   </div>
               </div>
            </div>
          </div>
          <div className="p-8 border-t flex justify-center bg-slate-50 rounded-b-[2.5rem]">
             <button 
               onClick={() => {
                 if(!userDniInput.trim()){ setDniError('Debe introducir su DNI para firmar.'); return; }
                 setShowPrivacySignature(true);
               }} 
               className="bg-[#a12d34] text-white px-12 py-5 rounded-2xl font-bold text-xl shadow-xl transition-transform active:scale-95"
             >
               Confirmar Datos y Firmar
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

          {/* Banner de configuración Drive si no está conectado */}
          {!isDriveConnected || !mainDriveFolder ? (
            <div className="bg-blue-50 border-2 border-blue-200 p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 shadow-xl animate-scaleIn">
              <div className="w-24 h-24 bg-[#4285F4] text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-lg">
                📂
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-blue-800">Conectar con Google Drive</h3>
                <p className="text-sm text-blue-600 font-medium mt-1 leading-relaxed">
                  Para empezar a trabajar, debe vincular la cuenta oficial de <b>sguillen@grupovitalicio.es</b> y seleccionar la carpeta donde se almacenarán todos los expedientes de los vendedores.
                </p>
              </div>
              <button 
                onClick={handleDriveConnection}
                disabled={driveSyncing}
                className="bg-[#4285F4] hover:bg-blue-600 text-white px-10 py-5 rounded-2xl font-bold text-lg shadow-xl transition-all active:scale-95 flex items-center gap-3 disabled:opacity-50"
              >
                {driveSyncing ? 'Conectando...' : 'Vincular Drive Now'}
              </button>
            </div>
          ) : null}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <div className={UI_CONFIG.cardClass}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center text-xl">⚙️</div>
                  <h3 className="font-bold text-gray-800">Infraestructura</h3>
                </div>
                <div className="space-y-4">
                   <p className="text-xs text-gray-400">Raíz Drive: <span className="font-bold text-gray-600 block mt-1">{mainDriveFolder || 'SIN CONFIGURAR'}</span></p>
                   <div className="flex items-center gap-2">
                     <span className={`w-2 h-2 rounded-full animate-pulse ${isDriveConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                     <p className={`text-xs font-bold uppercase tracking-widest ${isDriveConnected ? 'text-green-600' : 'text-red-600'}`}>
                        {isDriveConnected ? 'Drive Conectado' : 'Sin Conexión'}
                     </p>
                   </div>
                   {isDriveConnected && (
                     <button onClick={() => setShowDrivePicker(true)} className="text-[9px] text-blue-500 font-bold underline hover:text-blue-700">CAMBIAR DIRECTORIO RAÍZ</button>
                   )}
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
                <p className="text-xs text-gray-500 leading-relaxed mb-4">Operaciones auditadas. El Administrador puede supervisar todos los documentos y firmas.</p>
                <button 
                  onClick={() => setShowAuditModal(true)}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors"
                >
                  Ver Auditoría de Drive
                </button>
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
                          {s.privacySigned ? `DNI: ${s.dni || 'PENDIENTE'}` : 'Pendiente de Firma'}
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
                  <p className="text-[10px] text-[#a12d34] font-mono font-bold truncate max-w-[200px]">{currentViewUser?.driveFolderPath || 'PENDIENTE DE ASIGNACIÓN'}</p>
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
                  
                  {currentDocs.filter(d => activeTab === 'docs' ? (d.type === 'PDF' || d.type === 'CONTRACT') : d.type === 'IMAGE').length === 0 ? (
                    <div className="text-center py-16 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                       <p className="text-gray-400 font-bold italic">No hay archivos en esta categoría.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                      {currentDocs.filter(d => activeTab === 'docs' ? (d.type === 'PDF' || d.type === 'CONTRACT') : d.type === 'IMAGE').map(doc => (
                        <div key={doc.id} className="bg-white rounded-[2rem] overflow-hidden shadow-lg hover:shadow-2xl transition-all border border-gray-100 flex flex-col group">
                           <div className="h-48 bg-slate-100 flex items-center justify-center relative overflow-hidden">
                              {doc.type === 'IMAGE' && doc.url ? (
                                <img src={doc.url} alt={doc.name} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                              ) : (
                                <span className="text-6xl group-hover:scale-125 transition-transform duration-300">
                                    {doc.type === 'CONTRACT' ? '📜' : '📕'}
                                </span>
                              )}
                              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                 { (user.role === UserRole.ADMIN || user.id === doc.ownerId) && (
                                     <button 
                                      onClick={() => handleDeleteDoc(doc.id)} 
                                      className="w-10 h-10 bg-white/90 text-red-500 rounded-full shadow-lg flex items-center justify-center hover:bg-red-500 hover:text-white transition-all"
                                     >
                                        🗑️
                                     </button>
                                 )}
                              </div>
                           </div>
                           <div className="p-6">
                              <p className="font-bold text-gray-800 truncate" title={doc.name}>{doc.name}</p>
                              <div className="flex flex-col gap-3 mt-4">
                                 <span className="text-[10px] bg-slate-100 px-3 py-1 self-start rounded-full text-gray-500 font-bold uppercase tracking-wider">{doc.uploadDate}</span>
                                 <div className="flex justify-between items-center pt-2 border-t border-slate-50">
                                     <button 
                                        onClick={() => handleViewDoc(doc)}
                                        className="text-[10px] font-bold text-[#a12d34] hover:underline uppercase tracking-widest"
                                     >
                                        Ver Online 👁️
                                     </button>
                                     <button 
                                        onClick={() => handleDownloadDoc(doc)}
                                        className="text-[10px] font-bold text-[#C5A059] hover:underline uppercase tracking-widest"
                                     >
                                        Descargar 💾
                                     </button>
                                 </div>
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
                         <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">DNI / Pasaporte</label>
                         <div className="bg-slate-50 p-4 rounded-xl font-bold text-[#a12d34] border border-slate-100 uppercase text-[12px]">{currentViewUser?.dni || 'NO ASIGNADO'}</div>
                       </div>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Email de Acceso</label>
                       <div className="bg-slate-50 p-4 rounded-xl font-bold text-gray-700 border border-slate-100">{currentViewUser?.email}</div>
                     </div>
                     <div>
                       <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Directorio Drive Sincronizado</label>
                       <div className="bg-slate-50 p-4 rounded-xl font-mono text-[10px] text-gray-500 border border-slate-100">{currentViewUser?.driveFolderPath || 'SIN CARPETA'}</div>
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
          <form onSubmit={handleAddSeller} className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6 animate-scaleIn shadow-2xl border border-gray-100">
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
              <button type="button" onClick={() => setShowAddSeller(false)} className="flex-1 font-bold text-gray-400">Cancelar</button>
              <button 
                type="submit" 
                className="flex-1 bg-[#a12d34] text-white py-4 rounded-2xl font-bold shadow-xl"
                disabled={isProcessing}
              >
                {isProcessing ? 'Sincronizando...' : 'Dar de Alta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: DRIVE PICKER (ADMIN) */}
      {showDrivePicker && (
        <DrivePickerModal 
          onSelect={onDriveFolderSelected} 
          onCancel={() => setShowDrivePicker(false)} 
        />
      )}

      {/* MODAL: AUDITORIA GLOBAL (ADMIN) */}
      {showAuditModal && (
        <AuditModal 
          logs={logs} 
          onCancel={() => setShowAuditModal(false)} 
        />
      )}
    </Layout>
  );
};

export default App;
