const Homey = require('homey');
const axios = require('axios');


let now = new Date();

let token;
let response_token;
let response_api;
let response_api_data;
let id_device;
let smarthomes;

let zone_label;

class Driver extends Homey.Driver {
  async onPair(session) {
    this.log('test1');
    let username = '';
    let password = '';

    session.setHandler('login', async (data) => {
      this.log('test2');
      let credentialsAreValid = false;
      username = data.username;
      password = data.password;
      this.log('test3');
      const payload = {
        grant_type: 'password',
        username: username,
        password: password,
        client_id: 'app-front',
      };
      this.log('test4');
      response_token = await axios.post('https://auth.smarthome.wattselectronics.com/realms/watts/protocol/openid-connect/token', new URLSearchParams(payload));
      this.log('test5');
      token = response_token.data.access_token;
      this.log('test6');
      if (response_token.status == '200') {
        credentialsAreValid = true;
      }
      
      return credentialsAreValid;
    });

    session.setHandler('list_devices', async () => {
      var devices = [];
      const headers = { Authorization: `Bearer ${token}` };
      const payload = new URLSearchParams({ token: 'true', email: username, lang: 'nl_NL' });

      response_api = await axios.post('https://smarthome.wattselectronics.com/api/v0.1/human/user/read/', payload , { headers: headers });
      smarthomes = response_api.data.data.smarthomes[0].smarthome_id;

      const headers2 = { Authorization: `Bearer ${token}` };
      const payload2 = new URLSearchParams({ token: 'true', smarthome_id: smarthomes, lang: 'nl_NL' });
      response_api_data = await axios.post('https://smarthome.wattselectronics.com/api/v0.1/human/smarthome/read/', payload2 , { headers: headers2 });

      let x = 0;
      //set to 1 for testing with one device
      let maxDevices = 999;
      while (x != maxDevices) {
        try {
          zone_label = response_api_data.data.data.zones[x].zone_label;
          id_device  = response_api_data.data.data.zones[x].devices[0].id_device;
          devices.push(
            {
              name: zone_label,
              data: {
                id: id_device,
              },
              store: {
                username: username,
                password: password,
                deviceNum: x,
                id: id_device,
              },
            },
          );
        x += 1;
        } catch {
          x = maxDevices;
        }
      };
      return devices;
    });
  }
}
module.exports = Driver;