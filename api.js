const Homey = require('homey');

module.exports = {
    async updateData({ homey, body }) {
        return homey.app.parseGatewayData(body) ;
    } ,
};