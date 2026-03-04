
export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  dni?: string; // Documento Nacional de Identidad o Pasaporte
  role: UserRole;
  status: 'ACTIVE' | 'DELETED';
  driveFolderPath: string;
  privacySigned?: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE' | 'CONTRACT';
  url: string;
  status: 'PENDING' | 'SIGNED' | 'APPROVED';
  uploadDate: string;
  ownerId: string;
  folderPath: string;
}

export interface Comment {
  id: string;
  sellerId: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  sellerId: string;
  action: 'UPLOAD' | 'DELETE' | 'SIGNATURE' | 'PRIVACY_ACCEPTANCE';
  fileName: string;
  authorName: string;
  timestamp: string;
}
