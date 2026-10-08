/**
 * What the Learn CDK simulator knows about aws-cdk-lib: construct property lists, enums and Lambda runtimes.
 * Kept as plain data so it is easy to update when CDK or Lambda change. Keep this file free of path aliases and JSX.
 */

/** Lambda runtime support as published in the Lambda developer guide (checked October 2026). */
export const CATALOG_AS_OF = "October 2026";

export const CURRENT_RUNTIMES = ["NODEJS_22_X", "NODEJS_24_X", "PYTHON_3_12", "PYTHON_3_13", "PYTHON_3_14"] as const;
/** Still exist in aws-cdk-lib but Lambda has deprecated them or is about to. */
export const AGING_RUNTIMES = ["NODEJS_20_X", "NODEJS_18_X", "NODEJS_16_X", "NODEJS_14_X", "NODEJS_12_X", "PYTHON_3_8", "PYTHON_3_9", "PYTHON_3_7"] as const;
/** Still creatable today, but on their way out: accepted, with a heads-up in the lessons. */
export const AGEING_BUT_OK_RUNTIMES = ["PYTHON_3_10", "PYTHON_3_11"] as const;

export const ENUMS: Record<string, string[]> = {
  "core.RemovalPolicy": ["DESTROY", "RETAIN", "SNAPSHOT", "RETAIN_ON_UPDATE_OR_DELETE"],
  "s3.BucketEncryption": ["UNENCRYPTED", "KMS_MANAGED", "S3_MANAGED", "KMS", "DSSE", "DSSE_MANAGED"],
  "s3.BlockPublicAccess": ["BLOCK_ALL", "BLOCK_ACLS", "BLOCK_ACLS_ONLY"],
  "s3.EventType": [
    "OBJECT_CREATED", "OBJECT_CREATED_PUT", "OBJECT_CREATED_POST", "OBJECT_CREATED_COPY", "OBJECT_CREATED_COMPLETE_MULTIPART_UPLOAD",
    "OBJECT_REMOVED", "OBJECT_REMOVED_DELETE", "OBJECT_REMOVED_DELETE_MARKER_CREATED", "OBJECT_RESTORE_POST", "OBJECT_RESTORE_COMPLETED",
    "REDUCED_REDUNDANCY_LOST_OBJECT", "REPLICATION_OPERATION_FAILED_REPLICATION", "LIFECYCLE_EXPIRATION", "LIFECYCLE_EXPIRATION_DELETE",
    "LIFECYCLE_TRANSITION", "INTELLIGENT_TIERING", "OBJECT_TAGGING", "OBJECT_TAGGING_PUT", "OBJECT_TAGGING_DELETE", "OBJECT_ACL_PUT",
  ],
  "dynamodb.AttributeType": ["STRING", "NUMBER", "BINARY"],
  "dynamodb.BillingMode": ["PAY_PER_REQUEST", "PROVISIONED"],
  "dynamodb.ProjectionType": ["ALL", "KEYS_ONLY", "INCLUDE"],
  "dynamodb.StreamViewType": ["NEW_IMAGE", "OLD_IMAGE", "NEW_AND_OLD_IMAGES", "KEYS_ONLY"],
  "iam.Effect": ["ALLOW", "DENY"],
  "apigateway.Cors": ["ALL_ORIGINS", "ALL_METHODS", "DEFAULT_HEADERS"],
};

export const RUNTIME_NAMES = new Set<string>([...CURRENT_RUNTIMES, ...AGING_RUNTIMES, ...AGEING_BUT_OK_RUNTIMES, "JAVA_17", "JAVA_21", "DOTNET_8", "PROVIDED_AL2023", "PROVIDED_AL2", "NODEJS_26_X"]);

export type Spec = {
  /** Class name for messages: "Bucket". */
  cls: string;
  /** Props interface for TypeScript messages: "BucketProps". */
  propsType: string;
  /** Takes (scope, id, props). Value types take only their own arguments. */
  scoped: boolean;
  props: string[];
  required: string[];
};

export const SPECS: Record<string, Spec> = {
  "core.Stack": {
    cls: "Stack", propsType: "StackProps", scoped: true, required: [],
    props: ["description", "env", "stackName", "terminationProtection", "tags", "analyticsReporting", "crossRegionReferences", "synthesizer", "permissionsBoundary", "suppressTemplateIndentation", "notificationArns"],
  },
  "constructs.Construct": { cls: "Construct", propsType: "ConstructProps", scoped: true, required: [], props: [] },
  "s3.Bucket": {
    cls: "Bucket", propsType: "BucketProps", scoped: true, required: [],
    props: [
      "bucketName", "versioned", "removalPolicy", "autoDeleteObjects", "encryption", "encryptionKey", "bucketKeyEnabled", "blockPublicAccess", "enforceSSL",
      "lifecycleRules", "eventBridgeEnabled", "publicReadAccess", "cors", "objectOwnership", "accessControl", "serverAccessLogsBucket", "serverAccessLogsPrefix",
      "intelligentTieringConfigurations", "metrics", "notificationsHandlerRole", "minimumTLSVersion", "transferAcceleration", "websiteIndexDocument",
      "websiteErrorDocument", "inventories", "objectLockEnabled", "objectLockDefaultRetention", "notificationsSkipDestinationValidation", "transitionDefaultMinimumObjectSize",
    ],
  },
  "dynamodb.Table": {
    cls: "Table", propsType: "TableProps", scoped: true, required: ["partitionKey"],
    props: [
      "partitionKey", "sortKey", "billingMode", "readCapacity", "writeCapacity", "removalPolicy", "pointInTimeRecovery", "pointInTimeRecoverySpecification",
      "timeToLiveAttribute", "stream", "tableName", "encryption", "encryptionKey", "tableClass", "deletionProtection", "contributorInsightsEnabled",
      "contributorInsightsSpecification", "kinesisStream", "replicationRegions", "replicationTimeout", "waitForReplicationToFinish", "maxReadRequestUnits",
      "maxWriteRequestUnits", "warmThroughput", "resourcePolicy", "importSource",
    ],
  },
  "lambda.Function": {
    cls: "Function", propsType: "FunctionProps", scoped: true, required: ["runtime", "handler", "code"],
    props: [
      "runtime", "handler", "code", "functionName", "timeout", "memorySize", "environment", "description", "role", "layers", "architecture", "tracing",
      "logRetention", "logGroup", "reservedConcurrentExecutions", "deadLetterQueue", "deadLetterQueueEnabled", "vpc", "vpcSubnets", "securityGroups",
      "ephemeralStorageSize", "initialPolicy", "events", "retryAttempts", "onFailure", "onSuccess", "maxEventAge", "allowPublicSubnet", "environmentEncryption",
      "currentVersionOptions", "filesystem", "insightsVersion", "loggingFormat", "applicationLogLevelV2", "systemLogLevelV2", "runtimeManagementMode", "snapStart",
      "paramsAndSecrets", "recursiveLoop", "adotInstrumentation",
    ],
  },
  "apigateway.RestApi": {
    cls: "RestApi", propsType: "RestApiProps", scoped: true, required: [],
    props: [
      "restApiName", "description", "deploy", "deployOptions", "defaultCorsPreflightOptions", "defaultIntegration", "defaultMethodOptions", "endpointTypes",
      "cloudWatchRole", "binaryMediaTypes", "apiKeySourceType", "policy", "failOnWarnings", "retainDeployments", "minCompressionSize", "endpointConfiguration",
      "disableExecuteApiEndpoint", "parameters", "restApiId", "cloudWatchRoleRemovalPolicy", "domainName",
    ],
  },
  "apigateway.LambdaRestApi": {
    cls: "LambdaRestApi", propsType: "LambdaRestApiProps", scoped: true, required: ["handler"],
    props: [
      "handler", "proxy", "integrationOptions", "restApiName", "description", "deploy", "deployOptions", "defaultCorsPreflightOptions", "defaultIntegration",
      "defaultMethodOptions", "endpointTypes", "cloudWatchRole", "binaryMediaTypes", "apiKeySourceType", "policy", "failOnWarnings", "retainDeployments",
      "minCompressionSize", "endpointConfiguration", "disableExecuteApiEndpoint", "parameters", "restApiId", "cloudWatchRoleRemovalPolicy", "domainName",
    ],
  },
  "core.CfnOutput": { cls: "CfnOutput", propsType: "CfnOutputProps", scoped: true, required: ["value"], props: ["value", "description", "exportName", "condition"] },
  "iam.PolicyStatement": {
    cls: "PolicyStatement", propsType: "PolicyStatementProps", scoped: false, required: [],
    props: ["actions", "resources", "effect", "principals", "conditions", "sid", "notActions", "notResources", "notPrincipals"],
  },
};

/** Which enum a construct property expects, for "not assignable" messages. */
export const PROP_ENUMS: Record<string, Record<string, string>> = {
  "s3.Bucket": { removalPolicy: "core.RemovalPolicy", encryption: "s3.BucketEncryption" },
  "dynamodb.Table": { removalPolicy: "core.RemovalPolicy", billingMode: "dynamodb.BillingMode" },
  "iam.PolicyStatement": { effect: "iam.Effect" },
};

export const norm = (s: string) => s.replace(/_/g, "").toLowerCase();

/** `removal_policy` / `removalPolicy` / `RemovalPolicy` → the canonical property name from `names`, if any. */
export function canon(names: string[], key: string): string | undefined {
  return names.find((n) => norm(n) === norm(key));
}

export const camel = (s: string) => (s.includes("_") && s === s.toLowerCase() ? s.replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase()) : s);
export const snake = (s: string) =>
  s
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1_$2")
    .toLowerCase();

/** `aws-cdk-lib/aws-s3` and `aws_cdk.aws_s3` → "s3"; `aws-cdk-lib` / `aws_cdk` → "core"; `constructs` → "constructs"; otherwise null. */
export function moduleKey(spec: string): string | null {
  if (spec === "aws-cdk-lib" || spec === "aws_cdk") return "core";
  if (spec === "constructs") return "constructs";
  const m = /^(?:aws-cdk-lib\/|aws_cdk\.)(.+)$/.exec(spec);
  return m ? moduleName(m[1]) : null;
}

/** "aws_s3" / "aws-s3-notifications" → "s3" / "s3notifications"; "assertions" stays. */
export const moduleName = (s: string) => s.replace(/^aws[-_]/, "").replace(/[-_]/g, "").toLowerCase();

export const isModuleName = (name: string) => name.startsWith("aws_") || name === "assertions" || name === "pipelines";

/** NODEJS_22_X → nodejs22.x, PYTHON_3_13 → python3.13, … */
export function runtimeId(name: string): string {
  let m = /^NODEJS_(\d+)_X$/.exec(name);
  if (m) return `nodejs${m[1]}.x`;
  m = /^PYTHON_(\d+)_(\d+)$/.exec(name);
  if (m) return `python${m[1]}.${m[2]}`;
  m = /^PROVIDED_(AL\d+)$/.exec(name);
  if (m) return `provided.${m[1].toLowerCase()}`;
  return name.toLowerCase().replace(/_/g, "");
}

export const BUCKET_READ = ["s3:GetObject*", "s3:GetBucket*", "s3:List*"];
export const BUCKET_PUT = ["s3:PutObject", "s3:PutObjectLegalHold", "s3:PutObjectRetention", "s3:PutObjectTagging", "s3:PutObjectVersionTagging", "s3:Abort*"];
export const BUCKET_WRITE = ["s3:DeleteObject*", ...BUCKET_PUT];
export const TABLE_READ = ["dynamodb:BatchGetItem", "dynamodb:GetRecords", "dynamodb:GetShardIterator", "dynamodb:Query", "dynamodb:GetItem", "dynamodb:Scan", "dynamodb:ConditionCheckItem", "dynamodb:DescribeTable"];
export const TABLE_WRITE = ["dynamodb:BatchWriteItem", "dynamodb:PutItem", "dynamodb:UpdateItem", "dynamodb:DeleteItem", "dynamodb:DescribeTable"];
