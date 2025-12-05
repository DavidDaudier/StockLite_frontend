# 📋 Architecture - Gestion des Demandes de Suppression

## 🎯 Vue d'ensemble

Ce document décrit l'architecture complète du système de gestion des demandes de suppression de ventes dans l'application StockLite.

---

## 🏗️ Architecture Frontend

### 1. Composant Principal: `messages.component`

#### Structure des Fichiers
```
src/app/pages/messages/
├── messages.component.html      # Template avec filtres, tableau et modale
├── messages.component.ts        # Logique métier et gestion d'état
├── messages.component.css       # Styles personnalisés (optionnel)
```

#### État du Composant (Signals)

```typescript
// Données
requests = signal<DeletionRequest[]>([])           // Toutes les demandes
filteredRequests = signal<DeletionRequest[]>([])   // Demandes filtrées
selectedRequest = signal<DeletionRequest | null>(null)
selectedStatus = signal<string>('all')             // Filtre actif
loading = signal(false)
showStats = signal<boolean>(true)

// Interface
expandedRequestId = signal<string | null>(null)    // Ligne déroulée

// Modale
showModal = signal(false)
modalAction = signal<'approve' | 'reject' | 'delete' | null>(null)
responseDescription = ''                            // Raison du rejet
submitting = signal(false)
```

#### Computed Properties (Badges)

```typescript
totalCount = computed(() => this.requests().length)
pendingCount = computed(() => this.requests().filter(...).length)
approvedCount = computed(() => this.requests().filter(...).length)
rejectedCount = computed(() => this.requests().filter(...).length)
```

---

## 🎨 Interface Utilisateur

### 1. Filtres avec Badges

Affichage horizontal centré avec 4 boutons :

| Filtre | Badge | Couleur | État actif |
|--------|-------|---------|------------|
| **Tous** | Nombre total | Teal | `bg-teal-600` |
| **En attente** | Pending count | Yellow | `bg-yellow-600` |
| **Approuvées** | Approved count | Green | `bg-green-600` |
| **Rejetées** | Rejected count | Red | `bg-red-600` |

**Code HTML:**
```html
<button (click)="filterByStatus('all')" [class]="...">
  <span>Tous</span>
  <span class="badge">{{ totalCount() }}</span>
</button>
```

---

### 2. Tableau Style Reports

**Colonnes:**
1. **Icône dérouler** - Arrow pour expand/collapse
2. **#** - Numéro de vente (`#{{ saleTicketNo }}`)
3. **Vendeur** - Nom du vendeur
4. **Date** - Date de création formatée
5. **Motifs** - Badge avec nombre de motifs
6. **Statut** - Badge coloré (pending/approved/rejected)
7. **Action** - Bouton "Répondre"

**Ligne déroulable (expandable):**
- Motifs détaillés (pills)
- Description complète
- Raison du rejet (si applicable)

**État:**
```typescript
expandedRequestId = signal<string | null>(null)

toggleRequestDetails(requestId: string): void {
  if (this.expandedRequestId() === requestId) {
    this.expandedRequestId.set(null)  // Fermer
  } else {
    this.expandedRequestId.set(requestId)  // Ouvrir
  }
}
```

---

### 3. Modale de Réponse

#### Structure

```
┌─────────────────────────────────────────┐
│  🎯 Header (Gradient teal)              │
│  "Répondre à la demande"          [X]   │
├─────────────────────────────────────────┤
│  📊 Informations                        │
│  ├─ Numéro vente                        │
│  ├─ Vendeur                             │
│  ├─ Date                                │
│  ├─ Statut                              │
│  ├─ Motifs (pills)                      │
│  └─ Description                         │
├─────────────────────────────────────────┤
│  ✍️ Zone de réponse (textarea)         │
│  "Optionnel - uniquement pour rejet"   │
├─────────────────────────────────────────┤
│  🎬 Actions                             │
│  [Fermer] [Rejeter] [Supprimer*] [Approuver] │
└─────────────────────────────────────────┘

* Supprimer visible uniquement si status === 'approved'
```

#### Actions Disponibles

| Bouton | Couleur | Condition | Icône |
|--------|---------|-----------|-------|
| **Fermer** | Gris | Toujours | - |
| **Rejeter** | Rouge | status === 'pending' | `hugeCancel02` |
| **Supprimer** | Orange | status === 'approved' | `hugeDelete03` |
| **Approuver** | Vert | status === 'pending' | `hugeCheckmarkCircle02` |

---

## ⚙️ Logique Métier

### 1. Approuver une Demande ✅

**Fonction:** `handleApprove()`

**Workflow:**
```
1. Vérifier: status === 'pending'
2. Confirmer l'action (popup)
3. Appeler: deletionRequestService.approveRequest(id)
4. Backend:
   - Supprimer la vente de sales (soft delete ou hard delete)
   - Mettre à jour status → 'approved'
   - Archiver dans table deletion_requests_archive
5. Frontend:
   - Fermer la modale
   - Recharger la liste
   - Afficher message de succès
```

**Résultat:**
- ✅ Vente supprimée de l'historique (seller, admin, super admin)
- ✅ Demande archivée (visible super admin)
- ✅ Vendeur notifié

---

### 2. Rejeter une Demande ❌

**Fonction:** `handleReject()`

**Workflow:**
```
1. Vérifier: status === 'pending'
2. Récupérer la description (optionnelle)
3. Confirmer l'action
4. Appeler: deletionRequestService.rejectRequest(id, reason)
5. Backend:
   - Mettre à jour status → 'rejected'
   - Enregistrer rejectionReason
   - Conserver la vente dans sales
6. Frontend:
   - Fermer la modale
   - Recharger la liste
   - Afficher message
```

**Résultat:**
- ✅ Vente conservée dans l'historique
- ✅ Demande marquée comme rejetée
- ✅ Raison visible par le vendeur

---

### 3. Supprimer une Demande 🗑️

**Fonction:** `handleDelete()`

**Workflow:**
```
1. Vérifier: status === 'approved'
2. Confirmer l'action (popup WARNING)
3. Appeler: deletionRequestService.deleteRequest(id)
4. Backend:
   - Supprimer définitivement de deletion_requests
   - Action irréversible
5. Frontend:
   - Fermer la modale
   - Recharger la liste
   - Afficher confirmation
```

**Résultat:**
- 🗑️ Demande supprimée définitivement
- ⚠️ Action irréversible

---

## 📡 Service: `DeletionRequestService`

### Méthodes Disponibles

```typescript
// Chargement
loadRequests(): void
getAllRequests(): DeletionRequest[]
getPendingRequests(): DeletionRequest[]
getPendingRequestForSale(saleId: string): DeletionRequest | undefined
getRequestById(id: string): DeletionRequest | undefined

// Création
createRequest(dto: CreateDeletionRequestDto): Observable<DeletionRequest>

// Mise à jour
updateRequestStatus(id: string, dto: UpdateDeletionRequestStatusDto): Observable<DeletionRequest>
approveRequest(id: string): Observable<DeletionRequest>
rejectRequest(id: string, reason: string): Observable<DeletionRequest>
cancelRequest(id: string): Observable<DeletionRequest>

// Suppression
deleteRequest(id: string): Observable<void>
```

### Observable Pattern

```typescript
private requestsSubject = new BehaviorSubject<DeletionRequest[]>([])
public requests$ = this.requestsSubject.asObservable()

// Le composant s'abonne:
this.deletionRequestService.requests$
  .pipe(takeUntil(this.destroy$))
  .subscribe(() => {
    this.loadRequests()
  })
```

---

## 🗄️ Modèle de Données

### Interface `DeletionRequest`

```typescript
interface DeletionRequest {
  id: string                           // UUID
  saleId: string                       // Référence à la vente
  saleTicketNo: string                 // Numéro de ticket
  sellerId: string                     // ID du vendeur
  sellerName: string                   // Nom du vendeur
  reasons: DeletionReason[]            // Motifs multiples
  description: string                  // Description du vendeur
  status: DeletionRequestStatus        // pending | approved | rejected | cancelled
  rejectionReason?: string             // Raison du rejet (si applicable)
  createdAt: string                    // ISO date
  updatedAt: string                    // ISO date
}
```

### Enum `DeletionReason`

```typescript
enum DeletionReason {
  WRONG_PRODUCT = 'WRONG_PRODUCT',      // Mauvais produit
  WRONG_QUANTITY = 'WRONG_QUANTITY',    // Mauvaise quantité
  WRONG_PRICE = 'WRONG_PRICE',          // Mauvais prix
  WRONG_CUSTOMER = 'WRONG_CUSTOMER',    // Mauvais client
  DUPLICATE = 'DUPLICATE',              // Vente en double
  PAYMENT_ISSUE = 'PAYMENT_ISSUE',      // Problème de paiement
  OTHER = 'OTHER'                       // Autre
}
```

### Enum `DeletionRequestStatus`

```typescript
enum DeletionRequestStatus {
  PENDING = 'pending',        // En attente
  APPROVED = 'approved',      // Approuvée
  REJECTED = 'rejected',      // Rejetée
  CANCELLED = 'cancelled'     // Annulée
}
```

---

## 🎨 Design System

### Couleurs

| Statut | Background | Text | Border |
|--------|-----------|------|--------|
| **Pending** | `bg-yellow-100` | `text-yellow-800` | `border-yellow-200` |
| **Approved** | `bg-green-100` | `text-green-800` | `border-green-200` |
| **Rejected** | `bg-red-100` | `text-red-800` | `border-red-200` |
| **Cancelled** | `bg-gray-100` | `text-gray-800` | `border-gray-200` |

### Icônes (`@ng-icons/huge-icons`)

```typescript
import {
  hugeMessageDelay02,      // Demandes
  hugeCheckmarkCircle02,   // Approuver
  hugeCancel02,            // Rejeter
  hugeDelete03,            // Supprimer
  hugeArrowDown02,         // Expand
  hugeArrowRightDouble,    // Collapse
  hugeEye,                 // Toggle visible
  hugeViewOff,             // Toggle caché
  hugeCancel01             // Fermer modale
} from '@ng-icons/huge-icons'
```

---

## 🔐 Permissions & Sécurité

### Rôles Autorisés

- **Super Admin** : Toutes les actions
- **Admin** : Approuver, Rejeter
- **Seller** : Créer des demandes uniquement

### Guards

```typescript
// Route protégée
{
  path: 'messages',
  component: MessagesComponent,
  canActivate: [AuthGuard, AdminGuard]
}
```

---

## 🔄 Flux de Données

```
┌─────────────┐
│   Seller    │
│  Soumet     │
│  demande    │
└──────┬──────┘
       │
       ▼
┌─────────────────────┐
│  Backend API        │
│  POST /deletion-    │
│       requests      │
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐      ┌──────────────┐
│  Admin Dashboard    │◄─────│  WebSocket   │
│  Reçoit             │      │  (optionnel) │
│  notification       │      └──────────────┘
└──────┬──────────────┘
       │
       ▼
┌─────────────────────┐
│  Admin examine      │
│  - Filtres          │
│  - Tableau          │
│  - Modale           │
└──────┬──────────────┘
       │
       ├───► Approuver ──► Supprime vente
       │
       ├───► Rejeter ───► Garde vente + notifie
       │
       └───► Supprimer ─► Archive définitive
```

---

## 📊 Statistiques & Reporting

### Métriques Affichées

1. **Total** : Toutes les demandes
2. **En attente** : Nécessitent une action
3. **Approuvées** : Ventes supprimées
4. **Rejetées** : Conservées

### Visualisation

```typescript
// Card avec toggle visibility
@if (showStats()) {
  <div class="stats-card">
    <span class="label">Demandes en Attente</span>
    <span class="value">{{ pendingCount() }}</span>
  </div>
}
```

---

## 🚀 Optimisations & Performance

### 1. Pagination (Future)

```typescript
// Ajouter pagination pour grandes listes
paginatedRequests = computed(() => {
  const start = (currentPage() - 1) * pageSize()
  const end = start + pageSize()
  return filteredRequests().slice(start, end)
})
```

### 2. Virtual Scrolling (CDK)

```html
<cdk-virtual-scroll-viewport itemSize="80">
  <tr *cdkVirtualFor="let request of filteredRequests()">
    ...
  </tr>
</cdk-virtual-scroll-viewport>
```

### 3. Debounce sur Recherche

```typescript
searchTerm = signal('')

filteredBySearch = computed(() => {
  const term = searchTerm().toLowerCase()
  return filteredRequests().filter(r =>
    r.saleTicketNo.includes(term) ||
    r.sellerName.toLowerCase().includes(term)
  )
})
```

---

## 🧪 Tests

### Tests Unitaires

```typescript
describe('MessagesComponent', () => {
  it('should filter by status', () => {
    component.filterByStatus('pending')
    expect(component.selectedStatus()).toBe('pending')
    expect(component.filteredRequests()).toHaveLength(3)
  })

  it('should toggle request details', () => {
    component.toggleRequestDetails('id-1')
    expect(component.expandedRequestId()).toBe('id-1')
    component.toggleRequestDetails('id-1')
    expect(component.expandedRequestId()).toBeNull()
  })
})
```

---

## 📝 Notes Importantes

### ⚠️ Points d'Attention

1. **Approuver = Supprimer vente**
   - Action irréversible sur la vente
   - Demande archivée visible super admin

2. **Rejeter = Conserver vente**
   - Vente reste dans l'historique
   - Vendeur peut soumettre nouvelle demande

3. **Supprimer demande ≠ Supprimer vente**
   - Supprime la demande elle-même
   - Disponible uniquement si déjà approuvée

### 🔮 Améliorations Futures

1. **Notifications temps réel** (WebSocket)
2. **Historique des actions** (Audit trail)
3. **Export CSV/PDF** des demandes
4. **Commentaires** sur les demandes
5. **Workflow multi-niveaux** (validation manager)

---

## 📚 Ressources

- **Angular Signals**: https://angular.dev/guide/signals
- **Tailwind CSS**: https://tailwindcss.com/docs
- **ng-icons**: https://ng-icons.github.io/ng-icons
- **RxJS Patterns**: https://rxjs.dev/guide/operators

---

## 👥 Contacts

- **Développeur**: Claude Code Assistant
- **Date**: 19 Novembre 2025
- **Version**: 1.0.0

---

**Document créé pour**: StockLite - Application de gestion de ventes
