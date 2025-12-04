import * as fn from '../../lib/function.mjs';
import Homey from 'homey';

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
                        dataformat: fn.readFormat(device.manufacturerData)
                    },
                    capabilities: [
                        'measure_temperature',
                        'measure_rssi',
                        'onoff'
                    ],
                };

                // do not add capabilities not supported for Ruuvitag pro
                if (fn.isPressureSupported(new_device.data.dataformat, device.manufacturerData)) new_device.capabilities.push('measure_pressure');
                if (fn.isHumiditySupported(new_device.data.dataformat, device.manufacturerData)) new_device.capabilities.push('measure_humidity');

                if (new_device.data.dataformat == 3) {
                    new_device.capabilities.push('measure_battery');
                    new_device.capabilities.push('acceleration');
                }
                if (new_device.data.dataformat == 5) {
                    new_device.capabilities.push('measure_battery');
                    new_device.capabilities.push('acceleration');
                    new_device.capabilities.push('alarm_motion');
                    new_device.capabilities.push('alarm_battery');
                    new_device.capabilities.push('button.resetbattery');
                }
                if (new_device.data.dataformat == 6) {
                    new_device.capabilities.push("measure_co2");
                    new_device.capabilities.push("measure_pm25");
                    new_device.capabilities.push("measure_nox_index");
                    new_device.capabilities.push("measure_tvoc_index");
                    new_device.capabilities.push("measure_aqi");
                    // removing the battery property
                    // mandatory in driver.compose.json but in this case Ruuvi Air does not have batteries
                    new_device.energy = {
                    };
                }
                if (new_device.data.dataformat == 225) {
                    new_device.capabilities.push("measure_co2");
                    new_device.capabilities.push("measure_pm1");
                    new_device.capabilities.push("measure_pm25");
                    new_device.capabilities.push("measure_pm10");
                    new_device.capabilities.push("measure_pm4");
                    new_device.capabilities.push("measure_nox_index");
                    new_device.capabilities.push("measure_tvoc_index");
                    new_device.capabilities.push("measure_aqi");
                    // removing the battery property
                    // mandatory in driver.compose.json but in this case Ruuvi Air does not have batteries
                    new_device.energy = {
                    };
                }

                // Filtre: privilégier format 225 sur format 6 pour un même device
                const existingIndex = devices.findIndex(d => d.data.id === new_device.data.id);
                if (existingIndex === -1) {
                    // Device pas encore dans la liste, on l'ajoute
                    devices.push(new_device);
                } else if (devices[existingIndex].data.dataformat === 6 && new_device.data.dataformat === 225) {
                    // Device existe en format 6, on le remplace par format 225
                    devices[existingIndex] = new_device;
                }
                // Sinon on ne fait rien (garde l'existant)
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

            //default value for polling
            if (!polling_interval) polling_interval = 60;

            //scanning BLE devices
            let foundDevices = await this.homey.ble.discover();

            //sending bleAdv to ruuviTag
            for (const ruuvitag of this.ruuvitags) {
                let ruuvitagData = ruuvitag.getData();
                ruuvitag.emit('updateTag', foundDevices.find(bleAdv => bleAdv.uuid == ruuvitagData.uuid));
            };

            await this.delay(polling_interval);
        };
    }

    async refreshDevices() {
        //listing all Ruuvitag
        this.ruuvitags = this.getDevices();
        if (this.ruuvitags.length == 0) this.polling = false;
        else {
            if (!this.polling) {
                this.polling = true;
                this.emit('poll');
            }
        }
    }

}

export default RuuviTag;