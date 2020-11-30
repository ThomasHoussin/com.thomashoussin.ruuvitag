'use strict';

const Homey = require('homey');

class RuuviTag extends Homey.Driver {
  /**
   * onInit is called when the driver is initialized.
   */
  async onInit() {
      this.log('RuuviTag driver has been initialized');
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
        const timeout = 29000;

        try {
            let devices = [];     
            const ManufacturerID = Buffer.from('9904', 'hex');

            const foundDevices = await Homey.ManagerBLE.discover([], timeout);

            foundDevices.forEach(device => {
                //discard all but Ruuvi devices
                if (typeof device.manufacturerData == 'undefined'
                    || device.manufacturerData.length <= 2
                    || ManufacturerID.compare(device.manufacturerData, 0, 2) != 0)
                    return;
         
                devices.push({
                    name: device.address,
                    data: {
                        id: device.id,
                        uuid: device.uuid,
                        address: device.address,
                        dataformat: device.manufacturerData[2] 
                     }
                })
            });

            resolve(devices)
        }
        catch (error) {
            reject(error)
        }
    });
}