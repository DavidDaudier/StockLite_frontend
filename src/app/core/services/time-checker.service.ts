import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TimeCheckerService {
  constructor() {}

  /**
   * Vérifie si le délai (en minutes) est expiré depuis une date donnée
   * @param createdAt - Date de création (ISO string)
   * @param delayInMinutes - Délai en minutes
   * @returns true si le délai est expiré, false sinon
   */
  isDelayExpired(createdAt: string, delayInMinutes: number): boolean {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMinutes = diffMs / 1000 / 60;
    return diffMinutes > delayInMinutes;
  }

  /**
   * Calcule le nombre de minutes écoulées depuis une date
   * @param createdAt - Date de création (ISO string)
   * @returns Nombre de minutes écoulées
   */
  getMinutesElapsed(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    return diffMs / 1000 / 60;
  }

  /**
   * Calcule le nombre de minutes restantes avant expiration
   * @param createdAt - Date de création (ISO string)
   * @param delayInMinutes - Délai total en minutes
   * @returns Nombre de minutes restantes (peut être négatif si expiré)
   */
  getRemainingMinutes(createdAt: string, delayInMinutes: number): number {
    const elapsed = this.getMinutesElapsed(createdAt);
    return Math.max(0, delayInMinutes - elapsed);
  }

  /**
   * Formatte une durée en minutes en format lisible (ex: "2h 30min")
   * @param minutes - Nombre de minutes
   * @returns String formatée
   */
  formatMinutes(minutes: number): string {
    if (minutes < 60) {
      return `${Math.round(minutes)} min`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}min`;
  }
}
