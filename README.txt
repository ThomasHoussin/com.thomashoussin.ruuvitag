Adds support for RuuviTag Bluetooth Sensor

RuuviTag is an advanced open-source sensor beacon platform designed to fulfill the needs of business customers, developers, makers, students, and can even be used in your home and as part of your personal endeavours. See https://ruuvi.com/ fore more information. 

This apps allows integration of RuuviTag (RAWv1 and RAWv2 format) in Homey, allowing to monitor :
- Temperature
- Humidity
- Pressure
- Acceleration
- Battery
- RSSI
- Movement (RAWv2 only)
- Entering/leaving range : it can be used as a BLE beacon, triggering an event when the device enters or leaves the range. The number of attempts scan can be configured per device in device settings.

Scan duration (how long homey listens for BLE advertisment) and polling interval (how long between two scans) can be configured in app settings.

This apps allows integration of RuuviTag Gateway in Homey. You need first to activate API-key (bearer token) in Ruuvi Gateway ; see https://docs.ruuvi.com/gw-examples/polling-mode for more information. After that Homey will poll the latest data with timestamps from the gateway. 
Gateway IP adress should be auto-detected ; you need to enter the bearer token in the next screen, and then choose Ruuvitag to add in Homey. 

The driver offers the same capabilities as the Ruuvitag driver. Polling interval can be setup for each device independently. 

If you want to use several Ruuvi gateway, you should plug only one at a time during setup.
