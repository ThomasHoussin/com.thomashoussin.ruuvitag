import * as fn from '../../lib/function.mjs';
import fetch from 'node-fetch';
import Homey from 'homey';

class GatewayDevice extends Homey.Device {

    async delay(s) {
        return new Promise(resolve => this.homey.setTimeout(resolve, 1000 * s));
    }

    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('GatewayDevice has been initialized');

        // avoid all pooling at the same time
        await new Promise(resolve => setTimeout(resolve, Math.random() * 10000));

        //polling BLE
        this.polling = true;
        this.addListener('poll', this.pollDevice);

        // Initiating device polling
        this.emit('poll');
    }

    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        this.log('GatewayDevice has been added');
        // Refreshing devices list
        this.driver.emit('refreshDevices');
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
        this.log('GatewayDevice settings where changed');
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('GatewayDevice was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        this.log('GatewayDevice has been deleted');
        this.polling = false;
    }

    onDiscoveryResult(discoveryResult) {
        // Return a truthy value here if the discovery result matches your device.
        return discoveryResult.host.replace('.local', '') === this.getData().hostname.replace('.local', '');
    }

    async onDiscoveryAvailable(discoveryResult) {
        // This method will be executed once when the device has been found (onDiscoveryResult returned true)
        //this.api = new MyDeviceAPI(discoveryResult.address);
        //await this.api.connect(); // When this throws, the device will become unavailable.
        return;
    }

    async pollDevice() {
        console.log("Entering poll loop (Ruuvi Gateway)");

        while (this.polling) {
            console.log(`Updating device ${this.getName()}`);
            this.setAvailable(true).catch(this.error);
            let settings = this.getSettings();
            let data = this.getData();

            // Scanning BLE devices
            let token = settings.token;

            // Construct the hostname with .local only if it's not already present
            const hostname = data.hostname.endsWith('.local') ? data.hostname : `${data.hostname}.local`;
            const validationUrl = `http://${hostname}/history?decode=false`;

            fetch(validationUrl, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            })
                .then(fn.checkResponseStatus)
                .then(result => result.json())
                .then(json => {
                    this.updateValues(json.data.tags[data.id]);
                })
                .catch(error => {
                    console.log(`Error with device ${this.getName()} : ${error}`);
                })

            await this.delay(settings.polling_interval);
        };
    }

    async updateValues(data) {
        let settings = this.getSettings();
        if (!data) {
            console.log(`No data when updating Tag ${this.getName()} with uuid ${this.getData().id}`);
            return;
        }
        if (!data?.timestamp) {
            console.log(`No timestamp in data when updating Tag ${this.getName()} with uuid ${this.getData().id}`);
        }
        //discard old data
        if (data?.timestamp && Math.floor(Date.now() / 1000) - parseInt(data.timestamp) > this.getSettings().polling_interval) {
            //Ruuvitag is out of range
            console.log(`Data too old when updating Tag ${this.getName()} with uuid ${this.getData().id}`);

            //decreasing TTL
            console.log(`Decreasing TTL for ruuviTag ${this.getName()} `);
            let TTL = this.getStoreValue('TTL') - 1;
            if (TTL >= 0) this.setStoreValue('TTL', TTL);
            //marking as away if TTL = 0 
            if (TTL <= 0) {
                console.log(`Marking ruuviTag ${this.getName()} out of range`);
                this.setOutsideRange();
            }
            return;
        }

        let buffer = data.ble_phy === "2M" ? Buffer.from(data.data.substring(4), 'hex') : Buffer.from(data.data.substring(10), 'hex');
        let dataformat = this.getData().dataformat;

        fn.validateDataFormat(dataformat, buffer);

        //marking device as present
        this.setInsideRange();

        this.setCapabilityValue('measure_rssi', data.rssi).catch(this.error);
        this.setCapabilityValue('measure_temperature', fn.readTemperature(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_pressure')) this.setCapabilityValue('measure_pressure', fn.readPressure(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_humidity')) this.setCapabilityValue('measure_humidity', fn.readHumidity(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_battery')) this.setCapabilityValue('measure_battery', fn.estimateBattery(fn.readBattery(dataformat, buffer), settings)).catch(this.error);
        if (this.hasCapability('acceleration')) this.setCapabilityValue('acceleration', fn.computeAcceleration(fn.readAccelerationX(dataformat, buffer), fn.readAccelerationY(dataformat, buffer), fn.readAccelerationZ(dataformat, buffer)) / 1000).catch(this.error);
        if (this.hasCapability('measure_co2')) this.setCapabilityValue('measure_co2', fn.readCo2(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_pm25')) this.setCapabilityValue('measure_pm25', fn.readPm25(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_pm1')) this.setCapabilityValue('measure_pm1', fn.readPm1(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_pm10')) this.setCapabilityValue('measure_pm10', fn.readPm10(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_pm4')) this.setCapabilityValue('measure_pm4', fn.readPm4(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_nox_index')) this.setCapabilityValue('measure_nox_index', fn.readNoxIndex(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_tvoc_index')) this.setCapabilityValue('measure_tvoc_index', fn.readTvocIndex(dataformat, buffer)).catch(this.error);
        if (this.hasCapability('measure_aqi')) this.setCapabilityValue('measure_aqi', fn.calc_aqi(fn.readPm25(dataformat, buffer), fn.readCo2(dataformat, buffer))).catch(this.error);

        if (this.hasCapability('alarm_motion') && settings.motiondetection) {
            let last_movement_counter = this.getStoreValue('movement_counter');
            let movement_counter = fn.readMovementCounter(dataformat, buffer);
            this.setStoreValue('movement_counter', movement_counter);

            if (typeof last_movement_counter == 'number') {
                let rate = movement_counter - last_movement_counter;
                if (rate < 0) rate += 255;
                if (rate > settings.movement_rate) this.setCapabilityValue('alarm_motion', true).catch(this.error);
                else this.setCapabilityValue('alarm_motion', false).catch(this.error);
            }
        }
    }

    setInsideRange() {
        this.setStoreValue('TTL', this.getSetting('TTL'));

        //showing token as on
        if (!this.getCapabilityValue('onoff')) {
            this.setCapabilityValue('onoff', true).catch(this.error);

            //registering notification if enabled
            if (this.getSetting('enable_notif')) {
                this.homey.notifications.createNotification({
                    excerpt: `RuuviTag ${this.getName()} entered range`
                }).catch(error => { this.error('Error sending notification: ' + error.message) });
            }

            //launching trigger
            this.driver.RuuviTagEnteredRange.trigger(this, {
                'name': this.getName(),
                'uuid': this.getData().id
            })
                .then(function () {
                    console.log('Done trigger flow card ruuvitag_entered_range');
                })
                .catch(function (error) {
                    console.log('Cannot trigger flow card ruuvitag_entered_range: ' + error);
                });
        }
    }

    setOutsideRange() {
        //trigger only if state changed
        if (this.getCapabilityValue('onoff')) {
            //showing token as off
            this.setCapabilityValue('onoff', false).catch(this.error);

            //registering notification if enabled
            if (this.getSetting('enable_notif')) {
                this.homey.notifications.createNotification({
                    excerpt: `RuuviTag ${this.getName()} exited range`
                }).catch(error => { this.error('Error sending notification: ' + error.message) });
            }

            //launching trigger
            this.driver.RuuviTagExitedRange.trigger(this, {
                'name': this.getName(),
                'uuid': this.getData().id
            })
                .then(function () {
                    console.log('Done trigger flow card ruuvitag_exited_range');
                })
                .catch(function (error) {
                    console.log('Cannot trigger flow card ruuvitag_exited_range: ' + error);
                });
        }
    }
}

export default GatewayDevice;