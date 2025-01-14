import * as cxapi from "@aws-cdk/cx-api";
import { Tag } from "sst-aws-cdk/lib/cdk-toolkit.js";
import { ISDK, SdkProvider } from "sst-aws-cdk/lib/api/aws-auth/index.js";
import { EnvironmentResources } from "sst-aws-cdk/lib/api/environment-resources.js";
import { HotswapMode } from "sst-aws-cdk/lib/api/hotswap/common.js";
import { ResourcesToImport } from "sst-aws-cdk/lib/api/util/cloudformation.js";
import { StackActivityProgress } from "sst-aws-cdk/lib/api/util/cloudformation/stack-activity-monitor.js";
export interface DeployStackResult {
    readonly noOp: boolean;
    readonly outputs: {
        [name: string]: string;
    };
    readonly stackArn: string;
}
export interface DeployStackOptions {
    /**
     * The stack to be deployed
     */
    readonly stack: cxapi.CloudFormationStackArtifact;
    /**
     * Skip monitoring
     */
    readonly noMonitor?: boolean;
    /**
     * The environment to deploy this stack in
     *
     * The environment on the stack artifact may be unresolved, this one
     * must be resolved.
     */
    readonly resolvedEnvironment: cxapi.Environment;
    /**
     * The SDK to use for deploying the stack
     *
     * Should have been initialized with the correct role with which
     * stack operations should be performed.
     */
    readonly sdk: ISDK;
    /**
     * SDK provider (seeded with default credentials)
     *
     * Will exclusively be used to assume publishing credentials (which must
     * start out from current credentials regardless of whether we've assumed an
     * action role to touch the stack or not).
     *
     * Used for the following purposes:
     *
     * - Publish legacy assets.
     * - Upload large CloudFormation templates to the staging bucket.
     */
    readonly sdkProvider: SdkProvider;
    /**
     * Information about the bootstrap stack found in the target environment
     */
    readonly envResources: EnvironmentResources;
    /**
     * Role to pass to CloudFormation to execute the change set
     *
     * @default - Role specified on stack, otherwise current
     */
    readonly roleArn?: string;
    /**
     * Notification ARNs to pass to CloudFormation to notify when the change set has completed
     *
     * @default - No notifications
     */
    readonly notificationArns?: string[];
    /**
     * Name to deploy the stack under
     *
     * @default - Name from assembly
     */
    readonly deployName?: string;
    /**
     * Quiet or verbose deployment
     *
     * @default false
     */
    readonly quiet?: boolean;
    /**
     * List of asset IDs which shouldn't be built
     *
     * @default - Build all assets
     */
    readonly reuseAssets?: string[];
    /**
     * Tags to pass to CloudFormation to add to stack
     *
     * @default - No tags
     */
    readonly tags?: Tag[];
    /**
     * What deployment method to use
     *
     * @default - Change set with defaults
     */
    readonly deploymentMethod?: DeploymentMethod;
    /**
     * The collection of extra parameters
     * (in addition to those used for assets)
     * to pass to the deployed template.
     * Note that parameters with `undefined` or empty values will be ignored,
     * and not passed to the template.
     *
     * @default - no additional parameters will be passed to the template
     */
    readonly parameters?: {
        [name: string]: string | undefined;
    };
    /**
     * Use previous values for unspecified parameters
     *
     * If not set, all parameters must be specified for every deployment.
     *
     * @default false
     */
    readonly usePreviousParameters?: boolean;
    /**
     * Display mode for stack deployment progress.
     *
     * @default StackActivityProgress.Bar stack events will be displayed for
     *   the resource currently being deployed.
     */
    readonly progress?: StackActivityProgress;
    /**
     * Deploy even if the deployed template is identical to the one we are about to deploy.
     * @default false
     */
    readonly force?: boolean;
    /**
     * Whether we are on a CI system
     *
     * @default false
     */
    readonly ci?: boolean;
    /**
     * Rollback failed deployments
     *
     * @default true
     */
    readonly rollback?: boolean;
    readonly hotswap?: HotswapMode;
    /**
     * The extra string to append to the User-Agent header when performing AWS SDK calls.
     *
     * @default - nothing extra is appended to the User-Agent header
     */
    readonly extraUserAgent?: string;
    /**
     * If set, change set of type IMPORT will be created, and resourcesToImport
     * passed to it.
     */
    readonly resourcesToImport?: ResourcesToImport;
    /**
     * If present, use this given template instead of the stored one
     *
     * @default - Use the stored template
     */
    readonly overrideTemplate?: any;
    /**
     * Whether to build/publish assets in parallel
     *
     * @default true To remain backward compatible.
     */
    readonly assetParallelism?: boolean;
}
export type DeploymentMethod = DirectDeploymentMethod | ChangeSetDeploymentMethod;
export interface DirectDeploymentMethod {
    readonly method: "direct";
}
export interface ChangeSetDeploymentMethod {
    readonly method: "change-set";
    /**
     * Whether to execute the changeset or leave it in review.
     *
     * @default true
     */
    readonly execute?: boolean;
    /**
     * Optional name to use for the CloudFormation change set.
     * If not provided, a name will be generated automatically.
     */
    readonly changeSetName?: string;
}
export declare function deployStack(options: DeployStackOptions): Promise<DeployStackResult | undefined>;
export interface DestroyStackOptions {
    /**
     * The stack to be destroyed
     */
    stack: cxapi.CloudFormationStackArtifact;
    sdk: ISDK;
    roleArn?: string;
    deployName?: string;
    quiet?: boolean;
    ci?: boolean;
}
export declare function destroyStack(options: DestroyStackOptions): Promise<void>;
