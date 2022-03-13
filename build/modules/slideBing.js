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
var slideBing_exports = {};
__export(slideBing_exports, {
  getPicture: () => getPicture,
  updatePictureList: () => updatePictureList
});
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
module.exports = __toCommonJS(slideBing_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPicture,
  updatePictureList
});
//# sourceMappingURL=slideBing.js.map
