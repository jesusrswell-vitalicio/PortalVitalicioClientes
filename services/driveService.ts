
/// services/driveService.ts

const DRIVE_API = "https://www.googleapis.com/drive/v3/files";
const UPLOAD_API = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";

export interface DriveFolder {
  id: string;
  name: string;
}

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem('gv_token');
    throw new Error("SESION_EXPIRED");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || "Error en Drive");
  return data;
};

export const driveService = {
  fetchFolders: async (token: string, parentId: string = 'root'): Promise<DriveFolder[]> => {
    const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and '${parentId}' in parents and trashed=false`);
    const url = `${DRIVE_API}?q=${query}&fields=files(id, name)&orderBy=name`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return data.files || [];
  },

  // Nueva función para traer archivos (fotos y pdfs) de una carpeta
  fetchFilesFromFolder: async (token: string, folderId: string) => {
    const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const url = `${DRIVE_API}?q=${query}&fields=files(id, name, mimeType, webViewLink, thumbnailLink)&orderBy=createdTime desc`;
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await handleResponse(response);
    return data.files || [];
  },

  createSellerFolder: async (sellerName: string, parentId: string, token: string) => {
    const metadata = {
      name: `Expediente - ${sellerName}`,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId]
    };
    const response = await fetch(DRIVE_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    });
    return await handleResponse(response);
  },

  syncDocument: async (file: File, folderId: string, token: string) => {
    const metadata = { name: file.name, parents: [folderId] };
    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);
    const response = await fetch(UPLOAD_API, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData
    });
    return await handleResponse(response);
  },

  deleteFile: async (fileId: string, token: string) => {
    const response = await fetch(`${DRIVE_API}/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.status !== 204 && response.status !== 404) await handleResponse(response);
  }
};
