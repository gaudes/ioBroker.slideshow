var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (module2, isNodeMode) => {
  return __reExport(__markAsModule(__defProp(module2 != null ? __create(__getProtoOf(module2)) : {}, "default", !isNodeMode && module2 && module2.__esModule ? { get: () => module2.default, enumerable: true } : { value: module2, enumerable: true })), module2);
};
var __toCommonJS = /* @__PURE__ */ ((cache) => {
  return (module2, temp) => {
    return cache && cache.get(module2) || (temp = __reExport(__markAsModule({}), module2, 1), cache && cache.set(module2, temp), temp);
  };
})(typeof WeakMap !== "undefined" ? /* @__PURE__ */ new WeakMap() : 0);
var global_helper_exports = {};
__export(global_helper_exports, {
  GlobalHelper: () => GlobalHelper
});
var SentryObj = __toESM(require("@sentry/types"));
class GlobalHelper {
  constructor(adapterInstance, language) {
    this.Adapter = adapterInstance;
    this.Language = language;
    if (this.Adapter.supportsFeature && this.Adapter.supportsFeature("PLUGINS")) {
      const sentryInstance = this.Adapter.getPluginInstance("sentry");
      if (sentryInstance) {
        this.Sentry = sentryInstance.getSentryObject();
      }
    }
  }
  async ReportingError(Err, FriendlyError, NameFunction, NameAction = "", Info = "", ReportSentry = true) {
    try {
      let sErrMsg = `Error occured: ${FriendlyError} in ${NameFunction}`;
      if (NameAction !== "")
        sErrMsg = sErrMsg + `(${NameAction})`;
      if (Err !== null)
        sErrMsg = sErrMsg + ` [${Err}] [${Info}]`;
      this.Adapter.log.error(sErrMsg);
    } catch (e) {
      this.Adapter.log.error(`Exception in ErrorReporting [${e}]`);
    }
    try {
      if (this.Sentry && this.Adapter.config.sentry_disable === false && ReportSentry === true) {
        this.Sentry && this.Sentry.withScope((scope) => {
          scope.setLevel(SentryObj.Severity.Error);
          scope.setExtra("NameFunction", NameFunction);
          scope.setExtra("NameAction", NameAction);
          if (Info) {
            scope.setExtra("Info", Info);
          }
          if (this.Sentry) {
            this.Sentry.captureException(Err);
          }
        });
      }
    } catch (e) {
      this.Adapter.log.error(`Exception in ErrorReporting Sentry [${e}]`);
    }
  }
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
    (_a = this.Sentry) == null ? void 0 : _a.addBreadcrumb({
      category: Category,
      message: Message,
      level: Level,
      data: Data
    });
  }
  getLanguage() {
    return this.Language;
  }
}
module.exports = __toCommonJS(global_helper_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  GlobalHelper
});
//# sourceMappingURL=global-helper.js.map
