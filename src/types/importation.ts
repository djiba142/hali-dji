
export type ImportWorkflowStatus = 
  | 'brouillon' 
  | 'validation_juridique' 
  | 'attente_paiement' 
  | 'en_transit' 
  | 'arrive_conakry' 
  | 'receptionne' 
  | 'distribue' 
  | 'cloture';

export interface ImportDossier {
  id: string;
  numero: string;
  produit: string;
  quantite: number;
  fournisseur: string;
  navire: string;
  eta: string;
  statut: ImportWorkflowStatus;
  date_creation: string;
  montant?: number;
  devise?: string;
}
