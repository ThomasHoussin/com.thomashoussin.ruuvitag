import Homey from 'homey';

class MyApp extends Homey.App {
  /**
   * onInit is called when the app is initialized.
   */
    async onInit() {
        this.log('MyApp has been initialized');

        // register system events
        this.homey.on('memwarn', () => console.log('memwarn!'));

        // no listener for onoff capability ; if needed see below
        // adding listener for capability
        // see https://apps.developer.homey.app/upgrade-guides/device-capabilities
    }

}

export default MyApp;

