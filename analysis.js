const TagoUtils = require('tago/utils');
const TagoAccount = require('tago/account');
const Analysis = require('tago/analysis');

/*
** Analysis Example
** Get Device List
**
** This analysis retrieves the device list of your account and print to the console.
** There are examples on how to apply filter.
**
** Environment Variables
** In order to use this analysis, you must setup the Environment Variable table.
**
** account_token: Your account token
**
** Steps to generate an account_token:
** 1 - Enter the following link: https://admin.tago.io/account/
** 2 - Select your Profile.
** 3 - Enter Tokens tab.
** 4 - Generate a new Token with Expires Never.
** 5 - Press the Copy Button and place at the Environment Variables tab of this analysis.
* */

async function listDevicesByTag(context) {
  // Transform all Environment Variable to JSON.
  const envVars = TagoUtils.env_to_obj(context.environment);
  
  if (!envVars.account_token) return context.log('Missing account_token environment variable');
  const account = new TagoAccount(envVars.account_token);
   
  // Example of filtering devies by Tag.
  // You can filter by: name, last_input, last_output, bucket, etc.
  const filter = {
    tags: [{
      key: 'keyOfTagWeWantToSearch', value: 'valueOfTagWeWantToSearch',
    }],
    // bucket: '55d269211a2e236c25bb9859',
    // name: 'My Device'
    // name: 'My Dev*
  }
  // Searching all devices with tag we want
  const devices = await account.devices.list(1, ['id', 'tags'], filter, 10000);

  context.log(devices);
}

module.exports = new Analysis(listDevicesByTag, 'ANALYSIS TOKEN HERE');
