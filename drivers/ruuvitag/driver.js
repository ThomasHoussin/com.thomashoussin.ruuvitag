'use strict';

const Homey = require('homey');
const delay = s => new Promise(resolve => setTimeout(resolve, 1000 * s));

class RuuviTag extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
      this.log('RuuviTag driver has been initialized');

      // Registering trigger
      this.RuuviTagEnteredRange = this.homey.flow.getDeviceTriggerCard('ruuvitag_entered_range');
      this.RuuviTagExitedRange = this.homey.flow.getDeviceTriggerCard('ruuvitag_exited_range');

      //polling BLE
      this.polling = true;
      this.addListener('poll', this.pollDevice);

      // Initiating device polling
      this.emit('poll');
  }

  /**
   * onPairListDevices is called when a user is adding a device and the 'list_devices' view is called.
   * This should return an array with the data of devices that are available for pairing.
   */
    async onPairListDevices() {
        console.log("Searching for Ruuvi devices...");

        let devices = [];
        const ManufacturerID = Buffer.from('9904', 'hex');

        const foundDevices = await this.homey.ble.discover([], 25 * 1000);

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
                    'onoff'
                ],
            };
            if (device.manufacturerData[2] == 5) {
                new_device.capabilities.push('alarm_motion');
                new_device.capabilities.push('alarm_battery');
                new_device.capabilities.push('button.resetbattery');
            }
            devices.push(new_device);
        });

        return devices;
    }

    async pollDevice() {
        while (this.polling) {
            console.log(`Refreshing BLE`);
            let polling_interval = this.homey.settings.get('polling_interval');
            let scan_duration = this.homey.settings.get('scan_duration');

            //default value for polling and scan
            if (!polling_interval) polling_interval = 60;
            if (!scan_duration) scan_duration = 20;

            //listing all Ruuvitag
            let ruuvitags = this.getDevices();

            //scanning BLE devices
            let foundDevices = this.homey.ble.discover([], scan_duration * 1000);

            //sending bleAdv to ruuviTag
            for (const ruuvitag of ruuvitags) {
                let ruuvitagData = ruuvitag.getData() ;
                ruuvitag.emit('updateTag', foundDevices.then(devices => devices.find(bleAdv => bleAdv.uuid == ruuvitagData.uuid)));
            };

            await delay(polling_interval);
        };
    }
}

module.exports = RuuviTag ;