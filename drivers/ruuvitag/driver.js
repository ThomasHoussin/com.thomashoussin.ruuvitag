'use strict';

const Homey = require('homey');

class RuuviTag extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
      this.log('RuuviTag driver has been initialized');

      // Registering trigger
      this.RuuviTagEnteredRange = new Homey.FlowCardTriggerDevice('ruuvitag_entered_range');
      this.RuuviTagEnteredRange.register();

      this.RuuviTagExitedRange = new Homey.FlowCardTriggerDevice('ruuvitag_exited_range');
      this.RuuviTagExitedRange.register();
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
    async onPairListDevices(data, callback) {
        discoverRuuviDevices(this)
            .then(devices => {
                this.log(devices)
                callback(null, devices);
            })
            .catch(error => {
                this.log(error);
                callback(new Error(Homey.__('list devices error')));
            });
  }

}

module.exports = RuuviTag ;

function discoverRuuviDevices(driver){
    return new Promise(async (resolve, reject) => {

        console.log("Searching for Ruuvi devices...")

        try {
            let devices = [];     
            const ManufacturerID = Buffer.from('9904', 'hex');

            const foundDevices = await Homey.ManagerBLE.discover([], 25*1000);

            foundDevices.forEach(device => {
                //discard all but Ruuvi devices
                if (typeof device.manufacturerData == 'undefined'
                    || device.manufacturerData.length <= 2
                    || ManufacturerID.compare(device.manufacturerData, 0, 2) != 0)
                    return;

                let new_device =
                {
                    name: device.address,
                    data: {
                        id: device.id,
                        uuid: device.uuid,
                        address: device.address,
                        dataformat: device.manufacturerData[2]
                    },
                    capabilities: [
                        'measure_battery',
                        'measure_humidity',
                        'measure_pressure',
                        'measure_temperature',
                        'measure_rssi',
                        'acceleration',
                        'onoff',
                        'alarm_battery',
                        'button.resetbattery'
                    ],
                };
                if (device.manufacturerData[2] == 5) new_device.capabilities.push('alarm_motion');
                devices.push(new_device);
            });

            resolve(devices)
        }
        catch (error) {
            reject(error)
        }
    });
}