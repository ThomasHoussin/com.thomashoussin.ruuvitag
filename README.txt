Adds support for Ruuvi Bluetooth Sensors (RuuviTag & Ruuvi Air)

Ruuvi is an advanced open-source sensor platform designed for business, developers, makers, students, and home automation. See https://ruuvi.com/ for more information.

SUPPORTED PRODUCTS:

RuuviTag - Compact environmental sensor (battery-powered)
- Formats: 3 (RAWv1), 5 (RAWv2)
- Temperature, Humidity, Pressure, Acceleration, Battery, RSSI
- Movement detection (RAWv2 only)
- Entering/leaving range triggers

Ruuvi Air - Air quality monitor (powered by adapter)
- Formats: 6, E1 (Extended)
- Temperature, Humidity, Pressure, Luminosity
- Air quality: CO2, PM1.0, PM2.5, PM4.0, PM10, NOx index, TVOC index, AQI
- RSSI, Entering/leaving range triggers
- No battery capability (powered device)

BLE DRIVER CONFIGURATION:
Scan duration (how long Homey listens for BLE advertisements) and polling interval (time between scans) can be configured in app settings. Number of scan attempts per device can be set in device settings for presence detection.

This apps allows integration of RuuviTag Gateway in Homey. You need first to activate API-key (bearer token) in Ruuvi Gateway ; see https://docs.ruuvi.com/gw-examples/polling-mode for more information. After that Homey will poll the latest data with timestamps from the gateway. 
Gateway IP adress should be auto-detected ; you need to enter the bearer token in the next screen, and then choose Ruuvitag to add in Homey. 

The driver offers the same capabilities as the Ruuvitag driver. Polling interval can be setup for each device independently. 

If you want to use several Ruuvi gateway, you should plug only one at a time during setup.
