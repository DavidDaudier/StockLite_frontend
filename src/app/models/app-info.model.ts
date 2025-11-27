export interface AppInfo {
  id: string;
  logo_app?: string;
  nom_app: string;
  email_app?: string;
  adresse_app?: string;
  phone_app?: string;
  color_primary?: string;
  color_secondary?: string;
  color_tertiary?: string;
  sous_titre_app?: string;
  logo_size?: number;
  color_nom_app?: string;
  color_sous_titre_app?: string;
  logo_bg_color?: string;
  currency?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppInfoDto {
  logo_app?: string;
  nom_app: string;
  email_app?: string;
  adresse_app?: string;
  phone_app?: string;
  color_primary?: string;
  color_secondary?: string;
  color_tertiary?: string;
  sous_titre_app?: string;
  logo_size?: number;
  color_nom_app?: string;
  color_sous_titre_app?: string;
  logo_bg_color?: string;
  currency?: string;
}

export interface UpdateAppInfoDto {
  logo_app?: string;
  nom_app?: string;
  email_app?: string;
  adresse_app?: string;
  phone_app?: string;
  color_primary?: string;
  color_secondary?: string;
  color_tertiary?: string;
  sous_titre_app?: string;
  logo_size?: number;
  color_nom_app?: string;
  color_sous_titre_app?: string;
  logo_bg_color?: string;
  currency?: string;
}
