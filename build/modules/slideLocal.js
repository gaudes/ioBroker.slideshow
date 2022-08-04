var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);
var slideLocal_exports = {};
__export(slideLocal_exports, {
  getPicture: () => getPicture,
  updatePictureList: () => updatePictureList
});
var import_exif = require("./exif");
let CurrentImages;
let CurrentImage;
async function getPicture(Helper) {
  try {
    if (CurrentImages.length === 0) {
      await updatePictureList(Helper);
    }
    if (CurrentImages.length !== 0) {
      if (!CurrentImage) {
        CurrentImage = CurrentImages[0];
      } else {
        if (CurrentImages.indexOf(CurrentImage) === CurrentImages.length - 1) {
          CurrentImage = CurrentImages[0];
        } else {
          CurrentImage = CurrentImages[CurrentImages.indexOf(CurrentImage) + 1];
        }
      }
      return CurrentImage;
    }
    return null;
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Local", "getPicture");
    return null;
  }
}
async function updatePictureList(Helper) {
  try {
    CurrentImages = [];
    const CurrentImageFiles = await Helper.Adapter.readDirAsync("vis.0", "/slideshow");
    if (!(CurrentImageFiles.length > 0)) {
      Helper.ReportingError(null, "No pictures found in folder", "Local", "updatePictureList/List", "", false);
      return { success: false, picturecount: 0 };
    } else {
      await Promise.all(CurrentImageFiles.map(async (file) => {
        const CurrentImageFile = await Helper.Adapter.readFileAsync("vis.0", `/slideshow/${file.file}`);
        const fileInfo = await (0, import_exif.getPictureInformation)(Helper, CurrentImageFile.data);
        let info1, info2, info3 = "";
        let date = null;
        (fileInfo == null ? void 0 : fileInfo.info1) ? info1 = fileInfo == null ? void 0 : fileInfo.info1 : info1 = "";
        (fileInfo == null ? void 0 : fileInfo.info2) ? info2 = fileInfo == null ? void 0 : fileInfo.info2 : info2 = "";
        (fileInfo == null ? void 0 : fileInfo.info3) ? info3 = fileInfo == null ? void 0 : fileInfo.info3 : info3 = "";
        (fileInfo == null ? void 0 : fileInfo.date) ? date = fileInfo == null ? void 0 : fileInfo.date : date = null;
        if (Array.isArray(CurrentImages)) {
          CurrentImages.push({ url: `/vis.0/slideshow/${file.file}`, path: file.file, info1, info2, info3, date });
        } else {
          CurrentImages = [{ url: `/vis.0/slideshow/${file.file}`, path: file.file, info1, info2, info3, date }];
        }
      }));
    }
    Helper.ReportingInfo("Info", "Local", `${CurrentImages.length} pictures found`, { JSON: JSON.stringify(CurrentImages.slice(0, 10)) });
    return { success: true, picturecount: CurrentImages.length };
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Local", "updatePictureList/List");
    return { success: false, picturecount: 0 };
  }
}
module.exports = __toCommonJS(slideLocal_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPicture,
  updatePictureList
});
//# sourceMappingURL=slideLocal.js.map
