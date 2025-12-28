/**
 * Helper functions for creating custom test buffers
 * Use these factories to create buffers with specific values for edge case testing
 */

/**
 * Create a Format 3 buffer with custom values
 * @param {Object} opts - Options for buffer values
 * @param {number} [opts.humidity=51] - Humidity in % (will be stored as value * 2)
 * @param {number} [opts.temperature=24.0] - Temperature in C (integer + fractional)
 * @param {number} [opts.pressure=754.96] - Pressure in hPa
 * @param {number} [opts.accelX=4] - Acceleration X in mG
 * @param {number} [opts.accelY=-4] - Acceleration Y in mG
 * @param {number} [opts.accelZ=1036] - Acceleration Z in mG
 * @param {number} [opts.battery=2954] - Battery in mV
 * @returns {Buffer} 16-byte Format 3 buffer
 */
export function createFormat3Buffer(opts = {}) {
  const defaults = {
    humidity: 51,
    temperature: 24.0,
    pressure: 754.96,
    accelX: 4,
    accelY: -4,
    accelZ: 1036,
    battery: 2954
  };
  const values = { ...defaults, ...opts };

  const buffer = Buffer.alloc(16);
  buffer.writeUInt8(0x99, 0);       // Header
  buffer.writeUInt8(0x04, 1);       // Header
  buffer.writeUInt8(0x03, 2);       // Format 3

  // Humidity: stored as value * 2 (0.5% steps)
  buffer.writeUInt8(Math.round(values.humidity * 2), 3);

  // Temperature: integer byte + fractional byte (value / 100)
  const tempInt = Math.floor(values.temperature);
  const tempFrac = Math.round(Math.abs(values.temperature - tempInt) * 100);
  buffer.writeInt8(tempInt, 4);
  buffer.writeUInt8(tempFrac, 5);

  // Pressure: (value - 500) * 100
  buffer.writeUInt16BE(Math.round((values.pressure - 500) * 100), 6);

  // Acceleration XYZ (signed int16)
  buffer.writeInt16BE(values.accelX, 8);
  buffer.writeInt16BE(values.accelY, 10);
  buffer.writeInt16BE(values.accelZ, 12);

  // Battery (direct mV)
  buffer.writeUInt16BE(values.battery, 14);

  return buffer;
}

/**
 * Create a Format 5 buffer with custom values
 * @param {Object} opts - Options for buffer values
 * @param {number} [opts.temperature=24.3] - Temperature in C (0.005 resolution)
 * @param {number} [opts.humidity=53.49] - Humidity in % (0.0025 resolution)
 * @param {number} [opts.pressure=1000.44] - Pressure in hPa
 * @param {number} [opts.accelX=4] - Acceleration X in mG
 * @param {number} [opts.accelY=-4] - Acceleration Y in mG
 * @param {number} [opts.accelZ=1036] - Acceleration Z in mG
 * @param {number} [opts.battery=2977] - Battery in mV
 * @param {number} [opts.movementCounter=66] - Movement counter (0-255)
 * @param {number} [opts.sequenceNumber=205] - Sequence number (0-65535)
 * @param {number[]} [opts.mac] - MAC address bytes (6 bytes)
 * @returns {Buffer} 26-byte Format 5 buffer
 */
export function createFormat5Buffer(opts = {}) {
  const defaults = {
    temperature: 24.3,
    humidity: 53.49,
    pressure: 1000.44,
    accelX: 4,
    accelY: -4,
    accelZ: 1036,
    battery: 2977,
    movementCounter: 66,
    sequenceNumber: 205,
    mac: [0xCB, 0xB8, 0x33, 0x4C, 0x88, 0x4F]
  };
  const values = { ...defaults, ...opts };

  const buffer = Buffer.alloc(26);
  buffer.writeUInt8(0x99, 0);
  buffer.writeUInt8(0x04, 1);
  buffer.writeUInt8(0x05, 2);

  // Temperature: value / 0.005
  buffer.writeInt16BE(Math.round(values.temperature / 0.005), 3);

  // Humidity: value / 0.0025
  buffer.writeUInt16BE(Math.round(values.humidity / 0.0025), 5);

  // Pressure: (value - 500) * 100
  buffer.writeUInt16BE(Math.round((values.pressure - 500) * 100), 7);

  // Acceleration XYZ
  buffer.writeInt16BE(values.accelX, 9);
  buffer.writeInt16BE(values.accelY, 11);
  buffer.writeInt16BE(values.accelZ, 13);

  // Battery: (voltage - 1600) << 5 (simplified, ignores TX power bits)
  buffer.writeUInt16BE((values.battery - 1600) << 5, 15);

  // Movement counter
  buffer.writeUInt8(values.movementCounter, 17);

  // Sequence number
  buffer.writeUInt16BE(values.sequenceNumber, 18);

  // MAC address
  for (let i = 0; i < 6; i++) {
    buffer.writeUInt8(values.mac[i], 20 + i);
  }

  return buffer;
}

/**
 * Create a Format 6 buffer (Ruuvi Air)
 * @param {Object} opts - Options for buffer values
 * @param {number} [opts.temperature=22.0] - Temperature in C
 * @param {number} [opts.humidity=60.0] - Humidity in %
 * @param {number} [opts.pressure=1001.0] - Pressure in hPa
 * @param {number} [opts.pm25=15.0] - PM2.5 in ug/m3
 * @param {number} [opts.co2=800] - CO2 in ppm
 * @param {number} [opts.tvocIndex=100] - TVOC index
 * @param {number} [opts.noxIndex=150] - NOx index
 * @param {number} [opts.sequence=120] - Sequence counter (0-255)
 * @returns {Buffer} 22-byte Format 6 buffer
 */
export function createFormat6Buffer(opts = {}) {
  const defaults = {
    temperature: 22.0,
    humidity: 60.0,
    pressure: 1001.0,
    pm25: 15.0,
    co2: 800,
    tvocIndex: 100,
    noxIndex: 150,
    sequence: 120
  };
  const values = { ...defaults, ...opts };

  const buffer = Buffer.alloc(22);
  buffer.writeUInt8(0x99, 0);
  buffer.writeUInt8(0x04, 1);
  buffer.writeUInt8(0x06, 2);

  // Temperature: value / 0.005
  buffer.writeInt16BE(Math.round(values.temperature / 0.005), 3);

  // Humidity: value / 0.0025
  buffer.writeUInt16BE(Math.round(values.humidity / 0.0025), 5);

  // Pressure: (value - 500) * 100
  buffer.writeUInt16BE(Math.round((values.pressure - 500) * 100), 7);

  // PM2.5: value / 0.1
  buffer.writeUInt16BE(Math.round(values.pm25 / 0.1), 9);

  // CO2: direct ppm
  buffer.writeUInt16BE(values.co2, 11);

  // TVOC and NOx: split into base byte and LSB
  buffer.writeUInt8(Math.floor(values.tvocIndex / 2), 13);
  buffer.writeUInt8(Math.floor(values.noxIndex / 2), 14);

  // Sequence
  buffer.writeUInt8(values.sequence, 17);

  // LSB byte for TVOC (bit 6) and NOx (bit 7)
  const lsbByte = ((values.tvocIndex % 2) << 6) | ((values.noxIndex % 2) << 7);
  buffer.writeUInt8(lsbByte, 18);

  return buffer;
}

/**
 * Create a Format 225 (E1) buffer (Ruuvi Air Extended)
 * @param {Object} opts - Options for buffer values
 * @param {number} [opts.temperature=25.0] - Temperature in C
 * @param {number} [opts.humidity=50.0] - Humidity in %
 * @param {number} [opts.pressure=1002.0] - Pressure in hPa
 * @param {number} [opts.pm1=5.0] - PM1 in ug/m3
 * @param {number} [opts.pm25=10.0] - PM2.5 in ug/m3
 * @param {number} [opts.pm4=12.0] - PM4 in ug/m3
 * @param {number} [opts.pm10=15.0] - PM10 in ug/m3
 * @param {number} [opts.co2=650] - CO2 in ppm
 * @param {number} [opts.tvocIndex=100] - TVOC index
 * @param {number} [opts.noxIndex=150] - NOx index
 * @param {number} [opts.sequence=12345] - Sequence counter (24-bit)
 * @returns {Buffer} 46-byte Format 225 buffer
 */
export function createFormat225Buffer(opts = {}) {
  const defaults = {
    temperature: 25.0,
    humidity: 50.0,
    pressure: 1002.0,
    pm1: 5.0,
    pm25: 10.0,
    pm4: 12.0,
    pm10: 15.0,
    co2: 650,
    tvocIndex: 100,
    noxIndex: 150,
    sequence: 12345
  };
  const values = { ...defaults, ...opts };

  const buffer = Buffer.alloc(46);
  buffer.writeUInt8(0x99, 0);
  buffer.writeUInt8(0x04, 1);
  buffer.writeUInt8(0xE1, 2);       // Format 225 (0xE1)

  // Temperature: value / 0.005
  buffer.writeInt16BE(Math.round(values.temperature / 0.005), 3);

  // Humidity: value / 0.0025
  buffer.writeUInt16BE(Math.round(values.humidity / 0.0025), 5);

  // Pressure: (value - 500) * 100
  buffer.writeUInt16BE(Math.round((values.pressure - 500) * 100), 7);

  // PM values: value / 0.1
  buffer.writeUInt16BE(Math.round(values.pm1 / 0.1), 9);
  buffer.writeUInt16BE(Math.round(values.pm25 / 0.1), 11);
  buffer.writeUInt16BE(Math.round(values.pm4 / 0.1), 13);
  buffer.writeUInt16BE(Math.round(values.pm10 / 0.1), 15);

  // CO2: direct ppm
  buffer.writeUInt16BE(values.co2, 17);

  // TVOC and NOx
  buffer.writeUInt8(Math.floor(values.tvocIndex / 2), 19);
  buffer.writeUInt8(Math.floor(values.noxIndex / 2), 20);

  // Sequence (24-bit)
  buffer.writeUIntBE(values.sequence, 27, 3);

  // LSB byte for TVOC (bit 6) and NOx (bit 7)
  const lsbByte = ((values.tvocIndex % 2) << 6) | ((values.noxIndex % 2) << 7);
  buffer.writeUInt8(lsbByte, 30);

  return buffer;
}
