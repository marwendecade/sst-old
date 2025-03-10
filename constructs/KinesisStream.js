import { Construct } from "constructs";
import * as kinesis from "aws-cdk-lib/aws-kinesis";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaEventSources from "aws-cdk-lib/aws-lambda-event-sources";
import { getFunctionRef, isCDKConstruct } from "./Construct.js";
import { Function as Fn, } from "./Function.js";
/////////////////////
// Construct
/////////////////////
/**
 * The `KinesisStream` construct is a higher level CDK construct that makes it easy to create a Kinesis Data Stream and add a list of consumers to it.
 *
 * @example
 *
 * ```js
 * import { KinesisStream } from "sst/constructs";
 *
 * new KinesisStream(stack, "Stream", {
 *   consumers: {
 *     myConsumer: "src/lambda.main",
 *   }
 * });
 * ```
 */
export class KinesisStream extends Construct {
    id;
    cdk;
    functions = {};
    bindingForAllConsumers = [];
    permissionsAttachedForAllConsumers = [];
    props;
    constructor(scope, id, props) {
        super(scope, props?.cdk?.id || id);
        this.id = id;
        this.props = props || {};
        this.cdk = {};
        this.createStream();
        // Create Consumers
        if (props?.consumers) {
            for (const consumerName in props.consumers) {
                this.addConsumer(this, consumerName, props.consumers[consumerName]);
            }
        }
        const app = this.node.root;
        app.registerTypes(this);
    }
    /**
     * The ARN of the internally created Kinesis Stream
     */
    get streamArn() {
        return this.cdk.stream.streamArn;
    }
    /**
     * The name of the internally created Kinesis Stream
     */
    get streamName() {
        return this.cdk.stream.streamName;
    }
    /**
     * Add consumers to a stream after creating it
     *
     * @example
     * ```js
     * stream.addConsumers(stack, {
     *   consumer1: "src/function.handler"
     * })
     * ```
     */
    addConsumers(scope, consumers) {
        Object.keys(consumers).forEach((consumerName) => {
            this.addConsumer(scope, consumerName, consumers[consumerName]);
        });
    }
    /**
     * Binds the given list of resources to all the consumers.
     *
     * @example
     *
     * ```js
     * stream.bind([STRIPE_KEY, bucket]]);
     * ```
     */
    bind(constructs) {
        Object.values(this.functions).forEach((fn) => fn.bind(constructs));
        this.bindingForAllConsumers.push(...constructs);
    }
    /**
     * Binds the given list of resources to a specific consumer.
     *
     * @example
     * ```js
     * stream.bindToConsumer("consumer1", [STRIPE_KEY, bucket]);
     * ```
     */
    bindToConsumer(consumerName, constructs) {
        if (!this.functions[consumerName]) {
            throw new Error(`The "${consumerName}" consumer was not found in the "${this.node.id}" KinesisStream.`);
        }
        this.functions[consumerName].bind(constructs);
    }
    /**
     * Attaches the given list of permissions to all the consumers. This allows the functions to access other AWS resources.
     *
     * @example
     *
     * ```js
     * stream.attachPermissions(["s3"]);
     * ```
     */
    attachPermissions(permissions) {
        Object.values(this.functions).forEach((fn) => fn.attachPermissions(permissions));
        this.permissionsAttachedForAllConsumers.push(permissions);
    }
    /**
     * Attaches the given list of permissions to a specific consumer. This allows that function to access other AWS resources.
     *
     * @example
     * ```js
     * stream.attachPermissionsToConsumer("consumer1", ["s3"]);
     * ```
     */
    attachPermissionsToConsumer(consumerName, permissions) {
        if (!this.functions[consumerName]) {
            throw new Error(`The "${consumerName}" consumer was not found in the "${this.node.id}" KinesisStream.`);
        }
        this.functions[consumerName].attachPermissions(permissions);
    }
    /**
     * Get the function for a specific consumer
     *
     * @example
     * ```js
     * stream.getFunction("consumer1");
     * ```
     */
    getFunction(consumerName) {
        return this.functions[consumerName];
    }
    getConstructMetadata() {
        return {
            type: "KinesisStream",
            data: {
                streamName: this.cdk.stream.streamName,
                consumers: Object.entries(this.functions).map(([name, fn]) => ({
                    name,
                    fn: getFunctionRef(fn),
                })),
            },
        };
    }
    /** @internal */
    getBindings() {
        return {
            clientPackage: "kinesis-stream",
            variables: {
                streamName: {
                    type: "plain",
                    value: this.streamName,
                },
            },
            permissions: {
                "kinesis:*": [this.streamArn],
            },
        };
    }
    createStream() {
        const { cdk } = this.props;
        const app = this.node.root;
        const id = this.node.id;
        if (isCDKConstruct(cdk?.stream)) {
            this.cdk.stream = cdk?.stream;
        }
        else {
            const kinesisStreamProps = (cdk?.stream || {});
            this.cdk.stream = new kinesis.Stream(this, "Stream", {
                streamName: app.logicalPrefixedName(id),
                ...kinesisStreamProps,
            });
        }
    }
    addConsumer(scope, consumerName, consumer) {
        // normalize consumer
        let consumerFunction, consumerProps;
        if (consumer.function) {
            consumer = consumer;
            consumerFunction = consumer.function;
            consumerProps = consumer.cdk?.eventSource;
        }
        else {
            consumerFunction = consumer;
        }
        consumerProps = {
            startingPosition: lambda.StartingPosition.LATEST,
            ...(consumerProps || {}),
        };
        // create function
        const fn = Fn.fromDefinition(scope, `Consumer_${this.node.id}_${consumerName}`, consumerFunction, this.props.defaults?.function, `The "defaults.function" cannot be applied if an instance of a Function construct is passed in. Make sure to define all the consumers using FunctionProps, so the KinesisStream construct can apply the "defaults.function" to them.`);
        this.functions[consumerName] = fn;
        // create event source
        const eventSource = new lambdaEventSources.KinesisEventSource(this.cdk.stream, consumerProps);
        fn.addEventSource(eventSource);
        // attach permissions
        this.permissionsAttachedForAllConsumers.forEach((permissions) => {
            fn.attachPermissions(permissions);
        });
        fn.bind(this.bindingForAllConsumers);
        return fn;
    }
}
