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
var slideBing_exports = {};
__export(slideBing_exports, {
  getPicture: () => getPicture,
  updatePictureList: () => updatePictureList
});
module.exports = __toCommonJS(slideBing_exports);
var import_axios = __toESM(require("axios"));
const BingUrl = "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=10&mkt=de-DE";
let BingPictureList;
let CurrentImage;
async function getPicture(Helper) {
  try {
    if (BingPictureList.length === 0) {
      await updatePictureList(Helper);
    }
    if (BingPictureList.length !== 0) {
      if (!CurrentImage) {
        CurrentImage = BingPictureList[0];
      } else {
        if (BingPictureList.indexOf(CurrentImage) === BingPictureList.length - 1) {
          CurrentImage = BingPictureList[0];
        } else {
          CurrentImage = BingPictureList[BingPictureList.indexOf(CurrentImage) + 1];
        }
      }
      return CurrentImage;
    }
    return null;
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Bing", "getPicture");
    return null;
  }
}
async function updatePictureList(Helper) {
  try {
    BingPictureList = [];
    const WebResult = await import_axios.default.get(BingUrl);
    Helper.ReportingInfo("Debug", "Bing", "Picture list received", { JSON: JSON.stringify(WebResult.data) });
    WebResult.data.images.forEach((Image) => {
      const ImageDetails = Image.copyright.match(/(.*)\s\(©\s(.*)\)/);
      let ImageDescription = "";
      let ImageCopyright = "";
      if (ImageDetails) {
        ImageDescription = ImageDetails[1];
        ImageCopyright = ImageDetails[2];
      }
      const ImageDate = new Date(parseInt(Image.startdate.substring(0, 4)), parseInt(Image.startdate.substring(4, 6)), parseInt(Image.startdate.substring(6, 8)));
      if (Array.isArray(BingPictureList)) {
        BingPictureList.push({ bingurl: "https://bing.com" + Image.url, url: "", path: "", info1: Image.title, info2: ImageDescription, info3: ImageCopyright, date: ImageDate });
      } else {
        BingPictureList = [{ bingurl: "https://bing.com" + Image.url, url: "", path: "", info1: Image.title, info2: ImageDescription, info3: ImageCopyright, date: ImageDate }];
      }
    });
    Helper.ReportingInfo("Debug", "Bing", `Picture List from Bing: ${JSON.stringify(BingPictureList)}`, { JSON: JSON.stringify(BingPictureList.slice(0, 10)) });
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Bing", "updatePictureList/List");
    return { success: false, picturecount: 0 };
  }
  try {
    for (const CountElement in BingPictureList) {
      const currentWebCall = await import_axios.default.get(BingPictureList[CountElement].bingurl, { responseType: "arraybuffer" });
      await Helper.Adapter.writeFileAsync(Helper.Adapter.namespace, `bing/${CountElement}.jpg`, currentWebCall.data);
      BingPictureList[CountElement].url = `/${Helper.Adapter.namespace}/bing/${CountElement}.jpg`;
      BingPictureList[CountElement].path = BingPictureList[CountElement].url;
    }
    Helper.ReportingInfo("Info", "Bing", `${BingPictureList.length} pictures downloaded from Bing`, { JSON: JSON.stringify(BingPictureList.slice(0, 10)) });
    return { success: true, picturecount: BingPictureList.length };
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Bing", "updatePictureList/Download");
    return { success: false, picturecount: 0 };
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPicture,
  updatePictureList
});
//# sourceMappingURL=slideBing.js.map
