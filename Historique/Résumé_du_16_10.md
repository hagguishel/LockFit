# 🔐 Sprint — Déconnexion (Logout)

## 🎯 Objectif
Permettre à un utilisateur connecté de **se déconnecter proprement** :
- Révoquer le **refresh token** dans la base de données.
- Empêcher toute réutilisation du token révoqué.
- Nettoyer le **cookie** (si utilisé côté web).
- Répondre sans erreur même si le token est déjà expiré ou révoqué (idempotence).

---

## ⚙️ Fichiers modifiés

### 1. `prisma/schema.prisma`

```prisma
model RefreshToken {
  id             String       @id @default(cuid())
  utilisateurId  String
  tokenHash      String

  jti            String       @unique
  expiresAt      DateTime

  revoked        Boolean      @default(false)
  revokedAt      DateTime?

  userAgent      String?
  ip             String?
  createdAt      DateTime     @default(now())

  utilisateur    Utilisateur  @relation(fields: [utilisateurId], references: [id])

  @@index([utilisateurId, revoked])
  @@index([expiresAt])
  @@map("refresh_tokens")
}
```

✅ **Pourquoi ces champs :**
- `jti` : identifiant unique du token (dans le JWT).
- `expiresAt` : date d’expiration du refresh.
- `revoked` / `revokedAt` : statut et date de révocation.
- `tokenHash` : hash sécurisé du refresh token.
- `utilisateurId` : lien avec le propriétaire du token.

---

### 2. `src/auth/auth.service.ts`

Méthode de **déconnexion sécurisée et idempotente** :

```ts
async logout(userId: string, authzHeader: string) {
  const rawRefreshToken = FromAuthz(authzHeader);
  if (!rawRefreshToken) return { message: 'Déconnexion réussie' };

  try {
    const payload = this.jwt.verify(rawRefreshToken, {
      secret: process.env.JWT_REFRESH_SECRET,
    }) as { jti: string; sub: string };

    await this.prisma.refreshToken.updateMany({
      where: { jti: payload.jti, utilisateurId: payload.sub, revoked: false },
      data: { revoked: true, revokedAt: new Date() },
    });
  } catch {
    // Si le token est expiré ou invalide, on ne lève pas d'erreur.
    // (le token est déjà inutilisable)
  }

  return { message: 'Déconnexion réussie' };
}
```

✅ **Ce que fait cette méthode :**
- Vérifie le token (`jwt.verify`).
- Révoque en base via le `jti` et le `userId`.
- Marque `revoked = true` et ajoute `revokedAt`.
- Ne plante jamais si le token est invalide/expiré → **idempotent**.

---

### 3. `src/auth/auth.controller.ts`

Endpoint `/api/v1/auth/logout` :

```ts
@Post('logout')
@UseGuards(AuthGuard('jwt-refresh')) // le refresh est vérifié ici
@HttpCode(204)
async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
  const authz = (req.headers['authorization'] as string) || '';
  const { sub } = req.user as any;

  await this.authService.logout(sub, authz);

  // (Optionnel, si cookie httpOnly côté web)
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: true,   // true en prod (HTTPS)
    sameSite: 'lax',
    path: '/',
  });
}
```

✅ **Détails :**
- `AuthGuard('jwt-refresh')` valide le refresh token avant la révocation.
- Appelle la méthode `logout()` du service.
- Vide le cookie côté navigateur si utilisé.
- Retourne un **code HTTP 204 No Content** (standard pour un logout).

---

## 🧪 Tests manuels

### 1. Logout classique
```bash
curl -i -X POST http://localhost:3000/api/v1/auth/logout   -H "Authorization: Bearer <REFRESH_JWT>"
# ✅ Attendu : HTTP/1.1 204 No Content
```

### 2. Déjà révoqué / expiré
```bash
curl -i -X POST http://localhost:3000/api/v1/auth/logout   -H "Authorization: Bearer <même_token>"
# ✅ Toujours HTTP/1.1 204 No Content
# (aucune erreur, idempotent)
```

### 3. Sans header
```bash
curl -i -X POST http://localhost:3000/api/v1/auth/logout
# ❌ 401 Unauthorized (guard jwt-refresh)
```

---

## 🧼 Maintenance (optionnel)

### Suppression périodique des tokens expirés
```ts
await this.prisma.refreshToken.deleteMany({
  where: { expiresAt: { lt: new Date() } },
});
```

### Ajout `revokedAt` aussi dans la rotation (refresh)
```ts
await this.prisma.refreshToken.update({
  where: { id: storedToken.id },
  data: { revoked: true, revokedAt: new Date() },
});
```

---

## ✅ Résumé final

| Élément | Statut | Description |
|----------|---------|-------------|
| **Modèle Prisma** | ✅ | Ajout de `jti`, `expiresAt`, `revoked`, `revokedAt` |
| **Service logout** | ✅ | Révocation sécurisée via `jti` |
| **Contrôleur logout** | ✅ | Endpoint `/api/v1/auth/logout` (204 No Content) |
| **Guard `jwt-refresh`** | ✅ | Vérifie le refresh token avant logout |
| **Cron nettoyage** | 🟡 | Optionnel (supprimer tokens expirés) |

---

## 💡 Points forts
- **Sécurité** : tokens révoqués ne sont plus réutilisables.  
- **Simplicité** : 1 seule requête, 0 erreur côté client.  
- **Évolutif** : gère facilement la rotation, multi-appareils, logs d’activité.  
- **Standard REST** : `POST /api/v1/auth/logout` → **204 No Content**.

---

## 🚀 Prochaines étapes (Sprint suivant)
- Implémenter la **connexion complète** (ton collègue).  
- Ajouter la **réinitialisation du mot de passe (US-ACCT-04)**.  
- Intégrer la **déconnexion côté front** (suppression du refresh + redirection vers login).

---

_Fait avec ❤️ par l’équipe LockFit — Sprint 3 : Authentification & Sécurité_
