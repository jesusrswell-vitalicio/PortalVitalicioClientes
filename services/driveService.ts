
/**
 * Mock service for Google Drive Integration.
 * System Account: sguillen@grupovitalicio.es
 * Target storage: "Mi Unidad"
 */

// Simulación de "encriptación" básica (Base64) para cumplir con el requisito de ofuscación
const _sys = "c2d1aWxsZW5AZ3J1cG92aXRhbGljaW8uZXM="; // sguillen@grupovitalicio.es
const _pk = "Vml0YWxpY2lvQDIwMjY="; // Vitalicio@2026

const decrypt = (val: string) => atob(val);

export const driveService = {
  getConnectionInfo: () => ({
    user: decrypt(_sys),
    status: 'CONECTADO',
    lastSync: new Date().toLocaleTimeString()
  }),

  createSellerFolder: async (sellerName: string) => {
    const user = decrypt(_sys);
    console.log(`[Google Drive] Usando cuenta: ${user}`);
    console.log(`[Google Drive - Mi Unidad] Creando carpeta de expediente: /VendedoresExternos/${sellerName}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));
    return `Mi Unidad/VendedoresExternos/${sellerName}`;
  },

  moveFolderToDeleted: async (currentPath: string) => {
    const user = decrypt(_sys);
    console.log(`[Google Drive] Usando cuenta: ${user}`);
    const folderName = currentPath.split('/').pop();
    const newPath = `Mi Unidad/VendedoresExternos/Eliminados/${folderName}`;
    console.log(`[Google Drive - Mi Unidad] Moviendo carpeta de ${currentPath} a ${newPath}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    return newPath;
  },

  syncDocument: async (fileName: string, folderPath: string) => {
    const user = decrypt(_sys);
    console.log(`[Google Drive] Sincronizando como: ${user}`);
    console.log(`[Google Drive - Mi Unidad] Sincronizando archivo "${fileName}" en la ruta: ${folderPath}`);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return true;
  }
};
