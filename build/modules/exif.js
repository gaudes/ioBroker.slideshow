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
var exif_exports = {};
__export(exif_exports, {
  getPictureInformation: () => getPictureInformation
});
var exifr = __toESM(require("exifr"));
var import_exif = require("exif");
var import_moment = __toESM(require("moment"));
var import_coordinate_parser = __toESM(require("coordinate-parser"));
async function getPictureInformation(Helper, file) {
  try {
    let PictureInfo = await exifr.parse(file, true);
    let GpsInfo = await exifr.gps(file);
    if (!GpsInfo || !GpsInfo.latitude || !GpsInfo.longitude) {
      GpsInfo = {
        latitude: PictureInfo.latitude,
        longitude: PictureInfo.longitude
      };
    }
    let fallbackData = await getFallbackData(Helper, file, PictureInfo, GpsInfo);
    return {
      info1: PictureInfo && PictureInfo["XPTitle"] ? PictureInfo["XPTitle"] : "",
      info2: PictureInfo && PictureInfo["XPSubject"] ? PictureInfo["XPSubject"] : "",
      info3: PictureInfo && PictureInfo["XPComment"] ? PictureInfo["XPComment"] : "",
      date: PictureInfo && PictureInfo["DateTimeOriginal"] ? new Date(PictureInfo["DateTimeOriginal"]) : fallbackData.date,
      latitude: GpsInfo && GpsInfo.latitude ? GpsInfo.latitude : fallbackData.latitude,
      longitude: GpsInfo && GpsInfo.longitude ? GpsInfo.longitude : fallbackData.longitude
    };
  } catch (error) {
    Helper.ReportingError(error, "Unknown Error", "exifr", "getPictureInformation");
    return null;
  }
}
async function getFallbackData(Helper, file, PictureInfo, GpsInfo) {
  let fallbackDate = null;
  let fallbackLatitude = null;
  let fallbackLongitude = null;
  if (!PictureInfo || !PictureInfo["DateTimeOriginal"] || !GpsInfo || !GpsInfo.latitude || !GpsInfo.longitude) {
    let fallbackData = await getExifFallback(Helper, file);
    if (fallbackData) {
      if (!PictureInfo || !PictureInfo["DateTimeOriginal"]) {
        if (fallbackData.exif && fallbackData.exif.DateTimeOriginal) {
          Helper.ReportingInfo("Debug", "Adapter", `using fallback lib: file: '${file}', DateTimeOriginal: '${fallbackData.exif.DateTimeOriginal}'`);
          fallbackDate = fallbackData.exif && fallbackData.exif.DateTimeOriginal ? new Date((0, import_moment.default)(fallbackData.exif.DateTimeOriginal, "YYYY:MM:DD HH:mm:ss").toString()) : null;
        }
      }
      if (fallbackDate === null && fallbackData.gps && fallbackData.gps.GPSDateStamp) {
        Helper.ReportingInfo("Debug", "Adapter", `using fallback lib: file: '${file}', GPSDateStamp: '${fallbackData.gps.GPSDateStamp}'`);
        fallbackDate = new Date((0, import_moment.default)(fallbackData.gps.GPSDateStamp, "YYYY:MM:DD").toString());
      }
      if (!GpsInfo || !GpsInfo.latitude || !GpsInfo.longitude) {
        if (fallbackData.gps && fallbackData.gps.GPSLatitudeRef && fallbackData.gps.GPSLatitude && fallbackData.gps.GPSLongitudeRef && fallbackData.gps.GPSLongitude) {
          let latitudeTmp = `${fallbackData.gps.GPSLatitude[0]}:${fallbackData.gps.GPSLatitude[1]}:${fallbackData.gps.GPSLatitude[2]}${fallbackData.gps.GPSLatitudeRef}`;
          let longitudeTmp = `${fallbackData.gps.GPSLongitude[0]}:${fallbackData.gps.GPSLongitude[1]}:${fallbackData.gps.GPSLongitude[2]}${fallbackData.gps.GPSLongitudeRef}`;
          let coordTmp = `${latitudeTmp} ${longitudeTmp}`;
          Helper.ReportingInfo("Debug", "Adapter", `using fallback lib: file: '${file}', Coordinates: '${coordTmp}'`);
          try {
            let position = new import_coordinate_parser.default(coordTmp);
            fallbackLatitude = position.getLatitude();
            fallbackLongitude = position.getLongitude();
          } catch (err) {
            Helper.ReportingError(err, "Unknown Error", "gpsCoordParser", "getFallbackData");
          }
        }
      }
    }
  }
  return {
    date: fallbackDate,
    latitude: fallbackLatitude,
    longitude: fallbackLongitude
  };
}
async function getExifFallback(Helper, file) {
  return new Promise((resolve) => {
    new import_exif.ExifImage(file, (error, data) => {
      if (error) {
        if (error.message.includes("The Exif data is not valid") || error.message.includes("No Exif segment found in the given image")) {
          Helper.ReportingInfo("Debug", "Adapter", `[getExifFallback]: ${error.message}`);
        } else {
          Helper.ReportingError(error, "Unknown Error", "exif", "getExifFallback");
        }
        resolve(null);
      } else {
        resolve(data);
      }
    });
  });
}
module.exports = __toCommonJS(exif_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPictureInformation
});
//# sourceMappingURL=exif.js.map
