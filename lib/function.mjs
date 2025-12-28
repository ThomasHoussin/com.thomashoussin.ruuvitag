export function readFormat(buffer) {
    return buffer.readUInt8(2);
}

export function validateDataFormat(format, buffer) {
    if (format == 5 && buffer.length == 26 && buffer.readUInt8(2) == 5) return buffer;
    else if (format == 3 && buffer.length == 16 && buffer.readUInt8(2) == 3) return buffer;
    else if (format == 6 && buffer.length == 22 && buffer.readUInt8(2) == 6) return buffer;
    else if (format == 225 && buffer.length == 46 && buffer.readUInt8(2) == 225) return buffer;
    else {
        console.log(`Unexpected data in buffer : ${buffer.toString('hex')} with length ${buffer.length} and format ${format}`);
        throw new Error(`Unexpected data in buffer : ${buffer.toString('hex')} with length ${buffer.length} and format ${format}`);
    }
}

export function readTemperature(format, buffer) {
    if (format == 5 || format == 6 || format == 225) return buffer.readInt16BE(3) * 0.005;
    else if (format == 3) return buffer.readInt8(4) + buffer.readUInt8(5) / 100;
    else throw new Error(`Unsupported format detected`);
}

export function readHumidity(format, buffer) {
    if (format == 5 || format == 6 || format == 225) return buffer.readUInt16BE(5) * 0.0025;
    else if (format == 3) return buffer.readUInt8(3) * 0.5;
    else throw new Error(`Unsupported format detected`);
}

export function readPressure(format, buffer) {
    if (format == 5 || format == 6 || format == 225) return buffer.readUInt16BE(7) / 100 + 500;
    else if (format == 3) return buffer.readUInt16BE(6) / 100 + 500;
    else throw new Error(`Unsupported format detected`);
}

export function readBattery(format, buffer) {
    if (format == 5) {
        return (buffer.readUInt16BE(15) >> 5) + 1600;
    }
    else if (format == 3) {
        return buffer.readUInt16BE(14);
    }
    else throw new Error(`Unsupported format detected`);
}

export function estimateBattery(voltage, settings) {
    //we try to estimate battery life
    //see https://github.com/ruuvi/ruuvitag_fw/wiki/FAQ:-battery
    //default settings is 2.5V for min value, but it can be adjusted (depending on temperature, etc.)

    let percent = (voltage - settings.batt_mini) / (settings.batt_maxi - settings.batt_mini) * 100;

    if (percent > 100) percent = 100;
    else if (percent < 0) percent = 0;

    return percent;
}

export function readMovementCounter(format, buffer) {
    if (format == 5) return buffer.readUInt8(17);
    else if (format == 3) throw new Error('movement unsupported on v3 data format');
    else throw new Error(`Unsupported format detected`);
}

export function readAccelerationX(format, buffer) {
    if (format == 5) return buffer.readInt16BE(9);
    else if (format == 3) return buffer.readInt16BE(8);
    else throw new Error(`Unsupported format detected`);
}

export function readAccelerationY(format, buffer) {
    if (format == 5) return buffer.readInt16BE(11);
    else if (format == 3) return buffer.readInt16BE(10);
    else throw new Error(`Unsupported format detected`);
}

export function readAccelerationZ(format, buffer) {
    if (format == 5) return buffer.readInt16BE(13);
    else if (format == 3) return buffer.readInt16BE(12);
    else throw new Error(`Unsupported format detected`);
}

export function readSequenceNumber(format, buffer) {
    if (format == 5) return buffer.readUInt16BE(18);
    else if (format == 6) return buffer.readUInt8(17);
    else if (format == 225) return buffer.readUIntBE(27, 3);
    else if (format == 3) throw new Error(`Sequence number unsupported on v3 data format`);
    else throw new Error(`Unsupported format detected`);
}

export function computeAcceleration(accelerationX, accelerationY, accelerationZ) {
    return Math.sqrt(Math.pow(accelerationX, 2) +
        Math.pow(accelerationY, 2)
        + Math.pow(accelerationZ, 2));
}

export function checkResponseStatus(res) {
    if (res.ok) {
        return res
    } else {
        console.log(`Wrong response status : ${res.status} (${res.statusText})`);
        throw new Error(`Wrong response status : ${res.status} (${res.statusText})`);
    }
}

export function isTemperatureSupported(format, buffer) {
    if (format == 5 && buffer.readInt16BE(3) == -32768) return false;
    return true;
}

export function isPressureSupported(format, buffer) {
    if (format == 5 && buffer.readUInt16BE(7) == 65535) return false;
    else return true;
}

export function isHumiditySupported(format, buffer) {
    if (format == 5 && buffer.readUInt16BE(5) == 65535) return false;
    else return true;
}

export function readCo2(format, buffer) {
    if (format == 6) return buffer.readUInt16BE(11);
    else if (format == 225) return buffer.readUInt16BE(17);
    else throw new Error(`Unsupported format detected`);
}

export function readPm25(format, buffer) {
    if (format == 6) return buffer.readUInt16BE(9) * 0.1;
    else if (format == 225) return buffer.readUInt16BE(11) * 0.1;
    else throw new Error(`Unsupported format detected`);
}

export function readPm1(format, buffer) {
    if (format == 225) return buffer.readUInt16BE(9) * 0.1;
    else throw new Error(`Unsupported format detected`);
}

export function readPm4(format, buffer) {
    if (format == 225) return buffer.readUInt16BE(13) * 0.1;
    else throw new Error(`Unsupported format detected`);
}

export function readPm10(format, buffer) {
    if (format == 225) return buffer.readUInt16BE(15) * 0.1;
    else throw new Error(`Unsupported format detected`);
}

export function readNoxIndex(format, buffer) {
    if (format == 6) return buffer.readUInt8(14) * 2 + ((buffer.readUInt8(18) >> 7) & 0x01);
    else if (format == 225) return buffer.readUInt8(20) * 2 + ((buffer.readUInt8(30) >> 7) & 0x01);
    else throw new Error(`Unsupported format detected`);
}

export function readTvocIndex(format, buffer) {
    if (format == 6) return buffer.readUInt8(13) * 2 + ((buffer.readUInt8(18) >> 6) & 0x01);
    else if (format == 225) return buffer.readUInt8(19) * 2 + ((buffer.readUInt8(30) >> 6) & 0x01);
    else throw new Error(`Unsupported format detected`);
}

// Reusing AQI calculation provided by Ruuvi
const AQI_MAX = 100;

const PM25_MAX = 60, PM25_MIN = 0;
const PM25_SCALE = AQI_MAX / (PM25_MAX - PM25_MIN);   // ≈ 1.6667

const CO2_MAX = 2300, CO2_MIN = 420;
const CO2_SCALE = AQI_MAX / (CO2_MAX - CO2_MIN);     // ≈ 0.05319

function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

export function calc_aqi(pm25, co2) {
    if (isNaN(pm25) || isNaN(co2)) { return NaN; }

    pm25 = clamp(pm25, PM25_MIN, PM25_MAX);
    co2 = clamp(co2, CO2_MIN, CO2_MAX);

    const dx = (pm25 - PM25_MIN) * PM25_SCALE; // 0..100
    const dy = (co2 - CO2_MIN) * CO2_SCALE;  // 0..100

    const r = Math.hypot(dx, dy);             // sqrt(dx*dx + dy*dy)
    return Math.round(clamp(AQI_MAX - r, 0, AQI_MAX));
}
