import { BaseClient } from "openid-client";
import { OauthConfig } from "./oauth.js";
export declare const AppleAdapter: (config: OauthConfig) => () => Promise<{
    type: "success";
    properties: {
        tokenset: import("openid-client").TokenSet;
        client: BaseClient;
    };
} | {
    type: "step";
    properties: {
        statusCode: number;
        headers: {
            location: string;
        };
    };
} | undefined>;
