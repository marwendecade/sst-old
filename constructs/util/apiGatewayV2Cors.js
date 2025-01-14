import { CorsHttpMethod, } from "aws-cdk-lib/aws-apigatewayv2";
import { toCdkDuration } from "./duration.js";
export function buildCorsConfig(cors) {
    // Handle cors: false
    if (cors === false) {
        return;
    }
    // Handle cors: true | undefined
    if (cors === undefined || cors === true) {
        cors = {};
    }
    // Handle cors: CorsProps
    return {
        allowCredentials: cors.allowCredentials || false,
        allowHeaders: cors.allowHeaders || ["*"],
        allowMethods: (cors.allowMethods || ["ANY"]).map((method) => CorsHttpMethod[method]),
        allowOrigins: cors.allowOrigins || ["*"],
        exposeHeaders: cors.exposeHeaders,
        maxAge: cors.maxAge && toCdkDuration(cors.maxAge),
    };
}
