# CLAUDE.md

Guide pour Claude Code lors du développement de cette app Homey pour capteurs RuuviTag.

## Recherche sémantique

```
mcp__claude-context__search_code with:
- path: D:\code-workspace\Homey\com.thomashoussin.ruuvitag
- query: "votre requête en langage naturel"
```

## Aperçu

App Homey pour capteurs RuuviTag BLE avec support des formats RAWv1 (format 3) et RAWv2 (format 5).

- **Platform**: Homey SDK v3
- **Hardware**: RuuviTag BLE, RuuviGateway (optionnel)
- **2 Drivers**: BLE direct ou via Gateway HTTP/LAN

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
