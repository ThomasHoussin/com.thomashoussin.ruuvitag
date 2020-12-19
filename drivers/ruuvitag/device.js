'use strict';

const Homey = require('homey');

class Tag extends Homey.Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
      this.log('RuuviTag device has been initialized');
      this.addListener('updateTag', this.updateTag);
   }


  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
      this.log('RuuviTag device has been added');
  }

  /**
   * onSettings is called when the user updates the device's settings.
   * @param {object} event the onSettings event data
   * @param {object} event.oldSettings The old settings object
   * @param {object} event.newSettings The new settings object
   * @param {string[]} event.changedKeys An array of keys changed since the previous version
   * @returns {Promise<string|void>} return a custom message that will be displayed
   */
  async onSettings(oldSettings, newSettings, changedKeys) {
      this.log('RuuviTag device settings where changed');
      if (this.getCapabilityValue('onoff')) this.setStoreValue('TTL', newSettings.TTL);
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
      this.log('RuuviTag device was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
      this.log('RuuviTag device has been deleted');
  }

    async updateTag(foundDevices) {
        console.log(`Updating RuuviTag ${this.getName()}`);
        let deviceData = this.getData();
        let settings = this.getSettings();

        foundDevices.then(devices => devices.find(bleAdv => bleAdv.uuid == deviceData.uuid))
            .then(bleAdv => {
                if (bleAdv != undefined) {
                    this.setCapabilityValue('measure_rssi', bleAdv.rssi);
                    return bleAdv.manufacturerData;
                }
                else throw new Error(`No scanned data for device ${this.getName()}`);
            })
            .then(buffer => {
                if (deviceData.dataformat == readFormat(buffer)) return validateDataFormat(deviceData.dataformat, buffer);
                else {
                    console.log(`Difference between dataFormat and read data for ${this.getName()} with uuid ${deviceData.uuid}`);
                    throw new Error(`Unexpected data in buffer : ${buffer}`);
                }
            })
            .then(buffer => {
                //marking device as present
                this.setInsideRange();

                this.setCapabilityValue('measure_temperature', readTemperature(deviceData.dataformat, buffer));
                this.setCapabilityValue('measure_pressure', readPressure(deviceData.dataformat, buffer));
                this.setCapabilityValue('measure_humidity', readHumidity(deviceData.dataformat, buffer));
                this.setCapabilityValue('measure_battery', readBattery(deviceData.dataformat, buffer, settings));
                this.setCapabilityValue('acceleration', computeAcceleration(deviceData.dataformat, buffer));

                if (this.hasCapability('alarm_motion') && settings.motiondetection) {
                    let last_movement_counter = this.getStoreValue('movement_counter');
                    let movement_counter = readMovementCounter(deviceData.dataformat, buffer);
                    this.setStoreValue('movement_counter', movement_counter);

                    if (typeof last_movement_counter == 'number') {
                        let rate = movement_counter - last_movement_counter;
                        if (rate < 0) rate += 255;
                        if (rate > settings.movement_rate) this.setCapabilityValue('alarm_motion', true);
                        else this.setCapabilityValue('alarm_motion', false);
                    }
                }
            })
            .catch(error => {
                console.log(`Error/no data available when updating Tag ${this.getName()} with uuid ${deviceData.uuid}`);
                console.log(error);
                //decreasing TTL
                let TTL = this.getStoreValue('TTL') - 1; 
                this.setStoreValue('TTL', TTL);
                //marking as away if TTL = 0 
                if(TTL <= 0) this.setOutsideRange();
            }); 
    }

    setInsideRange() {
        this.setStoreValue('TTL', this.getSetting('TTL'));

        //showing token as on
        if (!this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', true);

            //registering notification
            new Homey.Notification({
                excerpt: `RuuviTag ${this.getName()} entered range`
            })
                .register();

            //launching trigger
            this.getDriver().RuuviTagEnteredRange.trigger(this, {
                'name': this.getName(),
                'uuid': this.getData().uuid
            })
                .then(function () {
                    Homey.app.log('Done trigger flow card ruuvitag_entered_range');
                })
                .catch(function (error) {
                    Homey.app.log('Cannot trigger flow card ruuvitag_entered_range: ' + error);
                });
        }
    }

    setOutsideRange() {
        this.setStoreValue('TTL', 0);    

        //trigger only if state changed
        if (this.getCapabilityValue('onoff')) {
            //showing token as off
            this.setCapabilityValue('onoff', false);

            //registering notification
            new Homey.Notification({
                excerpt: `RuuviTag ${this.getName()} exited range`
            })
                .register();

            //launching trigger
            this.getDriver().RuuviTagExitedRange.trigger(this, {
                'name': this.getName(),
                'uuid': this.getData().uuid
            })
                .then(function () {
                    Homey.app.log('Done trigger flow card ruuvitag_exited_range');
                })
                .catch(function (error) {
                    Homey.app.log('Cannot trigger flow card ruuvitag_exited_range: ' + error);
                });
        }
    }
}

module.exports = Tag ;

function readFormat(buffer) {
    return buffer[2];
}

function validateDataFormat(format, buffer) {
    if (format == 5 && buffer.length == 26 && buffer[2] == 5) return buffer;
    else if (format == 3 && buffer.length == 16 && buffer[2] == 3) return buffer;
    else {
        console.log(`Unexpected data in buffer : ${buffer}`);
        throw new Error(`Unexpected data in buffer : ${buffer}`);
    }
}

function readTemperature(format, buffer) {
    if (format == 5) return buffer.readInt16BE(3) * 0.005;
    else if (format == 3) return buffer.readInt8(4) + buffer.readUInt8(5) / 100;
    else throw new Error(`Unsupported format detected`);
}

function readHumidity(format, buffer) {
    if (format == 5) return buffer.readUInt16BE(5) * 0.0025 ;
    else if (format == 3) return buffer.readUInt8(3) * 0.5;
    else throw new Error(`Unsupported format detected`);
}

function readPressure(format, buffer) {
    if (format == 5) return buffer.readUInt16BE(7) + 50000;
    else if (format == 3) return buffer.readUInt16BE(6) + 50000;
    else throw new Error(`Unsupported format detected`);
}

function readBattery(format, buffer, settings) {
    if (format == 5) {
        let voltage = (buffer.readUInt16BE(15) >> 5) + 1600;
        return (voltage - settings.batt_mini) / (settings.batt_maxi - settings.batt_mini) * 100;
    }
    else if (format == 3) {
        let voltage = buffer.readUInt16BE(14);
        return (voltage - settings.batt_mini) / (settings.batt_maxi - settings.batt_mini) * 100;
    }
    else throw new Error(`Unsupported format detected`);
}

function readMovementCounter(format, buffer) {
    if (format == 5) return buffer.readUInt8(17) ;
    else if (format == 3) console.log('movement unsupported on v3 data format');
    else throw new Error(`Unsupported format detected`);
}

function readAccelerationX(format, buffer) {
    if (format == 5) return buffer.readInt16BE(9);
    else if (format == 3) return buffer.readUInt16BE(8);
    else throw new Error(`Unsupported format detected`);
}

function readAccelerationY(format, buffer) {
    if (format == 5) return buffer.readInt16BE(11);
    else if (format == 3) return buffer.readUInt16BE(10);
    else throw new Error(`Unsupported format detected`);
}

function readAccelerationZ(format, buffer) {
    if (format == 5) return buffer.readInt16BE(13);
    else if (format == 3) return buffer.readUInt16BE(12);
    else throw new Error(`Unsupported format detected`);
}

function computeAcceleration(format, buffer) {
    return Math.sqrt(Math.pow(readAccelerationX(format, buffer), 2) +
        Math.pow(readAccelerationY(format, buffer), 2)
        + Math.pow(readAccelerationZ(format, buffer), 2)) / 1000; 
}