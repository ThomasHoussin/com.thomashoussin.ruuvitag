# Testing Guide

Guide de test pour l'application Homey RuuviTag avec Vitest.

## Quick Start

```bash
# Exécuter tous les tests
npm test

# Mode watch (développement)
npm run test:watch

# Avec rapport de couverture
npm run test:coverage
```

## Architecture des tests

```
tests/
├── lib/
│   └── function.test.mjs      # Tests du parser (priorité 1)
├── fixtures/
│   └── buffers.mjs            # Buffers de test pré-définis
└── helpers/
    └── buffer-factory.mjs     # Factory pour buffers custom
```

## Module testé

### `lib/function.mjs` - Parser de données RuuviTag

Module de parsing avec 25+ fonctions pures couvrant :

| Catégorie | Fonctions | Formats supportés |
|-----------|-----------|-------------------|
| Détection | `readFormat`, `validateDataFormat` | 3, 5, 6, 225 |
| Température | `readTemperature` | 3, 5, 6, 225 |
| Humidité | `readHumidity`, `isHumiditySupported` | 3, 5, 6, 225 |
| Pression | `readPressure`, `isPressureSupported` | 3, 5, 6, 225 |
| Batterie | `readBattery`, `estimateBattery` | 3, 5 |
| Mouvement | `readAcceleration*`, `computeAcceleration`, `readMovementCounter` | 3, 5 |
| Séquence | `readSequenceNumber` | 5, 6, 225 |
| Qualité air | `readCo2`, `readPm*`, `readNoxIndex`, `readTvocIndex`, `calc_aqi` | 6, 225 |
| HTTP | `checkResponseStatus` | N/A |

## Formats de données RuuviTag

### Format 3 (RAWv1) - 16 bytes
RuuviTag basique avec capteurs environnementaux.

```
[0-1]   Header (0x9904)
[2]     Format (0x03)
[3]     Humidity (0.5% steps)
[4-5]   Temperature (int8 + frac)
[6-7]   Pressure (Pa, +50000 offset)
[8-13]  Acceleration XYZ (mG signed)
[14-15] Battery (mV direct)
```

### Format 5 (RAWv2) - 26 bytes
RuuviTag avancé avec compteurs de mouvement/séquence.

```
[0-1]   Header
[2]     Format (0x05)
[3-4]   Temperature (0.005°C)
[5-6]   Humidity (0.0025%)
[7-8]   Pressure (Pa)
[9-14]  Acceleration XYZ
[15-16] Power info (battery bits)
[17]    Movement counter
[18-19] Sequence number
[20-25] MAC address
```

### Format 6 - 22 bytes (Ruuvi Air)
Capteur qualité de l'air (CO2, PM2.5, VOC, NOx).

### Format 225 (E1) - 46 bytes (Ruuvi Air Extended)
Version étendue avec PM1, PM4, PM10 additionnels.

## Données de test

### Buffer de référence (Format 5)

```javascript
import { FORMAT_5_EXAMPLE } from './tests/fixtures/buffers.mjs';

// Buffer hex: 0512fc5394c37c0004fffc040cac364200cdcbb8334c884f
// Valeurs décodées:
// - Temperature: 24.3°C
// - Humidity: 53.49%
// - Pressure: 1000.44 hPa
// - Battery: 2977 mV
// - Movement: 66
// - Sequence: 205
```

### Créer des buffers custom

```javascript
import { createFormat5Buffer } from './tests/helpers/buffer-factory.mjs';

const buffer = createFormat5Buffer({
  temperature: -10.0,
  humidity: 85.0,
  battery: 3100,
  movementCounter: 100
});
```

### Cas limites disponibles

| Fixture | Description |
|---------|-------------|
| `FORMAT_5_UNSUPPORTED_HUMIDITY` | Humidity = 0xFFFF |
| `FORMAT_5_UNSUPPORTED_PRESSURE` | Pressure = 0xFFFF |
| `FORMAT_5_NEGATIVE_TEMP` | Température négative |
| `FORMAT_3_ZERO_VALUES` | Toutes les valeurs à zéro |
| `FORMAT_6_HIGH_POLLUTION` | CO2 et PM élevés |
| `FORMAT_225_MAX_SEQUENCE` | Sequence 24-bit max |

## Objectifs de couverture

| Métrique | Cible | Rationale |
|----------|-------|-----------|
| Lines | 90% | Haute couverture du parser |
| Functions | 90% | Toutes les fonctions exportées |
| Branches | 85% | Conditionnels par format |
| Statements | 90% | Tests exhaustifs |

## Exécution ciblée

```bash
# Tests d'un pattern spécifique
npx vitest run -t "readTemperature"

# Tests d'un fichier spécifique
npx vitest run tests/lib/function.test.mjs

# Mode verbose
npx vitest run --reporter=verbose

# Génération rapport HTML
npm run test:coverage
# Ouvrir coverage/index.html
```

## Catégories de tests

### 1. Tests nominaux
Valeurs typiques attendues en conditions normales.

```javascript
it('should read temperature with 0.005 C resolution', () => {
  const temp = fn.readTemperature(5, FORMAT_5_EXAMPLE);
  expect(temp).toBeCloseTo(24.3, 1);
});
```

### 2. Tests de bornes
Valeurs limites (min, max, zéro).

```javascript
it('should return 100% for voltage at max', () => {
  expect(fn.estimateBattery(3000, settings)).toBe(100);
});

it('should return 0% for voltage at min', () => {
  expect(fn.estimateBattery(2500, settings)).toBe(0);
});
```

### 3. Tests d'erreur
Formats non supportés, buffers invalides.

```javascript
it('should throw for format 3 (not supported)', () => {
  expect(() => fn.readMovementCounter(3, FORMAT_3_NORMAL))
    .toThrowError(/movement unsupported on v3/);
});
```

### 4. Tests de capteurs non supportés
Détection des valeurs 0xFFFF.

```javascript
it('should return false for 0xFFFF humidity in format 5', () => {
  expect(fn.isHumiditySupported(5, FORMAT_5_UNSUPPORTED_HUMIDITY)).toBe(false);
});
```

## Intégration CI

Ajouter à `.github/workflows/test.yml`:

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
```

## Limitations connues

1. **Tests drivers** : Les fichiers `device.mjs` et `driver.mjs` dépendent du SDK Homey, non testables sans mock complet.

2. **Tests BLE** : Le scan BLE réel nécessite un appareil Homey.

3. **Tests Gateway HTTP** : Nécessiterait de mocker `node-fetch`.

## Ajout de nouveaux tests

### Pour une nouvelle fonction de parsing

1. Ajouter des buffers de test dans `tests/fixtures/buffers.mjs`
2. Optionnel: ajouter une factory dans `tests/helpers/buffer-factory.mjs`
3. Ajouter les tests dans `tests/lib/function.test.mjs`

### Template de test

```javascript
describe('newFunction', () => {
  it('should handle normal case for format X', () => {
    const result = fn.newFunction(X, BUFFER_X);
    expect(result).toBe(expectedValue);
  });

  it('should throw for unsupported format', () => {
    expect(() => fn.newFunction(Y, BUFFER_Y))
      .toThrowError(/Unsupported format/);
  });
});
```

## Ressources

- [Vitest Documentation](https://vitest.dev/)
- [RuuviTag Data Formats](https://docs.ruuvi.com/communication/bluetooth-advertisements)
- [Format 3 Spec](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-3)
- [Format 5 Spec](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-5)
- [Format 6 Spec](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-6)
- [Format E1 Spec](https://docs.ruuvi.com/communication/bluetooth-advertisements/data-format-e1)
