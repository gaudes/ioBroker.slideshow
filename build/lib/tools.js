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
var tools_exports = {};
__export(tools_exports, {
  isArray: () => isArray,
  isObject: () => isObject,
  translateText: () => translateText
});
var import_axios = __toESM(require("axios"));
function isObject(it) {
  return Object.prototype.toString.call(it) === "[object Object]";
}
function isArray(it) {
  if (Array.isArray != null)
    return Array.isArray(it);
  return Object.prototype.toString.call(it) === "[object Array]";
}
async function translateText(text, targetLang, yandexApiKey) {
  if (targetLang === "en") {
    return text;
  } else if (!text) {
    return "";
  }
  if (yandexApiKey) {
    return translateYandex(text, targetLang, yandexApiKey);
  } else {
    return translateGoogle(text, targetLang);
  }
}
async function translateYandex(text, targetLang, apiKey) {
  var _a;
  if (targetLang === "zh-cn") {
    targetLang = "zh";
  }
  try {
    const url = `https://translate.yandex.net/api/v1.5/tr.json/translate?key=${apiKey}&text=${encodeURIComponent(text)}&lang=en-${targetLang}`;
    const response = await import_axios.default.get(url, { timeout: 15e3 });
    if (isArray((_a = response.data) == null ? void 0 : _a.text)) {
      return response.data.text[0];
    }
    throw new Error("Invalid response for translate request");
  } catch (e) {
    throw new Error(`Could not translate to "${targetLang}": ${e}`);
  }
}
async function translateGoogle(text, targetLang) {
  var _a;
  try {
    const url = `http://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}&ie=UTF-8&oe=UTF-8`;
    const response = await import_axios.default.get(url, { timeout: 15e3 });
    if (isArray(response.data)) {
      return response.data[0][0][0];
    }
    throw new Error("Invalid response for translate request");
  } catch (e) {
    if (((_a = e.response) == null ? void 0 : _a.status) === 429) {
      throw new Error(`Could not translate to "${targetLang}": Rate-limited by Google Translate`);
    } else {
      throw new Error(`Could not translate to "${targetLang}": ${e}`);
    }
  }
}
module.exports = __toCommonJS(tools_exports);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isArray,
  isObject,
  translateText
});
//# sourceMappingURL=tools.js.map
