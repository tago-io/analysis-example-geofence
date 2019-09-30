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
** In this example we get the Analysis name and print to the console.
**
**.
* */

async function getToHTTP(context, scope) {
  const options = {
    url: 'https://api.tago.io/info',
    method: 'GET',
    headers: {
      Authorization: context.token,
    },
    // How to use HTTP QueryString
    // params: {
    //  client_token,
    // },
    //
    // How to send a HTTP Body:
    // body: 'My text body',
  };
   
  const result = await axios(options).catch(error => console.log(`${error.response.status}\n${error.response.statusText}`));
  
  if (result) context.log(result.data);
}

module.exports = new Analysis(getToHTTP, 'ANALYSIS TOKEN HERE');
