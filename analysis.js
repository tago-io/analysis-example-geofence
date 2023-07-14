/*
 * Analysis Example
 * Geofences
 *
 * Use geofences to control the area that your devices are in.
 *
 ** How to use:
 ** To analysis works, you need to add a new policy in your account. Steps to add a new policy:
 **  1 - Click the button "Add Policy" at this url: https://admin.tago.io/am;
 **  2 - In the Target selector, select the Analysis with the field set as "ID" and choose your Analysis in the list;
 **  3 - Click the "Click to add a new permission" element and select "Device" with the rule "Access" with the field as "Any";
 **  4 - To save your new Policy, click the save button in the bottom right corner;
 **
 * Follow this guide https://docs.tago.io/en/articles/151 and create
 * two geofences, one with the event code 'danger' and another named 'safe'.
 */
const { Analysis, Services, Resources } = require("@tago-io/sdk");
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

async function startAnalysis(context, scope) {
  context.log("Running");

  if (!scope[0]) {
    throw "Scope is missing"; // doesn't need to run if scope[0] is null
  }
  const device_id = scope[0].device;
  // This checks if we received a location
  const location = scope.find((data) => data.variable === "location");
  if (!location || !location.location)
    return context.log("No location found in the scope.");
  // Now we check if we have any geofences to go through.
  const geofences = await Resources.devices.getDeviceData(device_id, {
    variable: "geofence",
    qty: 10,
  });
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
