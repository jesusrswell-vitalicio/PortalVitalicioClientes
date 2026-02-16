
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
Mediante el presente aviso legal y política de privacidad, GRUPO VITALICIO con domicilio social en CALLE ZURBANO 45, 1ª PLANTA, 28010 DE MADRID, informa a los usuarios del sitio webs grupovitalicio.es, Crm.grupovitalicio.es, y este portal de clientes, de su Política de Privacidad, y describe qué datos recoge, cómo los utiliza, las opciones de los usuarios en relación a estos datos, sus derechos (conocidos como derechos ARCO, Acceso, Rectificación, Cancelación y Oposición y los nuevos introducidos por el RGPD, derecho al olvido, derecho al olvido, derecho a la portabilidad de los datos personales y el derecho a la limitación en el tratamiento), la seguridad de sus datos, y la modificación de la política de confidencialidad.

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
  { id: 'v_1', name: 'Antonio García', email: 'antonio@gmail.com', role: UserRole.SELLER, status: 'ACTIVE', driveFolderPath: 'Mi Unidad/VendedoresExternos/Antonio García', privacySigned: false }
];

const INITIAL_PASSWORDS: Record<string, string> = {
  [ADMIN_EMAIL]: ADMIN_PASS_INITIAL,
  'antonio@gmail.com': '123456'
};

const INITIAL_DOCS: Document[] = [
  { id: 'd1', name: 'Contrato Vitalicio Antonio', type: 'CONTRACT', url: '', status: 'PENDING', uploadDate: '20/05/2024', ownerId: 'v_1', folderPath: 'Mi Unidad/VendedoresExternos/Antonio García' },
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

  const handleDriveConnection = async () => {
    setDriveSyncing(true);
    try {
      await driveService.authenticate();
      setIsDriveConnected(true);
      setShowDrivePicker(true);
    } finally {
      setDriveSyncing(false);
    }
  };

  const onDriveFolderSelected = (path: string) => {
    setMainDriveFolder(path);
    setShowDrivePicker(false);
    alert(`Portal configurado correctamente en: ${path}`);
  };

  const handleOpenDriveFolder = (path: string | undefined) => {
    if (!path) {
      alert("No hay una ruta de Drive asignada a este expediente.");
      return;
    }
    const url = driveService.getFolderViewUrl(path);
    window.open(url, '_blank', 'width=1024,height=768,menubar=no,toolbar=no,location=no');
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
      // Se crea la subcarpeta con el nombre y apellidos del vendedor dentro de la raíz
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
      alert(`Vendedor creado. Carpeta asignada en: ${drivePath}`);
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
    
    const privacyDoc: Document = {
        id: 'privacy_' + user.id,
        name: 'Política_Privacidad_Firmada.pdf',
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'IMAGE' | 'PDF') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
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

  const handleDownloadDoc = (doc: Document) => {
    if (!doc.url) {
        alert("El archivo no tiene una URL válida para descargar.");
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
    if (doc.url.startsWith('data:')) {
        const win = window.open();
        if (win) {
            if (doc.type === 'IMAGE') {
                win.document.write(`<img src="${doc.url}" style="max-width:100%; height:auto;">`);
            } else {
                win.document.write(`<iframe src="${doc.url}" frameborder="0" style="border:0; width:100%; height:100%;" allowfullscreen></iframe>`);
            }
        }
    } else {
        window.open(doc.url, '_blank');
    }
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
          <div className="flex-1 overflow-y-auto p-10 space-y-6 text-sm text-gray-700">
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
            {loginError && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border-l-4 border-red-500">{loginError}</div>}
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
                   <div className="bg-slate-100 px-5 py-3 rounded-xl border font-bold text-[#a12d34] tracking-widest text-2xl italic select-none">{captchaValue}</div>
                   <input type="text" value={userCaptchaInput} onChange={e => setUserCaptchaInput(e.target.value)} placeholder="0000" className={`${UI_CONFIG.inputClass} flex-1 text-center font-mono`} maxLength={4} required />
                </div>
              </div>
            </div>
            <button type="submit" className="w-full bg-[#a12d34] text-white py-5 rounded-2xl font-bold text-xl shadow-xl transition-all active:scale-95">Acceder</button>
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

          {!isDriveConnected || !mainDriveFolder ? (
            <div className="bg-blue-50 border-2 border-blue-200 p-10 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-8 shadow-xl">
              <div className="w-24 h-24 bg-[#4285F4] text-white rounded-[2rem] flex items-center justify-center text-4xl">📂</div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-2xl font-bold text-blue-800">Conectar con Google Drive</h3>
                <p className="text-sm text-blue-600 font-medium mt-1 leading-relaxed">
                  Debe vincular la cuenta <b>sguillen@grupovitalicio.es</b> y seleccionar la carpeta raíz.
                </p>
              </div>
              <button onClick={handleDriveConnection} disabled={driveSyncing} className="bg-[#4285F4] text-white px-10 py-5 rounded-2xl font-bold shadow-xl">
                {driveSyncing ? 'Conectando...' : 'Vincular Drive Now'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               <div className={UI_CONFIG.cardClass}>
                  <div className="flex items-center gap-3 mb-4"><span className="text-2xl">⚙️</span><h3 className="font-bold text-gray-800">Infraestructura</h3></div>
                  <p className="text-xs text-gray-400">Raíz Drive: <span className="font-bold text-gray-600 block">{mainDriveFolder}</span></p>
                  <button onClick={() => setShowDrivePicker(true)} className="mt-4 text-xs text-blue-500 font-bold underline">Cambiar Raíz</button>
               </div>
               <div className={UI_CONFIG.cardClass}>
                  <div className="flex items-center gap-3 mb-4"><span className="text-2xl">🛡️</span><h3 className="font-bold text-gray-800">Auditoría</h3></div>
                  <button onClick={() => setShowAuditModal(true)} className="w-full py-2 bg-slate-100 rounded-lg text-xs font-bold uppercase tracking-wider">Ver Auditoría Global</button>
               </div>
               <div className={UI_CONFIG.cardClass}>
                  <div className="flex items-center gap-3 mb-4"><span className="text-2xl">👥</span><h3 className="font-bold text-gray-800">Vendedores</h3></div>
                  <p className="text-3xl font-bold text-[#a12d34]">{allUsers.filter(u => u.role === UserRole.SELLER).length}</p>
               </div>
            </div>
          )}
        </div>
      )}

      {/* VISTA: LISTA DE VENDEDORES (ADMIN) */}
      {activeTab === 'admin-sellers' && user.role === UserRole.ADMIN && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <h2 className={UI_CONFIG.headingClass}>Colaboradores Externos</h2>
            <button onClick={() => setShowAddSeller(true)} className="bg-[#C5A059] text-white px-8 py-3 rounded-2xl font-bold shadow-lg">
              + Nuevo Colaborador
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4">
            {allUsers.filter(u => u.role === UserRole.SELLER && u.status === 'ACTIVE').map(s => (
              <div key={s.id} className="bg-white p-6 rounded-[2.5rem] shadow-md border-l-8 border-[#a12d34] flex flex-wrap justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-2xl font-bold text-[#a12d34]">{s.name.charAt(0)}</div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">{s.name}</h3>
                    <p className="text-sm text-gray-500">{s.email}</p>
                    <button 
                      onClick={() => handleOpenDriveFolder(s.driveFolderPath)}
                      className="text-[10px] text-blue-600 font-bold hover:underline mt-1"
                    >
                      Carpeta: {s.driveFolderPath} ↗️
                    </button>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => { setSelectedSellerId(s.id); setActiveTab('dashboard'); }} className="px-6 py-3 bg-[#a12d34] text-white rounded-xl font-bold text-xs">Ver Expediente</button>
                  <button onClick={() => handleDeleteSeller(s.id)} className="p-3 text-red-300 hover:text-red-600">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VISTA COMÚN: EXPEDIENTE (DASHBOARD / DOCS / PHOTOS) */}
      {(activeTab === 'dashboard' || activeTab === 'docs' || activeTab === 'photos' || activeTab === 'settings') && (
        <div className="space-y-8 animate-fadeIn">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b pb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{currentViewUser?.name}</h2>
              <button 
                onClick={() => handleOpenDriveFolder(currentViewUser?.driveFolderPath)}
                className="text-xs text-blue-600 font-bold hover:underline flex items-center gap-1"
              >
                <span>📂 {currentViewUser?.driveFolderPath || 'No asignada'}</span>
                <span>↗️</span>
              </button>
            </div>
            {activeTab === 'docs' || activeTab === 'photos' ? (
              <label className={`${UI_CONFIG.buttonClass} bg-[#a12d34] text-white cursor-pointer`}>
                {isProcessing ? 'Sincronizando...' : `Subir ${activeTab === 'docs' ? 'Documento' : 'Foto'}`}
                <input type="file" className="hidden" accept={activeTab === 'docs' ? '.pdf' : 'image/*'} onChange={e => handleFileUpload(e, activeTab === 'docs' ? 'PDF' : 'IMAGE')} disabled={isProcessing} />
              </label>
            ) : null}
          </div>

          {(activeTab === 'docs' || activeTab === 'photos') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentDocs.filter(d => activeTab === 'docs' ? (d.type === 'PDF' || d.type === 'CONTRACT') : d.type === 'IMAGE').map(doc => (
                <div key={doc.id} className="bg-white rounded-[2rem] overflow-hidden shadow-lg border group">
                   <div className="h-48 bg-slate-100 flex items-center justify-center relative">
                      {doc.type === 'IMAGE' ? <img src={doc.url} className="w-full h-full object-cover" /> : <span className="text-6xl">📕</span>}
                      <button onClick={() => handleDeleteDoc(doc.id)} className="absolute top-2 right-2 w-8 h-8 bg-white/90 text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                   </div>
                   <div className="p-6">
                      <p className="font-bold text-gray-800 truncate">{doc.name}</p>
                      <div className="flex justify-between mt-4">
                        <button onClick={() => handleViewDoc(doc)} className="text-[10px] font-bold text-[#a12d34] hover:underline uppercase">Ver 👁️</button>
                        <button onClick={() => handleDownloadDoc(doc)} className="text-[10px] font-bold text-[#C5A059] hover:underline uppercase">Bajar 💾</button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showAddSeller && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4">
          <form onSubmit={handleAddSeller} className="bg-white w-full max-w-md rounded-[3rem] p-10 space-y-6">
            <h3 className="text-2xl font-bold text-center">Nuevo Vendedor</h3>
            <div className="space-y-4">
               <div><label className="text-[10px] font-bold text-gray-400 uppercase">Nombre y Apellidos</label><input type="text" value={newSellerName} onChange={e => setNewSellerName(e.target.value)} className={UI_CONFIG.inputClass} required /></div>
               <div><label className="text-[10px] font-bold text-gray-400 uppercase">Email</label><input type="email" value={newSellerEmail} onChange={e => setNewSellerEmail(e.target.value)} className={UI_CONFIG.inputClass} required /></div>
               <div><label className="text-[10px] font-bold text-gray-400 uppercase">Clave Inicial</label><input type="password" value={newSellerPass} onChange={e => setNewSellerPass(e.target.value)} className={UI_CONFIG.inputClass} required /></div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setShowAddSeller(false)} className="flex-1 font-bold text-gray-400">Cerrar</button>
              <button type="submit" className="flex-1 bg-[#a12d34] text-white py-4 rounded-2xl font-bold shadow-xl">Guardar</button>
            </div>
          </form>
        </div>
      )}

      {showDrivePicker && <DrivePickerModal onSelect={onDriveFolderSelected} onCancel={() => setShowDrivePicker(false)} />}
      {showAuditModal && <AuditModal logs={logs} onCancel={() => setShowAuditModal(false)} />}
    </Layout>
  );
};

export default App;
