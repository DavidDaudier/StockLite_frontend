import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // État du sidebar desktop (réduit/étendu)
  collapsed = signal(false);
  
  // État du sidebar mobile (ouvert/fermé)
  mobileOpen = signal(false);

  toggle(): void {
    this.collapsed.update(value => !value);
  }

  toggleMobile(): void {
    this.mobileOpen.update(value => !value);
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }
}
