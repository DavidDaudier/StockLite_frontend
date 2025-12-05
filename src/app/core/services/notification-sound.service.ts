import { Injectable } from '@angular/core';

/**
 * Service pour gérer les sons de notification
 * Joue un son d'alerte pour les notifications importantes (ex: stock faible)
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationSoundService {
  private audio: HTMLAudioElement | null = null;
  private soundEnabled = true;

  constructor() {
    this.initializeAudio();

    // Charger l'état muet depuis localStorage
    const mutedState = localStorage.getItem('notificationSoundMuted');
    if (mutedState === 'true') {
      this.soundEnabled = false;
    }
  }

  /**
   * Initialise l'audio avec un son de notification
   * Utilise un son système de notification
   */
  private initializeAudio(): void {
    // Créer un son simple avec l'API Web Audio ou utiliser un fichier audio
    // Pour l'instant, on utilise un Data URL d'un son bip simple
    this.audio = new Audio();

    // Son d'alerte simple (bip) encodé en base64
    // Vous pouvez remplacer ceci par un vrai fichier audio: this.audio.src = '/assets/sounds/notification.mp3'
    this.audio.src = this.generateBeepSound();
    this.audio.volume = 0.7; // 70% du volume
  }

  /**
   * Génère un son de bip simple
   * Alternative: uploadez un fichier .mp3 dans /assets/sounds/ et utilisez-le
   */
  private generateBeepSound(): string {
    // Son de notification court
    return 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBjGJ0fPTgjMGHm7A7+OZRQ0OVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBSyAze/bjjYGGmi56+SaRw0PVqzn77FeCwxDnN3wv3AeBQ==';
  }

  /**
   * Joue le son de notification
   * @param repeat - Nombre de fois à répéter le son (défaut: 1)
   */
  playNotificationSound(repeat: number = 1): void {
    if (!this.soundEnabled || !this.audio) {
      return;
    }

    let playCount = 0;
    const playSound = () => {
      if (playCount < repeat) {
        this.audio!.currentTime = 0;
        this.audio!.play().catch(err => {
          console.warn('Impossible de jouer le son de notification:', err);
        });
        playCount++;

        if (playCount < repeat) {
          setTimeout(playSound, 800); // Pause de 800ms entre chaque répétition
        }
      }
    };

    playSound();
  }

  /**
   * Joue le son d'alerte pour stock faible
   * Répète le son 2 fois pour attirer l'attention
   */
  playLowStockAlert(): void {
    this.playNotificationSound(2);
  }

  /**
   * Joue le son d'alerte pour nouveau message de demande de suppression
   * Répète le son 1 fois
   */
  playDeletionRequestAlert(): void {
    this.playNotificationSound(1);
  }

  /**
   * Active ou désactive les sons
   */
  setSoundEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    console.log(`Sons de notification: ${enabled ? 'activés' : 'désactivés'}`);
  }

  /**
   * Active ou désactive les sons (alias pour setMuted)
   */
  setMuted(muted: boolean): void {
    this.soundEnabled = !muted;
    console.log(`Sons de notification: ${!muted ? 'activés' : 'désactivés'}`);
  }

  /**
   * Vérifie si les sons sont activés
   */
  isSoundEnabled(): boolean {
    return this.soundEnabled;
  }

  /**
   * Ajuste le volume (0.0 à 1.0)
   */
  setVolume(volume: number): void {
    if (this.audio) {
      this.audio.volume = Math.max(0, Math.min(1, volume));
    }
  }
}
