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
exports.getPictureInformation = void 0;
const exifr = __importStar(require("exifr"));
async function getPictureInformation(Helper, file) {
    try {
        const PictureInfo = await exifr.parse(file, ["XPTitle", "XPComment", "XPSubject", "DateTimeOriginal"]);
        return { info1: PictureInfo["XPTitle"] || "", info2: PictureInfo["XPSubject"] || "", info3: PictureInfo["XPComment"] || "", date: new Date(PictureInfo["DateTimeOriginal"]) };
    }
    catch (error) {
        return null;
    }
}
exports.getPictureInformation = getPictureInformation;
//# sourceMappingURL=exif.js.map