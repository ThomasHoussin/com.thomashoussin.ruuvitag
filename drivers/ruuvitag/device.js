'use strict';

const Homey = require('homey');

const delay = s => new Promise(resolve => setTimeout(resolve, 1000 * s));


class Tag extends Homey.Device {
  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
      this.log('RuuviTag device has been initialized');

      this.polling = true;
      this.addListener('poll', this.pollDevice);
      // Enable device polling
      this.emit('poll');
    
      //this.updateTag();
  }

    async pollDevice() {
        while (this.polling) {
            console.log(`Updating RuuviTag ${this.getName()}`);
            this.updateTag();
            await delay(this.getSetting('polling_interval'));
        }
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
  async onSettings({ oldSettings, newSettings, changedKeys }) {
      this.log('RuuviTag device settings where changed');
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
      this.polling = false;
  }

    updateTag() {
        const timeout = 15000;
        let deviceData = this.getData();
        let settings = this.getSettings();

        Homey.ManagerBLE.find(deviceData.uuid, timeout)
            .then(bleAdv => {
                this.setCapabilityValue('measure_rssi', bleAdv.rssi);
                return bleAdv.manufacturerData;
            })
            .then(buffer => validateDataFormat(deviceData.dataformat, buffer))
            .then(buffer => {
                this.setCapabilityValue('measure_temperature', readTemperature(deviceData.dataformat, buffer));
                this.setCapabilityValue('measure_pressure', readPressure(deviceData.dataformat, buffer));
                this.setCapabilityValue('measure_humidity', readHumidity(deviceData.dataformat, buffer));
                this.setCapabilityValue('measure_battery', readBattery(deviceData.dataformat, buffer, settings));
            })
            .catch(error => {
                console.log(`Error when updating Tag ${this.getName()} with uuid ${deviceData.uuid}`);
            })
    }
}

module.exports = Tag ;

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
