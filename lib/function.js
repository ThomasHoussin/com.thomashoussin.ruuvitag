exports.readFormat = function (buffer) {
    return buffer[2];
}

exports.validateDataFormat = function(format, buffer) {
    if (format == 5 && buffer.length == 26 && buffer[2] == 5) return buffer;
    else if (format == 3 && buffer.length == 16 && buffer[2] == 3) return buffer;
    else {
        console.log(`Unexpected data in buffer : ${buffer}`);
        throw new Error(`Unexpected data in buffer : ${buffer}`);
    }
}

exports.readTemperature = function(format, buffer) {
    if (format == 5) return buffer.readInt16BE(3) * 0.005;
    else if (format == 3) return buffer.readInt8(4) + buffer.readUInt8(5) / 100;
    else throw new Error(`Unsupported format detected`);
}

exports.readHumidity = function(format, buffer) {
    if (format == 5) return buffer.readUInt16BE(5) * 0.0025;
    else if (format == 3) return buffer.readUInt8(3) * 0.5;
    else throw new Error(`Unsupported format detected`);
}

exports.readPressure = function(format, buffer) {
    if (format == 5) return buffer.readUInt16BE(7) / 100 + 500;
    else if (format == 3) return buffer.readUInt16BE(6) / 100 + 500;
    else throw new Error(`Unsupported format detected`);
}

exports.readBattery = function(format, buffer) {
    if (format == 5) {
        return (buffer.readUInt16BE(15) >> 5) + 1600;
    }
    else if (format == 3) {
        return buffer.readUInt16BE(14);
    }
    else throw new Error(`Unsupported format detected`);
}

exports.estimateBattery = function(voltage, settings) {
    //we try to estimate battery life
    //see https://github.com/ruuvi/ruuvitag_fw/wiki/FAQ:-battery 
    //default settings is 2.5V for min value, but it can be adjusted (depending on temperature, etc.)

    let percent = (voltage - settings.batt_mini) / (settings.batt_maxi - settings.batt_mini) * 100;

    if (percent > 100) percent = 100;
    else if (percent < 0) percent = 0;

    return percent;
}

exports.readMovementCounter = function(format, buffer) {
    if (format == 5) return buffer.readUInt8(17);
    else if (format == 3) throw new Error('movement unsupported on v3 data format');
    else throw new Error(`Unsupported format detected`);
}

exports.readAccelerationX = function(format, buffer) {
    if (format == 5) return buffer.readInt16BE(9);
    else if (format == 3) return buffer.readInt16BE(8);
    else throw new Error(`Unsupported format detected`);
}

exports.readAccelerationY = function(format, buffer) {
    if (format == 5) return buffer.readInt16BE(11);
    else if (format == 3) return buffer.readInt16BE(10);
    else throw new Error(`Unsupported format detected`);
}

exports.readAccelerationZ = function(format, buffer) {
    if (format == 5) return buffer.readInt16BE(13);
    else if (format == 3) return buffer.readInt16BE(12);
    else throw new Error(`Unsupported format detected`);
}

exports.readSequenceNumber = function(format, buffer) {
    if (format == 5) return buffer.readUInt16BE(18);
    else if (format == 3) throw new Error(`Sequence number unsupported on v3 data format`);
    else throw new Error(`Unsupported format detected`);
}

exports.computeAcceleration = function(accelerationX, accelerationY, accelerationZ) {
    return Math.sqrt(Math.pow(accelerationX, 2) +
        Math.pow(accelerationY, 2)
        + Math.pow(accelerationZ, 2));
}

exports.checkResponseStatus = function(res) {
    if (res.ok) {
        return res
    } else {
        console.log(`Wrong response status : ${res.status} (${res.statusText})`);
        throw new Error(`Wrong response status : ${res.status} (${res.statusText})`);
    }
}