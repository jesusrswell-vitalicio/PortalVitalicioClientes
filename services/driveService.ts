// driveservice.ts
fetchFolders: async (token: string): Promise<DriveFolder[]> => {
  // Construimos la URL con encodeURIComponent para evitar errores de símbolos
  const query = encodeURIComponent("mimeType='application/vnd.google-apps.folder' and trashed=false");
  const url = `https://www.googleapis.com{query}&fields=files(id, name)`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Respuesta de error de Google:", errorData);
      return [];
    }

    const data = await response.json();
    return data.files?.map((f: any) => ({ 
      id: f.id, 
      name: f.name, 
      path: f.name 
    })) || [];
  } catch (error) {
    console.error("Error de red en fetchFolders:", error);
    return [];
  }
},