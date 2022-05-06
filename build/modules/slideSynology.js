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
var slideSynology_exports = {};
__export(slideSynology_exports, {
  getPicture: () => getPicture,
  getPicturePrefetch: () => getPicturePrefetch,
  updatePictureList: () => updatePictureList
});
var import_axios = __toESM(require("axios"));
var import_axios_cookiejar_support = require("axios-cookiejar-support");
var import_tough_cookie = require("tough-cookie");
var path = __toESM(require("path"));
let synoConnectionState = false;
let synoToken = "";
const AxiosJar = new import_tough_cookie.CookieJar();
const synoConnection = (0, import_axios_cookiejar_support.wrapper)(import_axios.default.create({ withCredentials: true, jar: AxiosJar }));
let CurrentImages;
let CurrentImage;
let CurrentPicture;
async function getPicture(Helper) {
  try {
    if (!CurrentPicture) {
      await getPicturePrefetch(Helper);
    }
    const CurrentPictureResult = CurrentPicture;
    getPicturePrefetch(Helper);
    return CurrentPictureResult;
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Synology", "getPicture");
    return null;
  }
}
async function getPicturePrefetch(Helper) {
  var _a;
  try {
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
    }
  } catch (err) {
    Helper.ReportingError(err, "Unknown Error", "Synology", "getPicturePrefetch/Select");
  }
  try {
    await loginSyno(Helper);
    let synURL = "";
    if (Helper.Adapter.config.syno_version === 0) {
      synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.FotoTeam.Download&method=download&version=1&unit_id=%5B${CurrentImage.path}%5D&force_download=true&SynoToken=${synoToken}`;
    } else {
      synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/download.php?api=SYNO.PhotoStation.Download&method=getphoto&version=1&id=${CurrentImage.path}&download=true`;
    }
    const synResult = await synoConnection.get(synURL, { responseType: "arraybuffer" });
    const PicContentB64 = synResult.data.toString("base64");
    CurrentPicture = __spreadProps(__spreadValues({}, CurrentImage), { url: `data:image/jpeg;base64,${PicContentB64}` });
  } catch (err) {
    if (((_a = err.response) == null ? void 0 : _a.status) === 502) {
      Helper.ReportingError(err, `Unknown Error downloading Picture ${CurrentImage.path}`, "Synology", "getPicturePrefetch/Retrieve", "", false);
    } else {
      Helper.ReportingError(err, "Unknown Error", "Synology", "getPicturePrefetch/Retrieve");
    }
  }
}
async function updatePictureList(Helper) {
  CurrentImages = [];
  await loginSyno(Helper);
  const CurrentImageList = [{ path: "0", url: "", info1: "", info2: "", info3: "", date: null, x: 0, y: 0, latitude: null, longitude: null }];
  if (synoConnectionState === true) {
    try {
      let synEndOfFiles = false;
      let synOffset = 0;
      while (synEndOfFiles === false) {
        if (Helper.Adapter.config.syno_version === 0) {
          let synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.FotoTeam.Browse.Item&method=list_with_filter&version=1&limit=500&item_type=%5B0%5D&additional=%5B%22description%22%2C%22orientation%22%2C%22tag%22%2C%22resolution%22%5D&offset=${synOffset}&SynoToken=${synoToken}`;
          switch (Helper.Adapter.config.syno_order) {
            case 1:
              synURL = synURL + "&sort_by=filename&sort_direction=asc";
              break;
            default:
              synURL = synURL + "&sort_by=takentime";
              break;
          }
          const synResult = await synoConnection.get(synURL);
          if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["list"])) {
            if (synResult.data["data"]["list"].length === 0) {
              synEndOfFiles = true;
            } else {
              synResult.data["data"]["list"].forEach((element) => {
                let PictureDate = null;
                if (element.time) {
                  PictureDate = new Date(element.time);
                }
                CurrentImageList.push({ path: element.id, url: "", info1: element.description, info2: "", info3: element.filename, date: PictureDate, x: element.additional.resolution.height, y: element.additional.resolution.width, latitude: null, longitude: null });
              });
              synOffset = synOffset + 500;
            }
          } else {
            Helper.ReportingError(null, "Error getting pictures from Synology", "Synology", "updatePictureList/List", JSON.stringify(synResult.data), false);
            return { success: false, picturecount: 0 };
          }
        } else {
          let synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/photo.php?api=SYNO.PhotoStation.Photo&method=list&version=1&limit=500&type=photo&offset=${synOffset}`;
          switch (Helper.Adapter.config.syno_order) {
            case 1:
              synURL = synURL + "&sort_by=filename";
              break;
            case 2:
              synURL = synURL + "&sort_by=createdate";
              break;
            default:
              synURL = synURL + "&sort_by=takendate";
              break;
          }
          const synResult = await synoConnection.get(synURL);
          if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["items"])) {
            synResult.data["data"]["items"].forEach((element) => {
              let PictureDate = null;
              if (element.info.takendate) {
                PictureDate = new Date(element.info.takendate);
              }
              CurrentImageList.push({ path: element.id, url: "", info1: element.info.title, info2: element.info.description, info3: element.info.name, date: PictureDate, x: element.info.resolutionx, y: element.info.resolutiony, latitude: null, longitude: null });
            });
            if (synResult.data["data"]["total"] === synResult.data["data"]["offset"]) {
              synEndOfFiles = true;
            } else {
              synOffset = synResult.data["data"]["offset"];
            }
          } else {
            Helper.ReportingError(null, "Error getting pictures from Synology", "Synology", "updatePictureList/List", JSON.stringify(synResult.data), false);
            return { success: false, picturecount: 0 };
          }
        }
      }
    } catch (err) {
      Helper.ReportingError(err, "Unknown Error", "Synology", "updatePictureList/List");
      return { success: false, picturecount: 0 };
    }
    try {
      const CurrentImageListFilter1 = CurrentImageList.filter(function(element) {
        if (path.extname(element.info3).toLowerCase() === ".jpg" || path.extname(element.info3).toLowerCase() === ".jpeg") {
          return element;
        }
      });
      if (Helper.Adapter.config.syno_format > 0) {
        CurrentImageListFilter1.filter(function(element) {
          if ((Helper.Adapter.config.syno_format === 1 && element.x > element.y) === true) {
            if (Array.isArray(CurrentImages)) {
              CurrentImages.push(element);
            } else {
              CurrentImages = [element];
            }
          }
          if ((Helper.Adapter.config.syno_format === 2 && element.y > element.x) === true) {
            if (Array.isArray(CurrentImages)) {
              CurrentImages.push(element);
            } else {
              CurrentImages = [element];
            }
          }
        });
      } else {
        CurrentImages = CurrentImageListFilter1;
      }
      if (Helper.Adapter.config.syno_order === 3) {
        let currentIndex = CurrentImages.length, temporaryValue, randomIndex;
        while (currentIndex !== 0) {
          randomIndex = Math.floor(Math.random() * currentIndex);
          currentIndex -= 1;
          temporaryValue = CurrentImages[currentIndex];
          CurrentImages[currentIndex] = CurrentImages[randomIndex];
          CurrentImages[randomIndex] = temporaryValue;
        }
      }
    } catch (err) {
      Helper.ReportingError(err, "Unknown Error", "Synology", "updatePictureList/Filter");
      return { success: false, picturecount: 0 };
    }
    if (!(CurrentImages.length > 0)) {
      Helper.ReportingError(null, "No pictures found", "Synology", "updatePictureList", "", false);
      return { success: false, picturecount: 0 };
    } else {
      Helper.ReportingInfo("Info", "Synology", `${CurrentImages.length} pictures found`, { JSON: JSON.stringify(CurrentImages.slice(0, 99)) });
      return { success: true, picturecount: CurrentImages.length };
    }
  } else {
    return { success: false, picturecount: 0 };
  }
}
async function loginSyno(Helper) {
  var _a;
  try {
    if (Helper.Adapter.config.syno_path === "" || Helper.Adapter.config.syno_path === null) {
      Helper.Adapter.log.error("No name or IP address of Synology PhotoStation configured");
      return false;
    }
    if (Helper.Adapter.config.syno_username === "" || Helper.Adapter.config.syno_username === null) {
      Helper.Adapter.log.error("No user name for Synology PhotoStation configured");
      return false;
    }
    if (Helper.Adapter.config.syno_userpass === "" || Helper.Adapter.config.syno_userpass === null) {
      Helper.Adapter.log.error("No user name for Synology PhotoStation configured");
      return false;
    }
  } catch (err) {
    Helper.ReportingError(err, "Unknown error", "Synology", "loginSyno/CheckParameters");
    synoConnectionState = false;
    return false;
  }
  if (await synoCheckConnection(Helper) === true) {
    return true;
  } else {
    try {
      if (Helper.Adapter.config.syno_version === 0) {
        const synoURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.API.Auth&version=6&method=login&account=${Helper.Adapter.config.syno_username}&passwd=${encodeURIComponent(Helper.Adapter.config.syno_userpass)}&enable_syno_token=yes`;
        const synResult = await synoConnection.get(synoURL);
        if (synResult.data && synResult.data["data"] && synResult.data["data"]["sid"] && synResult.data["success"] === true) {
          synoToken = synResult.data["data"]["synotoken"];
          synoConnectionState = true;
          Helper.ReportingInfo("Debug", "Synology", "Synology Login successfull");
          return true;
        } else {
          Helper.Adapter.log.error("Connection failure to Synology PhotoStation");
          synoConnectionState = false;
          return false;
        }
      } else {
        const synResult = await synoConnection.get(`http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=login&version=1&username=${Helper.Adapter.config.syno_username}&password=${encodeURIComponent(Helper.Adapter.config.syno_userpass)}`);
        Helper.ReportingInfo("Debug", "Synology", "Synology result data", { result: synResult });
        if (synResult.data && synResult.data["data"] && synResult.data["data"]["username"] === Helper.Adapter.config.syno_username) {
          synoConnectionState = true;
          Helper.ReportingInfo("Debug", "Synology", "Synology Login successfull");
          return true;
        } else {
          Helper.Adapter.log.error("Connection failure to Synology PhotoStation");
          synoConnectionState = false;
          return false;
        }
      }
    } catch (err) {
      if (((_a = err.response) == null ? void 0 : _a.status) === 403) {
        synoConnectionState = false;
        return false;
      } else if (err.isAxiosError === true) {
        Helper.Adapter.log.error("No connection to Synology PhotoStation, misconfigured name or IP address");
        synoConnectionState = false;
        return false;
      } else {
        Helper.ReportingError(err, "Unknown error", "Synology", "loginSyno/Login");
        synoConnectionState = false;
        return false;
      }
    }
  }
}
async function synoCheckConnection(Helper) {
  var _a, _b, _c, _d;
  try {
    if (Helper.Adapter.config.syno_version === 0) {
      const synoURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.cgi?api=SYNO.Core.Desktop.Initdata&method=get_user_service&version=1&SynoToken=${synoToken}`;
      const synResult = await synoConnection.get(synoURL);
      if (synResult.status === 200) {
        if (((_b = (_a = synResult.data.data) == null ? void 0 : _a.Session) == null ? void 0 : _b.isLogined) === true) {
          synoConnectionState = true;
          return true;
        } else {
          synoConnectionState = false;
        }
      } else {
        synoConnectionState = false;
      }
    } else {
      const synoURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/auth.php?api=SYNO.PhotoStation.Auth&method=checkauth&version=1`;
      const synResult = await synoConnection.get(synoURL);
      if (synResult.status === 200) {
        if (((_c = synResult.data.data) == null ? void 0 : _c.username) === Helper.Adapter.config.syno_username) {
          synoConnectionState = true;
          return true;
        } else {
          synoConnectionState = false;
        }
      } else {
        synoConnectionState = false;
      }
    }
  } catch (err) {
    if (((_d = err.response) == null ? void 0 : _d.status) === 403) {
      synoConnectionState = false;
      return false;
    } else if (err.isAxiosError === true) {
      Helper.Adapter.log.error("No connection to Synology PhotoStation, misconfigured name or IP address");
      synoConnectionState = false;
      return false;
    } else {
      Helper.ReportingError(err, "Unknown error", "Synology", "synoCheckConnection");
      synoConnectionState = false;
      return false;
    }
  }
  return false;
}
module.exports = __toCommonJS(slideSynology_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPicture,
  getPicturePrefetch,
  updatePictureList
});
//# sourceMappingURL=slideSynology.js.map
