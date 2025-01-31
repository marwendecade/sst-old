import * as logs from "aws-cdk-lib/aws-logs";
import { WebSocketStage, } from "aws-cdk-lib/aws-apigatewayv2";
const defaultHttpFields = [
    // request info
    `"requestTime":"$context.requestTime"`,
    `"requestId":"$context.requestId"`,
    `"httpMethod":"$context.httpMethod"`,
    `"path":"$context.path"`,
    `"routeKey":"$context.routeKey"`,
    `"status":$context.status`,
    `"responseLatency":$context.responseLatency`,
    // integration info
    `"integrationRequestId":"$context.integration.requestId"`,
    `"integrationStatus":"$context.integration.status"`,
    `"integrationLatency":"$context.integration.latency"`,
    `"integrationServiceStatus":"$context.integration.integrationStatus"`,
    // caller info
    `"ip":"$context.identity.sourceIp"`,
    `"userAgent":"$context.identity.userAgent"`,
    // `cognitoIdentityId` is not supported in us-west-2 region
    //`"cognitoIdentityId":"$context.identity.cognitoIdentityId"`,
];
const defaultWebSocketFields = [
    // request info
    `"requestTime":"$context.requestTime"`,
    `"requestId":"$context.requestId"`,
    `"eventType":"$context.eventType"`,
    `"routeKey":"$context.routeKey"`,
    `"status":$context.status`,
    // integration info
    `"integrationRequestId":"$context.awsEndpointRequestId"`,
    `"integrationStatus":"$context.integrationStatus"`,
    `"integrationLatency":"$context.integrationLatency"`,
    `"integrationServiceStatus":"$context.integration.integrationStatus"`,
    // caller info
    `"ip":"$context.identity.sourceIp"`,
    `"userAgent":"$context.identity.userAgent"`,
    `"cognitoIdentityId":"$context.identity.cognitoIdentityId"`,
    `"connectedAt":"$context.connectedAt"`,
    `"connectionId":"$context.connectionId"`,
];
export function buildAccessLogData(scope, accessLog, apiStage, isDefaultStage) {
    if (accessLog === false) {
        return;
    }
    const isWebSocketApi = apiStage instanceof WebSocketStage;
    // note: Access log configuration is not supported by L2 constructs as of CDK v1.85.0. We
    //       need to define it at L1 construct level.
    // create log group
    let logGroup;
    let destinationArn;
    if (accessLog && accessLog.destinationArn) {
        destinationArn = accessLog.destinationArn;
    }
    else {
        const root = scope.node.root;
        const apiName = root.logicalPrefixedName(scope.node.id);
        // Backwards compatibility, only suffix if not default stage
        const logGroupName = "LogGroup" + (isDefaultStage ? "" : apiStage.stageName);
        logGroup = new logs.LogGroup(scope, logGroupName, {
            logGroupName: [
                `/aws/vendedlogs/apis`,
                `/${cleanupLogGroupName(apiName)}-${apiStage.api.apiId}`,
                `/${cleanupLogGroupName(apiStage.stageName)}`,
            ].join(""),
            retention: buildLogGroupRetention(accessLog),
        });
        destinationArn = logGroup.logGroupArn;
    }
    // get log format
    let format;
    if (accessLog && accessLog.format) {
        format = accessLog.format;
    }
    else if (typeof accessLog === "string") {
        format = accessLog;
    }
    else {
        format = isWebSocketApi
            ? "{" + defaultWebSocketFields.join(",") + "}"
            : "{" + defaultHttpFields.join(",") + "}";
    }
    // get L1 cfnStage construct
    if (!apiStage?.node.defaultChild) {
        throw new Error(`Failed to define the default stage for Http API`);
    }
    // set access log settings
    const cfnStage = apiStage.node.defaultChild;
    cfnStage.accessLogSettings = { format, destinationArn };
    return logGroup;
}
export function cleanupLogGroupName(str) {
    return str.replace(/[^.\-_/#A-Za-z0-9]/g, "");
}
function buildLogGroupRetention(accessLog) {
    const retention = accessLog && accessLog.retention;
    if (!retention) {
        return logs.RetentionDays.INFINITE;
    }
    // Case: retention is string
    const retentionValue = logs.RetentionDays[retention.toUpperCase()];
    // validate retention
    if (!retentionValue) {
        throw new Error(`Invalid access log retention value "${retention}".`);
    }
    return retentionValue;
}
