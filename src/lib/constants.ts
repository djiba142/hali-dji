/**
 * SIHG Central Constants
 * Centralized source of truth for administrative and configuration data
 * replacing reliance on mock data files.
 */

export const REGIONS = [
    'Conakry',
    'Boké',
    'Kindia',
    'Mamou',
    'Labé',
    'Faranah',
    'Kankan',
    'N\'Zérékoré'
] as const;

export type Region = typeof REGIONS[number];

export const PREFECTURES_BY_REGION: Record<string, string[]> = {
    'Conakry': ['Kaloum', 'Dixinn', 'Ratoma', 'Matam', 'Matoto'],
    'Boké': ['Boké', 'Boffa', 'Fria', 'Koundara', 'Gaoual'],
    'Kindia': ['Kindia', 'Coyah', 'Dubréka', 'Forécariah', 'Télimélé'],
    'Mamou': ['Mamou', 'Dalaba', 'Pita'],
    'Labé': ['Labé', 'Koubia', 'Lélouma', 'Mali', 'Tougué'],
    'Faranah': ['Faranah', 'Dabola', 'Dinguiraye', 'Kissidougou'],
    'Kankan': ['Kankan', 'Kérouané', 'Kouroussa', 'Siguiri', 'Mandiana'],
    'N\'Zérékoré': ['N\'Zérékoré', 'Beyla', 'Guéckédou', 'Lola', 'Macenta', 'Yomou']
};

export const FUEL_TYPES = [
    { id: 'essence', label: 'Essence Super', unit: 'L' },
    { id: 'gasoil', label: 'Gasoil', unit: 'L' },
    { id: 'gpl', label: 'GPL', unit: 'L' },
    { id: 'lubrifiants', label: 'Lubrifiants', unit: 'L' }
] as const;

export const STATION_TYPES = [
    { id: 'urbaine', label: 'Urbaine' },
    { id: 'routiere', label: 'Routière' },
    { id: 'depot', label: 'Dépôt' }
] as const;

export const STATION_STATUS = [
    { id: 'ouverte', label: 'Ouverte', color: 'bg-emerald-100 text-emerald-700' },
    { id: 'fermee', label: 'Fermée', color: 'bg-red-100 text-red-700' },
    { id: 'en_travaux', label: 'En travaux', color: 'bg-amber-100 text-amber-700' },
    { id: 'attente_validation', label: 'En attente', color: 'bg-blue-100 text-blue-700' }
] as const;
