import { createProxy } from "../../util/index.js";
export const Auth = /* @__PURE__ */ createProxy("Auth");
export * from "./adapter/oidc.js";
export * from "./adapter/google.js";
export * from "./adapter/link.js";
export * from "./adapter/github.js";
export * from "./adapter/facebook.js";
export * from "./adapter/microsoft.js";
export * from "./adapter/oauth.js";
export * from "./adapter/spotify.js";
export * from "./adapter/code.js";
export * from "./adapter/apple.js";
export * from "./session.js";
export * from "./handler.js";
export * from "./encryption.js";
export { Issuer } from "openid-client";