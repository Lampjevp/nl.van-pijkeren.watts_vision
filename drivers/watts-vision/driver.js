const Homey = require("homey");
const axios = require("axios");


let now = new Date();

let _token;
let _token_expires;
let _refresh_token;
let _response_token;
let _response_api;
let _response_api_data;
let _label;
let _smarthomes;
let _mac;
let _address;
let _devices_result;
let location;

let _id;
let _zone_label;

class Driver extends Homey.Driver {
  async onPair(session) {
    let _username = "";
    let _password = "";

    session.setHandler("login", async (data) => {

      let credentialsAreValid = false;

      _username = data.username;
      _password = data.password;

      const payload = {
        grant_type: "password",
        username: _username,
        password: _password,
        client_id: "app-front",
      };

      _response_token = await axios.post("https://smarthome.wattselectronics.com/auth/realms/watts/protocol/openid-connect/token", new URLSearchParams(payload));

      _token = _response_token.data.access_token;
      _token_expires = new Date(now.getTime() + _response_token.data.expires_in * 1000);
      _refresh_token = _response_token.data.refresh_token;


      if (_response_token.status == "200") {
        credentialsAreValid = true;
      }
      
      return credentialsAreValid;
    });


    session.setHandler("list_devices", async () => {
      const headers = { Authorization: `Bearer ${_token}` };
      const payload  = new URLSearchParams({ token: "true", email: _username, lang: "nl_NL" });

      _response_api = await axios.post("https://smarthome.wattselectronics.com/api/v0.1/human/user/read/", payload , { headers: headers });
      _label      = _response_api.data.data.smarthomes[0].label;
      _smarthomes = _response_api.data.data.smarthomes[0].smarthome_id;
      _mac        = _response_api.data.data.smarthomes[0].mac_adress;
      _address    = _response_api.data.data.smarthomes[0].address_position;

      const headers2 = { Authorization: `Bearer ${_token}` };
      const payload2 = new URLSearchParams({ token: "true", smarthome_id: _smarthomes, lang: "nl_NL" });
      _response_api_data = await axios.post("https://smarthome.wattselectronics.com/api/v0.1/human/smarthome/read/", payload2 , { headers: headers2 });
      this.log(_response_api_data.data.data.zones[1]);
      _zone_label = _response_api_data.data.data.zones[1].zone_label;
      _id         = _response_api_data.data.data.zones[1].devices[0].id;
      
      this.log(_zone_label);
      this.log(_id);

      const devices = {
        name: _zone_label,
        data: {
          id: _id,
        },
        settings: {
          // Store username & password in settings
          // so the user can change them later
          _username,
          _password,
        },
      };
      return devices;
    });
  }
}

module.exports = Driver;