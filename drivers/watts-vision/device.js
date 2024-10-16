'use strict';

const { Device } = require('homey');
const axios = require('axios');

let now = new Date();

let token;
let smarthomes;
let mode;
let menuMode;
let targetValue;
let _response_api_data;

class MyDevice extends Device {

  /**
   * onInit is called when the device is initialized.
   */
  async onInit() {
    await this.getAPI();
    await this.getMode();
    await this.getTemp();
    
    // Listen for target_temperature change
    this.registerCapabilityListener('target_temperature', async (value) => { 
      this.log(value);
      let newValue = (10 * ((value * (9/5)) + 32))
      this.log(newValue);
      mode = _response_api_data.gv_mode;
      let deviceID = this.getStoreValue('id');
      
      const headers = { Authorization: `Bearer ${token}` };
      const payload = new URLSearchParams({ 
        'token': 'true',
        'context': '1',
        'smarthome_id': smarthomes,
        'query[id_device]': deviceID,
        'query[gv_mode]': mode,
        'query[nv_mode]': mode,
        'peremption': '15000',
        'lang': 'nl_NL',
        'query[consigne_eco]': newValue,
        'query[consigne_manuel]': newValue,
      });     
      
      this.log(payload);
      await axios.post('https://smarthome.wattselectronics.com/api/v0.1/human/query/push/', payload , { headers: headers });
      this.log("Joe");
      await this.getTemp();
      this.log("JoeJoe");
      
    });


    // Listen for watts_vision_modes change
    this.registerCapabilityListener('watts_vision_modes', async (mode) => {
      if (menuMode != 999) {
        let deviceID = this.getStoreValue('id');
        const headers = { Authorization: `Bearer ${token}` };
        const payload = new URLSearchParams({ 
          'token': 'true',
          'context': '1',
          'smarthome_id': smarthomes,
          'query[id_device]': deviceID,
          'query[gv_mode]': mode,
          'query[nv_mode]': mode,
          'peremption': '15000',
          'lang': 'nl_NL',
        });
        await axios.post('https://smarthome.wattselectronics.com/api/v0.1/human/query/push/', payload , { headers: headers });
        
        await this.getTemp();


      }else {
        this.log('Program is not supported yet');
      }
    });
    this.log('MyDevice has been initialized: ' + this.getStoreValue('id') );

    this.updateInterval = this.homey.setInterval(
      this.loop.bind(this),
      10000
    );
  }

  /**
   * onAdded is called when the user adds the device, called just after pairing.
   */
  async onAdded() {
    this.log('MyDevice has been added: ' + this.getStoreValue('id') );
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
    this.log('MyDevice has been deleted: ' + this.getStoreValue('id') );
  }

  async loop() {
    await this.getAPI();
    await this.getMode();
    await this.getTemp();
  }

  async getTemp() {
    // Get measured temperature from api data and set the CapabilityValue
    let measureTemp = Number(_response_api_data.temperature_air);
    let measureValue = Math.round(((((measureTemp / 10.0) - 32) * (5.0 / 9.0))*10)/10);
    this.setCapabilityValue('measure_temperature', measureValue);

    // Get target_temp *COMFORT* modus
    if (mode == '0') {
      let targetTemp = Number(_response_api_data.consigne_confort);
      targetValue = ((targetTemp / 10.0) - 32) * (5.0 / 9.0);
    }
    // Get target_temp *OFF* modus          !!Not variable
    if (mode == '1') {
      targetValue = 0;
    }
    // Get target_temp *ANTI FREEZE* modus  !!Not variable
    if (mode == '2') {
      targetValue = 7;
    }
    // Get target_temp *ECO* modus
    if (mode == '3') {
      let targetTemp = Number(_response_api_data.consigne_eco);
      targetValue = ((targetTemp / 10.0) - 32) * (5.0 / 9.0);
    }
    // Get target_temp *BOOST* modus          !!Not variable
    if (mode == '4') {
      let targetTemp = Number(_response_api_data.consigne_boost);
      targetValue = ((targetTemp / 10.0) - 32) * (5.0 / 9.0);
    }
    // Get target_temp *PROGRAM_ON* modus          
    if (mode == '8') {
      let targetTemp = Number(_response_api_data.consigne_confort);
      targetValue = ((targetTemp / 10.0) - 32) * (5.0 / 9.0);
    }
    // Get target_temp *PROGRAM_OFF* modus          
    if (mode == '11') {
      let targetTemp = Number(_response_api_data.consigne_eco);
      targetValue = ((targetTemp / 10.0) - 32) * (5.0 / 9.0);
    }
    // Set the CapabilityValue to the right temperature
    this.setCapabilityValue('target_temperature', targetValue);
  }

  async getMode() {
    // Get the actual mode from api data and set the CapabilityValue
    mode = _response_api_data.gv_mode;
    if ( mode == '8' || mode == '11') {
      menuMode = '999'
      this.setCapabilityValue('watts_vision_modes', menuMode);
    } else {
      menuMode = mode
      this.setCapabilityValue('watts_vision_modes', menuMode);
    }
  }

  async getAPI(){
    const password = this.getStoreValue('password');
    const username = this.getStoreValue('username');

    const payload = {grant_type: 'password', username: username, password: password, client_id: 'app-front'};
    let _response_token = await axios.post('https://smarthome.wattselectronics.com/auth/realms/watts/protocol/openid-connect/token', new URLSearchParams(payload));

    token = _response_token.data.access_token;

    const deviceNum = this.getStoreValue('deviceNum');
    const headers2 = { Authorization: `Bearer ${token}` };
    const payload2 = new URLSearchParams({ token: 'true', email: this.username, lang: 'nl_NL' });
    let _response_api = await axios.post('https://smarthome.wattselectronics.com/api/v0.1/human/user/read/', payload2 , { headers: headers2 });

    smarthomes = _response_api.data.data.smarthomes[0].smarthome_id;

    const headers3 = { Authorization: `Bearer ${token}` };
    const payload3 = new URLSearchParams({ token: 'true', smarthome_id: smarthomes, lang: 'nl_NL' });
    let _response_api_data_raw = await axios.post('https://smarthome.wattselectronics.com/api/v0.1/human/smarthome/read/', payload3 , { headers: headers3 });
    _response_api_data = _response_api_data_raw.data.data.zones[deviceNum].devices[0]
  }
}
module.exports = MyDevice;