/*
 * Analysis Example
 * Geofences
 *
 * Use geofences to control the area that your devices are in.
 *
 * Instructions
 * To run this analysis you need to add an account token to the environment variables,
 * To do that, go to your account settings, then token and copy your token.
 * 1 - Enter the following link: https://admin.tago.io/account/
 * 2 - Select your Profile.
 * 3 - Enter Tokens tab.
 * 4 - Generate a new Token with Expires Never.
 * 5 - Press the Copy Button and place at the Environment Variables tab of this analysis with key account_token.
 *
 * Follow this guide https://docs.tago.io/en/articles/151 and create
 * two geofences, one with the event code 'danger' and another named 'safe'.
 */
const { Utils, Account, Analysis, Device, Services } = require("@tago-io/sdk");
const geolib = require("geolib");
// This function checks if our device is inside a polygon geofence
function insidePolygon(point, geofence) {
  const x = point[1];
  const y = point[0];
  let inside = false;
  for (let i = 0, j = geofence.length - 1; i < geofence.length; j = i++) {
    const xi = geofence[i][0];
    const yi = geofence[i][1];
    const xj = geofence[j][0];
    const yj = geofence[j][1];
    const intersect =
      yi > y != yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
// This function checks if our device is inside any geofence
function checkZones(point, geofence_list) {
  // The line below gets all Polygon geofences that we may have.
  const polygons = geofence_list.filter(
    (x) => x.geolocation.type === "Polygon"
  );
  if (polygons.length) {
    // Here we check if our device is inside any Polygon geofence using our function above.
    const pass_check = polygons.map((x) =>
      insidePolygon(point, x.geolocation.coordinates[0])
    );
    const index = pass_check.findIndex((x) => x === true);
    if (index !== -1) return polygons[index];
  }
  // The line below gets all Point (circle) geofences that we may have.
  const circles = geofence_list.filter((x) => x.geolocation.type === "Point");
  if (circles.length) {
    // Here we check if our device is inside any Point geofence using a third party library called geolib.
    const pass_check = circles.map((x) =>
      geolib.isPointWithinRadius(
        { latitude: point[1], longitude: point[0] },
        {
          latitude: x.geolocation.coordinates[0],
          longitude: x.geolocation.coordinates[1],
        },
        x.geolocation.radius
      )
    );
    const index = pass_check.findIndex((x) => x);
    if (index !== -1) return circles[index];
  }
  return;
}
// This function help us get the device using just its id.
async function getDevice(account, device_id) {
  const customer_token = await Utils.getTokenByName(account, device_id);
  const customer_dev = new Device({ token: customer_token });
  return customer_dev;
}

async function startAnalysis(context, scope) {
  context.log("Running");

  if (!scope[0]) {
    throw "Scope is missing"; // doesn't need to run if scope[0] is null
  }

  // The code block below gets all environment variables and checks if we have the needed ones.
  const environment = Utils.envToJson(context.environment);
  if (!environment.account_token) {
    throw "Missing account_token environment var";
  }

  const account = new Account({ token: environment.account_token });
  const device_id = scope[0].device;
  // Here we get the device information using our account data and the device id.
  const device = await getDevice(account, device_id);
  // This checks if we received a location
  const location = scope.find((data) => data.variable === "location");
  if (!location || !location.location)
    return context.log("No location found in the scope.");
  // Now we check if we have any geofences to go through.
  const geofences = await device.getData({ variable: "geofence", qty: 10 });
  const zones = geofences.map((geofence) => geofence.metadata);
  const zone = checkZones(location.location.coordinates, zones);

  // The line below starts our notification service.
  const notification = new Services({ token: context.token }).Notification;

  if (!zone) {
    // If no geofence is found, we stop our application sending a notification.
    notification.send({
      title: "No zone alert",
      message: "Your device is not inside any zone.",
    });
    context.log("Your device is not inside any zone.");
    return;
  }

  if (zone.event === "danger") {
    // If our device is inside a danger geofence, we will send a notification with a danger alert.
    notification.send({
      title: "Danger alert",
      message: "Your device is inside a dangerous zone.",
    });
  }
  if (zone.event === "safe") {
    // If our device is inside a safe geofence, we will send a safe geofence notification.
    notification.send({
      title: "Sage alert",
      message: "Your device is inside a safe zone.",
    });
  }
  context.log(zone.event);
}
module.exports = new Analysis(startAnalysis);
