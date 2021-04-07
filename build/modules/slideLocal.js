"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePictureList = exports.getPicture = void 0;
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
            return CurrentImage;
        }
        return null;
    }
    catch (err) {
        Helper.ReportingError(err, "Unknown Error", "Local", "getPicture");
        return null;
    }
}
exports.getPicture = getPicture;
async function updatePictureList(Helper) {
    try {
        CurrentImages = [];
        const CurrentImageFiles = await (Helper.Adapter.readDirAsync("vis.0", "/slideshow"));
        if (!(CurrentImageFiles.length > 0)) {
            Helper.ReportingError(null, "No pictures found in folder", "Local", "updatePictureList/List", "", false);
            return { success: false, picturecount: 0 };
        }
        else {
            await Promise.all(CurrentImageFiles.map(async (file) => {
                const CurrentImageFile = await Helper.Adapter.readFileAsync("vis.0", `/slideshow/${file.file}`);
                const fileInfo = await exif_1.getPictureInformation(Helper, CurrentImageFile.file);
                let info1, info2, info3 = "";
                let date = null;
                (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info1) ? info1 = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info1 : info1 = "";
                (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info2) ? info2 = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info2 : info2 = "";
                (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info3) ? info3 = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.info3 : info3 = "";
                (fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.date) ? date = fileInfo === null || fileInfo === void 0 ? void 0 : fileInfo.date : date = null;
                if (Array.isArray(CurrentImages)) {
                    CurrentImages.push({ url: `/vis.0/slideshow/${file.file}`, path: file.file, info1: info1, info2: info2, info3: info3, date: date });
                }
                else {
                    CurrentImages = [{ url: `/vis.0/slideshow/${file.file}`, path: file.file, info1: info1, info2: info2, info3: info3, date: date }];
                }
            }));
        }
        Helper.ReportingInfo("Info", "Local", `${CurrentImages.length} pictures found`, { JSON: JSON.stringify(CurrentImages.slice(0, 10)) });
        return { success: true, picturecount: CurrentImages.length };
    }
    catch (err) {
        Helper.ReportingError(err, "Unknown Error", "Local", "updatePictureList/List");
        return { success: false, picturecount: 0 };
    }
}
exports.updatePictureList = updatePictureList;
//# sourceMappingURL=slideLocal.js.map