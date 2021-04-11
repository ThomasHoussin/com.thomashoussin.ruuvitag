'use strict';

const Homey = require('homey');

const delay = s => new Promise(resolve => setTimeout(resolve, 1000 * s));


class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
    async onInit() {
        this.log('MyApp has been initialized');

        //polling BLE
        this.polling = true;
        this.addListener('poll', this.pollDevice);

        // Initiating device polling
        this.emit('poll');
    }

    async pollDevice() {
        while (this.polling) {
            console.log(`Refreshing BLE`);
            let polling_interval = Homey.ManagerSettings.get('polling_interval');
            let scan_duration = Homey.ManagerSettings.get('scan_duration');

            //default value for polling and scan
            if (!polling_interval) polling_interval = 60;
            if (!scan_duration) scan_duration = 20;

            //listing all all Ruuvitag
            let devices = Homey.ManagerDrivers.getDriver('ruuvitag').getDevices();

            //clear BLE cache for Ruuvitag devices
            devices.forEach(device => delete Homey.ManagerBLE.__advertisementsByPeripheralUUID[device.getData().uuid]);

            //sending update message to all Ruuvitag
            devices.forEach(device => device.emit('updateTag', Homey.ManagerBLE.discover([], scan_duration * 1000)));
            await delay(polling_interval);
        };
    }

    parseGatewayData(body) {
        console.log('Request received on api gateway');

        try {
            if (typeof body.tags != 'undefined' && body.hasOwnProperty('tags') && body.tags.accelX != 'undefined' && body.tags.accelY != 'undefined' && body.tags.accelZ != 'undefined' &&
                body.tags.humidity != 'undefined' && body.tags.movementCounter != 'undefined' && body.tags.rssi != 'undefined' && body.tags.temperature != 'undefined' && body.tags.voltage != 'undefined') {
                body.tags.forEach(tag => {
                    if (typeof tag.id == 'undefined') throw new Error('Unexpected data in POST request');
                    let uuid = tag.id.toLowerCase().replace(/\:/g, '');
                    let deviceData = {
                        id: uuid,
                        uuid: uuid,
                        address: tag.id.toLowerCase(),
                        dataformat: tag.dataFormat
                    };

                    let device = Homey.ManagerDrivers.getDriver('ruuvitag').getDevice(deviceData);
                    if (device instanceof Error) throw device;
                    device.emit('updateTagFromGateway', tag);
                    console.log(`Updated data from API for device ${device.getName()}`);
                });
                return 'Success';
            }
            throw new Error('Unexpected data in POST request');
        }
        catch (error) {
            return error;
        }
    }
}

module.exports = MyApp;

