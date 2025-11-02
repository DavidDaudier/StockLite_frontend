import { AppInfo } from '../models/app-info.model';

/**
 * Valeurs par défaut pour les informations de l'application
 * Ces valeurs sont utilisées lorsque l'API ne retourne pas de données
 * ou en cas d'erreur lors du chargement
 */
export const DEFAULT_APP_INFO: AppInfo = {
  id: '',
  logo_app: '',
  nom_app: 'StockLite',
  email_app: 'contact@stocklite.com',
  adresse_app: 'Port-au-Prince, Haïti',
  phone_app: '+509 1234-5678',
  color_primary: '#0d9488',
  color_secondary: '#14b8a6',
  color_tertiary: '#2dd4bf',
  createdAt: new Date(),
  updatedAt: new Date()
};
