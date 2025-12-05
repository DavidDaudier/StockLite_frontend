import { Injectable, signal, effect } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  // 'light' | 'dark'
  currentTheme = signal<'light' | 'dark'>('light');

  constructor() {
    // Charger le thème depuis le localStorage ou utiliser la préférence système
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark';
    if (savedTheme) {
      this.currentTheme.set(savedTheme);
    } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.currentTheme.set('dark');
    }

    // Effet pour appliquer la classe 'dark' au document HTML
    effect(() => {
      const theme = this.currentTheme();
      const html = document.documentElement;
      
      if (theme === 'dark') {
        html.classList.add('dark');
      } else {
        html.classList.remove('dark');
      }
      
      localStorage.setItem('theme', theme);
    });
  }

  toggleTheme(): void {
    this.currentTheme.update(theme => theme === 'light' ? 'dark' : 'light');
  }

  isDark(): boolean {
    return this.currentTheme() === 'dark';
  }
}
