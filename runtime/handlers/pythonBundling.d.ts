import { Runtime } from "aws-cdk-lib/aws-lambda";
import { FunctionDockerBuildProps, FunctionProps } from "../../constructs/Function.js";
import { AssetHashType } from "aws-cdk-lib/core";
/**
 * Dependency files to exclude from the asset hash.
 */
export declare const DEPENDENCY_EXCLUDES: string[];
/**
 * The location in the image that the bundler image caches dependencies.
 */
export declare const BUNDLER_DEPENDENCIES_CACHE = "/var/dependencies";
/**
 * Options for bundling
 */
export interface BundlingOptions {
    /**
     * Entry path
     */
    readonly entry: string;
    /**
     * The runtime of the lambda function
     */
    readonly runtime: Runtime;
    /**
     * Architecture used by the lambda function
     */
    readonly architecture: FunctionProps["architecture"];
    /**
     * Output path suffix ('python' for a layer, '.' otherwise)
     */
    readonly outputPathSuffix: string;
    /**
     * Determines how asset hash is calculated. Assets will get rebuild and
     * uploaded only if their hash has changed.
     *
     * If asset hash is set to `SOURCE` (default), then only changes to the source
     * directory will cause the asset to rebuild. This means, for example, that in
     * order to pick up a new dependency version, a change must be made to the
     * source tree. Ideally, this can be implemented by including a dependency
     * lockfile in your source tree or using fixed dependencies.
     *
     * If the asset hash is set to `OUTPUT`, the hash is calculated after
     * bundling. This means that any change in the output will cause the asset to
     * be invalidated and uploaded. Bear in mind that `pip` adds timestamps to
     * dependencies it installs, which implies that in this mode Python bundles
     * will _always_ get rebuild and uploaded. Normally this is an anti-pattern
     * since build
     *
     * @default AssetHashType.SOURCE By default, hash is calculated based on the
     * contents of the source directory. If `assetHash` is also specified, the
     * default is `CUSTOM`. This means that only updates to the source will cause
     * the asset to rebuild.
     */
    readonly assetHashType?: AssetHashType;
    /**
     * Specify a custom hash for this asset. If `assetHashType` is set it must
     * be set to `AssetHashType.CUSTOM`. For consistency, this custom hash will
     * be SHA256 hashed and encoded as hex. The resulting hash will be the asset
     * hash.
     *
     * NOTE: the hash is used in order to identify a specific revision of the asset, and
     * used for optimizing and caching deployment activities related to this asset such as
     * packaging, uploading to Amazon S3, etc. If you chose to customize the hash, you will
     * need to make sure it is updated every time the asset changes, or otherwise it is
     * possible that some deployments will not be invalidated.
     *
     * @default - based on `assetHashType`
     */
    readonly assetHash?: string;
    readonly installCommands?: string[];
    readonly dockerBuild?: FunctionDockerBuildProps;
}
/**
 * Produce bundled Lambda asset code
 */
export declare function bundle(options: BundlingOptions & {
    out: string;
}): void;
/**
 * Checks to see if the `entry` directory contains a type of dependency that
 * we know how to install.
 */
export declare function stageDependencies(entry: string, stagedir: string): boolean;
