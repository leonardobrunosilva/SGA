
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
}

export interface Metric {
  label: string;
  value: string | number;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: string;
  color: string;
}
