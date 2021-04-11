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


The app also allows Homey to act as a Ruuvi Station gateway. 

You have to allow public access in the app settings (default is private) ; then in Ruuvi Station, in gateway settings, use : 
- http://<your_ip>/api/app/com.thomashoussin.ruuvitag for local access only
- https://<cloudId>.connect.athom.com/api/app/com.thomashoussin.ruuvitag (cloudId can be found on http://developer.athom.com/tools/system)

Device must have been locally added in Homey ; after that, data received through update Ruuvitag device (if device is unknown, data is discarded). Presence is not modified when receiving data through gateway. 