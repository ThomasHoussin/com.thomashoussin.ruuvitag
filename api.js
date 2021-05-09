const Homey = require('homey');

module.exports = {
    async updateData({ homey, body }) {
        return this.homey.app.parseGatewayData(body) ;
    } ,
};