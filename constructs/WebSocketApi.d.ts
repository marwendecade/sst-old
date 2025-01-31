import { Construct } from "constructs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apig from "aws-cdk-lib/aws-apigatewayv2";
import * as apigAuthorizers from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { SSTConstruct } from "./Construct.js";
import { Function as Fn, FunctionProps, FunctionInlineDefinition, FunctionDefinition } from "./Function.js";
import { BindingResource, BindingProps } from "./util/binding.js";
import { Permissions } from "./util/permission.js";
import * as apigV2Domain from "./util/apiGatewayV2Domain.js";
import * as apigV2AccessLog from "./util/apiGatewayV2AccessLog.js";
export interface WebSocketApiDomainProps extends apigV2Domain.CustomDomainProps {
}
export interface WebSocketApiAccessLogProps extends apigV2AccessLog.AccessLogProps {
}
export interface WebSocketApiProps {
    /**
     * The routes for the WebSocket API
     *
     * @example
     * ```js
     * new WebSocketApi(stack, "Api", {
     *   routes: {
     *     $connect    : "src/connect.main",
     *     $default    : "src/default.main",
     *     $disconnect : "src/disconnect.main",
     *     sendMessage : "src/sendMessage.main",
     *   }
     * })
     * ```
     */
    routes?: Record<string, FunctionInlineDefinition | WebSocketApiFunctionRouteProps>;
    /**
     * Enable CloudWatch access logs for this API
     *
     * @example
     * ```js
     * new WebSocketApi(stack, "Api", {
     *   accessLog: true
     * });
     * ```
     *
     * @example
     * ```js
     * new WebSocketApi(stack, "Api", {
     *   accessLog: {
     *     retention: "one_week",
     *   },
     * });
     * ```
     */
    accessLog?: boolean | string | WebSocketApiAccessLogProps;
    /**
     * Specify a custom domain to use in addition to the automatically generated one. SST currently supports domains that are configured using [Route 53](https://aws.amazon.com/route53/)
     *
     * @example
     * ```js
     * new WebSocketApi(stack, "Api", {
     *   customDomain: "api.example.com"
     * })
     * ```
     *
     * @example
     * ```js
     * new WebSocketApi(stack, "Api", {
     *   customDomain: {
     *     domainName: "api.example.com",
     *     hostedZone: "domain.com",
     *     path: "v1"
     *   }
     * })
     * ```
     */
    customDomain?: string | WebSocketApiDomainProps;
    /**
     * The default authorizer for the API.
     *
     * @example
     * ```js
     * new WebSocketApi(stack, "Api", {
     *   authorizer: "iam",
     * });
     * ```
     *
     * @example
     * ```js
     * new WebSocketApi(stack, "Api", {
     *   authorizer: {
     *     type: "lambda",
     *     function: new Function(stack, "Authorizer", {
     *       handler: "test/lambda.handler",
     *     }),
     *   },
     * });
     * ```
     */
    authorizer?: "none" | "iam" | WebSocketApiLambdaAuthorizer;
    defaults?: {
        /**
         * The default function props to be applied to all the Lambda functions in the API. The `environment`, `permissions` and `layers` properties will be merged with per route definitions if they are defined.
         *
         * @example
         * ```js
         * new WebSocketApi(stack, "Api", {
         *   defaults: {
         *     function: {
         *       timeout: 20,
         *       environment: { tableName: table.tableName },
         *       permissions: [table],
         *     }
         *   },
         * });
         * ```
         */
        function?: FunctionProps;
    };
    cdk?: {
        /**
         * Allows you to override default id for this construct.
         */
        id?: string;
        /**
         * Override the internally created WebSocket API
         *
         * @example
         * ```js
         * new WebSocketApi(stack, "WebSocketApi", {
         *   cdk: {
         *     webSocketApi: {
         *       apiName: "my-websocket-api"
         *     }
         *   }
         * })
         * ```
         */
        webSocketApi?: apig.IWebSocketApi | apig.WebSocketApiProps;
        /**
         * Override the internally created WebSocket Stage
         *
         * @example
         * ```js
         * new WebSocketApi(stack, "WebSocketApi", {
         *   cdk: {
         *     webSocketStage: {
         *       autoDeploy: false
         *     }
         *   }
         * })
         * ```
         */
        webSocketStage?: apig.IWebSocketStage | WebSocketApiCdkStageProps;
    };
}
/**
 * Specify a function route handler and configure additional options
 *
 * @example
 * ```js
 * api.addRoutes(stack, {
 *   sendMessage : {
 *     function: "src/sendMessage.main",
 *   }
 * });
 * ```
 */
export interface WebSocketApiFunctionRouteProps {
    type?: "function";
    /**
     * The function definition used to create the function for this route.
     */
    function: FunctionDefinition;
    /**
     * Should the route send a response to the client.
     */
    returnResponse?: boolean;
}
/**
 * Specify a Lambda authorizer and configure additional options.
 *
 * @example
 * ```js
 * new WebSocketApi(stack, "Api", {
 *   authorizer: {
 *     type: "lambda",
 *     function: new Function(stack, "Authorizer", {
 *       handler: "test/lambda.handler",
 *     }),
 *   },
 * });
 * ```
 */
export interface WebSocketApiLambdaAuthorizer {
    type: "lambda";
    name?: string;
    identitySource?: string[];
    function?: Fn;
    cdk?: {
        authorizer: apigAuthorizers.WebSocketLambdaAuthorizer;
    };
}
export interface WebSocketApiCdkStageProps extends Omit<apig.WebSocketStageProps, "webSocketApi" | "stageName"> {
    stageName?: string;
}
/**
 * The `WebSocketApi` construct is a higher level CDK construct that makes it easy to create a WebSocket API.
 *
 * @example
 * ```js
 * import { WebSocketApi } from "sst/constructs";
 *
 * new WebSocketApi(stack, "Api", {
 *   routes: {
 *     $connect: "src/connect.main",
 *     $default: "src/default.main",
 *     $disconnect: "src/disconnect.main",
 *     sendMessage: "src/sendMessage.main",
 *   },
 * });
 * ```
 */
export declare class WebSocketApi extends Construct implements SSTConstruct {
    readonly id: string;
    readonly cdk: {
        /**
         * The internally created websocket api
         */
        webSocketApi: apig.WebSocketApi;
        /**
         * The internally created websocket stage
         */
        webSocketStage: apig.WebSocketStage;
        /**
         * The internally created log group
         */
        accessLogGroup?: logs.LogGroup;
        /**
         * The internally created domain name
         */
        domainName?: apig.DomainName;
        /**
         * The internally created certificate
         */
        certificate?: acm.Certificate;
    };
    private _customDomainUrl?;
    private functions;
    private apigRoutes;
    private bindingForAllRoutes;
    private permissionsAttachedForAllRoutes;
    private authorizer?;
    private props;
    constructor(scope: Construct, id: string, props?: WebSocketApiProps);
    /**
     * Url of the WebSocket API
     */
    get url(): string;
    /**
     * Custom domain url if it's configured
     */
    get customDomainUrl(): string | undefined;
    /**
     * List of routes of the websocket api
     */
    get routes(): string[];
    get _connectionsArn(): string;
    /**
     * Add routes to an already created WebSocket API
     *
     * @example
     * ```js
     * api.addRoutes(stack, {
     *   "$connect": "src/connect.main",
     * })
     * ```
     */
    addRoutes(scope: Construct, routes: Record<string, FunctionInlineDefinition | WebSocketApiFunctionRouteProps>): void;
    /**
     * Get the instance of the internally created Function, for a given route key where the `routeKey` is the key used to define a route. For example, `$connect`.
     *
     * @example
     * ```js
     * const fn = api.getFunction("$connect");
     * ```
     */
    getFunction(routeKey: string): Fn | undefined;
    /**
     * Get the instance of the internally created Route, for a given route key where the `routeKey` is the key used to define a route. For example, `$connect`.
     *
     * @example
     * ```js
     * const route = api.getRoute("$connect");
     * ```
     */
    getRoute(routeKey: string): apig.WebSocketRoute | undefined;
    /**
     * Binds the given list of resources to all the routes.
     *
     * @example
     *
     * ```js
     * api.bind([STRIPE_KEY, bucket]);
     * ```
     */
    bind(constructs: BindingResource[]): void;
    /**
     * Binds the given list of resources to a specific route.
     *
     * @example
     * ```js
     * api.bindToRoute("$connect", [STRIPE_KEY, bucket]);
     * ```
     *
     */
    bindToRoute(routeKey: string, constructs: BindingResource[]): void;
    /**
     * Attaches the given list of permissions to all the routes. This allows the functions to access other AWS resources.
     *
     * @example
     *
     * ```js
     * api.attachPermissions(["s3"]);
     * ```
     */
    attachPermissions(permissions: Permissions): void;
    /**
     * Attaches the given list of permissions to a specific route. This allows that function to access other AWS resources.
     *
     * @example
     * ```js
     * api.attachPermissionsToRoute("$connect", ["s3"]);
     * ```
     *
     */
    attachPermissionsToRoute(routeKey: string, permissions: Permissions): void;
    getConstructMetadata(): {
        type: "WebSocketApi";
        data: {
            url: string;
            httpApiId: string;
            customDomainUrl: string | undefined;
            routes: {
                route: string;
                fn: {
                    node: string;
                    stack: string;
                } | undefined;
            }[];
        };
    };
    /** @internal */
    getBindings(): BindingProps;
    private createWebSocketApi;
    private createWebSocketStage;
    private createCloudWatchRole;
    private addAuthorizer;
    private addRoute;
    private buildRouteAuth;
    private normalizeRouteKey;
}
