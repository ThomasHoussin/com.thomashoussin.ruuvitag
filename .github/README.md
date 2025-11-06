# GitHub Configuration pour RuuviTag Homey App

Ce dossier contient la configuration GitHub Actions et les templates d'issues pour l'automatisation du projet.

## 📋 Vue d'ensemble

### Workflows (.github/workflows/)

1. **codeql-analysis.yml** - Analyse de sécurité
   - Scan automatique des vulnérabilités
   - Déclenché sur push/PR vers `main`
   - Actif par défaut, pas de configuration nécessaire

2. **issue-management.yml** - Gestion automatique des issues avec Claude
   - Analyse automatique des nouvelles issues
   - Répond avec solutions pour problèmes connus
   - Demande informations complémentaires si nécessaire
   - Catégorise et labellise les issues
   - **Nécessite configuration** (voir ci-dessous)

### Templates d'issues (.github/ISSUE_TEMPLATE/)

1. **bug_report.yml** - Rapport de bug structuré
   - Collecte informations essentielles (modèle RuuviTag, driver, versions)
   - Format guidé pour faciliter le diagnostic
   - Utilisé automatiquement lors de la création d'une issue

2. **feature_request.yml** - Demande de fonctionnalité
   - Structure la demande avec cas d'usage
   - Identifie les drivers et formats concernés
   - Facilite l'évaluation de la faisabilité

## 🚀 Activation du workflow Claude

### Étape 1 : Obtenir le token OAuth

1. Aller sur : https://claude.ai/oauth/github
2. Se connecter avec votre compte Claude
3. Autoriser l'accès pour le repository `ThomasHoussin/com.thomashoussin.ruuvitag`
4. Copier le token OAuth généré

### Étape 2 : Configurer le secret GitHub

**Option A : Via l'interface GitHub**

1. Aller sur : https://github.com/ThomasHoussin/com.thomashoussin.ruuvitag/settings/secrets/actions
2. Cliquer sur "New repository secret"
3. Nom : `CLAUDE_CODE_OAUTH_TOKEN`
4. Valeur : Coller le token OAuth de l'étape 1
5. Cliquer sur "Add secret"

**Option B : Via GitHub CLI**

```bash
gh secret set CLAUDE_CODE_OAUTH_TOKEN
# Puis coller le token quand demandé
```

### Étape 3 : Vérifier l'activation

1. Créer une issue test sur GitHub
2. Aller dans l'onglet "Actions" du repository
3. Vérifier qu'un workflow "Claude Issue Auto-Triage" se lance
4. Claude devrait analyser et commenter l'issue automatiquement (en quelques secondes)

## 🔧 Fonctionnement du workflow Claude

Lorsqu'une nouvelle issue est créée, Claude :

1. **Analyse** l'issue en se basant sur CLAUDE.md
2. **Catégorise** :
   - 🔴 Bug connu → fournit la solution
   - 🐛 Nouveau bug → confirme et demande infos si nécessaire
   - ✨ Feature request → remercie et pose questions de clarification
   - ❓ Question support → guide vers la solution
   - ⚠️ Manque d'info → demande précisions avec checklist
3. **Labellise** automatiquement (`bug`, `enhancement`, `question`, `needs-info`, `known-issue`)
4. **Répond** en français avec informations pertinentes

## 🎯 Ce que Claude peut faire

### Problèmes identifiés automatiquement

- ✅ BLE ne détecte pas les RuuviTags (problème de polling)
- ✅ Gateway 401 Unauthorized (token expiré)
- ✅ Valeurs 0xFFFF dans les données (capteur non supporté)
- ✅ Capability non reconnue (oubli de build)
- ✅ App crash au démarrage (import ESM invalide)
- ✅ Différences entre Format 3 et Format 5

### Guidance fournie

- 🔍 Troubleshooting BLE (distance, interférences, polling)
- 🌐 Troubleshooting Gateway (réseau, token, hostname)
- 📊 Format des données RuuviTag
- 🔧 Commandes de debug et logs
- 📝 Standards de code et développement

## 📚 Documentation associée

- [CLAUDE.md](../CLAUDE.md) - Guide complet pour Claude et les développeurs
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Guide de contribution

## 🔒 Sécurité

Le token OAuth Claude :
- ✅ A accès en lecture au code du repository
- ✅ Peut commenter et labelliser les issues
- ✅ Ne peut PAS push de code
- ✅ Ne peut PAS modifier les secrets
- ✅ Est stocké de manière sécurisée dans GitHub Secrets
- ⚠️ Ne pas partager publiquement
- ⚠️ Révoquer et régénérer si compromis

## 🐛 Dépannage

### Le workflow ne se déclenche pas
- Vérifier que le secret `CLAUDE_CODE_OAUTH_TOKEN` est bien configuré
- Vérifier que le workflow est activé dans Settings → Actions
- Vérifier les permissions Actions dans Settings → Actions → General

### Claude ne répond pas
- Vérifier les logs du workflow dans l'onglet Actions
- Le token OAuth est peut-être expiré (régénérer)
- Vérifier que les permissions d'écriture sont activées pour les issues

### Claude demande des infos déjà fournies
- Le template d'issue n'a peut-être pas été utilisé
- Les informations peuvent être ambiguës
- Vérifier que le format de l'issue correspond au template

## 🔄 Maintenance

### Mettre à jour Claude

Claude se met à jour automatiquement via l'action `anthropics/claude-code-action@v1`.

Pour forcer une mise à jour :
1. Modifier le workflow pour utiliser une version spécifique (ex: `@v1.2.3`)
2. Ou attendre que GitHub Actions récupère la dernière version de `@v1`

### Ajuster le comportement de Claude

Éditer le prompt dans [.github/workflows/issue-management.yml](workflows/issue-management.yml) :
- Ajouter de nouveaux problèmes connus
- Modifier le ton des réponses
- Ajouter des checks supplémentaires
- Changer les catégories

Après modification :
1. Commit et push les changements
2. Le workflow sera automatiquement mis à jour
3. Tester avec une nouvelle issue

## 📞 Support

Questions sur la configuration :
- Ouvrir une issue sur le repository
- Consulter la documentation Claude : https://code.claude.com/docs/en/github-actions

---

✨ **Tip** : Une fois configuré, Claude devient un premier niveau de support automatique, libérant du temps pour se concentrer sur les vraies corrections et nouvelles fonctionnalités !
