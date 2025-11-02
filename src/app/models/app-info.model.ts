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
}
