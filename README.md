# MMM-Metar

This is a module for the [MagicMirror²-Project](https://magicmirror.builders).

It displays METARs from airports defined in config.

## Screenshot

**decoded**

![scrrenshot decoded](img/screenshot_decoded.png)

**not decoded**
![screenshot not decoded](img/screenshot_not_decoded.png)

## Installation

Assuming `~/MagicMirror` is the directory where you installed MagicMirror².

### Clone and install

```bash
cd ~/MagicMirror/modules
git clone https://github.com/calonmerc/MMM-Metar.git
```

### Update your config.js file

Add a configuration block to the modules array in the `~/MagicMirror/config/config.js` file and define your [AVWX.rest (register for an account)](https://account.avwx.rest/getting-started) API Key:

```js
var config = {
  modules: [
    {
      module: "MMM-Metar",
      position: "top_right",
      config: {
        apiKey: "<api-key-here>",
        airports: [ "KSFO","PAO","HAF","JFK" ],
      },
    },
  ],
};
```

This is the minimal config setup, you find more params in the [`default` section of `MMM-Metar.js`](../-/blob/master/MMM-Metar.js#L7).
