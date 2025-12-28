/**
 * Test buffers for RuuviTag data formats
 *
 * Format 3 (RAWv1): 16 bytes - Basic sensors, direct values
 * Format 5 (RAWv2): 26 bytes - Extended precision, movement counter
 * Format 6: 22 bytes - Ruuvi Air
 * Format 225 (E1): 46 bytes - Ruuvi Air Extended
 */

// ============================================
// Format 3 (RAWv1) - 16 bytes
// Structure: Header(2) + Format(1) + Humidity(1) + Temp(2) + Pressure(2) + AccelXYZ(6) + Battery(2)
// ============================================

export const FORMAT_3_NORMAL = Buffer.from([
  0x99, 0x04,        // Manufacturer ID header
  0x03,              // Format 3
  0x66,              // Humidity: 102 * 0.5 = 51%
  0x18, 0x00,        // Temperature: 24 integer + 0 fractional = 24.00 C
  0x63, 0x98,        // Pressure: 25496 / 100 + 500 = 754.96 hPa
  0x00, 0x04,        // Accel X: 4 mG
  0xFF, 0xFC,        // Accel Y: -4 mG (signed)
  0x04, 0x0C,        // Accel Z: 1036 mG
  0x0B, 0x8A         // Battery: 2954 mV
]);

export const FORMAT_3_NEGATIVE_TEMP = Buffer.from([
  0x99, 0x04, 0x03,
  0x66,              // Humidity: 51%
  0xF6, 0x50,        // Temperature: -10 integer + 80 fractional = -9.2 C (formula: int + frac/100)
  0x63, 0x98,        // Pressure: 754.96 hPa
  0x00, 0x04, 0xFF, 0xFC, 0x04, 0x0C,  // Acceleration XYZ
  0x0B, 0x8A         // Battery: 2954 mV
]);

export const FORMAT_3_ZERO_VALUES = Buffer.from([
  0x99, 0x04, 0x03,
  0x00,              // Humidity: 0%
  0x00, 0x00,        // Temperature: 0.00 C
  0x00, 0x00,        // Pressure: 500 hPa (minimum)
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00,  // Acceleration: all zeros
  0x00, 0x00         // Battery: 0 mV
]);

// ============================================
// Format 5 (RAWv2) - 26 bytes - From CLAUDE.md example
// Structure: Header(2) + Format(1) + Temp(2) + Humidity(2) + Pressure(2) +
//            AccelXYZ(6) + Power(2) + Movement(1) + Sequence(2) + MAC(6)
// ============================================

// Format 5 buffer with header prepended (0x9904 + payload from CLAUDE.md)
// Original payload: 0512fc5394c37c0004fffc040cac364200cdcbb8334c884f (24 bytes)
// With header: 99040512fc5394c37c0004fffc040cac364200cdcbb8334c884f (26 bytes)
export const FORMAT_5_EXAMPLE = Buffer.from(
  '99040512fc5394c37c0004fffc040cac364200cdcbb8334c884f',
  'hex'
);
// Decoded values from CLAUDE.md:
// - Temperature: (0x12FC = 4860) * 0.005 = 24.3 C
// - Humidity: (0x5394 = 21396) * 0.0025 = 53.49%
// - Pressure: (0xC37C = 50044) / 100 + 500 = 1000.44 hPa
// - Accel X: 0x0004 = 4 mG
// - Accel Y: 0xFFFC = -4 mG (signed)
// - Accel Z: 0x040C = 1036 mG
// - Battery: (0xAC36 >> 5) + 1600 = 2977 mV
// - Movement counter: 0x42 = 66
// - Sequence: 0x00CD = 205

export const FORMAT_5_UNSUPPORTED_HUMIDITY = Buffer.from([
  0x99, 0x04, 0x05,
  0x12, 0xFC,        // Temperature: 24.3 C
  0xFF, 0xFF,        // Humidity: 0xFFFF = unsupported
  0xC3, 0x7C,        // Pressure: 1000.44 hPa
  0x00, 0x04, 0xFF, 0xFC, 0x04, 0x0C,  // Acceleration XYZ
  0xAC, 0x36,        // Power info
  0x42,              // Movement counter: 66
  0x00, 0xCD,        // Sequence number: 205
  0xCB, 0xB8, 0x33, 0x4C, 0x88, 0x4F  // MAC
]);

export const FORMAT_5_UNSUPPORTED_PRESSURE = Buffer.from([
  0x99, 0x04, 0x05,
  0x12, 0xFC,        // Temperature: 24.3 C
  0x53, 0x94,        // Humidity: 53.49%
  0xFF, 0xFF,        // Pressure: 0xFFFF = unsupported
  0x00, 0x04, 0xFF, 0xFC, 0x04, 0x0C,  // Acceleration XYZ
  0xAC, 0x36,        // Power info
  0x42,              // Movement counter: 66
  0x00, 0xCD,        // Sequence number: 205
  0xCB, 0xB8, 0x33, 0x4C, 0x88, 0x4F  // MAC
]);

export const FORMAT_5_NEGATIVE_TEMP = Buffer.from([
  0x99, 0x04, 0x05,
  0xFC, 0x18,        // Temperature: -1000 * 0.005 = -5.0 C (signed int16)
  0x53, 0x94,        // Humidity: 53.49%
  0xC3, 0x7C,        // Pressure: 1000.44 hPa
  0x00, 0x04, 0xFF, 0xFC, 0x04, 0x0C,  // Acceleration XYZ
  0xAC, 0x36,        // Power info
  0x42,              // Movement counter: 66
  0x00, 0xCD,        // Sequence number: 205
  0xCB, 0xB8, 0x33, 0x4C, 0x88, 0x4F  // MAC
]);

export const FORMAT_5_UNSUPPORTED_TEMP = Buffer.from([
  0x99, 0x04, 0x05,
  0x80, 0x00,        // Temperature: 0x8000 = -32768 * 0.005 = -163.84 C (unsupported marker)
  0x53, 0x94,        // Humidity: 53.49%
  0xC3, 0x7C,        // Pressure: 1000.44 hPa
  0x00, 0x04, 0xFF, 0xFC, 0x04, 0x0C,  // Acceleration XYZ
  0xAC, 0x36,        // Power info
  0x42,              // Movement counter: 66
  0x00, 0xCD,        // Sequence number: 205
  0xCB, 0xB8, 0x33, 0x4C, 0x88, 0x4F  // MAC
]);

// ============================================
// Format 6 - 22 bytes (Ruuvi Air)
// Structure: Header(2) + Format(1) + Temp(2) + Humidity(2) + Pressure(2) +
//            PM2.5(2) + CO2(2) + TVOC(1) + NOx(1) + Reserved(3) + Sequence(1) + Flags(1) + Reserved(2)
// ============================================

export const FORMAT_6_NORMAL = (() => {
  const buffer = Buffer.alloc(22);
  buffer.writeUInt8(0x99, 0);        // Header
  buffer.writeUInt8(0x04, 1);        // Header
  buffer.writeUInt8(0x06, 2);        // Format 6
  buffer.writeInt16BE(4400, 3);      // Temperature: 4400 * 0.005 = 22.0 C
  buffer.writeUInt16BE(24000, 5);    // Humidity: 24000 * 0.0025 = 60%
  buffer.writeUInt16BE(50100, 7);    // Pressure: 50100 / 100 + 500 = 1001 hPa
  buffer.writeUInt16BE(150, 9);      // PM2.5: 150 * 0.1 = 15.0 ug/m3
  buffer.writeUInt16BE(800, 11);     // CO2: 800 ppm
  buffer.writeUInt8(50, 13);         // TVOC base: 50 * 2 = 100 (+ LSB)
  buffer.writeUInt8(75, 14);         // NOx base: 75 * 2 = 150 (+ LSB)
  buffer.writeUInt8(0, 15);          // Reserved
  buffer.writeUInt8(0, 16);          // Reserved
  buffer.writeUInt8(120, 17);        // Sequence counter: 120
  buffer.writeUInt8(0x00, 18);       // LSB byte for TVOC/NOx (both 0)
  return buffer;
})();

export const FORMAT_6_HIGH_POLLUTION = (() => {
  const buffer = Buffer.alloc(22);
  buffer.writeUInt8(0x99, 0);
  buffer.writeUInt8(0x04, 1);
  buffer.writeUInt8(0x06, 2);
  buffer.writeInt16BE(5000, 3);      // Temperature: 25.0 C
  buffer.writeUInt16BE(20000, 5);    // Humidity: 50%
  buffer.writeUInt16BE(50000, 7);    // Pressure: 1000 hPa
  buffer.writeUInt16BE(500, 9);      // PM2.5: 50.0 ug/m3 (high)
  buffer.writeUInt16BE(2000, 11);    // CO2: 2000 ppm (high)
  buffer.writeUInt8(200, 13);        // TVOC: 400+
  buffer.writeUInt8(200, 14);        // NOx: 400+
  buffer.writeUInt8(0, 15);
  buffer.writeUInt8(0, 16);
  buffer.writeUInt8(255, 17);        // Sequence: max 8-bit
  buffer.writeUInt8(0xC0, 18);       // LSB byte: both bits set
  return buffer;
})();

// ============================================
// Format 225 (E1) - 46 bytes (Ruuvi Air Extended)
// Structure: Header(2) + Format(1) + Temp(2) + Humidity(2) + Pressure(2) +
//            PM1(2) + PM2.5(2) + PM4(2) + PM10(2) + CO2(2) + TVOC(1) + NOx(1) +
//            Reserved(6) + Sequence(3) + Flags(1) + Reserved(5) + MAC(6)
// ============================================

export const FORMAT_225_NORMAL = (() => {
  const buffer = Buffer.alloc(46);
  buffer.writeUInt8(0x99, 0);        // Header
  buffer.writeUInt8(0x04, 1);        // Header
  buffer.writeUInt8(0xE1, 2);        // Format 225 (0xE1)
  buffer.writeInt16BE(5000, 3);      // Temperature: 5000 * 0.005 = 25.0 C
  buffer.writeUInt16BE(20000, 5);    // Humidity: 20000 * 0.0025 = 50%
  buffer.writeUInt16BE(50200, 7);    // Pressure: 50200 / 100 + 500 = 1002 hPa
  buffer.writeUInt16BE(50, 9);       // PM1: 50 * 0.1 = 5.0 ug/m3
  buffer.writeUInt16BE(100, 11);     // PM2.5: 100 * 0.1 = 10.0 ug/m3
  buffer.writeUInt16BE(120, 13);     // PM4: 120 * 0.1 = 12.0 ug/m3
  buffer.writeUInt16BE(150, 15);     // PM10: 150 * 0.1 = 15.0 ug/m3
  buffer.writeUInt16BE(650, 17);     // CO2: 650 ppm
  buffer.writeUInt8(50, 19);         // TVOC base: 100
  buffer.writeUInt8(75, 20);         // NOx base: 150
  // Reserved bytes 21-26
  buffer.writeUIntBE(12345, 27, 3);  // Sequence: 24-bit = 12345
  buffer.writeUInt8(0x00, 30);       // LSB byte for TVOC/NOx
  // Reserved and MAC bytes remain zero
  return buffer;
})();

export const FORMAT_225_MAX_SEQUENCE = (() => {
  const buffer = Buffer.from(FORMAT_225_NORMAL);
  buffer.writeUIntBE(0xFFFFFF, 27, 3);  // Sequence: max 24-bit = 16777215
  return buffer;
})();

// ============================================
// Invalid buffers for error testing
// ============================================

// Too short for format 5
export const INVALID_LENGTH_FORMAT_5 = Buffer.from([0x99, 0x04, 0x05, 0x00]);

// Length OK (26 bytes) but wrong format byte (says 3 instead of 5)
export const INVALID_FORMAT_MISMATCH = (() => {
  const buffer = Buffer.alloc(26);
  buffer.writeUInt8(0x03, 2);  // Says format 3 but has 26 bytes
  return buffer;
})();

// Unknown format code
export const INVALID_UNKNOWN_FORMAT = (() => {
  const buffer = Buffer.alloc(16);
  buffer.writeUInt8(0x99, 2);  // Unknown format 0x99
  return buffer;
})();

// Empty buffer
export const INVALID_EMPTY = Buffer.alloc(0);

// Very short buffer (less than 3 bytes for format detection)
export const INVALID_TOO_SHORT = Buffer.from([0x99, 0x04]);
