'use strict';

const Homey = require('homey');

const delay = s => new Promise(resolve => setTimeout(resolve, 1000 * s));


class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
    async onInit() {
        this.log('MyApp has been initialized');
        this.polling = true;
        //Homey.ManagerSettings.set('polling_interval', 30);

        this.addListener('poll', this.pollDevice);
        // Enable device polling
        this.emit('poll');
    }

    async pollDevice() {
        while (this.polling) {
            console.log(`Refreshing BLE`);
            let polling_interval = Homey.ManagerSettings.get('polling_interval');
            let scan_duration = Homey.ManagerSettings.get('scan_duration');
            if (!polling_interval) polling_interval = 60;
            if (!scan_duration) scan_duration = 20;

            console.log(polling_interval);
            console.log(scan_duration);

            //listing all all Ruuvitag
            let devices = Homey.ManagerDrivers.getDriver('ruuvitag').getDevices();

            //clear BLE cache for Ruuvitag devices
            devices.forEach(device => delete Homey.ManagerBLE.__advertisementsByPeripheralUUID[device.getData().uuid]);

            //sending update message to all Ruuvitag
            devices.forEach(device => device.emit('updateTag', Homey.ManagerBLE.discover([], scan_duration * 1000)));
            await delay(polling_interval);
        };
    }
}

module.exports = MyApp;

