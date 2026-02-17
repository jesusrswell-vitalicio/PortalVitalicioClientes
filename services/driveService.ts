/// services/driveService.ts

const DRIVE_ENDPOINT = "https://www.googleapis.com";

export interface DriveFolder {
  id: string;
  name: string;
  path: string;
}

export const driveService = {
  // 1. Obtener carpetas reales
  fetchFolders: async (token: string): Promise<DriveFolder[]> => {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
    const url = `${DRIVE_ENDPOINT}?q=${query}&fields=files(id, name)`;

    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      return data.files?.map((f: any) => ({ id: f.id, name: f.name, path: f.name })) || [];
    } catch (error) {
      console.error("Error fetchFolders:", error);
      return [];
    }
  },

  // 2. Crear carpeta de vendedor
  createSellerFolder: async (sellerName: string, parentId: string, token: string) => {
    const metadata = {
      name: sellerName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    };
    const response = await fetch(DRIVE_ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });
    return await response.json();
  },

  // 3. Subir archivo
  syncDocument: async (file: File, folderId: string, token: string) => {
    const metadata = { name: file.name, parents: [folderId] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const response = await fetch("https://www.googleapis.com", {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    return await response.json();
  },

  // 4. Eliminar
  deleteFile: async (fileId: string, token: string) => {
    await fetch(`${DRIVE_ENDPOINT}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}; // <--- ESTA LLAVE CIERRA EL OBJETO