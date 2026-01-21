
export type PageType =
  | 'Dashboard'
  | 'Apreensoes'
  | 'Destinacoes'
  | 'Restituicao'
  | 'Adocao'
  | 'Prontuario'
  | 'OutrosOrgaos'
  | 'RegiaoAdm'
  | 'Configuracoes';

export interface Animal {
  id: string;
  chip: string;
  name?: string;
  specie: string;
  breed: string;
  gender: 'Macho' | 'Fêmea';
  color: string;
  status: string; // Facilitando a transição entre as diferentes fases do sistema
  origin: string;
  dateIn: string;
  timeIn?: string;
  exitDate?: string;
  seiProcess?: string;
  daysIn: number;
  observations: string;
  imageUrl: string;
  organ: string;
  osNumber: string;
  mapsUrl?: string;
  contactInitiated?: boolean;
  classification?: string;
}

export interface Metric {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}

export interface WorklistItem {
  id: string; // The ID of the worklist entry itself
  animal_id: string;
  created_at: string;
  status: string;
  observations: string;
  animal?: Animal; // Nested animal data from JOIN
}

export interface WorklistRestituicao extends WorklistItem {
  contact_made?: boolean;
}

export interface WorklistOutros extends WorklistItem {
  organ_destination?: string;
}

export interface WorklistAdocao extends WorklistItem {
  // Add specific fields if any
}
