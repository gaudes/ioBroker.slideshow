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
exports.GlobalHelper = void 0;
const SentryObj = __importStar(require("@sentry/types"));
class GlobalHelper {
    constructor(adapterInstance) {
        this.Adapter = adapterInstance;
        // Init Sentry
        if (this.Adapter.supportsFeature && this.Adapter.supportsFeature("PLUGINS")) {
            const sentryInstance = this.Adapter.getPluginInstance("sentry");
            if (sentryInstance) {
                this.Sentry = sentryInstance.getSentryObject();
            }
        }
    }
    //#region Helper Function ReportingError
    /**
     * Function for global error reporting
     * @param {Error} Err Error-Object
     * @param {string} FriendlyError Error message for user
     * @param {string} NameFunction Name of the function where error occured
     * @param {string} NameAction Name of the subfunction where error occured
     * @param {string} Info Contextual information
     * @param {boolean} ReportSentry Report error to sentry, default true
     */
    async ReportingError(Err, FriendlyError, NameFunction, NameAction = "", Info = "", ReportSentry = true) {
        try {
            let sErrMsg = `Error occured: ${FriendlyError} in ${NameFunction}`;
            if (NameAction !== "")
                sErrMsg = sErrMsg + `(${NameAction})`;
            if (Err !== null)
                sErrMsg = sErrMsg + ` [${Err}] [${Info}]`;
            this.Adapter.log.error(sErrMsg);
        }
        catch (e) {
            this.Adapter.log.error(`Exception in ErrorReporting [${e}]`);
        }
        // Sentry reporting
        try {
            if (this.Sentry && this.Adapter.config.sentry_disable === false && ReportSentry === true) {
                this.Sentry && this.Sentry.withScope(scope => {
                    scope.setLevel(SentryObj.Severity.Error);
                    scope.setExtra("NameFunction", NameFunction);
                    scope.setExtra("NameAction", NameAction);
                    if (Info) {
                        scope.setExtra("Info", Info);
                    }
                    //scope.setExtra("Config", this.config);
                    if (this.Sentry) {
                        this.Sentry.captureException(Err);
                    }
                });
            }
        }
        catch (e) {
            this.Adapter.log.error(`Exception in ErrorReporting Sentry [${e}]`);
        }
    }
    //#endregion
    //#region Helper Function ReportingInfo
    /**
     * Function for global information reporting
     * @param {"Info"|"Debug"} Level Level for ioBroker Logging
     * @param {string} Category Category of information
     * @param {string} Message Message
     * @param {{[Key: string]: any}|undefined} Data Contextual data information
     */
    ReportingInfo(Level, Category, Message, Data) {
        var _a;
        let iobMessage = Message;
        if (this.Adapter.log.level === "debug" || this.Adapter.log.level === "silly") {
            iobMessage = `[${Category}] ${Message}`;
        }
        switch (Level) {
            case "Debug":
                this.Adapter.log.debug(iobMessage);
                break;
            default:
                this.Adapter.log.info(iobMessage);
                break;
        }
        (_a = this.Sentry) === null || _a === void 0 ? void 0 : _a.addBreadcrumb({
            category: Category,
            message: Message,
            level: Level,
            data: Data
        });
    }
}
exports.GlobalHelper = GlobalHelper;
//# sourceMappingURL=global-helper.js.map