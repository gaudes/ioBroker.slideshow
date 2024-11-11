"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var exif_exports = {};
__export(exif_exports, {
  getPictureInformation: () => getPictureInformation
});
module.exports = __toCommonJS(exif_exports);
var exifr = __toESM(require("exifr"));
async function getPictureInformation(Helper, file) {
  try {
    const PictureInfo = await exifr.parse(file, ["XPTitle", "XPComment", "XPSubject", "DateTimeOriginal"]);
    return { info1: PictureInfo["XPTitle"] || "", info2: PictureInfo["XPSubject"] || "", info3: PictureInfo["XPComment"] || "", date: new Date(PictureInfo["DateTimeOriginal"]) };
  } catch (error) {
    return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPictureInformation
});
//# sourceMappingURL=exif.js.map
