import { Issuer } from "openid-client";
import { OidcAdapter } from "./oidc.js";
import { OauthAdapter } from "./oauth.js";
let realIssuer;
const issuer = new Proxy({}, {
    get: async function (target, prop) {
        if (!realIssuer) {
            realIssuer = await Issuer.discover("https://accounts.google.com");
        }
        return realIssuer[prop];
    },
});
export function GoogleAdapter(config) {
    /* @__PURE__ */
    if (config.mode === "oauth") {
        return OauthAdapter({
            issuer: issuer,
            ...config,
            params: {
                ...(config.accessType && { access_type: config.accessType }),
                ...config.params,
            },
        });
    }
    return OidcAdapter({
        issuer: issuer,
        scope: "openid email profile",
        ...config,
    });
}
