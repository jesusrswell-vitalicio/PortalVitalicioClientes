
/**
 * Mock service for Google Drive Integration.
 * System Account: sguillen@grupovitalicio.es
 * Target storage: "Mi Unidad"
 */

const _sys = "c2d1aWxsZW5AZ3J1cG92aXRhbGljaW8uZXM="; // sguillen@grupovitalicio.es
const decrypt = (val: string) => atob(val);

export interface DriveFolder {
  id: string;
  name: string;
  path: string;
}

export const driveService = {
  getConnectionInfo: () => ({
    user: decrypt(_sys),
    status: 'CONECTADO',
    lastSync: new Date().toLocaleTimeString()
  }),

  // Simula el proceso de login de Google en un popup
  authenticate: async () => {
    return new Promise<{email: string}>((resolve) => {
      setTimeout(() => {
        resolve({ email: decrypt(_sys) });
      }, 1500);
    });
  },

  // Simula la obtención de carpetas de la cuenta
  fetchFolders: async (parentPath: string = "Mi Unidad"): Promise<DriveFolder[]> => {
    await new Promise(resolve => setTimeout(resolve, 600));
    return [
      { id: 'f1', name: 'Inmuebles_2024', path: `${parentPath}/Inmuebles_2024` },
      { id: 'f2', name: 'VendedoresExternos', path: `${parentPath}/VendedoresExternos` },
      { id: 'f3', name: 'Contratos_Nuevos', path: `${parentPath}/Contratos_Nuevos` },
      { id: 'f4', name: 'Expedientes_Legales', path: `${parentPath}/Expedientes_Legales` },
    ];
  },

  createSellerFolder: async (sellerName: string, rootPath: string) => {
    const user = decrypt(_sys);
    console.log(`[Google Drive] Usando cuenta: ${user}`);
    console.log(`[Google Drive] Creando carpeta de vendedor en: ${rootPath}/${sellerName}`);
    await new Promise(resolve => setTimeout(resolve, 800));
    return `${rootPath}/${sellerName}`;
  },

  moveFolderToDeleted: async (currentPath: string) => {
    const user = decrypt(_sys);
    console.log(`[Google Drive] Usando cuenta: ${user}`);
    const folderName = currentPath.split('/').pop();
    const newPath = `Mi Unidad/Eliminados/${folderName}`;
    console.log(`[Google Drive] Moviendo carpeta de ${currentPath} a ${newPath}`);
    await new Promise(resolve => setTimeout(resolve, 1000));
    return newPath;
  },

  syncDocument: async (fileName: string, folderPath: string) => {
    const user = decrypt(_sys);
    console.log(`[Google Drive] Sincronizando como: ${user}`);
    console.log(`[Google Drive] Archivo "${fileName}" -> ${folderPath}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
};
