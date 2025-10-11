import * as fn from '../../lib/function.mjs';
import fetch from 'node-fetch';
import Homey from 'homey';

class GatewayDriver extends Homey.Driver {

    /**
     * onInit is called when the driver is initialized.
     */
    async onInit() {
        this.log('GatewayDriver has been initialized');

        // Registering trigger
        this.RuuviTagEnteredRange = this.homey.flow.getDeviceTriggerCard('ruuvitag_entered_range');
        this.RuuviTagExitedRange = this.homey.flow.getDeviceTriggerCard('ruuvitag_exited_range');

    }

    onPair(session) {
        var devices;
        const discoveryStrategy = this.getDiscoveryStrategy();
        const discoveryResults = discoveryStrategy.getDiscoveryResults();

        //TODO : support more than  1 gateway
        const discoveryResult = Object.values(discoveryResults)[0];

        session.setHandler('validate', async function (data) {
            console.log("Validate connection bearer token");
            let token = data.token;

            // Construct the hostname with .local only if it's not already present
            const hostname = discoveryResult.host.endsWith('.local') ? discoveryResult.host : `${discoveryResult.host}.local`;
            const validationUrl = `http://${hostname}/history?decode=false`;

            console.log(validationUrl);

            return fetch(validationUrl, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
                .then(fn.checkResponseStatus)
                .then(result => result.json())
                .then(json => Object.keys(json.data.tags).map(id => {
                    let buffer = json.data.tags[id].ble_phy === "2M" ? Buffer.from(json.data.tags[id].data.substring(4), 'hex') : Buffer.from(json.data.tags[id].data.substring(10), 'hex');
                    let new_device = {
                        name: id,
                        data: {
                            id: id,
                            hostname: discoveryResult.host,
                            dataformat: fn.readFormat(buffer)
                        },
                        capabilities: [
                            'measure_temperature',
                            'measure_rssi',
                            'onoff'
                        ],
                        settings: {
                            // Store bearer token
                            token,
                        },
                    };

                    // do not add capabilities not supported for Ruuvitag pro
                    if (fn.isPressureSupported(new_device.data.dataformat, buffer)) new_device.capabilities.push('measure_pressure');
                    if (fn.isHumiditySupported(new_device.data.dataformat, buffer)) new_device.capabilities.push('measure_humidity');

                    if (new_device.data.dataformat == 3) {
                        new_device.capabilities.push('measure_battery');
                        new_device.capabilities.push('acceleration');
                        new_device.energy = {
                            batteries: ['CR2477']
                        };
                    }
                    if (new_device.data.dataformat == 5) {
                        new_device.capabilities.push('measure_battery');
                        new_device.capabilities.push('acceleration');
                        new_device.capabilities.push('alarm_motion');
                        new_device.capabilities.push('alarm_battery');
                        new_device.capabilities.push('button.resetbattery');
                        new_device.energy = {
                            batteries: ['CR2477']
                        };
                    }
                    if (new_device.data.dataformat == 6) {
                        new_device.capabilities.push("measure_co2");
                        new_device.capabilities.push("measure_pm25");
                        new_device.capabilities.push("measure_nox_index");
                        new_device.capabilities.push("measure_tvoc_index");
                        new_device.capabilities.push("measure_aqi");
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
                    }
                    return new_device;
                }))
                .then(list => {
                    devices = list;
                    return 'ok';
                })
                .catch(error => {
                    console.log(error);
                    return error;
                });
        });

        session.setHandler('list_devices', async function (data) {
            console.log('List devices started...');

            return devices;
        });
    }
}

export default GatewayDriver;

