var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __reExport = (target, module2, copyDefault, desc) => {
  if (module2 && typeof module2 === "object" || typeof module2 === "function") {
    for (let key of __getOwnPropNames(module2))
      if (!__hasOwnProp.call(target, key) && (copyDefault || key !== "default"))
        __defProp(target, key, { get: () => module2[key], enumerable: !(desc = __getOwnPropDesc(module2, key)) || desc.enumerable });
  }
  return target;
};
var __toESM = (module2, isNodeMode) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var utils = __toESM(require("@iobroker/adapter-core"));
var import_global_helper = require("./modules/global-helper");
var slideBing = __toESM(require("./modules/slideBing"));
var slideLocal = __toESM(require("./modules/slideLocal"));
var slideFS = __toESM(require("./modules/slideFS"));
var slideSyno = __toESM(require("./modules/slideSynology"));
var nominatim = __toESM(require("./modules/nominatim"));
let Helper;
const MsgErrUnknown = "Unknown Error";
let UpdateRunning = false;
let language = "en";
let storedLocations = {};
class Slideshow extends utils.Adapter {
  constructor(options = {}) {
    super(__spreadProps(__spreadValues({}, options), {
      name: "slideshow"
    }));
    this.tUpdatePictureStoreTimeout = null;
    this.tUpdateCurrentPictureTimeout = null;
    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
    this.isUnloaded = false;
  }
  async onReady() {
    try {
      var sysConfig = await this.getForeignObjectAsync("system.config");
      if (sysConfig && sysConfig.common && sysConfig.common["language"]) {
        language = sysConfig.common["language"];
      }
      Helper = new import_global_helper.GlobalHelper(this, language);
      await this.setObjectNotExistsAsync("updatepicturelist", {
        type: "state",
        common: {
          name: "updatepicturelist",
          type: "boolean",
          role: "button",
          read: true,
          write: true,
          desc: "Update picture list",
          def: false
        },
        native: {}
      });
      await this.setStateAsync("updatepicturelist", false, true);
      this.subscribeStates("updatepicturelist");
      if (this.config.downloadLocationData) {
        const locationCacheState = await this.getStateAsync("location.cache");
        if (locationCacheState && locationCacheState.val) {
          storedLocations = JSON.parse(locationCacheState.val.toString());
        }
      }
      await this.updatePictureStoreTimer();
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "onReady");
    }
  }
  async onStateChange(id, state) {
    if (state) {
      if (id === `${this.namespace}.updatepicturelist` && (state == null ? void 0 : state.val) === true && (state == null ? void 0 : state.ack) === false) {
        if (UpdateRunning === true) {
          Helper.ReportingInfo("Info", "Adapter", "Update picture list already running");
        } else {
          Helper.ReportingInfo("Info", "Adapter", "Updating picture list");
          clearTimeout(this.tUpdateCurrentPictureTimeout);
          await this.updatePictureStoreTimer();
        }
        await this.setStateAsync("updatepicturelist", false, false);
      }
    }
  }
  onUnload(callback) {
    try {
      this.isUnloaded = true;
      clearTimeout(this.tUpdateCurrentPictureTimeout);
      clearTimeout(this.tUpdatePictureStoreTimeout);
      callback();
    } catch (e) {
      callback();
    }
  }
  async updatePictureStoreTimer() {
    UpdateRunning = true;
    storedLocations = {};
    let updatePictureStoreResult = { success: false, picturecount: 0 };
    Helper.ReportingInfo("Debug", "Adapter", "UpdatePictureStoreTimer occured");
    try {
      this.tUpdatePictureStoreTimeout && clearTimeout(this.tUpdatePictureStoreTimeout);
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Clear Timer");
    }
    try {
      switch (this.config.provider) {
        case 1:
          updatePictureStoreResult = await slideBing.updatePictureList(Helper);
          break;
        case 2:
          updatePictureStoreResult = await slideLocal.updatePictureList(Helper);
          break;
        case 3:
          updatePictureStoreResult = await slideFS.updatePictureList(Helper);
          break;
        case 4:
          updatePictureStoreResult = await slideSyno.updatePictureList(Helper);
          break;
      }
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Call Timer Action");
    }
    try {
      if (this.config.update_picture_list && this.config.update_picture_list > 0 && updatePictureStoreResult.success === true) {
        Helper.ReportingInfo("Debug", "updatePictureStoreTimer", `Update every ${this.config.update_picture_list} hours, starting timer`);
        this.tUpdatePictureStoreTimeout = setTimeout(() => {
          this.updatePictureStoreTimer();
        }, this.config.update_picture_list * 36e5);
      } else if (updatePictureStoreResult.success === false) {
        this.tUpdatePictureStoreTimeout = setTimeout(() => {
          this.updatePictureStoreTimer();
        }, this.config.update_interval * 3e5);
      }
      if (updatePictureStoreResult.success === true && updatePictureStoreResult.picturecount > 0 && this.isUnloaded === false) {
        await this.setObjectNotExistsAsync("picturecount", {
          type: "state",
          common: {
            name: "picturecount",
            type: "number",
            role: "value",
            read: true,
            write: false,
            desc: "Pictures found"
          },
          native: {}
        });
        await this.setStateAsync("picturecount", { val: updatePictureStoreResult.picturecount, ack: true });
        this.updateCurrentPictureTimer();
      }
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Set Timer");
    }
    UpdateRunning = false;
  }
  async updateCurrentPictureTimer() {
    var _a;
    let CurrentPictureResult = null;
    let Provider = "";
    Helper.ReportingInfo("Debug", "Adapter", "updateCurrentPictureTimer occured");
    try {
      this.tUpdateCurrentPictureTimeout && clearTimeout(this.tUpdateCurrentPictureTimeout);
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Clear Timer");
    }
    try {
      switch (this.config.provider) {
        case 1:
          CurrentPictureResult = await slideBing.getPicture(Helper);
          Provider = "Bing";
          break;
        case 2:
          CurrentPictureResult = await slideLocal.getPicture(Helper);
          Provider = "Local";
          break;
        case 3:
          CurrentPictureResult = await slideFS.getPicture(Helper);
          Provider = "FileSystem";
          break;
        case 4:
          CurrentPictureResult = await slideSyno.getPicture(Helper);
          Provider = "Synology";
          break;
      }
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
    }
    try {
      if (CurrentPictureResult !== null && this.isUnloaded === false) {
        Helper.ReportingInfo("Debug", Provider, `Set picture to ${CurrentPictureResult.path}`);
        await this.setObjectNotExistsAsync("picture", {
          type: "state",
          common: {
            name: "picture",
            type: "string",
            role: "text",
            read: true,
            write: false,
            desc: "Current picture"
          },
          native: {}
        });
        await this.setStateAsync("picture", { val: CurrentPictureResult.url, ack: true });
        await this.setObjectNotExistsAsync("info1", {
          type: "state",
          common: {
            name: "info1",
            type: "string",
            role: "text",
            read: true,
            write: false,
            desc: "Info 1 for picture"
          },
          native: {}
        });
        await this.setStateAsync("info1", { val: CurrentPictureResult.info1, ack: true });
        await this.setObjectNotExistsAsync("info2", {
          type: "state",
          common: {
            name: "info2",
            type: "string",
            role: "text",
            read: true,
            write: false,
            desc: "Info 2 for picture"
          },
          native: {}
        });
        await this.setStateAsync("info2", { val: CurrentPictureResult.info2, ack: true });
        await this.setObjectNotExistsAsync("info3", {
          type: "state",
          common: {
            name: "info3",
            type: "string",
            role: "text",
            read: true,
            write: false,
            desc: "Info 3 for picture"
          },
          native: {}
        });
        await this.setStateAsync("info3", { val: CurrentPictureResult.info3, ack: true });
        await this.setObjectNotExistsAsync("date", {
          type: "state",
          common: {
            name: "date",
            type: "number",
            role: "date",
            read: true,
            write: false,
            desc: "Date of picture"
          },
          native: {}
        });
        await this.setStateAsync("date", { val: ((_a = CurrentPictureResult.date) == null ? void 0 : _a.getTime()) || null, ack: true });
        await this.setObjectNotExistsAsync("latitude", {
          type: "state",
          common: {
            name: "latitude",
            type: "number",
            role: "latitude",
            read: true,
            write: false,
            desc: "Latitude of picture"
          },
          native: {}
        });
        await this.setStateAsync("latitude", { val: CurrentPictureResult.latitude || null, ack: true });
        await this.setObjectNotExistsAsync("longitude", {
          type: "state",
          common: {
            name: "longitude",
            type: "number",
            role: "longitude",
            read: true,
            write: false,
            desc: "Longitude of picture"
          },
          native: {}
        });
        await this.setStateAsync("longitude", { val: CurrentPictureResult.longitude || null, ack: true });
        await this.setLocationStates(CurrentPictureResult);
      }
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
    }
    try {
      this.tUpdateCurrentPictureTimeout = setTimeout(() => {
        this.updateCurrentPictureTimer();
      }, this.config.update_interval * 1e3);
    } catch (err) {
      Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Set Timer");
    }
  }
  async setLocationStates(CurrentPictureResult) {
    try {
      if (this.config.downloadLocationData) {
        if (CurrentPictureResult && CurrentPictureResult.latitude !== null && CurrentPictureResult.longitude !== null) {
          if (!await this.getObjectAsync("location")) {
            await this.createChannelAsync("", "location");
          }
          await this.setObjectNotExistsAsync("location.country", {
            type: "state",
            common: {
              name: "country",
              type: "string",
              role: "country",
              read: true,
              write: false,
              desc: "Country of picture"
            },
            native: {}
          });
          await this.setObjectNotExistsAsync("location.state", {
            type: "state",
            common: {
              name: "state",
              type: "string",
              role: "state",
              read: true,
              write: false,
              desc: "State of picture"
            },
            native: {}
          });
          await this.setObjectNotExistsAsync("location.county", {
            type: "state",
            common: {
              name: "county",
              type: "string",
              role: "county",
              read: true,
              write: false,
              desc: "County of picture"
            },
            native: {}
          });
          await this.setObjectNotExistsAsync("location.city", {
            type: "state",
            common: {
              name: "city",
              type: "string",
              role: "city",
              read: true,
              write: false,
              desc: "City of picture"
            },
            native: {}
          });
          await this.setObjectNotExistsAsync("location.display_name", {
            type: "state",
            common: {
              name: "display_name",
              type: "string",
              role: "display_name",
              read: true,
              write: false,
              desc: "Full Infos of picture"
            },
            native: {}
          });
          await this.setObjectNotExistsAsync("location.cache", {
            type: "state",
            common: {
              name: "cache",
              type: "string",
              role: "",
              read: true,
              write: false,
              desc: "picture info cache",
              def: "{}"
            },
            native: {}
          });
          if (storedLocations && CurrentPictureResult.path && storedLocations[CurrentPictureResult.path]) {
            Helper.ReportingInfo("Debug", "Adapter", `[setLocationStates]: loading from cache (file: ${CurrentPictureResult.path}, data: ${JSON.stringify(storedLocations[CurrentPictureResult.path])}`);
            await this.setStateAsync("location.country", { val: storedLocations[CurrentPictureResult.path].country || "", ack: true });
            await this.setStateAsync("location.state", { val: storedLocations[CurrentPictureResult.path].state || "", ack: true });
            await this.setStateAsync("location.county", { val: storedLocations[CurrentPictureResult.path].county || "", ack: true });
            await this.setStateAsync("location.city", { val: storedLocations[CurrentPictureResult.path].city || "", ack: true });
            await this.setStateAsync("location.display_name", { val: storedLocations[CurrentPictureResult.path].display_name || "", ack: true });
          } else {
            const locationInfos = await nominatim.getLocationInfos(Helper, CurrentPictureResult);
            if (locationInfos && CurrentPictureResult.path) {
              storedLocations[CurrentPictureResult.path] = locationInfos;
              Helper.ReportingInfo("Debug", "Adapter", `[setLocationStates]: data downloaded (file: ${CurrentPictureResult.path}, data: ${JSON.stringify(storedLocations[CurrentPictureResult.path])}`);
              await this.setStateAsync("location.country", { val: locationInfos.country || "", ack: true });
              await this.setStateAsync("location.state", { val: locationInfos.state || "", ack: true });
              await this.setStateAsync("location.county", { val: locationInfos.county || "", ack: true });
              await this.setStateAsync("location.city", { val: locationInfos.city || "", ack: true });
              await this.setStateAsync("location.display_name", { val: locationInfos.display_name || "", ack: true });
              this.setState("location.cache", JSON.stringify(storedLocations), true);
            } else {
              await this.setStateAsync("location.country", { val: "", ack: true });
              await this.setStateAsync("location.state", { val: "", ack: true });
              await this.setStateAsync("location.county", { val: "", ack: true });
              await this.setStateAsync("location.city", { val: "", ack: true });
              await this.setStateAsync("location.display_name", { val: "", ack: true });
            }
          }
        } else {
          await this.setStateAsync("location.country", { val: "", ack: true });
          await this.setStateAsync("location.state", { val: "", ack: true });
          await this.setStateAsync("location.county", { val: "", ack: true });
          await this.setStateAsync("location.city", { val: "", ack: true });
          await this.setStateAsync("location.display_name", { val: "", ack: true });
        }
      }
    } catch (error) {
      Helper.ReportingError(error, "Unknown Error", "main", "setLocationStates");
    }
  }
}
if (module.parent) {
  module.exports = (options) => new Slideshow(options);
} else {
  (() => new Slideshow())();
}
//# sourceMappingURL=main.js.map
