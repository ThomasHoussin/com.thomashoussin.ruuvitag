'use strict';

//TODO: fix public settings for API


const Homey = require('homey');

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
    async onInit() {
        this.log('MyApp has been initialized');

        // register system events
        this.homey.on('memwarn', () => console.log('memwarn!'));

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

                    let device = this.homey.drivers.getDriver('ruuvitag').getDevice(deviceData);
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

