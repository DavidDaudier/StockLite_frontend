# 📋 UNIFORMISATION UI & SYSTÈME DE NOTIFICATIONS

## ✅ TRAVAUX TERMINÉS

### 1️⃣ **UNIFORMISATION DES PAGES** selon reports.component.html

#### **Structure de référence (Reports)**
```html
<main class="relative flex-1 flex flex-col overflow-hidden bg-white">
  <app-pos-header></app-pos-header>

  <!-- Titre FIXE -->
  <div class="px-6 pt-4 pb-3 bg-white">
    <h1 class="text-xl font-bold text-gray-900">Titre</h1>
    <p class="text-sm text-gray-500 mt-1">Dashboard > Page</p>
  </div>

  <!-- Stats FIXES (hors scroll) -->
  <div class="px-6 pb-4">
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-X gap-4">
      <!-- Cards avec gradient -->
    </div>
  </div>

  <!-- Contenu SCROLLABLE -->
  <div class="flex-1 overflow-y-auto px-6 pb-6 bg-white">
    <div class="bg-gray-100 rounded-[15px] p-4 border border-gray-300">
      <!-- Contenu -->
    </div>
  </div>
</main>
```

#### **Pages uniformisées**
✅ **Dashboard** (`src/app/pages/dashboard/dashboard.component.html`)
- Structure main conforme à Reports
- Titre personnalisé au lieu de app-page-header
- Stats fixes hors grey-container
- Contenu scrollable avec grey-container
- Import PageHeaderComponent retiré du TS

✅ **Sessions** (`src/app/pages/sessions-admin/sessions-admin.component.html`)
- Structure complète identique à Reports
- 2 cartes stats avec gradients (Sessions Actives + Inactives)
- Import PageHeaderComponent retiré du TS

✅ **Notifications** (`src/app/pages/notifications/notifications.component.html`)
- Structure complète identique à Reports
- 1 carte stats avec gradient (Notifications non lues)
- Bouton d'action style Reports
- Import PageHeaderComponent retiré du TS

✅ **Messages** (`src/app/pages/messages/messages.component.html`)
- Structure complète identique à Reports
- 1 carte stats avec gradient (Demandes en Attente)
- Import PageHeaderComponent retiré du TS

✅ **Zoom** (`src/app/pages/zoom/zoom.component.html`)
- Tableaux uniformisés :
  - `thead` : `bg-teal-600 text-white sticky top-0 z-10`
  - `tbody` : `hover:bg-gray-50 odd:bg-white even:bg-gray-50`

---

### 2️⃣ **SYSTÈME DE NOTIFICATIONS**

#### **Filtres Notifications (Tout | Lues | Non Lue)**
✅ Implémenté dans `src/app/pages/notifications/notifications.component.html`

**Fonctionnalités:**
- 3 boutons de filtre : Tout | Non Lues | Lues
- Compteurs dynamiques sur chaque bouton
- Bouton actif avec style `bg-teal-600 text-white`
- Filtrage côté client en temps réel

**Code ajouté dans TS:**
```typescript
selectedFilter: 'all' | 'read' | 'unread' = 'all';
filteredNotifications = signal<Notification[]>([]);

filterNotifications(filter: 'all' | 'read' | 'unread'): void {
  this.selectedFilter = filter;
  this.applyFilter();
}

private applyFilter(): void {
  const allNotifications = this.notifications();
  switch (this.selectedFilter) {
    case 'read':
      this.filteredNotifications.set(allNotifications.filter(n => n.read));
      break;
    case 'unread':
      this.filteredNotifications.set(allNotifications.filter(n => !n.read));
      break;
    default:
      this.filteredNotifications.set(allNotifications);
  }
}
```

#### **Icône de notification cliquable (POS Header)**
✅ Déjà implémenté dans `src/app/components/pos-header/pos-header.component.html`

**Fonctionnalités:**
- Icône avec badge rouge affichant le nombre de notifications non lues
- Cliquable → Redirige vers `/admin/notifications`
- Tooltip affichant la dernière notification
- Visible uniquement pour les Super Admin

**Code existant:**
```typescript
showNotifications(): void {
  this.router.navigate(['/admin/notifications']);
}

notificationBadge = computed(() => {
  const notifications = this.notificationService.getUnreadNotifications();
  return {
    count: notifications.length,
    hasUnread: notifications.length > 0
  };
});
```

#### **Service de notification sonore**
✅ Créé : `src/app/core/services/notification-sound.service.ts`

**Fonctionnalités:**
- `playNotificationSound(repeat)` : Joue un son X fois
- `playLowStockAlert()` : Joue le son d'alerte stock faible (2 répétitions)
- `setSoundEnabled(boolean)` : Active/Désactive les sons
- `setVolume(0-1)` : Ajuste le volume
- Son de notification intégré (Data URL base64)

**Utilisation:**
```typescript
constructor(private soundService: NotificationSoundService) {}

// Jouer le son d'alerte stock faible
this.soundService.playLowStockAlert();
```

---

## 🚧 À FINALISER

### 1️⃣ **Uniformisation restante**

#### **POS/Printer** (`src/app/pages/pos-printer/pos-printer.component.html`)
❌ Utilise encore `app-page-header`
→ À remplacer par la structure Reports

#### **Profile** (`src/app/pages/seller/profile/profile.component.html`)
⚠️ Utilise déjà grey-container mais avec `app-page-header`
→ À uniformiser selon Reports

#### **Zoom** (`src/app/pages/zoom/zoom.component.html`)
⚠️ Structure complexe avec filtres et stats mélangés
→ Nécessite refonte complète selon Reports

---

### 2️⃣ **Notifications de stock faible**

#### **Backend : Détection de stock faible**
📍 À implémenter dans le backend NestJS

**Fichier:** `Backend/src/products/products.service.ts`

**Logique à ajouter:**
```typescript
// Vérifier les stocks faibles lors de la mise à jour du stock
async checkLowStock(productId: string): Promise<void> {
  const product = await this.productModel.findById(productId);

  if (product.quantity <= product.minStock) {
    // Créer une notification
    await this.notificationService.create({
      title: 'Alerte Stock Faible',
      message: `Le produit "${product.name}" est en rupture de stock. Stock actuel: ${product.quantity}, Stock minimum: ${product.minStock}`,
      type: 'warning',
      recipientId: 'SUPER_ADMIN_ID', // Envoyer au super admin
      read: false
    });
  }
}

// Appeler cette méthode après chaque vente ou mise à jour de stock
```

**Endpoint à créer:**
```typescript
@Get('low-stock')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superadmin')
async getLowStockProducts() {
  return this.productsService.getLowStockProducts();
}
```

#### **Frontend : Intégration du son**
📍 À intégrer dans `src/app/core/services/notification.service.ts`

**Modifications à apporter:**
```typescript
import { NotificationSoundService } from './notification-sound.service';

constructor(
  private http: HttpClient,
  private soundService: NotificationSoundService
) {}

loadNotifications(): void {
  this.http.get<Notification[]>(`${this.apiUrl}/notifications`).subscribe({
    next: (notifications) => {
      // Vérifier si nouvelle notification de type warning (stock faible)
      const previousNotifications = this._notifications.getValue();
      const newWarnings = notifications.filter(n =>
        !n.read &&
        n.type === 'warning' &&
        !previousNotifications.some(prev => prev.id === n.id)
      );

      // Jouer le son si nouvelle alerte stock faible
      if (newWarnings.length > 0) {
        this.soundService.playLowStockAlert();
      }

      this._notifications.next(notifications);
    }
  });
}
```

#### **Polling automatique des notifications**
📍 À ajouter dans `src/app/app.component.ts`

**Code à ajouter:**
```typescript
export class AppComponent implements OnInit, OnDestroy {
  private notificationService = inject(NotificationService);
  private destroy$ = new Subject<void>();

  ngOnInit(): void {
    // Vérifier les notifications toutes les 30 secondes
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.notificationService.loadNotifications();
      });

    // Charger les notifications au démarrage
    this.notificationService.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
```

---

## 📝 **CARTES STATISTIQUES - STANDARD**

### **Structure HTML**
```html
<div class="bg-gradient-to-br from-{color}-50 to-{color}-100 p-4 rounded-xl border border-{color}-200 shadow-sm">
  <div class="flex items-center justify-between">
    <div>
      <p class="text-sm text-{color}-600 font-medium">Label</p>
      <p class="text-2xl font-bold text-{color}-900 mt-1">Valeur</p>
    </div>
    <div class="p-3 bg-{color}-500 rounded-lg text-white">
      <ng-icon name="icon" size="24" class="text-white"></ng-icon>
    </div>
  </div>
</div>
```

### **Palette de couleurs**
| Usage | Couleur | Exemple |
|-------|---------|---------|
| Succès | `green-*` | Sessions actives, confirmations |
| Info | `blue-*` | Notifications |
| Attention | `yellow-*` | Demandes en attente |
| Erreur | `red-*` | Alertes critiques |
| Primaire | `teal-*` | Actions principales |
| Neutre | `gray-*` | Stats secondaires |

---

## 🎯 **PROCHAINES ÉTAPES**

### **Priorité 1 : Notifications stock faible**
1. ✅ Service de son créé
2. ⏳ Implémenter détection backend
3. ⏳ Intégrer le son dans NotificationService
4. ⏳ Ajouter polling automatique

### **Priorité 2 : Finaliser uniformisation**
1. ⏳ Uniformiser POS/Printer selon Reports
2. ⏳ Uniformiser Profile selon Reports
3. ⏳ Refactoriser Zoom selon Reports

### **Priorité 3 : Optimisations**
1. Créer un composant `app-stat-card` partagé
2. Créer une classe CSS `.grey-container` globale
3. Tester sur mobile (responsive)

---

## 📚 **RESSOURCES**

### **Fichiers modifiés**
- `src/app/pages/dashboard/dashboard.component.html` ✅
- `src/app/pages/dashboard/dashboard.component.ts` ✅
- `src/app/pages/sessions-admin/sessions-admin.component.html` ✅
- `src/app/pages/sessions-admin/sessions-admin.component.ts` ✅
- `src/app/pages/notifications/notifications.component.html` ✅
- `src/app/pages/notifications/notifications.component.ts` ✅
- `src/app/pages/messages/messages.component.html` ✅
- `src/app/pages/messages/messages.component.ts` ✅
- `src/app/pages/zoom/zoom.component.html` ✅ (partiel)
- `src/app/components/pos-header/pos-header.component.html` ✅ (déjà conforme)
- `src/app/components/pos-header/pos-header.component.ts` ✅ (déjà conforme)

### **Fichiers créés**
- `src/app/core/services/notification-sound.service.ts` ✅

---

## 💡 **NOTES IMPORTANTES**

1. **Son de notification** : Actuellement utilise un son Data URL. Pour un meilleur son :
   - Téléchargez un fichier .mp3 dans `/assets/sounds/notification.mp3`
   - Remplacez `this.audio.src = this.generateBeepSound()` par `this.audio.src = '/assets/sounds/notification.mp3'`

2. **Permissions navigateur** : Les sons nécessitent une interaction utilisateur pour fonctionner (clic, toucher). Le son ne jouera pas automatiquement sans interaction préalable.

3. **Backend** : La détection de stock faible doit être implémentée côté serveur pour être fiable et temps réel.

4. **WebSockets** : Pour des notifications vraiment temps réel, considérez l'utilisation de WebSockets au lieu du polling HTTP.

---

**Document créé le :** 2025-11-18
**Par :** Claude Code Assistant
**Version :** 1.0
