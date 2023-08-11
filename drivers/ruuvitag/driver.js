'use strict';

const Homey = require('homey');

class RuuviTag extends Homey.Driver {

    async delay(s) {
        return new Promise(resolve => this.homey.setTimeout(resolve, 1000 * s));
    }

    //listing all Ruuvitag
    ruuvitags = this.getDevices();

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
      this.addListener('refreshDevices', this.refreshDevices);

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

        const foundDevices = await this.homey.ble.discover();

        try {
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
                        'measure_temperature',
                        'measure_rssi',
                        'acceleration',
                        'onoff'
                    ],
                };

                // do not add capabilities not supported for Ruuvitag pro
                if (new_device.data.dataformat != 5 || device.manufacturerData.readUInt16BE(7) != 65535) new_device.capabilities.push('measure_pressure');
                if (new_device.data.dataformat != 5 || device.manufacturerData.readUInt16BE(5) != 65535) new_device.capabilities.push('measure_humidity');
                    
                if (device.manufacturerData[2] == 5) {
                    new_device.capabilities.push('alarm_motion');
                    new_device.capabilities.push('alarm_battery');
                    new_device.capabilities.push('button.resetbattery');
                }
                devices.push(new_device);
            });
        }
        catch (error) {
                console.log("Error when searching for ruuvi devices");
                console.log(error);
        }

        return devices;
    }

    async pollDevice() {

        //quick fix, moving getDevices out of the loop
        //listing all Ruuvitag
        //let ruuvitags = this.getDevices();
        console.log("Entering poll loop");
        this.emit('refreshDevices');

        while (this.polling) {
            console.log(`Refreshing BLE`);
            let polling_interval = this.homey.settings.get('polling_interval');
            let scan_duration = this.homey.settings.get('scan_duration');

            //default value for polling and scan
            if (!polling_interval) polling_interval = 60;
            if (!scan_duration) scan_duration = 20;

            //scanning BLE devices
            let foundDevices = await this.homey.ble.discover([], scan_duration * 1000);

            //sending bleAdv to ruuviTag
            for (const ruuvitag of this.ruuvitags) {
                let ruuvitagData = ruuvitag.getData() ;
                ruuvitag.emit('updateTag', foundDevices.find(bleAdv => bleAdv.uuid == ruuvitagData.uuid));
            };

            await this.delay(polling_interval);
        };
    }

    async refreshDevices() {
        //listing all Ruuvitag
        this.ruuvitags = this.getDevices();
    }

}

module.exports = RuuviTag ;