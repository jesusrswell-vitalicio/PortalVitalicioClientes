const DRIVE_ENDPOINT = "https://www.googleapis.com";

export interface DriveFolder {
  id: string; // IMPORTANTE: Google usa IDs, no rutas.
  name: string;
  path: string;
}

export const driveService = {
  // 1. Obtener carpetas reales de Google Drive
  fetchFolders: async (token: string): Promise<DriveFolder[]> => {
    const response = await fetch(`${DRIVE_ENDPOINT}?q=mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id, name)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await response.json();
    return data.files?.map((f: any) => ({ id: f.id, name: f.name, path: f.name })) || [];
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
    return await response.json(); // Devuelve el objeto con el ID real
  },

  // 3. Subir archivo (PDF o Imagen)
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

  // 4. Eliminar (Mover a la papelera)
  deleteFile: async (fileId: string, token: string) => {
    await fetch(`${DRIVE_ENDPOINT}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }
};