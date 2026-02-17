
export enum UserRole {
  ADMIN = 'ADMIN',
  SELLER = 'SELLER'
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  dni?: string;
  role: UserRole;
  status: 'ACTIVE' | 'DELETED';
  driveFolderPath: string;
  privacySigned: boolean;
}

export interface Document {
  id: string;
  name: string;
  type: 'PDF' | 'IMAGE' | 'CONTRACT';
  url: string;
  thumbnail?: string;
  status: 'PENDING' | 'SIGNED' | 'APPROVED';
  uploadDate: string;
  ownerId: string;
  folderPath: string;
}

export interface Note {
  id: string;
  sellerId: string;
  authorId: string;
  authorName: string;
  text: string;
  timestamp: string;
}

export interface LogEntry {
  id: string;
  sellerId?: string;
  action: 'LOGIN' | 'UPLOAD' | 'DELETE' | 'PASSWORD_CHANGE' | 'PRIVACY_SIGN' | 'NOTE_ADD' | 'NAVIGATE' | 'VIEW_FILE' | 'LOGOUT';
  description: string;
  authorName: string;
  timestamp: string;
}
