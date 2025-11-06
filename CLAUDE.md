# CLAUDE.md

Guide pour Claude Code lors du développement de cette app Homey pour capteurs RuuviTag.

## Recherche sémantique

```
mcp__claude-context__search_code with:
- path: D:\code-workspace\Homey\com.thomashoussin.ruuvitag
- query: "votre requête en langage naturel"
```

## Aperçu

App Homey pour capteurs Ruuvi avec support BLE de plusieurs produits et formats de données.

- **Platform**: Homey SDK v3
- **Produits supportés**:
  - RuuviTag (capteur environnemental compact sur pile)
  - Ruuvi Air (moniteur qualité de l'air sur secteur)
  - RuuviGateway (relais HTTP/LAN optionnel)
- **2 Drivers**: BLE direct ou via Gateway HTTP/LAN
- **Module System**: ESM (type: "module" dans package.json)
- **Compatibilité**: Homey >= 12.2.0
- **Repository**: https://github.com/ThomasHoussin/com.thomashoussin.ruuvitag

## Commandes essentielles

```bash
homey app build      # Génère app.json depuis .homeycompose/
homey app validate   # Valide la structure
homey app run        # Lance sur Homey connectée
```

**Important**: Toujours éditer dans `.homeycompose/` puis builder, jamais éditer `app.json` directement.

## Architecture

### Composants clés

**`drivers/ruuvitag/`** - Driver BLE
- `driver.js`: Polling loop partagé pour tous les devices (un seul scan BLE)
- `device.js`: Logique individuelle par RuuviTag
- Événement `refreshDevices` pour démarrer/arrêter le polling

**`drivers/gateway/`** - Driver Gateway
- `driver.js`: Découverte mDNS + pairing avec bearer token
- `device.js`: Polling HTTP indépendant par device vers `http://{hostname}.local/history`
- Ajoute automatiquement `.local` aux hostnames

**`lib/function.js`** - Parser partagé
- Parse buffers format 3 (16 bytes) et format 5 (26 bytes)
- Extraction: température, humidité, pression, batterie, accélération, RSSI, compteurs

### Flux de données

**BLE**: Polling centralisé → scan BLE unique → événement `updateTag` → parsing buffer → update capabilities

**Gateway**: Polling par device → requête HTTP avec token → filtre MAC → parsing hex → update capabilities

### Détection de présence

- `onoff` capability = présence/portée
- TTL décrémenté si device absent
- Triggers: `ruuvitag_entered_range`, `ruuvitag_exited_range`

### Capabilities custom

- `acceleration`: Magnitude 3 axes en g
- `measure_rssi`: Force signal dBm
- `onoff`: Indicateur présence
- `alarm_motion`: Détection mouvement (format 5, delta movement_counter)
- `alarm_battery`: Batterie faible (format 5, reset sequence_counter)

## Points clés pour le dev

### Settings vs Store
- **Settings**: Config utilisateur, persistants
- **Store**: État interne (TTL, compteurs, timestamps)

### Format 3 vs 5
- Format 3: Capteurs basiques uniquement
- Format 5: Ajoute movement_counter, sequence_counter
- Certaines valeurs peuvent être 0xFFFF (capteur non supporté)

### Optimisation BLE
- Un seul scan BLE partagé entre tous les devices
- Polling géré par événements `refreshDevices` lors add/delete devices
- Évite scans simultanés multiples

### Organisation fichiers
```
.homeycompose/        # Source - ÉDITER ICI
├── app.json
├── capabilities/
└── flow/triggers/

drivers/              # Implémentation drivers
lib/function.js       # Parser protocole
app.json              # GÉNÉRÉ - NE PAS ÉDITER
```

## Standards de code et bonnes pratiques

### Modules ESM
- **TOUJOURS** utiliser `import`/`export` (jamais `require`)
- Extensions `.mjs` pour les fichiers principaux
- `"type": "module"` configuré dans package.json
- Imports explicites avec extensions: `import { parse } from './lib/function.js'`

### Style de code
- **Indentation**: 2 espaces (jamais de tabs)
- **Nommage**: camelCase pour variables/fonctions, PascalCase pour classes
- **Async/Await**: Préféré aux Promises chaînées
- **Error handling**: Toujours utiliser try/catch pour les opérations async
- **Logging**: `this.log()` pour debug, `this.error()` pour erreurs

### Gestion des erreurs

**Driver BLE**:
```javascript
try {
  const advertisements = await this.homey.ble.discover();
  // traitement
} catch (err) {
  this.error('BLE scan failed:', err.message);
  // gérer gracieusement sans crash
}
```

**Driver Gateway**:
```javascript
try {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  // traitement
} catch (err) {
  this.error('Gateway request failed:', err.message);
  // retry logic ou fallback
}
```

## Problèmes courants et solutions

### BLE ne détecte pas les RuuviTags
- **Cause**: Polling non démarré ou interval trop long
- **Solution**: Vérifier que `refreshDevices` est émis lors de l'ajout d'un device
- **Debug**: Logger `this.devices` dans le polling loop

### Gateway retourne 401 Unauthorized
- **Cause**: Bearer token incorrect ou expiré
- **Solution**: Re-pairer le device pour obtenir un nouveau token
- **Note**: Token stocké dans `device.store.bearer`

### Valeurs 0xFFFF dans les données
- **Cause**: Capteur non supporté par ce modèle de RuuviTag
- **Solution**: Vérifier avant de mettre à jour les capabilities
```javascript
if (data.temperature !== 0xFFFF) {
  await this.setCapabilityValue('measure_temperature', data.temperature);
}
```

### Capability non reconnue
- **Cause**: Oubli de `homey app build` après modification dans `.homeycompose/`
- **Solution**: Toujours builder après modifications de capabilities/flows

### App crash au démarrage
- **Cause**: Import ESM invalide ou dépendance manquante
- **Solution**: Vérifier les extensions `.js` dans les imports et `npm install`

## Tests et débogage

### Logs en temps réel
```bash
homey app run --clean   # Nettoie les logs précédents
```

### Debug BLE
```javascript
// Dans driver.js
this.log('BLE advertisements found:', advertisements.length);
advertisements.forEach(adv => {
  this.log(`Device: ${adv.localName}, RSSI: ${adv.rssi}, UUID: ${adv.uuid}`);
});
```

### Debug Gateway
```javascript
// Dans device.js
this.log('Gateway response:', {
  status: response.status,
  dataLength: data.tags?.length || 0,
  mac: this.getData().id
});
```

### Test des formats de données
```javascript
// Tester le parser avec des buffers connus
const testBuffer = Buffer.from('0512fc5394c37c0004fffc040cac364200cdcbb8334c884f', 'hex');
const parsed = parse(testBuffer);
this.log('Parsed data:', parsed);
```

## Workflow de développement

### Feature / Bug fix standard
1. **Créer une branche**: `git checkout -b feature/description`
2. **Éditer** dans `.homeycompose/` (jamais `app.json` directement)
3. **Build**: `homey app build` pour générer `app.json`
4. **Valider**: `homey app validate` avant chaque commit
5. **Tester**: `homey app run` sur Homey réelle
6. **Commit**: Messages clairs décrivant les changements
7. **PR**: Vers `main` avec description détaillée

### Workflow de release
1. **Version**: Incrémenter dans `.homeycompose/app.json`
2. **Build & Validate**: `homey app build && homey app validate`
3. **Test complet**: Sur les 2 drivers (BLE + Gateway)
4. **Commit**: `git commit -m "Release vX.Y.Z"`
5. **Tag**: `git tag vX.Y.Z && git push --tags`
6. **Publish**: Via Homey App Store

### GitHub Actions

Le projet utilise GitHub Actions pour l'automatisation. Voir [.github/README.md](.github/README.md) pour la configuration complète.

**CodeQL Analysis**: Analyse de sécurité automatique du code

**Issue Management**: Claude analyse automatiquement les nouvelles issues et fournit une première réponse (catégorisation, solutions aux problèmes connus, demande d'infos complémentaires)

## Dépendances

### Production
- `node-fetch@^3.3.2`: Requêtes HTTP pour Gateway driver (ESM compatible)
- `homey` SDK intégré: API Homey (BLE, capabilities, flows)

### Dev
- `homey@^3.7.12`: CLI Homey pour build/deploy/validate

### Pas de bundler requis
Le code est déployé tel quel sur Homey (pas de webpack/rollup).

## Capabilities RuuviTag

### Standard Homey
- `measure_temperature`: Température en °C (-163.835 à +163.835)
- `measure_humidity`: Humidité relative 0-100%
- `measure_pressure`: Pression atmosphérique en mbar
- `measure_battery`: Niveau batterie en % (calculé depuis voltage)
- `onoff`: Présence/portée du tag

### Custom (définies dans `.homeycompose/capabilities/`)
- `acceleration`: Magnitude vectorielle 3 axes en g
- `measure_rssi`: Force du signal BLE en dBm (-127 à 0)
- `alarm_motion`: Mouvement détecté (format 5 uniquement)
- `alarm_battery`: Batterie critique (format 5 uniquement)

### Insights automatiques
Toutes les capabilities sont loggées pour historique et graphes dans Homey.

## Produits et formats supportés

### RuuviTag (capteur environnemental)
Petit capteur BLE alimenté par pile CR2477, pour température, humidité, pression et mouvement.

**Format 3 (RAWv1) - 16 bytes** - Bluetooth 4
```
[0]    Format (0x03)
[1]    Humidity (0.5% steps)
[2-3]  Temperature (0.01°C signed)
[4-5]  Pressure (1 Pa offset 50000)
[6-7]  Accel X (mG signed)
[8-9]  Accel Y (mG signed)
[10-11] Accel Z (mG signed)
[12-13] Battery (mV)
```

**Format 5 (RAWv2) - 26 bytes** - Bluetooth 4
```
[0]    Format (0x05)
[1-2]  Temperature (0.005°C signed)
[3-4]  Humidity (0.0025% steps)
[5-6]  Pressure (1 Pa)
[7-8]  Accel X (mG signed)
[9-10] Accel Y (mG signed)
[11-12] Accel Z (mG signed)
[13-14] Power (voltage + tx power bits)
[15]   Movement counter (incremental)
[16-17] Sequence counter (incremental)
[18-23] MAC address
```

Capabilities: `measure_temperature`, `measure_humidity`, `measure_pressure`, `measure_battery`, `acceleration`, `measure_rssi`, `onoff`, `alarm_motion` (format 5), `alarm_battery` (format 5)

### Ruuvi Air (moniteur qualité de l'air)
Capteur de qualité de l'air alimenté par secteur, pour CO2, particules, VOC, NOx, température, humidité, pression et luminosité.

**⚠️ Pas de capability `measure_battery`** (alimenté par secteur)

**Format 6 - ~20 bytes** - Bluetooth 4
```
[0]    Format (0x06)
[1-2]  Temperature (0.005°C)
[3-4]  Humidity (0.0025%)
[5-6]  Pressure (1 Pa)
[7-8]  PM 2.5 (0.1 µg/m³)
[9-10] CO2 (1 ppm, 0-40000)
[11-12] VOC/NOx indices (9-bit each)
[13]   Luminosity (logarithmic)
[14]   Sequence counter
[15]   Flags
[16-18] MAC address (3 bytes LSB)
```

**Format E1 (Extended v1) - 40 bytes** - Bluetooth 5
```
[0]    Format (0xE1)
[1-2]  Temperature (0.005°C)
[3-4]  Humidity (0.0025%)
[5-6]  Pressure (1 Pa)
[7-14] PM 1.0/2.5/4.0/10.0 (0.1 µg/m³)
[15-16] CO2 (1 ppm, 0-40000)
[17-18] VOC/NOx indices (9-bit each)
[19-21] Luminosity (0.01 lux)
[22-24] Reserved
[25-27] Sequence counter
[28]   Flags
[29-33] Reserved
[34-39] MAC address
```

Capabilities: `measure_temperature`, `measure_humidity`, `measure_pressure`, `measure_co2`, `measure_pm25`, `measure_luminance`, NOx (custom), VOC (custom), `measure_rssi`, `onoff`

### Valeurs spéciales
- `0xFFFF` (ou équivalent): Capteur non disponible/supporté
- Toujours vérifier avant de mettre à jour une capability

### Documentation officielle
- [Format 3 (RAWv1)](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-3)
- [Format 5 (RAWv2)](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5)
- [Format 6](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-6)
- [Format E1](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-e1)

## Support et contribution

### Issues GitHub
- **Bug reports**: Inclure logs Homey, version app, modèle RuuviTag
- **Feature requests**: Décrire le cas d'usage et bénéfice utilisateur
- **Questions**: Vérifier d'abord les issues fermées et Homey Community

### CI/CD avec Claude
- Claude analyse automatiquement les nouvelles issues
- Répond si problème connu ou solution évidente
- Demande précisions si contexte insuffisant
- Peut proposer un fix automatique pour bugs simples

### Support communautaire
- **Homey Community**: Topic #39495
- **GitHub Issues**: Questions techniques et bugs
- **GitHub Discussions**: Idées et use cases

## Ressources externes

- **Homey SDK v3**: https://apps-sdk-v3.developer.homey.app/
- **RuuviTag specs**: https://docs.ruuvi.com/
- **RuuviTag formats**: https://github.com/ruuvi/ruuvi-sensor-protocols
- **Homey BLE**: https://apps-sdk-v3.developer.homey.app/tutorial-BLE.html
- **GitHub Actions pour Claude**: https://code.claude.com/docs/en/github-actions
