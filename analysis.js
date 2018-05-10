'use strict';

const Analysis = require('tago/analysis');
const Device = require('tago/device');
const Utils = require('tago/utils');
const Account = require('tago/account');
const co = require('co');

function convert_hex2dec(num) {
  return parseInt((num), 16).toString(10);
}

function convert_hex2bin(num) {
  const bin = String(parseInt(num, 16).toString(2));
  return bin;
}

function extractNumber2Bytes(message, index) {
  const hex = `${message[index]}`;
  return convert_hex2dec(hex);
}

function extractNumber2BytesBin(message, index) {
  const hex = `${message[index]}`;
  return convert_hex2bin(hex);
}

function extractNumber1Byte(message, index) {
  const hex = `${message[index]}`;
  return convert_hex2dec(hex);
}

function tagoVariable(variable, value, serie, time, unit, metadata) {
  const var_obj = {};
  var_obj.variable = variable;
  var_obj.value = value;
  if (serie) var_obj.serie = serie;
  if (time) var_obj.time = time;
  if (unit) var_obj.unit = unit;
  if (metadata) var_obj.metadata = metadata;
  return var_obj;
}

function parseAirSensor(bytes, serie, time) {
  const data = [];
  const air_sensor_bytes = bytes.slice(3, 5);

  const air_temperature = extractNumber2Bytes(air_sensor_bytes, 0);
  const air_temperature_value = ((air_temperature / 65536) * 175.72) - 46.85;
  data.push(tagoVariable('air_temperature', Number(air_temperature_value).toFixed(2), serie, time, '°C'));

  const air_humidity = extractNumber2Bytes(air_sensor_bytes, 1);
  const air_humidity_value = ((air_humidity / 65536) * 125) - 6;
  data.push(tagoVariable('air_humidity', Number(air_humidity_value).toFixed(2), serie, time, '%'));
  return data;
}

function parseBmpSensor(bmp280_bytes, serie, time) {
  const data = [];

  const bpm280_temperature = extractNumber2Bytes(bmp280_bytes, 0);
  const bpm280_temperature_value = (bpm280_temperature - 5000) / 100;
  data.push(tagoVariable('bpm280_temperature', Number(bpm280_temperature_value).toFixed(2), serie, time, '°C'));

  const barometric_pressure = extractNumber2Bytes(bmp280_bytes, 1);
  const barometric_pressure_value = barometric_pressure * 2;
  data.push(tagoVariable('barometric_pressure', Number(barometric_pressure_value).toFixed(0), serie, time, 'Pa'));
  return data;
}

function parseCO2Sensor(co2_bytes, serie, time) {
  const data = [];

  const co2_concentration = extractNumber2Bytes(co2_bytes, 0);
  const co2_concentration_value = co2_concentration - 32768;
  data.push(tagoVariable('co2_concentration', Number(co2_concentration_value).toFixed(0), serie, time, 'ppm'));

  const co2_concentration_lpf = extractNumber2Bytes(co2_bytes, 1);
  const co2_concentration_lpf_value = co2_concentration_lpf - 32768;
  data.push(tagoVariable('co2_concentration_lpf', Number(co2_concentration_lpf_value).toFixed(0), serie, time, 'ppm'));

  const co2_sensor_temperature = extractNumber2Bytes(co2_bytes, 2);
  const co2_sensor_temperature_value = (co2_sensor_temperature - 32768) / 100;
  data.push(tagoVariable('co2_sensor_temperature', Number(co2_sensor_temperature_value).toFixed(2), serie, time, '°C'));

  const capacitor_voltage1 = extractNumber2Bytes(co2_bytes, 3);
  const capacitor_voltage1_value = capacitor_voltage1 / 1000;
  data.push(tagoVariable('capacitor_voltage1', Number(capacitor_voltage1_value).toFixed(3), serie, time, 'V'));

  const capacitor_voltage2 = extractNumber2Bytes(co2_bytes, 4);
  const capacitor_voltage2_value = capacitor_voltage2 / 1000;
  data.push(tagoVariable('capacitor_voltage2', Number(capacitor_voltage2_value).toFixed(3), serie, time, 'V'));

  const co2_sensor_status = extractNumber2Bytes(co2_bytes, 5);
  data.push(tagoVariable('co2_sensor_status', Number(co2_sensor_status).toFixed(0), serie, time));

  const raw_ir_reading = extractNumber2Bytes(co2_bytes, 6);
  data.push(tagoVariable('raw_ir_reading', Number(raw_ir_reading).toFixed(0), serie, time));

  const raw_ir_reading_lpf = extractNumber2Bytes(co2_bytes, 7);
  data.push(tagoVariable('raw_ir_reading_lpf', Number(raw_ir_reading_lpf).toFixed(0), serie, time));


  return data;
}

function parseBatterySensor(battery_byte, serie, time) {
  const data = [];

  const battery = extractNumber2Bytes(battery_byte, 0);
  const battery_value = battery / 1000;
  data.push(tagoVariable('battery', battery_value.toFixed(3), serie, time, 'V'));
  return data;
}

function parse(context, scope) {
  co(function* _() {
    const env_var = Utils.env_to_obj(context.environment);
    if (!env_var.account_token) return context.log('Can not be found the parameter account_token on environment variables');
    context.log('Parse started!');
    const pdu = !scope[0] ? null : scope.find(x => x.variable === 'pdu');
    if (!pdu) return context.log('Variable data can not be found');

    let data_to_tago = [];
    const payload = String(pdu.value);
    const serie = pdu.serie || Date.now();
    const time = pdu.time || undefined;

    const bytes = [];
    for (let i = 0; i < payload.length; i += 2) {
      if (i < 2) {
        bytes.push(`${payload[i]}${payload[i + 1]}`);
      } else {
        bytes.push(`${payload[i]}${payload[i + 1]}${payload[i + 2]}${payload[i + 3]}`);
        i += 2;
      }
    }

    const version = extractNumber1Byte(bytes, 0);
    const device_id = extractNumber2Bytes(bytes, 1);
    const flag = extractNumber2BytesBin(bytes, 2);

    data_to_tago.push(tagoVariable('device_id', device_id, serie, time, null, { flag, version }));

    const flags = [];
    for (let index = 0; index < flag.length; index++) {
      flags.push(Number(flag[index]));
    }

    // check if send variables to battery
    if (flags[0] === 1) {
      const battery_bytes = bytes.slice(bytes.length - 1);
      data_to_tago = data_to_tago.concat(parseBatterySensor(battery_bytes, serie, time));
    }

    // check if send variables to co2 sensor
    if (flags[1] === 1) {
      let co2_bytes;
      switch (bytes.length) {
        case 11:
          co2_bytes = bytes.slice(3, 11);
          break;
        case 12:
          co2_bytes = bytes.slice(3, 11);
          break;
        case 13:
          co2_bytes = bytes.slice(3, 13);
          break;
        case 14:
          co2_bytes = bytes.slice(5, 13);
          break;
        default:
          co2_bytes = bytes.slice(7, 15);
          break;
      }
      data_to_tago = data_to_tago.concat(parseCO2Sensor(co2_bytes, serie, time));
    }

    // check if send variables to bmp280 sensor
    if (flags[2] === 1) {
      let bmp280_bytes;
      switch (bytes.length) {
        case 14:
          bmp280_bytes = bytes.slice(3, 5);
          break;
        case 13:
          bmp280_bytes = bytes.slice(3, 5);
          break;
        case 6:
          bmp280_bytes = bytes.slice(3, 5);
          break;
        case 5:
          bmp280_bytes = bytes.slice(3, 5);
          break;
        case 15:
          bmp280_bytes = bytes.slice(5, 7);
          break;
        case 7:
          bmp280_bytes = bytes.slice(5, 7);
          break;
        case 9:
          bmp280_bytes = bytes.slice(5, 7);
          break;
        default:
          bmp280_bytes = bytes.slice(5, 7);
          break;
      }
      data_to_tago = data_to_tago.concat(parseBmpSensor(bmp280_bytes, serie, time));
    }

    // check if send variables to air sensor
    if (flags[3] === 1) {
      data_to_tago = data_to_tago.concat(parseAirSensor(bytes, serie, time));
    }

    const myaccount = new Account(env_var.account_token);
    const device_token = yield Utils.getTokenByName(myaccount, pdu.origin, ['Generic', 'Default', 'Token #1', 'Token #2']);
    if (!device_token) return context.log(`Can not be found token to device origin: ${pdu.origin}`);

    const mydevice = new Device(device_token);
    yield mydevice.insert(data_to_tago).then(context.log);
    context.log('Parse successfully finished!');
  }).catch(context.log);
}

module.exports = new Analysis(parse, 'MY-ANALYSIS-TOKEN-HERE');
