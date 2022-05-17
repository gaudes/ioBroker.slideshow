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
var slideFS_exports = {};
__export(slideFS_exports, {
  getPicture: () => getPicture,
  updatePictureList: () => updatePictureList
});
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var imgsize = __toESM(require("image-size"));
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
      if (fs.existsSync(CurrentImage.path) === true) {
        try {
          const PicContent = fs.readFileSync(CurrentImage.path);
          const PicContentB64 = PicContent.toString("base64");
          return __spreadProps(__spreadValues({}, CurrentImage), { url: `data:image/jpeg;base64,${PicContentB64}` });
        } catch (err) {
          Helper.ReportingError(null, `File not accessible: ${CurrentImage.path}`, "Filesystem", "getPicture", "", false);
          return null;
        }
      } else {
        Helper.ReportingError(null, `File not accessible: ${CurrentImage.path}`, "Filesystem", "getPicture", "", false);
        return null;
      }
    }
    return null;
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Filesystem", "getPicture");
    return null;
  }
}
async function updatePictureList(Helper) {
  try {
    CurrentImages = [];
    if (!fs.existsSync(Helper.Adapter.config.fs_path)) {
      Helper.Adapter.log.error(`Folder ${Helper.Adapter.config.fs_path} does not exist`);
      return { success: false, picturecount: 0 };
    }
    const CurrentFileList = await getAllFiles(Helper, Helper.Adapter.config.fs_path);
    Helper.ReportingInfo("Info", "Filesystem", `${CurrentFileList.length} total files found in folder ${Helper.Adapter.config.fs_path}`, { JSON: JSON.stringify(CurrentFileList.slice(0, 99)) });
    const CurrentImageList = CurrentFileList.filter(function(file) {
      if (path.extname(file).toLowerCase() === ".jpg" || path.extname(file).toLowerCase() === ".jpeg" || path.extname(file).toLowerCase() === ".png") {
        return file;
      }
    });
    for (const ImageIndex in CurrentImageList) {
      if (Helper.Adapter.config.fs_format !== 0) {
        try {
          const ImageSize = await imgsize.imageSize(CurrentImageList[ImageIndex]);
          if (ImageSize.width && ImageSize.height) {
            if ((Helper.Adapter.config.fs_format === 1 && ImageSize.width > ImageSize.height) === true) {
              if (Array.isArray(CurrentImages)) {
                CurrentImages.push({ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null });
              } else {
                CurrentImages = [{ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null }];
              }
            }
            if ((Helper.Adapter.config.fs_format === 2 && ImageSize.height > ImageSize.width) === true) {
              if (Array.isArray(CurrentImages)) {
                CurrentImages.push({ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null });
              } else {
                CurrentImages = [{ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null }];
              }
            }
          }
        } catch (err) {
          Helper.Adapter.log.error(err.message);
        }
      } else {
        if (Array.isArray(CurrentImages)) {
          CurrentImages.push({ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null });
        } else {
          CurrentImages = [{ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null, latitude: null, longitude: null, locationInfos: null }];
        }
      }
    }
    if (Array.isArray(CurrentImages)) {
      if (CurrentImages.length > 0) {
        await Promise.all(CurrentImages.map(async (CurrentImage2) => {
          const fileInfo = await (0, import_exif.getPictureInformation)(Helper, CurrentImage2.path);
          (fileInfo == null ? void 0 : fileInfo.info1) ? CurrentImage2.info1 = fileInfo == null ? void 0 : fileInfo.info1 : CurrentImage2.info1 = "";
          (fileInfo == null ? void 0 : fileInfo.info2) ? CurrentImage2.info2 = fileInfo == null ? void 0 : fileInfo.info2 : CurrentImage2.info2 = "";
          (fileInfo == null ? void 0 : fileInfo.info3) ? CurrentImage2.info3 = fileInfo == null ? void 0 : fileInfo.info3 : CurrentImage2.info3 = "";
          (fileInfo == null ? void 0 : fileInfo.date) ? CurrentImage2.date = fileInfo == null ? void 0 : fileInfo.date : CurrentImage2.date = null;
          (fileInfo == null ? void 0 : fileInfo.latitude) ? CurrentImage2.latitude = fileInfo == null ? void 0 : fileInfo.latitude : CurrentImage2.latitude = null;
          (fileInfo == null ? void 0 : fileInfo.longitude) ? CurrentImage2.longitude = fileInfo == null ? void 0 : fileInfo.longitude : CurrentImage2.longitude = null;
        }));
      }
    }
    switch (Helper.Adapter.config.fs_order) {
      case 1:
        Helper.ReportingInfo("Debug", "Filesystem", "Sort pictures by filename");
        CurrentImages.sort((a, b) => a.path > b.path ? 1 : b.path > a.path ? -1 : 0);
        break;
      case 3:
        Helper.ReportingInfo("Debug", "Filesystem", "Sort pictures random");
        for (let i = CurrentImages.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [CurrentImages[i], CurrentImages[j]] = [CurrentImages[j], CurrentImages[i]];
        }
        break;
      default:
        Helper.ReportingInfo("Debug", "Filesystem", "Sort pictures by takendate");
        CurrentImages.sort((a, b) => {
          if (a.date !== null && b.date !== null) {
            if (a.date < b.date) {
              return -1;
            }
            if (a.date > b.date) {
              return 1;
            }
          }
          return 0;
        });
        break;
    }
    if (!(CurrentImages.length > 0)) {
      Helper.ReportingError(null, "No pictures found in folder", "Filesystem", "updatePictureList", "", false);
      return { success: false, picturecount: 0 };
    } else {
      Helper.ReportingInfo("Info", "Filesystem", `${CurrentImages.length} pictures found in folder ${Helper.Adapter.config.fs_path}`, { JSON: JSON.stringify(CurrentImages.slice(0, 99)) });
      Helper.ReportingInfo("Debug", "Filesystem", `Pictures: ${JSON.stringify(CurrentImages.slice(0, 99))}`);
      return { success: true, picturecount: CurrentImages.length };
    }
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Filesystem", "updatePictureList");
    return { success: false, picturecount: 0 };
  }
}
async function getAllFiles(Helper, dirPath, _arrayOfFiles = []) {
  _arrayOfFiles = _arrayOfFiles || [];
  try {
    const files = await fs.readdirSync(dirPath);
    files.forEach(async function(file) {
      try {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
          _arrayOfFiles = await getAllFiles(Helper, dirPath + "/" + file, _arrayOfFiles);
        } else {
          _arrayOfFiles.push(path.join(dirPath, "/", file));
        }
      } catch (err) {
        Helper.ReportingError(err, `Error scanning files: ${err} `, "Filesystem", "getAllFiles", "", false);
      }
    });
  } catch (err) {
    Helper.ReportingError(err, `Error scanning files: ${err} `, "Filesystem", "getAllFiles", "", false);
  }
  return _arrayOfFiles;
}
module.exports = __toCommonJS(slideFS_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPicture,
  updatePictureList
});
//# sourceMappingURL=slideFS.js.map
