import * as fn from '../../lib/function.mjs';
import Homey from 'homey';

class Tag extends Homey.Device {
    /**
     * onInit is called when the device is initialized.
     */
    async onInit() {
        this.log('RuuviTag device has been initialized');
        //v0.1.0 introduced alarm_battery capability
        //we check if this capability is supported and add it if necessary
        if (this.getData().dataformat == 5 && !this.hasCapability('alarm_battery')) {
            console.log(`Adding capability alarm_battery to Ruuvitag ${this.getName()}`);
            this.addCapability('alarm_battery');
        }

        if (this.getData().dataformat == 5 && !this.hasCapability('button.resetbattery')) {
            console.log(`Adding capability button.resetbattery to Ruuvitag ${this.getName()}`);
            this.addCapability('button.resetbattery');
        }

        if (this.getData().dataformat == 5) {
            this.registerCapabilityListener('button.resetbattery', async () => {
                this.setCapabilityValue('alarm_battery', false).catch(this.error);
                return;
            });
        }

        this.addListener('updateTag', this.updateTag);
    }


    /**
     * onAdded is called when the user adds the device, called just after pairing.
     */
    async onAdded() {
        // Refreshing devices list
        this.driver.emit('refreshDevices');
        this.log('RuuviTag device has been added');
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
        this.log('RuuviTag device settings where changed');
        if (this.getCapabilityValue('onoff')) this.setStoreValue('TTL', newSettings.TTL);
    }

    /**
     * onRenamed is called when the user updates the device's name.
     * This method can be used this to synchronise the name to the device.
     * @param {string} name The new name
     */
    async onRenamed(name) {
        this.log('RuuviTag device was renamed');
    }

    /**
     * onDeleted is called when the user deleted the device.
     */
    async onDeleted() {
        // Refreshing devices list
        this.driver.emit('refreshDevices');
        this.log('RuuviTag device has been deleted');
    }

    async updateTag(bleAdv) {
        console.log(`Updating RuuviTag ${this.getName()}`);
        let deviceData = this.getData();
        let dataformat = deviceData.dataformat;
        let settings = this.getSettings();

        try {
            if (bleAdv != undefined) {
                this.setCapabilityValue('measure_rssi', bleAdv.rssi).catch(this.error);
                let buffer = bleAdv.manufacturerData;

                if (dataformat == fn.readFormat(buffer)) {
                    fn.validateDataFormat(dataformat, buffer);

                    //marking device as present
                    this.setInsideRange();

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
                    if (this.hasCapability('measure_aqi') && (dataformat === 6 || dataformat === 225)) this.setCapabilityValue('measure_aqi', fn.calc_aqi(fn.readPm25(dataformat, buffer), fn.readCo2(dataformat, buffer))).catch(this.error);

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

                    //saving timestamp of measure
                    this.setStoreValue('last_measure', Date.now());

                    //we try to detect a reset in sequence number
                    if (this.hasCapability('alarm_battery')) {
                        let sequenceNumber = this.getStoreValue('sequence_counter');
                        let newSequenceNumber = fn.readSequenceNumber(dataformat, buffer);
                        this.setStoreValue('sequence_counter', newSequenceNumber);

                        let elapsed = Date.now() - this.getStoreValue('last_measure');
                        let inc = (elapsed * 1.2) / 1285;

                        if (newSequenceNumber < sequenceNumber
                            //reset in sequence number. Is this expected ?
                            && sequenceNumber + inc < 65535) {
                            //we use elapsed time to make a rough guess 

                            //reset is probably an anomaly
                            //probably low bat warning
                            //see https://github.com/ruuvi/ruuvitag_fw/wiki/FAQ:-battery for more informations
                            console.log(`RuuviTag ${this.getName()} reset in sequence number`);
                            this.setCapabilityValue('alarm_battery', true).catch(this.error);
                        }
                    }
                }

            }
            else throw new Error(`No scanned data for device ${this.getName()}`);
        }
        catch (error) {
            console.log(`Error/no data available when updating Tag ${this.getName()} with uuid ${deviceData.uuid}`);
            console.log(error);

            //decreasing TTL
            console.log(`Decreasing TTL for ruuviTag ${this.getName()} `);
            let TTL = this.getStoreValue('TTL') - 1;
            if (TTL >= 0) this.setStoreValue('TTL', TTL);
            //marking as away if TTL = 0 
            if (TTL <= 0) {
                console.log(`Marking ruuviTag ${this.getName()} out of range`);
                this.setOutsideRange();
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
                'uuid': this.getData().uuid
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
                'uuid': this.getData().uuid
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

export default Tag;
