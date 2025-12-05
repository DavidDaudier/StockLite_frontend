# 📋 IMPLÉMENTATION DU TOGGLE STATS

## ✅ Pages déjà implémentées :
- **Dashboard** ✅
- **Zoom** ✅
- **Reports** ✅ (référence)

## 🔧 À implémenter sur les autres pages :

### **Sessions, Notifications, Messages**

#### 1. HTML - Ajouter le bouton avant les stats :
```html
<!-- Bouton flottant Toggle Stats -->
<button
  (click)="showStats.set(!showStats())"
  class="fixed -right-2 z-50 p-3 bg-blue-600/70 text-white rounded-l-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 cursor-pointer"
  [style.top]="showStats() ? '175px' : '45px'"
  [title]="showStats() ? 'Masquer les statistiques' : 'Afficher les statistiques'">
  <ng-icon [name]="showStats() ? 'hugeViewOff' : 'hugeEye'" size="20" strokeWidth="2"></ng-icon>
</button>
```

#### 2. HTML - Entourer les stats :
```html
<!-- Statistiques -->
@if (showStats()) {
  <div class="px-6 pb-4">
    <!-- Cards ici -->
  </div>
}
```

#### 3. TypeScript - Ajouter le signal :
```typescript
showStats = signal<boolean>(true);
```

#### 4. TypeScript - Ajouter les icônes aux imports :
```typescript
import { hugeEye, hugeViewOff } from '@ng-icons/huge-icons';

// Dans viewProviders
provideIcons({
  // ... autres icônes
  hugeEye,
  hugeViewOff
})
```

---

## Dashboard Seller - À faire séparément
Voir instructions dans le document séparé.
