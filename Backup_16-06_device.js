'use strict';

const { Device } = require('homey');
const axios = require("axios");

let now = new Date();

let _token;
let _token_expires;
let _refresh_token;
let _smarthomes;

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    this.log('MyDevice has been initialized');

    //Always get a new token onInit
    this.log("getToken");
    this.getToken();
    this.log("checkToken")
    this.checkToken();

  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added');
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
    this.log('MyDevice settings where changed');
  }

  /**
   * onRenamed is called when the user updates the device's name.
   * This method can be used this to synchronise the name to the device.
   * @param {string} name The new name
   */
  async onRenamed(name) {
    this.log('MyDevice was renamed');
  }

  /**
   * onDeleted is called when the user deleted the device.
   */
  async onDeleted() {
    this.log('MyDevice has been deleted');
  }



  async getToken() {
    this.password = this.getStoreValue("password");
    this.username = this.getStoreValue("username");

    let payload;
    let forcelogin = 1;

    if (forcelogin == 1) {
      payload = {grant_type: "password", username: this.username, password: this.password, client_id: "app-front"};
    }


    let _response_token = await axios.post("https://smarthome.wattselectronics.com/auth/realms/watts/protocol/openid-connect/token", new URLSearchParams(payload));

    _token = _response_token.data.access_token;
    _token_expires = new Date(now.getTime() + _response_token.data.expires_in * 1000);
    _refresh_token = _response_token.data.refresh_token;
  }

  async checkToken() {
    this.log("CheckToken")
    if (_token_expires <= now) {
      this.log("Refreshing token")
      const payload = {grant_type: "refresh_token", refresh_token: _refresh_token, client_id: "app-front"};
      let _response_token = await axios.post("https://smarthome.wattselectronics.com/auth/realms/watts/protocol/openid-connect/token", new URLSearchParams(payload));
      _token = _response_token.data.access_token;
    }
  }



  async print() { 
    this.log("_token");
    this.log(_token);
    this.log("_token_expires");
    this.log(_token_expires);
    this.log("_refresh_token");
    this.log(_refresh_token);
  }

  async updateValues() {

    this.id = this.getStoreValue("id");
    const headers2 = { Authorization: `Bearer ${_token}` };
    const payload2 = new URLSearchParams({ token: "true", email: "wicher@van-pijkeren.nl", lang: "nl_NL" });
    let _response_api = await axios.post("https://smarthome.wattselectronics.com/api/v0.1/human/user/read/", payload2 , { headers: headers2 });

    _smarthomes = _response_api.data.data.smarthomes[0].smarthome_id;

    const headers3 = { Authorization: `Bearer ${_token}` };
    const payload3 = new URLSearchParams({ token: "true", smarthome_id: _smarthomes, lang: "nl_NL" });
    let _response_api_data = await axios.post("https://smarthome.wattselectronics.com/api/v0.1/human/smarthome/read/", payload3 , { headers: headers3 });

    let measure_temp = Number(_response_api_data.data.data.zones[this.id].devices[0].temperature_air);
    let measure_value = Math.round(((((measure_temp / 10.0) - 32) * (5.0 / 9.0))*10)/10);

    let target_temp = Number(_response_api_data.data.data.zones[this.id].devices[0].consigne_confort);
    let target_value = ((target_temp / 10.0) - 32) * (5.0 / 9.0);

    this.setCapabilityValue('measure_temperature', measure_value);
    this.setCapabilityValue('target_temperature', target_value);
  }

}

module.exports = MyDevice;
