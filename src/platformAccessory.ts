import { Service, PlatformAccessory, CharacteristicValue } from 'homebridge';

import { GoveeThermometerPlatform } from './platform';

/**
 * Platform Accessory
 * An instance of this class is created for each accessory your platform registers
 * Each accessory may expose multiple services of different service types.
 */
export class GoveeThermoHydrometerAccessory {
  private tempService: Service;
  private humidService: Service;

  /**
   * These are just used to create a working example
   * You should implement your own code to track the state of your accessory
   */
  private initialStates = {
    Temperature: 32.0,
    Humidity: 0,
  };

  constructor(
    private readonly platform: GoveeThermometerPlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Govee')
      .setCharacteristic(this.platform.Characteristic.Model, 'H5179')
      .setCharacteristic(this.platform.Characteristic.SerialNumber, 'Default-Serial');

    // get the LightBulb service if it exists, otherwise create a new LightBulb service
    // you can create multiple services for each accessory
    this.tempService = this.accessory.getService(this.platform.Service.TemperatureSensor) ||
      this.accessory.addService(this.platform.Service.TemperatureSensor);
    this.humidService = this.accessory.getService(this.platform.Service.HumiditySensor) ||
      this.accessory.addService(this.platform.Service.HumiditySensor);

    // set the service name, this is what is displayed as the default name on the Home app
    // in this example we are using the name we stored in the `accessory.context` in the `discoverDevices` method.
    this.tempService.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.deviceName);
    this.humidService.setCharacteristic(this.platform.Characteristic.Name, this.accessory.context.device.deviceName);

    // each service must implement at-minimum the "required characteristics" for the given service type
    // see https://developers.homebridge.io/#/service/Lightbulb

    // register handlers for the On/Off Characteristic
    this.tempService.getCharacteristic(this.platform.Characteristic.CurrentTemperature)
      .onGet(this.getTemp.bind(this)); // GET - bind to the `getOn` method below

    this.humidService.getCharacteristic(this.platform.Characteristic.CurrentRelativeHumidity)
      .onGet(this.getHumid.bind(this));

    /**
     * Creating multiple services of the same type.
     *
     * To avoid "Cannot add a Service with the same UUID another Service without also defining a unique 'subtype' property." error,
     * when creating multiple services of the same type, you need to use the following syntax to specify a name and subtype id:
     * this.accessory.getService('NAME') || this.accessory.addService(this.platform.Service.Lightbulb, 'NAME', 'USER_DEFINED_SUBTYPE_ID');
     *
     * The USER_DEFINED_SUBTYPE must be unique to the platform accessory (if you platform exposes multiple accessories, each accessory
     * can use the same sub type id.)
     */

    // Example: add two "motion sensor" services to the accessory
    // const motionSensorOneService = this.accessory.getService('Motion Sensor One Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor One Name', 'YourUniqueIdentifier-1');

    // const motionSensorTwoService = this.accessory.getService('Motion Sensor Two Name') ||
    //   this.accessory.addService(this.platform.Service.MotionSensor, 'Motion Sensor Two Name', 'YourUniqueIdentifier-2');

    /**
     * Updating characteristics values asynchronously.
     *
     * Example showing how to update the state of a Characteristic asynchronously instead
     * of using the `on('get')` handlers.
     * Here we change update the motion sensor trigger states on and off every 10 seconds
     * the `updateCharacteristic` method.
     *
     */
    // let motionDetected = false;
    // setInterval(() => {
    //   // EXAMPLE - inverse the trigger
    //   motionDetected = !motionDetected;

    //   // push the new value to HomeKit
    //   motionSensorOneService.updateCharacteristic(this.platform.Characteristic.MotionDetected, motionDetected);
    //   motionSensorTwoService.updateCharacteristic(this.platform.Characteristic.MotionDetected, !motionDetected);

    //   this.platform.log.debug('Triggering motionSensorOneService:', motionDetected);
    //   this.platform.log.debug('Triggering motionSensorTwoService:', !motionDetected);
    // }, 10000);
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, turning on a Light bulb.
   */
  // async setOn(value: CharacteristicValue) {
  //   // implement your own code to turn your device on/off
  //   this.exampleStates.On = value as boolean;

  //   this.platform.log.debug('Set Characteristic On ->', value);
  // }

  /**
   * Handle the "GET" requests from HomeKit
   * These are sent when HomeKit wants to know the current state of the accessory, for example, checking if a Light bulb is on.
   *
   * GET requests should return as fast as possbile. A long delay here will result in
   * HomeKit being unresponsive and a bad user experience in general.
   *
   * If your device takes time to respond you should update the status of your device
   * asynchronously instead using the `updateCharacteristic` method instead.

   * @example
   * this.service.updateCharacteristic(this.platform.Characteristic.On, true)
   */
  async getTemp(): Promise<CharacteristicValue> {
    const stateURL = 'https://openapi.api.govee.com/router/api/v1/device/state';
    const response = await fetch(stateURL, {
      method: 'POST',
      body: JSON.stringify({
        requestId: 'uuid',
        payload: {
          sku: 'H5179',
          device: this.accessory.context.device.device,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        'Govee-API-Key': this.platform.config.key,
      },
    });

    if (!response.ok) {
      // this.platform.log.error(response.statusText)
      this.platform.log.error('Error fetching device state');
    }

    // implement your own code to check if the device is on
    const responseJSON = await response.json();
    const temp = responseJSON.payload.capabilities[1].state.value / 100;

    this.platform.log.debug('Get Characteristic Temp ->', temp);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return temp;
  }

  /**
   * Handle "SET" requests from HomeKit
   * These are sent when the user changes the state of an accessory, for example, changing the Brightness
   */
  async getHumid(): Promise<CharacteristicValue> {
    const stateURL = 'https://openapi.api.govee.com/router/api/v1/device/state';
    const response = await fetch(stateURL, {
      method: 'POST',
      body: JSON.stringify({
        requestId: 'uuid',
        payload: {
          sku: 'H5179',
          device: this.accessory.context.device.device,
        },
      }),
      headers: {
        'Content-Type': 'application/json',
        'Govee-API-Key': this.platform.config.key,
      },
    });

    if (!response.ok) {
      // this.platform.log.error(response.statusText)
      this.platform.log.error('Error fetching device state');
    }

    // implement your own code to check if the device is on
    const responseJSON = await response.json();
    const humid = responseJSON.payload.capabilities[2].state.value.currentHumidity / 100;

    this.platform.log.debug('Get Characteristic Temp ->', humid);

    // if you need to return an error to show the device as "Not Responding" in the Home app:
    // throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);

    return humid;
  }

}
