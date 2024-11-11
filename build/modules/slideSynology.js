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
var slideSynology_exports = {};
__export(slideSynology_exports, {
  getPicture: () => getPicture,
  getPicturePrefetch: () => getPicturePrefetch,
  updatePictureList: () => updatePictureList
});
module.exports = __toCommonJS(slideSynology_exports);
var import_axios = __toESM(require("axios"));
var import_axios_cookiejar_support = require("axios-cookiejar-support");
var import_tough_cookie = require("tough-cookie");
var path = __toESM(require("path"));
const synoFolders = [];
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
    CurrentPicture = { ...CurrentImage, url: `data:image/jpeg;base64,${PicContentB64}` };
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
  const CurrentImageList = [{ path: "0", url: "", info1: "", info2: "", info3: "", date: null, x: 0, y: 0 }];
  if (synoConnectionState === true) {
    try {
      if (Helper.Adapter.config.syno_version === 0) {
        Helper.ReportingInfo("Debug", "Synology", `Start iterating folders`);
        synoFolders.length = 0;
        await synoGetFolders(Helper, 1);
        Helper.ReportingInfo("Debug", "Synology", `${synoFolders.length} folders found, receiving pictures`);
        for (const synoFolder of synoFolders) {
          let synEndOfFiles = false;
          let synOffset = 0;
          while (synEndOfFiles === false) {
            const synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.FotoTeam.Browse.Item&method=list&version=1&limit=500&item_type=%5B0%5D&additional=%5B%22description%22%2C%22orientation%22%2C%22tag%22%2C%22resolution%22%5D&offset=${synOffset}&SynoToken=${synoToken}&folder_id=${synoFolder.id}`;
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
                  CurrentImageList.push({ path: element.id, url: "", info1: element.description, info2: "", info3: element.filename, date: PictureDate, x: element.additional.resolution.height, y: element.additional.resolution.width });
                });
                synOffset = synOffset + 500;
              }
            } else {
              Helper.ReportingError(null, "Error getting pictures from Synology", "Synology", "updatePictureList/List", JSON.stringify(synResult.data), false);
              return { success: false, picturecount: 0 };
            }
          }
        }
      } else {
        let synEndOfFiles = false;
        let synOffset = 0;
        while (synEndOfFiles === false) {
          const synURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/photo.php?api=SYNO.PhotoStation.Photo&method=list&version=1&limit=500&type=photo&offset=${synOffset}`;
          const synResult = await synoConnection.get(synURL);
          if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["items"])) {
            synResult.data["data"]["items"].forEach((element) => {
              let PictureDate = null;
              if (element.info.takendate) {
                PictureDate = new Date(element.info.takendate);
              }
              CurrentImageList.push({ path: element.id, url: "", info1: element.info.title, info2: element.info.description, info3: element.info.name, date: PictureDate, x: element.info.resolutionx, y: element.info.resolutiony });
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
      switch (Helper.Adapter.config.syno_order) {
        case 0:
          CurrentImages = await sortByKey(CurrentImages, "date");
          break;
        case 1:
          CurrentImages = await sortByKey(CurrentImages, "info3");
          break;
        case 3:
          let currentIndex = CurrentImages.length, temporaryValue, randomIndex;
          while (0 !== currentIndex) {
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
async function synoGetFolders(Helper, FolderID) {
  try {
    let synoEndOfFolders = false;
    let synoOffset = 0;
    while (synoEndOfFolders === false) {
      const synoURL = `http://${Helper.Adapter.config.syno_path}/photo/webapi/entry.cgi?api=SYNO.FotoTeam.Browse.Folder&method=list&version=1&id=${FolderID}&limit=500&offset=${synoOffset}&SynoToken=${synoToken}`;
      Helper.ReportingInfo("Debug", "Synology", `Iterating folder id ${FolderID} `, { URL: synoURL });
      const synResult = await synoConnection.get(synoURL);
      Helper.ReportingInfo("Debug", "Synology", `Result iterating folder id ${FolderID}`, { JSON: JSON.stringify(synResult.data) });
      if (synResult.data["success"] === true && Array.isArray(synResult.data["data"]["list"])) {
        if (synResult.data["data"]["list"].length === 0) {
          synoEndOfFolders = true;
        } else {
          for (const element of synResult.data["data"]["list"]) {
            synoFolders.push({ id: element.id, name: element.name, parent: element.parent });
            await synoGetFolders(Helper, element.id);
          }
          synoOffset = synoOffset + 500;
        }
      } else {
        Helper.ReportingError(null, "Error getting folders from Synology", "Synology", "synoGetFolders", JSON.stringify(synResult.data), false);
        return false;
      }
    }
    return true;
  } catch (err) {
    Helper.ReportingError(err, "Unknown error", "Synology", "synoGetFolders");
    return false;
  }
}
async function sortByKey(array, key) {
  return array.sort(function(a, b) {
    const x = a[key];
    const y = b[key];
    return x < y ? -1 : x > y ? 1 : 0;
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getPicture,
  getPicturePrefetch,
  updatePictureList
});
//# sourceMappingURL=slideSynology.js.map
