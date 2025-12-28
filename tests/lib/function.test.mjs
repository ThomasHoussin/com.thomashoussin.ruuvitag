import { describe, it, expect } from 'vitest';
import * as fn from '../../lib/function.mjs';
import {
  FORMAT_3_NORMAL,
  FORMAT_3_NEGATIVE_TEMP,
  FORMAT_3_ZERO_VALUES,
  FORMAT_5_EXAMPLE,
  FORMAT_5_UNSUPPORTED_HUMIDITY,
  FORMAT_5_UNSUPPORTED_PRESSURE,
  FORMAT_5_UNSUPPORTED_TEMP,
  FORMAT_5_NEGATIVE_TEMP,
  FORMAT_6_NORMAL,
  FORMAT_6_HIGH_POLLUTION,
  FORMAT_225_NORMAL,
  FORMAT_225_MAX_SEQUENCE,
  INVALID_LENGTH_FORMAT_5,
  INVALID_FORMAT_MISMATCH,
  INVALID_UNKNOWN_FORMAT
} from '../fixtures/buffers.mjs';
import {
  createFormat3Buffer,
  createFormat5Buffer,
  createFormat6Buffer,
  createFormat225Buffer
} from '../helpers/buffer-factory.mjs';

// ============================================
// readFormat Tests
// ============================================
describe('readFormat', () => {
  it('should read format 3 from buffer', () => {
    expect(fn.readFormat(FORMAT_3_NORMAL)).toBe(3);
  });

  it('should read format 5 from buffer', () => {
    expect(fn.readFormat(FORMAT_5_EXAMPLE)).toBe(5);
  });

  it('should read format 6 from buffer', () => {
    expect(fn.readFormat(FORMAT_6_NORMAL)).toBe(6);
  });

  it('should read format 225 (E1) from buffer', () => {
    expect(fn.readFormat(FORMAT_225_NORMAL)).toBe(225);
  });

  it('should read format from custom buffer', () => {
    const customBuffer = createFormat5Buffer({ temperature: 30.0 });
    expect(fn.readFormat(customBuffer)).toBe(5);
  });
});

// ============================================
// validateDataFormat Tests
// ============================================
describe('validateDataFormat', () => {
  describe('valid formats', () => {
    it('should return buffer for valid format 3 (16 bytes)', () => {
      const result = fn.validateDataFormat(3, FORMAT_3_NORMAL);
      expect(result).toBe(FORMAT_3_NORMAL);
    });

    it('should return buffer for valid format 5 (26 bytes)', () => {
      const result = fn.validateDataFormat(5, FORMAT_5_EXAMPLE);
      expect(result).toBe(FORMAT_5_EXAMPLE);
    });

    it('should return buffer for valid format 6 (22 bytes)', () => {
      const result = fn.validateDataFormat(6, FORMAT_6_NORMAL);
      expect(result).toBe(FORMAT_6_NORMAL);
    });

    it('should return buffer for valid format 225 (46 bytes)', () => {
      const result = fn.validateDataFormat(225, FORMAT_225_NORMAL);
      expect(result).toBe(FORMAT_225_NORMAL);
    });
  });

  describe('invalid formats', () => {
    it('should throw on wrong buffer length for format 5', () => {
      expect(() => fn.validateDataFormat(5, INVALID_LENGTH_FORMAT_5))
        .toThrowError(/Unexpected data in buffer.*length 4.*format 5/);
    });

    it('should throw on format mismatch (length OK but wrong format byte)', () => {
      expect(() => fn.validateDataFormat(5, INVALID_FORMAT_MISMATCH))
        .toThrowError(/Unexpected data in buffer.*length 26.*format 5/);
    });

    it('should throw for unsupported format code', () => {
      expect(() => fn.validateDataFormat(99, INVALID_UNKNOWN_FORMAT))
        .toThrowError(/Unexpected data in buffer.*format 99/);
    });

    it('should throw when format 3 buffer has wrong length', () => {
      const wrongLength = Buffer.alloc(20);
      wrongLength.writeUInt8(0x03, 2);
      expect(() => fn.validateDataFormat(3, wrongLength))
        .toThrowError(/Unexpected data in buffer.*length 20.*format 3/);
    });
  });
});

// ============================================
// readTemperature Tests
// ============================================
describe('readTemperature', () => {
  describe('format 3', () => {
    it('should read positive temperature (24.00 C)', () => {
      const temp = fn.readTemperature(3, FORMAT_3_NORMAL);
      expect(temp).toBeCloseTo(24.0, 2);
    });

    it('should read negative temperature', () => {
      // FORMAT_3_NEGATIVE_TEMP has -10 integer + 80 fractional
      // Formula: int + frac/100 = -10 + 0.80 = -9.2 C
      const temp = fn.readTemperature(3, FORMAT_3_NEGATIVE_TEMP);
      expect(temp).toBeCloseTo(-9.2, 1);
    });

    it('should read zero temperature', () => {
      const temp = fn.readTemperature(3, FORMAT_3_ZERO_VALUES);
      expect(temp).toBe(0);
    });
  });

  describe('format 5', () => {
    it('should read temperature with 0.005 C resolution', () => {
      // FORMAT_5_EXAMPLE: 0x12FC = 4860, 4860 * 0.005 = 24.3 C
      const temp = fn.readTemperature(5, FORMAT_5_EXAMPLE);
      expect(temp).toBeCloseTo(24.3, 3);
    });

    it('should read negative temperature', () => {
      // FORMAT_5_NEGATIVE_TEMP: 0xFC18 = -1000 (signed), -1000 * 0.005 = -5.0 C
      const temp = fn.readTemperature(5, FORMAT_5_NEGATIVE_TEMP);
      expect(temp).toBeCloseTo(-5.0, 3);
    });

    it('should handle custom temperature via factory', () => {
      const buffer = createFormat5Buffer({ temperature: -20.5 });
      const temp = fn.readTemperature(5, buffer);
      expect(temp).toBeCloseTo(-20.5, 3);
    });

    it('should read unsupported temperature marker (0x8000)', () => {
      // FORMAT_5_UNSUPPORTED_TEMP: 0x8000 = -32768 * 0.005 = -163.84 C
      const temp = fn.readTemperature(5, FORMAT_5_UNSUPPORTED_TEMP);
      expect(temp).toBeCloseTo(-163.84, 2);
    });
  });

  describe('format 6 (Ruuvi Air)', () => {
    it('should read temperature (22.0 C)', () => {
      const temp = fn.readTemperature(6, FORMAT_6_NORMAL);
      expect(temp).toBeCloseTo(22.0, 1);
    });
  });

  describe('format 225 (E1)', () => {
    it('should read temperature (25.0 C)', () => {
      const temp = fn.readTemperature(225, FORMAT_225_NORMAL);
      expect(temp).toBeCloseTo(25.0, 1);
    });
  });

  it('should throw for unsupported format', () => {
    expect(() => fn.readTemperature(99, Buffer.alloc(16)))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// readHumidity Tests
// ============================================
describe('readHumidity', () => {
  it('should read humidity for format 3 (0.5% steps)', () => {
    // FORMAT_3_NORMAL has 0x66 (102) at position 3
    // 102 * 0.5 = 51%
    const humidity = fn.readHumidity(3, FORMAT_3_NORMAL);
    expect(humidity).toBe(51);
  });

  it('should read zero humidity for format 3', () => {
    const humidity = fn.readHumidity(3, FORMAT_3_ZERO_VALUES);
    expect(humidity).toBe(0);
  });

  it('should read humidity for format 5 (0.0025% steps)', () => {
    // FORMAT_5_EXAMPLE: 0x5394 = 21396, 21396 * 0.0025 = 53.49%
    const humidity = fn.readHumidity(5, FORMAT_5_EXAMPLE);
    expect(humidity).toBeCloseTo(53.49, 2);
  });

  it('should read humidity for format 6', () => {
    // FORMAT_6_NORMAL: 24000 * 0.0025 = 60%
    const humidity = fn.readHumidity(6, FORMAT_6_NORMAL);
    expect(humidity).toBeCloseTo(60.0, 1);
  });

  it('should read humidity for format 225', () => {
    // FORMAT_225_NORMAL: 20000 * 0.0025 = 50%
    const humidity = fn.readHumidity(225, FORMAT_225_NORMAL);
    expect(humidity).toBeCloseTo(50.0, 1);
  });

  it('should handle custom humidity via factory', () => {
    const buffer = createFormat5Buffer({ humidity: 85.25 });
    const humidity = fn.readHumidity(5, buffer);
    expect(humidity).toBeCloseTo(85.25, 1);
  });

  it('should throw for unsupported format', () => {
    expect(() => fn.readHumidity(99, Buffer.alloc(16)))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// readPressure Tests
// ============================================
describe('readPressure', () => {
  it('should read pressure for format 3', () => {
    // FORMAT_3_NORMAL: 0x6398 = 25496, 25496/100 + 500 = 754.96 hPa
    const pressure = fn.readPressure(3, FORMAT_3_NORMAL);
    expect(pressure).toBeCloseTo(754.96, 2);
  });

  it('should read minimum pressure for format 3', () => {
    // FORMAT_3_ZERO_VALUES: 0 / 100 + 500 = 500 hPa
    const pressure = fn.readPressure(3, FORMAT_3_ZERO_VALUES);
    expect(pressure).toBe(500);
  });

  it('should read pressure for format 5', () => {
    // FORMAT_5_EXAMPLE: 0xC37C = 50044, 50044/100 + 500 = 1000.44 hPa
    const pressure = fn.readPressure(5, FORMAT_5_EXAMPLE);
    expect(pressure).toBeCloseTo(1000.44, 2);
  });

  it('should read pressure for format 6', () => {
    // FORMAT_6_NORMAL: 50100 / 100 + 500 = 1001 hPa
    const pressure = fn.readPressure(6, FORMAT_6_NORMAL);
    expect(pressure).toBeCloseTo(1001, 0);
  });

  it('should read pressure for format 225', () => {
    // FORMAT_225_NORMAL: 50200 / 100 + 500 = 1002 hPa
    const pressure = fn.readPressure(225, FORMAT_225_NORMAL);
    expect(pressure).toBeCloseTo(1002, 0);
  });

  it('should throw for unsupported format', () => {
    expect(() => fn.readPressure(99, Buffer.alloc(16)))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// readBattery Tests (RuuviTag only - formats 3 & 5)
// ============================================
describe('readBattery', () => {
  it('should read battery voltage for format 3 (direct mV)', () => {
    // FORMAT_3_NORMAL: 0x0B8A = 2954 mV
    const battery = fn.readBattery(3, FORMAT_3_NORMAL);
    expect(battery).toBe(2954);
  });

  it('should read zero battery for format 3', () => {
    const battery = fn.readBattery(3, FORMAT_3_ZERO_VALUES);
    expect(battery).toBe(0);
  });

  it('should read battery voltage for format 5 (bit-shifted)', () => {
    // FORMAT_5_EXAMPLE: 0xAC36 = 44086
    // (44086 >> 5) + 1600 = 1377 + 1600 = 2977 mV
    const battery = fn.readBattery(5, FORMAT_5_EXAMPLE);
    expect(battery).toBe(2977);
  });

  it('should handle custom battery via factory', () => {
    const buffer = createFormat5Buffer({ battery: 3100 });
    const battery = fn.readBattery(5, buffer);
    expect(battery).toBe(3100);
  });

  it('should throw for format 6 (Ruuvi Air has no battery)', () => {
    expect(() => fn.readBattery(6, FORMAT_6_NORMAL))
      .toThrowError(/Unsupported format/);
  });

  it('should throw for format 225 (Ruuvi Air has no battery)', () => {
    expect(() => fn.readBattery(225, FORMAT_225_NORMAL))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// estimateBattery Tests
// ============================================
describe('estimateBattery', () => {
  const settings = { batt_mini: 2500, batt_maxi: 3000 };

  it('should return 100% for voltage at max', () => {
    expect(fn.estimateBattery(3000, settings)).toBe(100);
  });

  it('should return 100% for voltage above max (clamped)', () => {
    expect(fn.estimateBattery(3100, settings)).toBe(100);
  });

  it('should return 0% for voltage at min', () => {
    expect(fn.estimateBattery(2500, settings)).toBe(0);
  });

  it('should return 0% for voltage below min (clamped)', () => {
    expect(fn.estimateBattery(2400, settings)).toBe(0);
  });

  it('should return 50% for voltage midway', () => {
    expect(fn.estimateBattery(2750, settings)).toBe(50);
  });

  it('should return 25% for voltage at first quartile', () => {
    // (2625 - 2500) / (3000 - 2500) * 100 = 125/500 * 100 = 25%
    expect(fn.estimateBattery(2625, settings)).toBe(25);
  });

  it('should handle custom settings', () => {
    const customSettings = { batt_mini: 2000, batt_maxi: 3200 };
    // (2600 - 2000) / (3200 - 2000) * 100 = 600/1200 * 100 = 50%
    expect(fn.estimateBattery(2600, customSettings)).toBe(50);
  });
});

// ============================================
// Acceleration Tests
// ============================================
describe('readAccelerationX', () => {
  it('should read positive X acceleration for format 3', () => {
    // FORMAT_3_NORMAL: 0x0004 = 4 mG
    const accel = fn.readAccelerationX(3, FORMAT_3_NORMAL);
    expect(accel).toBe(4);
  });

  it('should read positive X acceleration for format 5', () => {
    // FORMAT_5_EXAMPLE: 0x0004 = 4 mG
    const accel = fn.readAccelerationX(5, FORMAT_5_EXAMPLE);
    expect(accel).toBe(4);
  });

  it('should read zero acceleration', () => {
    const accel = fn.readAccelerationX(3, FORMAT_3_ZERO_VALUES);
    expect(accel).toBe(0);
  });

  it('should throw for unsupported format (format 6)', () => {
    expect(() => fn.readAccelerationX(6, FORMAT_6_NORMAL))
      .toThrowError(/Unsupported format/);
  });
});

describe('readAccelerationY', () => {
  it('should read negative Y acceleration for format 3', () => {
    // FORMAT_3_NORMAL: 0xFFFC = -4 (signed int16)
    const accel = fn.readAccelerationY(3, FORMAT_3_NORMAL);
    expect(accel).toBe(-4);
  });

  it('should read negative Y acceleration for format 5', () => {
    // FORMAT_5_EXAMPLE: 0xFFFC = -4
    const accel = fn.readAccelerationY(5, FORMAT_5_EXAMPLE);
    expect(accel).toBe(-4);
  });

  it('should handle custom acceleration via factory', () => {
    const buffer = createFormat5Buffer({ accelY: -1000 });
    const accel = fn.readAccelerationY(5, buffer);
    expect(accel).toBe(-1000);
  });
});

describe('readAccelerationZ', () => {
  it('should read Z acceleration for format 3', () => {
    // FORMAT_3_NORMAL: 0x040C = 1036 mG
    const accel = fn.readAccelerationZ(3, FORMAT_3_NORMAL);
    expect(accel).toBe(1036);
  });

  it('should read Z acceleration for format 5', () => {
    // FORMAT_5_EXAMPLE: 0x040C = 1036 mG
    const accel = fn.readAccelerationZ(5, FORMAT_5_EXAMPLE);
    expect(accel).toBe(1036);
  });
});

describe('computeAcceleration', () => {
  it('should compute magnitude from XYZ values', () => {
    // sqrt(4^2 + (-4)^2 + 1036^2) = sqrt(16 + 16 + 1073296) = sqrt(1073328) ~ 1036.015
    const magnitude = fn.computeAcceleration(4, -4, 1036);
    expect(magnitude).toBeCloseTo(1036.015, 0);
  });

  it('should return 0 for all zeros', () => {
    expect(fn.computeAcceleration(0, 0, 0)).toBe(0);
  });

  it('should handle symmetric values', () => {
    // sqrt(1000^2 + 1000^2 + 1000^2) = sqrt(3) * 1000 ~ 1732.05
    const magnitude = fn.computeAcceleration(1000, 1000, 1000);
    expect(magnitude).toBeCloseTo(1732.05, 0);
  });

  it('should handle negative values correctly', () => {
    // Magnitude should be same regardless of sign
    const magnitude1 = fn.computeAcceleration(100, 100, 100);
    const magnitude2 = fn.computeAcceleration(-100, -100, -100);
    expect(magnitude1).toBeCloseTo(magnitude2, 5);
  });

  it('should handle single axis', () => {
    expect(fn.computeAcceleration(1000, 0, 0)).toBe(1000);
    expect(fn.computeAcceleration(0, 1000, 0)).toBe(1000);
    expect(fn.computeAcceleration(0, 0, 1000)).toBe(1000);
  });
});

// ============================================
// readMovementCounter Tests (Format 5 only)
// ============================================
describe('readMovementCounter', () => {
  it('should read movement counter for format 5', () => {
    // FORMAT_5_EXAMPLE: byte[17] = 0x42 = 66
    const counter = fn.readMovementCounter(5, FORMAT_5_EXAMPLE);
    expect(counter).toBe(66);
  });

  it('should handle max value (255)', () => {
    const buffer = createFormat5Buffer({ movementCounter: 255 });
    const counter = fn.readMovementCounter(5, buffer);
    expect(counter).toBe(255);
  });

  it('should handle zero', () => {
    const buffer = createFormat5Buffer({ movementCounter: 0 });
    const counter = fn.readMovementCounter(5, buffer);
    expect(counter).toBe(0);
  });

  it('should throw for format 3 (not supported)', () => {
    expect(() => fn.readMovementCounter(3, FORMAT_3_NORMAL))
      .toThrowError(/movement unsupported on v3/);
  });

  it('should throw for format 6', () => {
    expect(() => fn.readMovementCounter(6, FORMAT_6_NORMAL))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// readSequenceNumber Tests
// ============================================
describe('readSequenceNumber', () => {
  it('should read 16-bit sequence for format 5', () => {
    // FORMAT_5_EXAMPLE: bytes[18-19] = 0x00CD = 205
    const seq = fn.readSequenceNumber(5, FORMAT_5_EXAMPLE);
    expect(seq).toBe(205);
  });

  it('should handle max 16-bit sequence for format 5', () => {
    const buffer = createFormat5Buffer({ sequenceNumber: 65535 });
    const seq = fn.readSequenceNumber(5, buffer);
    expect(seq).toBe(65535);
  });

  it('should read 8-bit sequence for format 6', () => {
    // FORMAT_6_NORMAL: byte[17] = 120
    const seq = fn.readSequenceNumber(6, FORMAT_6_NORMAL);
    expect(seq).toBe(120);
  });

  it('should handle max 8-bit sequence for format 6', () => {
    // FORMAT_6_HIGH_POLLUTION: byte[17] = 255
    const seq = fn.readSequenceNumber(6, FORMAT_6_HIGH_POLLUTION);
    expect(seq).toBe(255);
  });

  it('should read 24-bit sequence for format 225', () => {
    // FORMAT_225_NORMAL: bytes[27-29] = 12345
    const seq = fn.readSequenceNumber(225, FORMAT_225_NORMAL);
    expect(seq).toBe(12345);
  });

  it('should handle max 24-bit sequence for format 225', () => {
    // FORMAT_225_MAX_SEQUENCE: 0xFFFFFF = 16777215
    const seq = fn.readSequenceNumber(225, FORMAT_225_MAX_SEQUENCE);
    expect(seq).toBe(16777215);
  });

  it('should throw for format 3 (not supported)', () => {
    expect(() => fn.readSequenceNumber(3, FORMAT_3_NORMAL))
      .toThrowError(/Sequence number unsupported on v3/);
  });

  it('should throw for unknown format', () => {
    expect(() => fn.readSequenceNumber(99, Buffer.alloc(30)))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// isPressureSupported / isHumiditySupported Tests
// ============================================
describe('isPressureSupported', () => {
  it('should return true for supported pressure in format 5', () => {
    expect(fn.isPressureSupported(5, FORMAT_5_EXAMPLE)).toBe(true);
  });

  it('should return false for 0xFFFF pressure in format 5', () => {
    expect(fn.isPressureSupported(5, FORMAT_5_UNSUPPORTED_PRESSURE)).toBe(false);
  });

  it('should return true for format 3 (always supported)', () => {
    expect(fn.isPressureSupported(3, FORMAT_3_NORMAL)).toBe(true);
  });

  it('should return true for format 6', () => {
    expect(fn.isPressureSupported(6, FORMAT_6_NORMAL)).toBe(true);
  });

  it('should return true for format 225', () => {
    expect(fn.isPressureSupported(225, FORMAT_225_NORMAL)).toBe(true);
  });
});

describe('isHumiditySupported', () => {
  it('should return true for supported humidity in format 5', () => {
    expect(fn.isHumiditySupported(5, FORMAT_5_EXAMPLE)).toBe(true);
  });

  it('should return false for 0xFFFF humidity in format 5', () => {
    expect(fn.isHumiditySupported(5, FORMAT_5_UNSUPPORTED_HUMIDITY)).toBe(false);
  });

  it('should return true for format 3 (always supported)', () => {
    expect(fn.isHumiditySupported(3, FORMAT_3_NORMAL)).toBe(true);
  });

  it('should return true for format 6', () => {
    expect(fn.isHumiditySupported(6, FORMAT_6_NORMAL)).toBe(true);
  });

  it('should return true for format 225', () => {
    expect(fn.isHumiditySupported(225, FORMAT_225_NORMAL)).toBe(true);
  });
});

describe('isTemperatureSupported', () => {
  it('should return true for supported temperature in format 5', () => {
    expect(fn.isTemperatureSupported(5, FORMAT_5_EXAMPLE)).toBe(true);
  });

  it('should return false for 0x8000 temperature in format 5', () => {
    expect(fn.isTemperatureSupported(5, FORMAT_5_UNSUPPORTED_TEMP)).toBe(false);
  });

  it('should return true for format 3 (always supported)', () => {
    expect(fn.isTemperatureSupported(3, FORMAT_3_NORMAL)).toBe(true);
  });

  it('should return true for format 6', () => {
    expect(fn.isTemperatureSupported(6, FORMAT_6_NORMAL)).toBe(true);
  });

  it('should return true for format 225', () => {
    expect(fn.isTemperatureSupported(225, FORMAT_225_NORMAL)).toBe(true);
  });
});

// ============================================
// Ruuvi Air Functions (Format 6 & 225)
// ============================================
describe('readCo2', () => {
  it('should read CO2 for format 6', () => {
    // FORMAT_6_NORMAL: 800 ppm
    const co2 = fn.readCo2(6, FORMAT_6_NORMAL);
    expect(co2).toBe(800);
  });

  it('should read high CO2 for format 6', () => {
    // FORMAT_6_HIGH_POLLUTION: 2000 ppm
    const co2 = fn.readCo2(6, FORMAT_6_HIGH_POLLUTION);
    expect(co2).toBe(2000);
  });

  it('should read CO2 for format 225', () => {
    // FORMAT_225_NORMAL: 650 ppm
    const co2 = fn.readCo2(225, FORMAT_225_NORMAL);
    expect(co2).toBe(650);
  });

  it('should handle custom CO2 via factory', () => {
    const buffer = createFormat6Buffer({ co2: 1500 });
    const co2 = fn.readCo2(6, buffer);
    expect(co2).toBe(1500);
  });

  it('should throw for format 3 (RuuviTag)', () => {
    expect(() => fn.readCo2(3, FORMAT_3_NORMAL))
      .toThrowError(/Unsupported format/);
  });

  it('should throw for format 5 (RuuviTag)', () => {
    expect(() => fn.readCo2(5, FORMAT_5_EXAMPLE))
      .toThrowError(/Unsupported format/);
  });
});

describe('readPm25', () => {
  it('should read PM2.5 for format 6 (with 0.1 multiplier)', () => {
    // FORMAT_6_NORMAL: 150 * 0.1 = 15.0 ug/m3
    const pm = fn.readPm25(6, FORMAT_6_NORMAL);
    expect(pm).toBeCloseTo(15.0, 1);
  });

  it('should read high PM2.5 for format 6', () => {
    // FORMAT_6_HIGH_POLLUTION: 500 * 0.1 = 50.0 ug/m3
    const pm = fn.readPm25(6, FORMAT_6_HIGH_POLLUTION);
    expect(pm).toBeCloseTo(50.0, 1);
  });

  it('should read PM2.5 for format 225', () => {
    // FORMAT_225_NORMAL: 100 * 0.1 = 10.0 ug/m3
    const pm = fn.readPm25(225, FORMAT_225_NORMAL);
    expect(pm).toBeCloseTo(10.0, 1);
  });

  it('should throw for format 3', () => {
    expect(() => fn.readPm25(3, FORMAT_3_NORMAL))
      .toThrowError(/Unsupported format/);
  });
});

describe('readPm1', () => {
  it('should read PM1 for format 225 only', () => {
    // FORMAT_225_NORMAL: 50 * 0.1 = 5.0 ug/m3
    const pm = fn.readPm1(225, FORMAT_225_NORMAL);
    expect(pm).toBeCloseTo(5.0, 1);
  });

  it('should throw for format 6 (not supported)', () => {
    expect(() => fn.readPm1(6, FORMAT_6_NORMAL))
      .toThrowError(/Unsupported format/);
  });

  it('should throw for format 5', () => {
    expect(() => fn.readPm1(5, FORMAT_5_EXAMPLE))
      .toThrowError(/Unsupported format/);
  });
});

describe('readPm4', () => {
  it('should read PM4 for format 225 only', () => {
    // FORMAT_225_NORMAL: 120 * 0.1 = 12.0 ug/m3
    const pm = fn.readPm4(225, FORMAT_225_NORMAL);
    expect(pm).toBeCloseTo(12.0, 1);
  });

  it('should throw for format 6', () => {
    expect(() => fn.readPm4(6, FORMAT_6_NORMAL))
      .toThrowError(/Unsupported format/);
  });
});

describe('readPm10', () => {
  it('should read PM10 for format 225 only', () => {
    // FORMAT_225_NORMAL: 150 * 0.1 = 15.0 ug/m3
    const pm = fn.readPm10(225, FORMAT_225_NORMAL);
    expect(pm).toBeCloseTo(15.0, 1);
  });

  it('should throw for format 6', () => {
    expect(() => fn.readPm10(6, FORMAT_6_NORMAL))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// VOC and NOx Index Tests (9-bit split values)
// ============================================
describe('readTvocIndex', () => {
  it('should read TVOC for format 6', () => {
    // FORMAT_6_NORMAL: byte[13]=50, LSB byte[18]=0x00
    // Value: 50 * 2 + ((0x00 >> 6) & 0x01) = 100 + 0 = 100
    const tvoc = fn.readTvocIndex(6, FORMAT_6_NORMAL);
    expect(tvoc).toBe(100);
  });

  it('should read TVOC with LSB set for format 6', () => {
    // FORMAT_6_HIGH_POLLUTION: byte[13]=200, LSB byte[18]=0xC0
    // Value: 200 * 2 + ((0xC0 >> 6) & 0x01) = 400 + 1 = 401
    const tvoc = fn.readTvocIndex(6, FORMAT_6_HIGH_POLLUTION);
    expect(tvoc).toBe(401);
  });

  it('should read TVOC for format 225', () => {
    // FORMAT_225_NORMAL: byte[19]=50, LSB byte[30]=0x00
    const tvoc = fn.readTvocIndex(225, FORMAT_225_NORMAL);
    expect(tvoc).toBe(100);
  });

  it('should throw for format 3', () => {
    expect(() => fn.readTvocIndex(3, FORMAT_3_NORMAL))
      .toThrowError(/Unsupported format/);
  });

  it('should throw for format 5', () => {
    expect(() => fn.readTvocIndex(5, FORMAT_5_EXAMPLE))
      .toThrowError(/Unsupported format/);
  });
});

describe('readNoxIndex', () => {
  it('should read NOx for format 6', () => {
    // FORMAT_6_NORMAL: byte[14]=75, LSB byte[18]=0x00
    // Value: 75 * 2 + ((0x00 >> 7) & 0x01) = 150 + 0 = 150
    const nox = fn.readNoxIndex(6, FORMAT_6_NORMAL);
    expect(nox).toBe(150);
  });

  it('should read NOx with LSB set for format 6', () => {
    // FORMAT_6_HIGH_POLLUTION: byte[14]=200, LSB byte[18]=0xC0
    // Value: 200 * 2 + ((0xC0 >> 7) & 0x01) = 400 + 1 = 401
    const nox = fn.readNoxIndex(6, FORMAT_6_HIGH_POLLUTION);
    expect(nox).toBe(401);
  });

  it('should read NOx for format 225', () => {
    // FORMAT_225_NORMAL: byte[20]=75, LSB byte[30]=0x00
    const nox = fn.readNoxIndex(225, FORMAT_225_NORMAL);
    expect(nox).toBe(150);
  });

  it('should throw for format 3', () => {
    expect(() => fn.readNoxIndex(3, FORMAT_3_NORMAL))
      .toThrowError(/Unsupported format/);
  });

  it('should throw for format 5', () => {
    expect(() => fn.readNoxIndex(5, FORMAT_5_EXAMPLE))
      .toThrowError(/Unsupported format/);
  });
});

// ============================================
// calc_aqi Tests
// ============================================
describe('calc_aqi', () => {
  it('should return 100 for perfect air quality (low PM2.5 and CO2)', () => {
    // pm25=0, co2=420 (minimum) should give AQI = 100
    const aqi = fn.calc_aqi(0, 420);
    expect(aqi).toBe(100);
  });

  it('should return low value for worst air quality', () => {
    // pm25=60, co2=2300 (maximum) should give AQI close to 0
    // Distance from ideal: sqrt(100^2 + 100^2) = 141.42
    // AQI = 100 - 141.42 = clamped to 0
    const aqi = fn.calc_aqi(60, 2300);
    expect(aqi).toBe(0);
  });

  it('should return intermediate value for moderate pollution', () => {
    const aqi = fn.calc_aqi(15, 800);
    expect(aqi).toBeGreaterThan(50);
    expect(aqi).toBeLessThan(100);
  });

  it('should clamp PM2.5 values above maximum', () => {
    // PM2.5 > 60 should be clamped to 60
    const aqi1 = fn.calc_aqi(100, 420);
    const aqi2 = fn.calc_aqi(60, 420);
    expect(aqi1).toBe(aqi2);
  });

  it('should clamp CO2 values above maximum', () => {
    // CO2 > 2300 should be clamped to 2300
    const aqi1 = fn.calc_aqi(0, 5000);
    const aqi2 = fn.calc_aqi(0, 2300);
    expect(aqi1).toBe(aqi2);
  });

  it('should clamp CO2 values below minimum', () => {
    // CO2 < 420 should be clamped to 420
    const aqi1 = fn.calc_aqi(0, 300);
    const aqi2 = fn.calc_aqi(0, 420);
    expect(aqi1).toBe(aqi2);
  });

  it('should return NaN for NaN PM2.5 input', () => {
    expect(fn.calc_aqi(NaN, 800)).toBeNaN();
  });

  it('should return NaN for NaN CO2 input', () => {
    expect(fn.calc_aqi(15, NaN)).toBeNaN();
  });

  it('should return NaN for both NaN inputs', () => {
    expect(fn.calc_aqi(NaN, NaN)).toBeNaN();
  });

  it('should handle typical indoor values', () => {
    // Typical indoor: PM2.5=10, CO2=600
    const aqi = fn.calc_aqi(10, 600);
    expect(aqi).toBeGreaterThan(70);
    expect(aqi).toBeLessThanOrEqual(100);
  });

  it('should round to integer', () => {
    const aqi = fn.calc_aqi(15, 800);
    expect(Number.isInteger(aqi)).toBe(true);
  });
});

// ============================================
// checkResponseStatus Tests
// ============================================
describe('checkResponseStatus', () => {
  it('should return response when ok is true', () => {
    const mockResponse = { ok: true, status: 200, statusText: 'OK' };
    const result = fn.checkResponseStatus(mockResponse);
    expect(result).toBe(mockResponse);
  });

  it('should throw error when ok is false with 401', () => {
    const mockResponse = { ok: false, status: 401, statusText: 'Unauthorized' };
    expect(() => fn.checkResponseStatus(mockResponse))
      .toThrowError(/Wrong response status : 401/);
  });

  it('should throw error when ok is false with 404', () => {
    const mockResponse = { ok: false, status: 404, statusText: 'Not Found' };
    expect(() => fn.checkResponseStatus(mockResponse))
      .toThrowError(/Not Found/);
  });

  it('should throw error when ok is false with 500', () => {
    const mockResponse = { ok: false, status: 500, statusText: 'Internal Server Error' };
    expect(() => fn.checkResponseStatus(mockResponse))
      .toThrowError(/500.*Internal Server Error/);
  });

  it('should include status text in error message', () => {
    const mockResponse = { ok: false, status: 403, statusText: 'Forbidden' };
    expect(() => fn.checkResponseStatus(mockResponse))
      .toThrowError(/Forbidden/);
  });
});

// ============================================
// Integration: Buffer Factory Tests
// ============================================
describe('Buffer Factory Integration', () => {
  describe('Format 3 factory', () => {
    it('should create valid format 3 buffer with defaults', () => {
      const buffer = createFormat3Buffer();
      expect(fn.readFormat(buffer)).toBe(3);
      expect(() => fn.validateDataFormat(3, buffer)).not.toThrow();
    });

    it('should create buffer with custom values', () => {
      const buffer = createFormat3Buffer({
        temperature: 30.5,
        humidity: 75,
        battery: 3000
      });
      expect(fn.readTemperature(3, buffer)).toBeCloseTo(30.5, 0);
      expect(fn.readHumidity(3, buffer)).toBe(75);
      expect(fn.readBattery(3, buffer)).toBe(3000);
    });
  });

  describe('Format 5 factory', () => {
    it('should create valid format 5 buffer with defaults', () => {
      const buffer = createFormat5Buffer();
      expect(fn.readFormat(buffer)).toBe(5);
      expect(() => fn.validateDataFormat(5, buffer)).not.toThrow();
    });

    it('should create buffer with custom values', () => {
      const buffer = createFormat5Buffer({
        temperature: -10.0,
        humidity: 90.0,
        movementCounter: 100,
        sequenceNumber: 1000
      });
      expect(fn.readTemperature(5, buffer)).toBeCloseTo(-10.0, 0);
      expect(fn.readHumidity(5, buffer)).toBeCloseTo(90.0, 0);
      expect(fn.readMovementCounter(5, buffer)).toBe(100);
      expect(fn.readSequenceNumber(5, buffer)).toBe(1000);
    });
  });

  describe('Format 6 factory', () => {
    it('should create valid format 6 buffer with defaults', () => {
      const buffer = createFormat6Buffer();
      expect(fn.readFormat(buffer)).toBe(6);
      expect(() => fn.validateDataFormat(6, buffer)).not.toThrow();
    });

    it('should create buffer with custom air quality values', () => {
      const buffer = createFormat6Buffer({
        co2: 1200,
        pm25: 25.0
      });
      expect(fn.readCo2(6, buffer)).toBe(1200);
      expect(fn.readPm25(6, buffer)).toBeCloseTo(25.0, 0);
    });
  });

  describe('Format 225 factory', () => {
    it('should create valid format 225 buffer with defaults', () => {
      const buffer = createFormat225Buffer();
      expect(fn.readFormat(buffer)).toBe(225);
      expect(() => fn.validateDataFormat(225, buffer)).not.toThrow();
    });

    it('should create buffer with all PM values', () => {
      const buffer = createFormat225Buffer({
        pm1: 2.0,
        pm25: 5.0,
        pm4: 8.0,
        pm10: 12.0
      });
      expect(fn.readPm1(225, buffer)).toBeCloseTo(2.0, 0);
      expect(fn.readPm25(225, buffer)).toBeCloseTo(5.0, 0);
      expect(fn.readPm4(225, buffer)).toBeCloseTo(8.0, 0);
      expect(fn.readPm10(225, buffer)).toBeCloseTo(12.0, 0);
    });
  });
});
