'use strict';

const Homey = require('homey');

class Tag extends Homey.Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
      this.log('RuuviTag device has been initialized');
      //v0.1.0 introduced alarm_battery capability
      //we check if this capability is supported and add it if necessary
      if (this.getData().dataformat == 5 && !this.hasCapability('alarm_battery')) {
          console.log(`Adding capability alarm_battery to Ruuvitag ${this.getName()}`);
          this.addCapability('alarm_battery');
      }

      if (this.getData().dataformat == 5 && !this.hasCapability('button.resetbattery')) {
          console.log(`Adding capability button.resetbattery to Ruuvitag ${this.getName()}`);
          this.addCapability('button.resetbattery');
      }

      if (this.getData().dataformat == 5) {
          this.registerCapabilityListener('button.resetbattery', async () => {
              this.setCapabilityValue('alarm_battery', false);
              return;
          });
      }

      this.addListener('updateTag', this.updateTag);
      this.addListener('updateTagFromGateway', this.updateTagFromGateway);
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
                this.setCapabilityValue('measure_battery', estimateBattery(readBattery(deviceData.dataformat, buffer), settings));
                this.setCapabilityValue('acceleration', computeAcceleration(readAccelerationX(deviceData.dataformat, buffer), readAccelerationY(deviceData.dataformat, buffer), readAccelerationZ(deviceData.dataformat, buffer)) / 1000 );

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

                //we try to detect a reset in sequence number
                if (this.hasCapability('alarm_battery')) {
                    let sequenceNumber = this.getStoreValue('sequence_counter');
                    let newSequenceNumber = readSequenceNumber(deviceData.dataformat, buffer);
                    this.setStoreValue('sequence_counter', newSequenceNumber);

                    let elapsed = Date.now() - this.getStoreValue('last_measure');
                    let inc = (elapsed * 1.2) / 1285; 

                    if (newSequenceNumber < sequenceNumber
                        //reset in sequence number. Is this expected ?
                        && sequenceNumber + inc < 65535) {
                        //we use elapsed time to make a rough guess 

                        //reset is probably an anomaly
                        //probably low bat warning
                        //see https://github.com/ruuvi/ruuvitag_fw/wiki/FAQ:-battery for more informations
                        console.log(`RuuviTag ${this.getName()} reset in sequence number`);
                        this.setCapabilityValue('alarm_battery', true);
                    }
                    else {
                        this.setCapabilityValue('alarm_battery', false);
                    }
                }

                //saving timestamp of measure
                this.setStoreValue('last_measure', Date.now());

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

            //registering notification if enabled
            if (this.getSetting('enable_notif')) {
                new Homey.Notification({
                    excerpt: `RuuviTag ${this.getName()} entered range`
                })
                    .register();
            }

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

            //registering notification if enabled
            if (this.getSetting('enable_notif')) {
                new Homey.Notification({
                    excerpt: `RuuviTag ${this.getName()} exited range`
                })
                    .register();
            }

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

    async updateTagFromGateway(tag) {
        let settings = this.getSettings();

        this.setCapabilityValue('measure_rssi', tag.rssi);
        this.setCapabilityValue('measure_temperature', tag.temperature);
        this.setCapabilityValue('measure_pressure', tag.pressure / 100);
        this.setCapabilityValue('measure_humidity', tag.humidity);
        this.setCapabilityValue('measure_battery', estimateBattery(tag.voltage * 1000, settings ));
        this.setCapabilityValue('acceleration', computeAcceleration(tag.accelX, tag.accelY, tag.accelZ));

        if (this.hasCapability('alarm_motion') && settings.motiondetection) {
            let last_movement_counter = this.getStoreValue('movement_counter');
            let movement_counter = tag.movementCounter ;
            this.setStoreValue('movement_counter', movement_counter);

            if (typeof last_movement_counter == 'number') {
                let rate = movement_counter - last_movement_counter;
                if (rate < 0) rate += 255;
                if (rate > settings.movement_rate) this.setCapabilityValue('alarm_motion', true);
                else this.setCapabilityValue('alarm_motion', false);
            }
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
    if (format == 5) return buffer.readUInt16BE(7) / 100 + 500;
    else if (format == 3) return buffer.readUInt16BE(6) / 100 + 500;
    else throw new Error(`Unsupported format detected`);
}

function readBattery(format, buffer) {
    if (format == 5) {
        return (buffer.readUInt16BE(15) >> 5) + 1600;
    }
    else if (format == 3) {
        return buffer.readUInt16BE(14);
    }
    else throw new Error(`Unsupported format detected`);
}

function estimateBattery(voltage, settings) {
    //we try to estimate battery life
    //see https://github.com/ruuvi/ruuvitag_fw/wiki/FAQ:-battery 
    //default settings is 2.5V for min value, but it can be adjusted (depending on temperature, etc.)

    let percent = (voltage - settings.batt_mini) / (settings.batt_maxi - settings.batt_mini) * 100;

    if (percent > 100) percent = 100;
    else if (percent < 0) percent = 0;

    return percent;
}

function readMovementCounter(format, buffer) {
    if (format == 5) return buffer.readUInt8(17) ;
    else if (format == 3) throw new Error('movement unsupported on v3 data format');
    else throw new Error(`Unsupported format detected`);
}

function readAccelerationX(format, buffer) {
    if (format == 5) return buffer.readInt16BE(9);
    else if (format == 3) return buffer.readInt16BE(8);
    else throw new Error(`Unsupported format detected`);
}

function readAccelerationY(format, buffer) {
    if (format == 5) return buffer.readInt16BE(11);
    else if (format == 3) return buffer.readInt16BE(10);
    else throw new Error(`Unsupported format detected`);
}

function readAccelerationZ(format, buffer) {
    if (format == 5) return buffer.readInt16BE(13);
    else if (format == 3) return buffer.readInt16BE(12);
    else throw new Error(`Unsupported format detected`);
}

function readSequenceNumber(format, buffer) {
    if (format == 5) return buffer.readUInt16BE(18);
    else if (format == 3) throw new Error(`Sequence number unsupported on v3 data format`);
    else throw new Error(`Unsupported format detected`);
}

function computeAcceleration(accelerationX, accelerationY, accelerationZ) {
    return Math.sqrt(Math.pow(accelerationX, 2) +
        Math.pow(accelerationY, 2)
        + Math.pow(accelerationZ, 2)) ; 
}