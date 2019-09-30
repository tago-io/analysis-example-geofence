const TagoUtils = require('tago/utils');
const TagoAccount = require('tago/account');
const Analysis = require('tago/analysis');
const axios = require('axios');

/*
** Analysis Example
** Post to HTTP Route
**
** This analysis simple post to an HTTP route. It's a starting example for you to develop more
** complex algorithms.
** In this example we get the Account name and print to the console.
**
**.
* */

async function getToHTTP(context, scope) {
  const options = {
    url: 'https://api.tago.io/info',
    method: 'GET',
    headers: {
      Authorization: 'Your-Account-Token',
    },
    // How to use HTTP QueryString
    // params: {
    //  serie: 123,
    // },
    //
    // How to send a HTTP Body:
    // body: 'My text body',
  };

  const result = await axios(options).catch((error) => { context.log(`${error}\n${error}`); return null; });
  if (result) {
    context.log(result.data);

    context.log('Your account name is: ', result.data.resulta.name);
  }


}

module.exports = new Analysis(getToHTTP, '');
