# Console des licences QPM — exploitation

Console web de QUOREICH GROUP SARL pour gérer les clients, le catalogue des plans et les licences QPM. Elle est servie par l’autorité de licences elle-même (`/`, API `/console-api/**`).

## Accès par tunnel SSH (disponible tout de suite)

Le service n’écoute que sur `127.0.0.1:8081` du VPS. Depuis votre poste :

```bash
ssh -N -L 8081:127.0.0.1:8081 abdouramane@169.58.86.7
```

puis ouvrez **http://localhost:8081** dans le navigateur. Les navigateurs acceptent le cookie de session sécurisé sur `localhost`.

## Premier compte administrateur

Une seule fois, sur le VPS (le jeton est `LICENSE_ADMIN_TOKEN` du fichier `license-authority/.env`, ne pas l’afficher dans un terminal partagé) :

```bash
cd ~/Projet/cmms/license-authority
read -rsp "Mot de passe (12 caractères min.) : " QPM_PWD; echo
curl -s -X POST http://127.0.0.1:8081/admin/console-users \
  -H "Authorization: Bearer $(grep '^LICENSE_ADMIN_TOKEN=' .env | cut -d= -f2-)" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"vous@quoreichgroup.bf\",\"displayName\":\"Votre nom\",\"role\":\"ADMIN\",\"password\":\"$QPM_PWD\"}"
unset QPM_PWD
```

À la première connexion, la console demande d’enregistrer une application d’authentification (Google Authenticator, Microsoft Authenticator, FreeOTP…). Les comptes suivants (commerciaux, autres administrateurs) se créent ensuite depuis **Comptes**.

## Rôles

| Action | Administrateur | Commercial |
| --- | :-: | :-: |
| Tableau de bord, clients, licences, historique | ✓ | ✓ |
| Créer / modifier un client | ✓ | ✓ |
| Émettre une licence depuis un plan du catalogue | ✓ | ✓ |
| Renouveler, modifier les places | ✓ | ✓ |
| Droits hors plan, suspendre, reprendre, révoquer, désactiver une installation | ✓ | — |
| Catalogue des plans, comptes | ✓ | — |

Chaque action est enregistrée avec l’e-mail de son auteur.

## Sécurité

- Mot de passe (BCrypt, 12 caractères minimum) **et** code d’application d’authentification, obligatoires pour tous les comptes.
- Blocage 15 minutes après 5 échecs (mot de passe ou code).
- Session serveur : 8 h maximum, fermée après 30 min d’inactivité, jeton renouvelé après la vérification en deux étapes, cookie `HttpOnly`, `Secure`, `SameSite=Strict`.
- En-tête obligatoire `X-QPM-Console` sur les requêtes de modification (protection CSRF), CSP stricte, pas d’intégration dans un cadre.
- Le jeton administrateur (`/admin/**`) reste réservé aux scripts d’exploitation.

## Accès Internet (à activer)

Prérequis : un enregistrement DNS `licences.quoreichgroup.bf` (ou autre) vers `169.58.86.7`.

Ensuite, Caddy (pile QPM) doit joindre le service et **n’exposer que la console** — jamais `/admin/**` (jeton opérateur) ni `/v1/**` (activation des instances) :

```caddy
licences.quoreichgroup.bf {
	encode zstd gzip
	@console path / /index.html /console/* /fonts/* /console-api/*
	handle @console {
		reverse_proxy license-authority:8080
	}
	handle {
		respond 404
	}
}
```

et un réseau Docker partagé entre `caddy` et `license-authority` (par exemple `qpm-licence-console`, déclaré `external` dans les deux fichiers Compose). Les instances QPM installées chez des clients et qui doivent s’activer depuis Internet nécessiteraient en plus d’exposer `/v1/activate` : décision à prendre séparément.

## Catalogue et compatibilité QPM

- Le catalogue (`EntitlementCatalog.java`) reprend les 33 droits historiques de QPM et 7 modules : achats, circuits d’approbation, listes de tâches, stratégies préventives, modèles de documents, concepteur visuel, multi-sites.
- Les licences émises depuis la console portent `catalogVersion = 2` dans le bail signé : QPM restreint alors ces modules aux droits de la licence.
- Les licences antérieures (`catalogVersion` absent = 1), les instances sans licence QUOREICH et le mode aperçu gardent tous les modules : aucune régression pour les clients existants.
- Sans le droit d’un module, QPM refuse les créations et modifications (`license_entitlement_required`) mais laisse consulter les données existantes.
