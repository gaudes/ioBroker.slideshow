var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __markAsModule = (target) => __defProp(target, "__esModule", { value: true });
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);
var nominatim_exports = {};
__export(nominatim_exports, {
  getLocationInfos: () => getLocationInfos
});
var import_nominatim_client = __toESM(require("nominatim-client"));
var import_moment = __toESM(require("moment"));
let time = null;
const blockTimeout = 30;
async function getLocationInfos(Helper, CurrentPictureResult) {
  try {
    const locationInfos = await downloadLocationInfos(Helper, CurrentPictureResult);
    let result = null;
    if (locationInfos) {
      result = {
        country: locationInfos.address && locationInfos.address.country ? locationInfos.address.country : null,
        state: locationInfos.address && locationInfos.address.state ? locationInfos.address.state : null,
        county: locationInfos.address && locationInfos.address.county ? locationInfos.address.county : null,
        city: locationInfos.address && locationInfos.address.city ? locationInfos.address.city : null,
        display_name: locationInfos.display_name ? locationInfos.display_name : null
      };
    }
    return result;
  } catch (error) {
    Helper.ReportingError(error, `${CurrentPictureResult.path} Unknown Error`, "exifr", "getLocationInfos");
    return null;
  }
}
async function downloadLocationInfos(Helper, CurrentPictureResult) {
  try {
    (0, import_moment.default)();
    if (time === null || (0, import_moment.default)().diff(time, "minutes") >= blockTimeout) {
      const client = import_nominatim_client.default.createClient({
        useragent: `ioBroker-slideshow-${Math.random() * (1e5 - 1) + 1}@iobroker.net`,
        referer: "https://nominatim.openstreetmap.org"
      });
      const query = {
        lat: CurrentPictureResult.latitude.toFixed(8),
        lon: CurrentPictureResult.longitude.toFixed(8),
        zoom: 18,
        "accept-language": Helper.getLanguage()
      };
      return new Promise((resolve) => {
        client.reverse(query).then((result) => {
          Helper.ReportingInfo("Debug", "Adapter", `[downloadLocationInfos]: ${JSON.stringify(result)}`);
          time = null;
          resolve(result);
        }).catch((error) => {
          Helper.ReportingError(error, `${CurrentPictureResult.path}, query: ${JSON.stringify(query)} Unknown Error`, "exifr", "downloadLocationInfos");
          time = (0, import_moment.default)();
          resolve(void 0);
        });
      });
    } else {
      Helper.ReportingInfo("Debug", "downloadLocationInfos", `Blocking prevention - waiting ${blockTimeout - (0, import_moment.default)().diff(time, "minutes")} Min.`);
    }
  } catch (error) {
    Helper.ReportingError(error, `${CurrentPictureResult.path} Unknown Error`, "exifr", "downloadLocationInfos");
    return null;
  }
}
module.exports = __toCommonJS(nominatim_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getLocationInfos
});
//# sourceMappingURL=nominatim.js.map
