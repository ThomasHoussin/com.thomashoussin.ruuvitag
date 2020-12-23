const Homey = require('homey');

module.exports = [
    {
        method: 'POST',
        path: '/',
        public: Homey.ManagerSettings.get('publicAPI') === null ? false : Homey.ManagerSettings.get('publicAPI'), 
        fn: function (args, callback) {
            const result = Homey.app.parseGatewayData(args.body);
            if (result instanceof Error) return callback(result);
            return callback(null, result);
        }
    }
]