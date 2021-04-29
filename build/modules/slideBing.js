"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePictureList = exports.getPicture = void 0;
const axios_1 = __importDefault(require("axios"));
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
            }
            else {
                if (BingPictureList.indexOf(CurrentImage) === BingPictureList.length - 1) {
                    CurrentImage = BingPictureList[0];
                }
                else {
                    CurrentImage = BingPictureList[BingPictureList.indexOf(CurrentImage) + 1];
                }
            }
            return CurrentImage;
        }
        return null;
    }
    catch (err) {
        Helper.ReportingError(err, "Unknown Error", "Bing", "getPicture");
        return null;
    }
}
exports.getPicture = getPicture;
async function updatePictureList(Helper) {
    // Getting List from Bing.com
    try {
        BingPictureList = [];
        const WebResult = await axios_1.default.get(BingUrl);
        Helper.ReportingInfo("Debug", "Bing", "Picture list received", { JSON: JSON.stringify(WebResult.data) });
        (WebResult.data).images.forEach(Image => {
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
            }
            else {
                BingPictureList = [{ bingurl: "https://bing.com" + Image.url, url: "", path: "", info1: Image.title, info2: ImageDescription, info3: ImageCopyright, date: ImageDate }];
            }
        });
        Helper.ReportingInfo("Debug", "Bing", `Picture List from Bing: ${JSON.stringify(BingPictureList)}`, { JSON: JSON.stringify(BingPictureList.slice(0, 10)) });
    }
    catch (err) {
        Helper.ReportingError(err, "Unknown Error", "Bing", "updatePictureList/List");
        return { success: false, picturecount: 0 };
    }
    // Saving list to files
    try {
        for (const CountElement in BingPictureList) {
            const currentWebCall = await axios_1.default.get(BingPictureList[CountElement].bingurl, { responseType: "arraybuffer" });
            await Helper.Adapter.writeFileAsync(Helper.Adapter.namespace, `bing/${CountElement}.jpg`, currentWebCall.data);
            BingPictureList[CountElement].url = `/${Helper.Adapter.namespace}/bing/${CountElement}.jpg`;
            BingPictureList[CountElement].path = BingPictureList[CountElement].url;
        }
        Helper.ReportingInfo("Info", "Bing", `${BingPictureList.length} pictures downloaded from Bing`, { JSON: JSON.stringify(BingPictureList.slice(0, 10)) });
        return { success: true, picturecount: BingPictureList.length };
    }
    catch (err) {
        Helper.ReportingError(err, "Unknown Error", "Bing", "updatePictureList/Download");
        return { success: false, picturecount: 0 };
    }
}
exports.updatePictureList = updatePictureList;
//# sourceMappingURL=slideBing.js.map