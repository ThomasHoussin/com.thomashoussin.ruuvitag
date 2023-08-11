'use strict';

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

}

module.exports = MyApp;

