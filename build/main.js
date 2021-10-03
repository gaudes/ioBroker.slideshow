"use strict";
/*
 * Created with @iobroker/create-adapter v2.0.1
 */
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
//#region Imports, Variables and Global
const utils = __importStar(require("@iobroker/adapter-core"));
const global_helper_1 = require("./modules/global-helper");
const slideBing = __importStar(require("./modules/slideBing"));
const slideLocal = __importStar(require("./modules/slideLocal"));
const slideFS = __importStar(require("./modules/slideFS"));
const slideSyno = __importStar(require("./modules/slideSynology"));
let Helper;
const MsgErrUnknown = "Unknown Error";
let UpdateRunning = false;
//#endregion
class Slideshow extends utils.Adapter {
    //#region Basic Adapter Functions
    constructor(options = {}) {
        super({
            ...options,
            name: "slideshow",
        });
        //#endregion
        //#region Timer and Action
        this.tUpdatePictureStoreTimeout = null;
        this.tUpdateCurrentPictureTimeout = null;
        this.on("ready", this.onReady.bind(this));
        this.on("stateChange", this.onStateChange.bind(this));
        this.on("unload", this.onUnload.bind(this));
        this.isUnloaded = false;
    }
    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        try {
            // Init Helper
            Helper = new global_helper_1.GlobalHelper(this);
            // Create button for updates
            await this.setObjectNotExistsAsync("updatepicturelist", {
                type: "state",
                common: {
                    name: "updatepicturelist",
                    type: "boolean",
                    role: "button",
                    read: true,
                    write: true,
                    desc: "Update picture list",
                    def: false
                },
                native: {},
            });
            await this.setStateAsync("updatepicturelist", false, true);
            this.subscribeStates("updatepicturelist");
            // Starting updatePictureStoreTimer action
            await this.updatePictureStoreTimer();
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "onReady");
        }
    }
    /**
     * Is called if a subscribed state changes
     */
    async onStateChange(id, state) {
        if (state) {
            if (id === `${this.namespace}.updatepicturelist` && (state === null || state === void 0 ? void 0 : state.val) === true && (state === null || state === void 0 ? void 0 : state.ack) === false) {
                if (UpdateRunning === true) {
                    Helper.ReportingInfo("Info", "Adapter", "Update picture list already running");
                }
                else {
                    Helper.ReportingInfo("Info", "Adapter", "Updating picture list");
                    clearTimeout(this.tUpdateCurrentPictureTimeout);
                    await this.updatePictureStoreTimer();
                }
                await this.setStateAsync("updatepicturelist", false, false);
            }
        }
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     */
    onUnload(callback) {
        try {
            this.isUnloaded = true;
            clearTimeout(this.tUpdateCurrentPictureTimeout);
            clearTimeout(this.tUpdatePictureStoreTimeout);
            callback();
        }
        catch (e) {
            callback();
        }
    }
    async updatePictureStoreTimer() {
        UpdateRunning = true;
        let updatePictureStoreResult = { success: false, picturecount: 0 };
        Helper.ReportingInfo("Debug", "Adapter", "UpdatePictureStoreTimer occured");
        try {
            this.tUpdatePictureStoreTimeout && clearTimeout(this.tUpdatePictureStoreTimeout);
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Clear Timer");
        }
        try {
            switch (this.config.provider) {
                case 1:
                    updatePictureStoreResult = await slideBing.updatePictureList(Helper);
                    break;
                case 2:
                    updatePictureStoreResult = await slideLocal.updatePictureList(Helper);
                    break;
                case 3:
                    updatePictureStoreResult = await slideFS.updatePictureList(Helper);
                    break;
                case 4:
                    updatePictureStoreResult = await slideSyno.updatePictureList(Helper);
                    break;
            }
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Call Timer Action");
        }
        try {
            if (this.config.update_picture_list && this.config.update_picture_list > 0 && updatePictureStoreResult.success === true) {
                Helper.ReportingInfo("Debug", "updatePictureStoreTimer", `Update every ${this.config.update_picture_list} hours, starting timer`);
                this.tUpdatePictureStoreTimeout = setTimeout(() => {
                    this.updatePictureStoreTimer();
                }, (this.config.update_picture_list * 3600000)); // Update every configured hours if successfull
            }
            else if (updatePictureStoreResult.success === false) {
                this.tUpdatePictureStoreTimeout = setTimeout(() => {
                    this.updatePictureStoreTimer();
                }, (this.config.update_interval * 300000)); // Update every minute if error
            }
            if (updatePictureStoreResult.success === true && updatePictureStoreResult.picturecount > 0 && this.isUnloaded === false) {
                // Save picturecount
                await this.setObjectNotExistsAsync("picturecount", {
                    type: "state",
                    common: {
                        name: "picturecount",
                        type: "number",
                        role: "value",
                        read: true,
                        write: false,
                        desc: "Pictures found"
                    },
                    native: {},
                });
                await this.setStateAsync("picturecount", { val: updatePictureStoreResult.picturecount, ack: true });
                // Starting updateCurrentPictureTimer action
                this.updateCurrentPictureTimer();
            }
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "updatePictureStoreTimer", "Set Timer");
        }
        UpdateRunning = false;
    }
    async updateCurrentPictureTimer() {
        var _a;
        let CurrentPictureResult = null;
        let Provider = "";
        Helper.ReportingInfo("Debug", "Adapter", "updateCurrentPictureTimer occured");
        try {
            this.tUpdateCurrentPictureTimeout && clearTimeout(this.tUpdateCurrentPictureTimeout);
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Clear Timer");
        }
        try {
            switch (this.config.provider) {
                case 1:
                    CurrentPictureResult = await slideBing.getPicture(Helper);
                    Provider = "Bing";
                    break;
                case 2:
                    CurrentPictureResult = await slideLocal.getPicture(Helper);
                    Provider = "Local";
                    break;
                case 3:
                    CurrentPictureResult = await slideFS.getPicture(Helper);
                    Provider = "FileSystem";
                    break;
                case 4:
                    CurrentPictureResult = await slideSyno.getPicture(Helper);
                    Provider = "Synology";
                    break;
            }
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
        }
        try {
            if (CurrentPictureResult !== null && this.isUnloaded === false) {
                Helper.ReportingInfo("Debug", Provider, `Set picture to ${CurrentPictureResult.path}`);
                // Set picture
                await this.setObjectNotExistsAsync("picture", {
                    type: "state",
                    common: {
                        name: "picture",
                        type: "string",
                        role: "text",
                        read: true,
                        write: false,
                        desc: "Current picture"
                    },
                    native: {},
                });
                await this.setStateAsync("picture", { val: CurrentPictureResult.url, ack: true });
                // Set info1
                await this.setObjectNotExistsAsync("info1", {
                    type: "state",
                    common: {
                        name: "info1",
                        type: "string",
                        role: "text",
                        read: true,
                        write: false,
                        desc: "Info 1 for picture"
                    },
                    native: {},
                });
                await this.setStateAsync("info1", { val: CurrentPictureResult.info1, ack: true });
                // Set info2
                await this.setObjectNotExistsAsync("info2", {
                    type: "state",
                    common: {
                        name: "info2",
                        type: "string",
                        role: "text",
                        read: true,
                        write: false,
                        desc: "Info 2 for picture"
                    },
                    native: {},
                });
                await this.setStateAsync("info2", { val: CurrentPictureResult.info2, ack: true });
                // Set info3
                await this.setObjectNotExistsAsync("info3", {
                    type: "state",
                    common: {
                        name: "info3",
                        type: "string",
                        role: "text",
                        read: true,
                        write: false,
                        desc: "Info 3 for picture"
                    },
                    native: {},
                });
                await this.setStateAsync("info3", { val: CurrentPictureResult.info3, ack: true });
                // Set date
                await this.setObjectNotExistsAsync("date", {
                    type: "state",
                    common: {
                        name: "date",
                        type: "number",
                        role: "date",
                        read: true,
                        write: false,
                        desc: "Date of picture"
                    },
                    native: {},
                });
                await this.setStateAsync("date", { val: ((_a = CurrentPictureResult.date) === null || _a === void 0 ? void 0 : _a.getTime()) || null, ack: true });
            }
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Call Timer Action");
        }
        try {
            this.tUpdateCurrentPictureTimeout = setTimeout(() => {
                this.updateCurrentPictureTimer();
            }, (this.config.update_interval * 1000));
        }
        catch (err) {
            Helper.ReportingError(err, MsgErrUnknown, "updateCurrentPictureTimer", "Set Timer");
        }
    }
}
if (module.parent) {
    // Export the constructor in compact mode
    module.exports = (options) => new Slideshow(options);
}
else {
    // otherwise start the instance directly
    (() => new Slideshow())();
}
//# sourceMappingURL=main.js.map