import type { Loader, BuildOptions } from "esbuild";
import { Construct } from "constructs";
import { Stack } from "./Stack.js";
import { SSTConstruct } from "./Construct.js";
import { Size } from "./util/size.js";
import { Duration } from "./util/duration.js";
import { BindingResource, BindingProps } from "./util/binding.js";
import { Permissions } from "./util/permission.js";
import * as functionUrlCors from "./util/functionUrlCors.js";
import { Architecture, Function as CDKFunction, FunctionOptions, ILayerVersion, Runtime as CDKRuntime, Tracing } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Size as CDKSize, Duration as CDKDuration, DockerCacheOption } from "aws-cdk-lib/core";
import { Asset } from "aws-cdk-lib/aws-s3-assets";
declare const supportedRuntimes: {
    container: CDKRuntime;
    rust: CDKRuntime;
    "nodejs16.x": CDKRuntime;
    "nodejs18.x": CDKRuntime;
    "nodejs20.x": CDKRuntime;
    "python3.7": CDKRuntime;
    "python3.8": CDKRuntime;
    "python3.9": CDKRuntime;
    "python3.10": CDKRuntime;
    "python3.11": CDKRuntime;
    "python3.12": CDKRuntime;
    "dotnetcore3.1": CDKRuntime;
    dotnet6: CDKRuntime;
    dotnet8: CDKRuntime;
    java8: CDKRuntime;
    java11: CDKRuntime;
    java17: CDKRuntime;
    java21: CDKRuntime;
    "go1.x": CDKRuntime;
    go: CDKRuntime;
};
export type Runtime = keyof typeof supportedRuntimes;
export type FunctionInlineDefinition = string | Function;
export type FunctionDefinition = string | Function | FunctionProps;
export interface FunctionUrlCorsProps extends functionUrlCors.CorsProps {
}
export interface FunctionDockerBuildCacheProps extends DockerCacheOption {
}
export interface FunctionDockerBuildProps {
    /**
     * Cache from options to pass to the `docker build` command.
     * @default No cache from args are passed
     * @example
     * ```js
     * cacheFrom: [{type: "gha"}],
     * ```
     */
    cacheFrom?: FunctionDockerBuildCacheProps[];
    /**
     * Cache to options to pass to the `docker build` command.
     * @default No cache to args are passed
     * @example
     * ```js
     * cacheTo: {type: "gha"},
     * ```
     */
    cacheTo?: FunctionDockerBuildCacheProps;
}
export interface FunctionHooks {
    /**
     * Hook to run before build
     */
    beforeBuild?: (props: FunctionProps, out: string) => Promise<void>;
    /**
     * Hook to run after build
     */
    afterBuild?: (props: FunctionProps, out: string) => Promise<void>;
}
export interface FunctionProps extends Omit<FunctionOptions, "functionName" | "memorySize" | "timeout" | "runtime" | "tracing" | "layers" | "architecture" | "logRetention"> {
    /**
     * Used to configure additional files to copy into the function bundle
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   copyFiles: [{ from: "src/index.js" }]
     * })
     *```
     */
    copyFiles?: FunctionCopyFilesProps[];
    /**
     * Used to configure go function properties
     */
    go?: GoProps;
    /**
     * Used to configure nodejs function properties
     */
    nodejs?: NodeJSProps;
    /**
     * Used to configure java function properties
     */
    java?: JavaProps;
    /**
     * Used to configure python function properties
     */
    python?: PythonProps;
    /**
     * Used to configure container function properties
     */
    container?: ContainerProps;
    /**
     * Hooks to run before and after function builds
     */
    hooks?: FunctionHooks;
    /**
     * The CPU architecture of the lambda function.
     *
     * @default "x86_64"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   architecture: "arm_64",
     * })
     * ```
     */
    architecture?: Lowercase<keyof Pick<typeof Architecture, "ARM_64" | "X86_64">>;
    /**
     * By default, the name of the function is auto-generated by AWS. You can configure the name by providing a string.
     *
     * @default Auto-generated function name
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   functionName: "my-function",
     * })
     *```
     */
    functionName?: string | ((props: FunctionNameProps) => string);
    /**
     * Path to the entry point and handler function. Of the format:
     * `/path/to/file.function`.
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     * })
     *```
     */
    handler?: string;
    /**
     * The runtime environment for the function.
     * @default "nodejs18.x"
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "function.handler",
     *   runtime: "nodejs18.x",
     * })
     *```
     */
    runtime?: Runtime;
    /**
     * The amount of disk storage in MB allocated.
     *
     * @default "512 MB"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   diskSize: "2 GB",
     * })
     *```
     */
    diskSize?: number | Size;
    /**
     * The amount of memory in MB allocated.
     *
     * @default "1 GB"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   memorySize: "2 GB",
     * })
     *```
     */
    memorySize?: number | Size;
    /**
     * The execution timeout in seconds.
     *
     * @default "10 seconds"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   timeout: "30 seconds",
     * })
     *```
     */
    timeout?: number | Duration;
    /**
     * Enable AWS X-Ray Tracing.
     *
     * @default "active"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   tracing: "pass_through",
     * })
     *```
     */
    tracing?: Lowercase<keyof typeof Tracing>;
    /**
     * Can be used to disable Live Lambda Development when using `sst start`. Useful for things like Custom Resources that need to execute during deployment.
     *
     * @default true
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   enableLiveDev: false
     * })
     *```
     */
    enableLiveDev?: boolean;
    /**
     * Configure environment variables for the function
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   environment: {
     *     TABLE_NAME: table.tableName,
     *   }
     * })
     * ```
     */
    environment?: Record<string, string>;
    /**
     * Bind resources for the function
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   bind: [STRIPE_KEY, bucket],
     * })
     * ```
     */
    bind?: BindingResource[];
    /**
     * Attaches the given list of permissions to the function. Configuring this property is equivalent to calling `attachPermissions()` after the function is created.
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   permissions: ["ses"]
     * })
     * ```
     */
    permissions?: Permissions;
    /**
     * Enable function URLs, a dedicated endpoint for your Lambda function.
     * @default Disabled
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   url: true
     * })
     * ```
     *
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   url: {
     *     authorizer: "iam",
     *     cors: {
     *       allowedOrigins: ['https://example.com'],
     *     },
     *   },
     * })
     * ```
     */
    url?: boolean | FunctionUrlProps;
    /**
     * A list of Layers to add to the function's execution environment.
     *
     * Note that, if a Layer is created in a stack (say `stackA`) and is referenced in another stack (say `stackB`), SST automatically creates an SSM parameter in `stackA` with the Layer's ARN. And in `stackB`, SST reads the ARN from the SSM parameter, and then imports the Layer.
     *
     * This is to get around the limitation that a Lambda Layer ARN cannot be referenced across stacks via a stack export. The Layer ARN contains a version number that is incremented everytime the Layer is modified. When you refer to a Layer's ARN across stacks, a CloudFormation export is created. However, CloudFormation does not allow an exported value to be updated. Once exported, if you try to deploy the updated layer, the CloudFormation update will fail. You can read more about this issue here - https://github.com/sst/sst/issues/549.
     *
     * @default no layers
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   layers: ["arn:aws:lambda:us-east-1:764866452798:layer:chrome-aws-lambda:22", myLayer]
     * })
     * ```
     */
    layers?: (string | ILayerVersion)[];
    /**
     * Disable sending function logs to CloudWatch Logs.
     *
     * Note that, logs will still appear locally when running `sst dev`.
     * @default false
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   disableCloudWatchLogs: true
     * })
     * ```
     *
     */
    disableCloudWatchLogs?: boolean;
    /**
     * Prefetches bound secret values and injects them into the function's environment variables.
     * @default false
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   prefetchSecrets: true
     * })
     * ```
     *
     */
    prefetchSecrets?: boolean;
    /**
     * The duration function logs are kept in CloudWatch Logs.
     *
     * When updating this property, unsetting it doesn't retain the logs indefinitely. Explicitly set the value to "infinite".
     * @default Logs retained indefinitely
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   logRetention: "one_week"
     * })
     * ```
     */
    logRetention?: Lowercase<keyof typeof RetentionDays>;
    /**
     * @internal
     */
    _doNotAllowOthersToBind?: boolean;
}
export interface FunctionNameProps {
    /**
     * The stack the function is being created in
     */
    stack: Stack;
    /**
     * The function properties
     */
    functionProps: FunctionProps;
}
export interface FunctionUrlProps {
    /**
     * The authorizer for the function URL
     * @default "none"
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   url: {
     *     authorizer: "iam",
     *   },
     * })
     * ```
     */
    authorizer?: "none" | "iam";
    /**
     * CORS support for the function URL
     * @default true
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   url: {
     *     cors: true,
     *   },
     * })
     * ```
     *
     * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   url: {
     *     cors: {
     *       allowedMethods: ["GET", "POST"]
     *       allowedOrigins: ['https://example.com'],
     *     },
     *   },
     * })
     * ```
     */
    cors?: boolean | FunctionUrlCorsProps;
    /**
     * Stream the response payload.
     * @default false
     * * ```js
     * new Function(stack, "Function", {
     *   handler: "src/function.handler",
     *   url: {
     *     streaming: true,
     *   },
     * })
     * ```
     */
    streaming?: boolean;
}
export interface NodeJSProps {
    /**
     * Configure additional esbuild loaders for other file extensions
     *
     * @example
     * ```js
     * nodejs: {
     *   loader: {
     *    ".png": "file"
     *   }
     * }
     * ```
     */
    loader?: Record<string, Loader>;
    /**
     * Packages that will be excluded from the bundle and installed into node_modules instead. Useful for dependencies that cannot be bundled, like those with binary dependencies.
     *
     * @example
     * ```js
     * nodejs: {
     *   install: ["pg"]
     * }
     * ```
     */
    install?: string[];
    /**
     * Use this to insert an arbitrary string at the beginning of generated JavaScript and CSS files.
     *
     * @example
     * ```js
     * nodejs: {
     *   banner: "console.log('Function starting')"
     * }
     * ```
     */
    banner?: string;
    /**
     * This allows you to customize esbuild config.
     */
    esbuild?: BuildOptions;
    /**
     * Enable or disable minification
     *
     * @default false
     *
     * @example
     * ```js
     * nodejs: {
     *   minify: true
     * }
     * ```
     */
    minify?: boolean;
    /**
     * Configure format
     *
     * @default "esm"
     *
     * @example
     * ```js
     * nodejs: {
     *   format: "cjs"
     * }
     * ```
     */
    format?: "cjs" | "esm";
    /**
     * Configure if sourcemaps are generated when the function is bundled for production. Since they increase payload size and potentially cold starts they are not generated by default. They are always generated during local development mode.
     *
     * @default false
     *
     * @example
     * ```js
     * nodejs: {
     *   sourcemap: true
     * }
     * ```
     */
    sourcemap?: boolean;
    /**
     * If enabled, modules that are dynamically imported will be bundled as their own files with common dependencies placed in shared chunks. This can help drastically reduce cold starts as your function grows in size.
     *
     * @default false
     *
     * @example
     * ```js
     * nodejs: {
     *   splitting: true
     * }
     * ```
     */
    splitting?: boolean;
}
/**
 * Used to configure Python bundling options
 */
export interface PythonProps {
    /**
     * A list of commands to override the [default installing behavior](Function#bundle) for Python dependencies.
     *
     * Each string in the array is a command that'll be run. For example:
     *
     * @default "[]"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   python: {
     *     installCommands: [
     *       'export VARNAME="my value"',
     *       'pip install --index-url https://domain.com/pypi/myprivatemodule/simple/ --extra-index-url https://pypi.org/simple -r requirements.txt .',
     *     ]
     *   }
     * })
     * ```
     */
    installCommands?: string[];
    /**
     * This options skips the Python bundle step. If you set this flag to `true`, you must ensure
     * that either:
     *
     * 1. Your Python build does not require dependencies.
     * 2. Or, you've already installed production dependencies before running `sst deploy`.
     *
     * One solution to accomplish this is to pre-compile your production dependencies to some
     * temporary directory, using pip's `--platform` argument to ensure Python pre-built wheels are
     * used and that your builds match your target Lambda runtime, and use SST's `copyFiles`
     * option to make sure these dependencies make it into your final deployment build.
     *
     * This can also help speed up Python Lambdas which do not have external dependencies. By
     * default, SST will still run a docker file that is essentially a no-op if you have no
     * dependencies. This option will bypass that step, even if you have a `Pipfile`, a `poetry.toml`,
     * a `pyproject.toml`, or a `requirements.txt` (which would normally trigger an all-dependencies
     * Docker build).
     *
     * Enabling this option implies that you have accounted for all of the above and are handling
     * your own build processes, and you are doing this for the sake of build optimization.
     */
    noDocker?: boolean;
    /**
     * Build options to pass to the docker build command.
     */
    dockerBuild?: FunctionDockerBuildProps;
}
/**
 * Used to configure Go bundling options
 */
export interface GoProps {
    /**
     * The ldflags to use when building the Go module.
     *
     * @default ["-s", "-w"]
     * @example
     * ```js
     * go: {
     *   ldFlags: ["-X main.version=1.0.0"],
     * }
     * ```
     */
    ldFlags?: string[];
    /**
     * The build tags to use when building the Go module.
     *
     * @default []
     * @example
     * ```js
     * go: {
     *   buildTags: ["enterprise", "pro"],
     * }
     * ```
     */
    buildTags?: string[];
    /**
     * Whether to enable CGO for the Go build.
     *
     * @default false
     * @example
     * ```js
     * go: {
     *   cgoEnabled: true,
     * }
     * ```
     */
    cgoEnabled?: boolean;
}
/**
 * Used to configure Java package build options
 */
export interface JavaProps {
    /**
     * Gradle build command to generate the bundled .zip file.
     *
     * @default "build"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   java: {
     *     buildTask: "bundle"
     *   }
     * })
     * ```
     */
    buildTask?: string;
    /**
     * The output folder that the bundled .zip file will be created within.
     *
     * @default "distributions"
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   java: {
     *     buildOutputDir: "output"
     *   }
     * })
     * ```
     */
    buildOutputDir?: string;
    /**
     * Use custom Amazon Linux runtime instead of Java runtime.
     *
     * @default Not using provided runtime
     *
     * @example
     * ```js
     * new Function(stack, "Function", {
     *   java: {
     *     experimentalUseProvidedRuntime: "provided.al2"
     *   }
     * })
     * ```
     */
    experimentalUseProvidedRuntime?: "provided" | "provided.al2";
}
export interface ContainerProps {
    /**
     * Specify or override the CMD on the Docker image.
     * @example
     * ```js
     * container: {
     *   cmd: ["index.handler"]
     * }
     * ```
     */
    cmd?: string[];
    /**
     * Name of the Dockerfile.
     * @example
     * ```js
     * container: {
     *   file: "path/to/Dockerfile.prod"
     * }
     * ```
     */
    file?: string;
    /**
     * Build args to pass to the docker build command.
     * @default No build args
     * @example
     * ```js
     * container: {
     *   buildArgs: {
     *     FOO: "bar"
     *   }
     * }
     * ```
     */
    buildArgs?: Record<string, string>;
    /**
     * SSH agent socket or keys to pass to the docker build command.
     * Docker BuildKit must be enabled to use the ssh flag
     * @default No --ssh flag is passed to the build command
     * @example
     * ```js
     * container: {
     *   buildSsh: "default"
     * }
     * ```
     */
    buildSsh?: string;
    /**
     * Cache from options to pass to the docker build command.
     * [DockerCacheOption](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets.DockerCacheOption.html)[].
     * @default No cache from options are passed to the build command
     * @example
     * ```js
     * container: {
     *   cacheFrom: [{ type: 'registry', params: { ref: 'ghcr.io/myorg/myimage:cache' }}],
     * }
     * ```
     */
    cacheFrom?: FunctionDockerBuildCacheProps[];
    /**
     * Cache to options to pass to the docker build command.
     * [DockerCacheOption](https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets.DockerCacheOption.html)[].
     * @default No cache to options are passed to the build command
     * @example
     * ```js
     * container: {
     *   cacheTo: { type: 'registry', params: { ref: 'ghcr.io/myorg/myimage:cache', mode: 'max', compression: 'zstd' }},
     * }
     * ```
     */
    cacheTo?: FunctionDockerBuildCacheProps;
}
/**
 * Used to configure additional files to copy into the function bundle
 *
 * @example
 * ```js
 * new Function(stack, "Function", {
 *   copyFiles: [{ from: "src/index.js" }]
 * })
 *```
 */
export interface FunctionCopyFilesProps {
    /**
     * Source path relative to sst.config.ts
     */
    from: string;
    /**
     * Destination path relative to function root in bundle
     */
    to?: string;
}
/**
 * The `Function` construct is a higher level CDK construct that makes it easy to create a Lambda Function with support for Live Lambda Development.
 *
 * @example
 *
 * ```js
 * import { Function } from "sst/constructs";
 *
 * new Function(stack, "MySnsLambda", {
 *   handler: "src/sns/index.main",
 * });
 * ```
 */
export declare class Function extends CDKFunction implements SSTConstruct {
    readonly id: string;
    readonly _isLiveDevEnabled: boolean;
    /** @internal */
    readonly _doNotAllowOthersToBind?: boolean;
    /** @internal */
    _overrideMetadataHandler?: string;
    private missingSourcemap?;
    private functionUrl?;
    private props;
    private allBindings;
    constructor(scope: Construct, id: string, props: FunctionProps);
    /**
     * The AWS generated URL of the Function.
     */
    get url(): string | undefined;
    /**
     * Binds additional resources to function.
     *
     * @example
     * ```js
     * fn.bind([STRIPE_KEY, bucket]);
     * ```
     */
    bind(constructs: BindingResource[]): void;
    /**
     * Attaches additional permissions to function.
     *
     * @example
     * ```js {20}
     * fn.attachPermissions(["s3"]);
     * ```
     */
    attachPermissions(permissions: Permissions): void;
    /** @internal */
    getConstructMetadata(): {
        type: "Function";
        data: {
            arn: string;
            runtime: "container" | "rust" | "nodejs16.x" | "nodejs18.x" | "nodejs20.x" | "python3.7" | "python3.8" | "python3.9" | "python3.10" | "python3.11" | "python3.12" | "dotnetcore3.1" | "dotnet6" | "dotnet8" | "java8" | "java11" | "java17" | "java21" | "go1.x" | "go" | undefined;
            handler: string | undefined;
            missingSourcemap: boolean | undefined;
            localId: string;
            secrets: string[];
            prefetchSecrets: boolean | undefined;
        };
    };
    /** @internal */
    getBindings(): BindingProps;
    private createUrl;
    private createSecretPrefetcher;
    private disableCloudWatchLogs;
    private isNodeRuntime;
    static validateHandlerSet(id: string, props: FunctionProps): void;
    static validateVpcSettings(id: string, props: FunctionProps): void;
    static buildLayers(scope: Construct, id: string, props: FunctionProps): ILayerVersion[];
    static normalizeMemorySize(memorySize?: number | Size): number;
    static normalizeDiskSize(diskSize?: number | Size): CDKSize;
    static normalizeTimeout(timeout?: number | Duration): CDKDuration;
    static handleImportedLayer(scope: Construct, layer: ILayerVersion): ILayerVersion;
    static isInlineDefinition(definition: any): definition is FunctionInlineDefinition;
    static fromDefinition(scope: Construct, id: string, definition: FunctionDefinition, inheritedProps?: FunctionProps, inheritErrorMessage?: string): Function;
    static mergeProps(baseProps?: FunctionProps, props?: FunctionProps): FunctionProps;
}
export declare const useFunctions: () => {
    sourcemaps: {
        add(stack: string, source: {
            asset: Asset;
            tarKey: string;
        }): void;
        forStack(stack: string): {
            asset: Asset;
            tarKey: string;
        }[];
    };
    fromID(id: string): FunctionProps | undefined;
    add(name: string, props: FunctionProps): void;
    readonly all: Record<string, FunctionProps>;
};
export {};