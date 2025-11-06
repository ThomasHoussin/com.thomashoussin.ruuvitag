# Contributing to RuuviTag Homey App

Merci de votre intérêt pour contribuer à cette app Homey pour RuuviTag ! 🎉

## Comment contribuer

### Signaler un bug

1. Vérifiez d'abord que le bug n'a pas déjà été signalé dans les [issues existantes](https://github.com/ThomasHoussin/com.thomashoussin.ruuvitag/issues)
2. Créez une nouvelle issue en utilisant le template "Bug Report"
3. Remplissez toutes les informations demandées (modèle RuuviTag, version app, logs, etc.)
4. Notre bot Claude analysera automatiquement votre issue et pourra :
   - Identifier un problème connu et fournir une solution
   - Demander des informations complémentaires
   - Confirmer qu'il s'agit d'un nouveau bug

### Proposer une fonctionnalité

1. Vérifiez d'abord si la fonctionnalité n'a pas déjà été demandée
2. Créez une nouvelle issue en utilisant le template "Feature Request"
3. Décrivez clairement le problème que vous souhaitez résoudre
4. Expliquez votre solution proposée et les alternatives envisagées

### Contribuer du code

#### Prérequis

- Node.js (version recommandée : LTS)
- Homey CLI installé : `npm install -g homey`
- Un Homey physique pour tester (SDK v3 ne supporte pas l'émulateur)
- Git configuré

#### Setup

```bash
# Cloner le repository
git clone https://github.com/ThomasHoussin/com.thomashoussin.ruuvitag.git
cd com.thomashoussin.ruuvitag

# Installer les dépendances
npm install

# Builder l'app
homey app build

# Valider la structure
homey app validate
```

#### Workflow de développement

1. **Créer une branche**
   ```bash
   git checkout -b feature/ma-fonctionnalite
   # ou
   git checkout -b fix/mon-correctif
   ```

2. **Faire vos modifications**
   - ⚠️ **IMPORTANT** : Éditer uniquement dans `.homeycompose/`, jamais `app.json` directement
   - Suivre les standards de code (voir CLAUDE.md)
   - Utiliser ESM (import/export, pas require)
   - Indentation : 2 espaces

3. **Builder après chaque modification**
   ```bash
   homey app build
   ```

4. **Valider**
   ```bash
   homey app validate
   ```

5. **Tester sur Homey réel**
   ```bash
   homey app run
   ```

6. **Commit**
   ```bash
   git add .
   git commit -m "Description claire du changement"
   ```

7. **Push et créer une Pull Request**
   ```bash
   git push origin feature/ma-fonctionnalite
   ```
   Puis créez une PR sur GitHub vers la branche `main`

#### Standards de code

Référez-vous à [CLAUDE.md](CLAUDE.md) pour :
- Standards de code détaillés
- Architecture du projet
- Gestion des erreurs
- Problèmes courants et solutions
- Guide de débogage

Points essentiels :
- **ESM uniquement** : `import`/`export`, pas de `require`
- **Indentation** : 2 espaces
- **Async/Await** : Préféré aux Promises
- **Error handling** : Toujours utiliser try/catch
- **Logging** : `this.log()` pour debug, `this.error()` pour erreurs

#### Tests

Avant de soumettre une PR :

1. ✅ Builder avec succès : `homey app build`
2. ✅ Valider : `homey app validate`
3. ✅ Tester sur Homey réel avec les 2 drivers (si applicable) :
   - Driver BLE Direct
   - Driver RuuviGateway
4. ✅ Tester avec différents formats de données (si applicable) :
   - Format 3 (RAWv1)
   - Format 5 (RAWv2)
5. ✅ Vérifier les logs Homey pour les erreurs

### Structure du projet

```
.homeycompose/          # ⚠️ ÉDITER ICI
├── app.json           # Configuration app
├── capabilities/      # Capabilities custom
└── flow/             # Flow cards et triggers

drivers/
├── ruuvitag/         # Driver BLE
│   ├── driver.js     # Polling BLE partagé
│   └── device.js     # Logique par device
└── gateway/          # Driver Gateway
    ├── driver.js     # Découverte mDNS
    └── device.js     # Polling HTTP

lib/
└── function.js       # Parser protocole RuuviTag

app.json              # ⚠️ GÉNÉRÉ - NE PAS ÉDITER
```

### Pull Request Guidelines

Votre PR devrait :

1. **Avoir un titre clair** décrivant le changement
2. **Référencer une issue** si applicable : "Fixes #123"
3. **Décrire les changements** :
   - Quel problème est résolu ?
   - Quelle solution est implémentée ?
   - Y a-t-il des breaking changes ?
4. **Inclure des détails de tests** :
   - Comment avez-vous testé ?
   - Quel matériel avez-vous utilisé ?
   - Quels scénarios avez-vous couverts ?

### Besoin d'aide ?

- 📖 Consultez [CLAUDE.md](CLAUDE.md) pour le guide complet
- 💬 Posez vos questions dans les [GitHub Issues](https://github.com/ThomasHoussin/com.thomashoussin.ruuvitag/issues)
- 🏘️ Rejoignez le [Homey Community Forum](https://community.homey.app/t/39495)

### Code de conduite

- Soyez respectueux et constructif
- Accueillez les nouveaux contributeurs
- Concentrez-vous sur les améliorations
- Signalez tout comportement inapproprié

### Ressources

- [Homey SDK v3 Documentation](https://apps-sdk-v3.developer.homey.app/)
- [RuuviTag Specifications](https://docs.ruuvi.com/)
- [RuuviTag Protocol Specs](https://github.com/ruuvi/ruuvi-sensor-protocols)

## Licence

En contribuant, vous acceptez que vos contributions soient sous la même licence que le projet.

---

Merci pour votre contribution ! 🚀
