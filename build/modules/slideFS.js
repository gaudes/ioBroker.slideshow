"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePictureList = exports.getPicture = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const imgsize = __importStar(require("image-size"));
const exif_1 = require("./exif");
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
            }
            else {
                if (CurrentImages.indexOf(CurrentImage) === CurrentImages.length - 1) {
                    CurrentImage = CurrentImages[0];
                }
                else {
                    CurrentImage = CurrentImages[CurrentImages.indexOf(CurrentImage) + 1];
                }
            }
            if (fs.existsSync(CurrentImage.path) === true) {
                const PicContent = fs.readFileSync(CurrentImage.path);
                const PicContentB64 = PicContent.toString("base64");
                return { ...CurrentImage, url: `data:image/jpeg;base64,${PicContentB64}` };
            }
            else {
                Helper.ReportingError(null, `File not accessible: ${CurrentImage.path}`, "Filesystem", "getPicture", "", false);
                return null;
            }
        }
        return null;
    }
    catch (err) {
        Helper.ReportingError(err, "Unknown Error", "Filesystem", "getPicture");
        return null;
    }
}
exports.getPicture = getPicture;
async function updatePictureList(Helper) {
    try {
        CurrentImages = [];
        // Check if folder exists
        if (!fs.existsSync(Helper.Adapter.config.fs_path)) {
            Helper.Adapter.log.error(`Folder ${Helper.Adapter.config.fs_path} does not exist`);
            return { success: false, picturecount: 0 };
        }
        // Filter for JPEG or JPG files
        const CurrentFileList = await getAllFiles(Helper, Helper.Adapter.config.fs_path);
        Helper.ReportingInfo("Info", "Filesystem", `${CurrentFileList.length} total files found in folder ${Helper.Adapter.config.fs_path}`, { JSON: JSON.stringify(CurrentFileList.slice(0, 99)) });
        const CurrentImageList = CurrentFileList.filter(function (file) {
            if (path.extname(file).toLowerCase() === ".jpg" || path.extname(file).toLowerCase() === ".jpeg" || path.extname(file).toLowerCase() === ".png") {
                return file;
            }
        });
        // Checking orientation of pictures (landscape or portrait) if configured
        for (const ImageIndex in CurrentImageList) {
            if (Helper.Adapter.config.fs_format !== 0) {
                const ImageSize = await imgsize.imageSize(CurrentImageList[ImageIndex]);
                if (ImageSize.width && ImageSize.height) {
                    if ((Helper.Adapter.config.fs_format === 1 && ImageSize.width > ImageSize.height) === true) {
                        if (Array.isArray(CurrentImages)) {
                            CurrentImages.push({ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null });
                        }
                        else {
                            CurrentImages = [{ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null }];
                        }
                    }
                    if ((Helper.Adapter.config.fs_format === 2 && ImageSize.height > ImageSize.width) === true) {
                        if (Array.isArray(CurrentImages)) {
                            CurrentImages.push({ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null });
                        }
                        else {
                            CurrentImages = [{ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null }];
                        }
                    }
                }
            }
            else {
                if (Array.isArray(CurrentImages)) {
                    CurrentImages.push({ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null });
                }
                else {
                    CurrentImages = [{ path: CurrentImageList[ImageIndex], url: "", info1: "", info2: "", info3: "", date: null }];
                }
            }
        }
        // Fillup picture information
        if (Array.isArray(CurrentImages)) {
            if (CurrentImages.length > 0) {
                await Promise.all(CurrentImages.map(async (CurrentImage) => {
                    const fileInfo = await exif_1.getPictureInformation(Helper, CurrentImage.path);
                    (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info1) ? CurrentImage.info1 = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info1 : CurrentImage.info1 = "";
                    (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info2) ? CurrentImage.info2 = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info2 : CurrentImage.info2 = "";
                    (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info3) ? CurrentImage.info3 = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info3 : CurrentImage.info3 = "";
                    (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.date) ? CurrentImage.date = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.date : CurrentImage.date = null;
                }));
            }
        }
        // Images found ?
        if (!(CurrentImages.length > 0)) {
            Helper.ReportingError(null, "No pictures found in folder", "Filesystem", "updatePictureList", "", false);
            return { success: false, picturecount: 0 };
        }
        else {
            Helper.ReportingInfo("Info", "Filesystem", `${CurrentImages.length} pictures found in folder ${Helper.Adapter.config.fs_path}`, { JSON: JSON.stringify(CurrentImages.slice(0, 99)) });
            return { success: true, picturecount: CurrentImages.length };
        }
    }
    catch (err) {
        Helper.ReportingError(err, "Unknown Error", "Filesystem", "updatePictureList");
        return { success: false, picturecount: 0 };
    }
}
exports.updatePictureList = updatePictureList;
async function getAllFiles(Helper, dirPath, _arrayOfFiles = []) {
    _arrayOfFiles = _arrayOfFiles || [];
    try {
        const files = await fs.readdirSync(dirPath);
        files.forEach(async function (file) {
            if (fs.statSync(dirPath + "/" + file).isDirectory()) {
                _arrayOfFiles = await getAllFiles(Helper, dirPath + "/" + file, _arrayOfFiles);
            }
            else {
                _arrayOfFiles.push(path.join(dirPath, "/", file));
            }
        });
    }
    catch (err) {
        Helper.ReportingError(err, `Error scanning files: ${err} `, "Filesystem", "getAllFiles", "", false);
    }
    return _arrayOfFiles;
}
//# sourceMappingURL=slideFS.js.map