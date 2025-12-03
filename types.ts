

export interface TranscriptItem {
  id: string;
  sender: 'user' | 'model';
  text: string;
  isFinal: boolean;
}

export interface MousePosition {
  x: number;
  y: number;
}

export interface Stage {
  id: number;
  title: string;
  completed: boolean;
  active: boolean;
}

export interface User {
  name: string;
  mobileNumber: string;
}

export const STAGES: Stage[] = [
  { id: 1, title: 'Introduction & Rapport', completed: false, active: true },
  { id: 2, title: 'Program Value', completed: false, active: false },
  { id: 3, title: 'Payment Structure', completed: false, active: false },
  { id: 4, title: 'NBFC & 0% EMI', completed: false, active: false },
  { id: 5, title: 'Right Co-Applicant', completed: false, active: false },
  { id: 6, title: 'KYC Completion', completed: false, active: false },
];