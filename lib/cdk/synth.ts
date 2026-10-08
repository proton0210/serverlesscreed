/**
 * Turns the constructs of one simulated stack into the CloudFormation template `cdk synth` would write
 * (the resource types, properties and logical IDs are modelled on aws-cdk-lib; hashes of asset zips are placeholders),
 * and implements the matching used by the assertions module. Keep this file free of path aliases and JSX.
 */
import { createHash } from "node:crypto";
import { runtimeId } from "./catalog.ts";
import { Cons, Dur, Matcher, PathVal, Tok, ValueObj, isRec } from "./model.ts";
import type { IamStatement, Rec } from "./model.ts";

export type Template = { Resources: Record<string, Rec>; Outputs?: Record<string, Rec> };

export const marker = (id: number) => `\u0001${id}\u0002`;
const MARK_RE = /\u0001(\d+)\u0002/g;
const md5 = (s: string) => createHash("md5").update(s).digest("hex");
const clean = (s: string) => s.replace(/[^A-Za-z0-9]/g, "");

/** The logical ID CloudFormation sees for a construct path (aws-cdk-lib `makeUniqueId`). */
export function logicalId(components: string[]): string {
  const parts = components.filter((c) => c !== "Default");
  if (parts.length === 1) {
    const only = clean(parts[0]);
    if (only.length <= 255) return only;
  }
  const hash = md5(parts.join("/")).slice(0, 8).toUpperCase();
  const deduped: string[] = [];
  for (const p of parts) if (!deduped.length || !deduped[deduped.length - 1].endsWith(p)) deduped.push(p);
  const human = deduped.filter((p) => p !== "Resource").map(clean).join("").slice(0, 240);
  return human + hash;
}

const oneOrMany = <T,>(items: T[]): T | T[] => (items.length === 1 ? items[0] : items);
const ref = (id: string) => ({ Ref: id });
const getAtt = (id: string, attr: string) => ({ "Fn::GetAtt": [id, attr] });
const join = (...parts: unknown[]) => ({ "Fn::Join": ["", parts] });
const policyVersion = "2012-10-17";

const PROVIDER_ROLE = logicalId(["Custom::S3AutoDeleteObjectsCustomResourceProvider", "Role"]);
const PROVIDER_FN = logicalId(["Custom::S3AutoDeleteObjectsCustomResourceProvider", "Handler"]);
const NOTIFY = "BucketNotificationsHandler050a0587b7544547bf325f094a3db834";
const NOTIFY_ROLE = logicalId([NOTIFY, "Role", "Resource"]);
const NOTIFY_POLICY = logicalId([NOTIFY, "Role", "DefaultPolicy", "Resource"]);
const NOTIFY_FN = logicalId([NOTIFY, "Resource"]);

const removal = (v: unknown, fallback: string) => {
  const p = v instanceof PathVal ? v.path.split(".").pop() : undefined;
  return p === "DESTROY" ? "Delete" : p === "SNAPSHOT" ? "Snapshot" : p === "RETAIN" ? "Retain" : p === "RETAIN_ON_UPDATE_OR_DELETE" ? "RetainExceptOnCreate" : fallback;
};

const leaf = (v: unknown) => (v instanceof PathVal ? v.path.split(".").pop() ?? "" : "");

export class Synth {
  stack: Cons;
  tokens: Tok[];
  res: Record<string, Rec> = {};
  out: Record<string, Rec> = {};
  constructor(stack: Cons, tokens: Tok[]) {
    this.stack = stack;
    this.tokens = tokens;
  }

  /** CloudFormation logical ID of the main resource behind an L2 construct. */
  primary(c: Cons): string {
    return logicalId([...c.path(), "Resource"]);
  }

  intrinsic(t: Tok): unknown {
    const c = t.cons;
    if (!c) return ref("AWS::NoValue");
    const id = c.imported ? "" : this.primary(c);
    switch (`${c.type}.${t.attr}`) {
      case "s3.Bucket.bucketName": return c.imported ? c.props.bucketName : ref(id);
      case "s3.Bucket.bucketArn": return c.imported ? `arn:aws:s3:::${String(c.props.bucketName)}` : getAtt(id, "Arn");
      case "s3.Bucket.bucketDomainName": return getAtt(id, "DomainName");
      case "s3.Bucket.bucketWebsiteUrl": return getAtt(id, "WebsiteURL");
      case "dynamodb.Table.tableName": return ref(id);
      case "dynamodb.Table.tableArn": return getAtt(id, "Arn");
      case "dynamodb.Table.tableStreamArn": return getAtt(id, "StreamArn");
      case "dynamodb.Table.indexArn": return c.indexes.length ? join(getAtt(id, "Arn"), "/index/*") : ref("AWS::NoValue");
      case "lambda.Function.functionName": return ref(id);
      case "lambda.Function.functionArn": return getAtt(id, "Arn");
      case "apigateway.RestApi.restApiId":
      case "apigateway.LambdaRestApi.restApiId": return ref(id);
      case "apigateway.RestApi.url":
      case "apigateway.LambdaRestApi.url": {
        const stage = this.stageName(c);
        return join("https://", ref(id), ".execute-api.", ref("AWS::Region"), ".", ref("AWS::URLSuffix"), "/", ref(logicalId([...c.path(), `DeploymentStage.${stage}`, "Resource"])), "/");
      }
      case "core.Stack.stackName": return ref("AWS::StackName");
      case "core.Stack.region": return ref("AWS::Region");
      case "core.Stack.account": return ref("AWS::AccountId");
      case "core.Stack.stackId": return ref("AWS::StackId");
      default: return ref("AWS::NoValue");
    }
  }

  resolve(v: unknown): unknown {
    if (v instanceof Tok) return this.intrinsic(v);
    if (typeof v === "string") return this.resolveString(v);
    if (v instanceof Dur) return v.seconds;
    if (v instanceof PathVal) return v.path.split(".").pop();
    if (Array.isArray(v)) return v.map((x) => this.resolve(x));
    if (isRec(v)) return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, this.resolve(x)]));
    return v;
  }

  resolveString(s: string): unknown {
    if (!s.includes("\u0001")) return s;
    const parts: unknown[] = [];
    let last = 0;
    for (const m of s.matchAll(MARK_RE)) {
      if (m.index! > last) parts.push(s.slice(last, m.index));
      parts.push(this.intrinsic(this.tokens[Number(m[1])]));
      last = m.index! + m[0].length;
    }
    if (last < s.length) parts.push(s.slice(last));
    return parts.length === 1 && typeof parts[0] !== "string" ? parts[0] : join(...parts);
  }

  stageName(api: Cons): string {
    const o = api.props.deployOptions;
    return isRec(o) && typeof o.stageName === "string" ? o.stageName : "prod";
  }

  tagsFor(c: Cons): { Key: string; Value: unknown }[] | undefined {
    const merged = new Map<string, unknown>();
    const chain: Cons[] = [];
    for (let x: Cons | null = c; x; x = x.parent) chain.unshift(x);
    for (const x of chain) {
      if (x.type === "core.Stack" && isRec(x.props.tags)) for (const [k, v] of Object.entries(x.props.tags)) merged.set(k, v);
      for (const [k, v] of x.tags) merged.set(k, v);
    }
    if (!merged.size) return undefined;
    return [...merged.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([Key, Value]) => ({ Key, Value: this.resolve(Value) }));
  }

  add(id: string, type: string, owner: Cons | null, pathSegments: string[], props: Rec | undefined, extra: Rec = {}) {
    this.res[id] = {
      Type: type,
      ...(props && Object.keys(props).length ? { Properties: props } : {}),
      ...extra,
      Metadata: { "aws:cdk:path": [this.stack.stackName, ...pathSegments].join("/") },
    };
    void owner;
  }

  run(): Template {
    const handlers = { providerNeeded: false, notifyNeeded: false };
    for (const c of this.stack.descendants()) {
      if (c.imported) continue;
      switch (c.type) {
        case "s3.Bucket": this.bucket(c, handlers); break;
        case "dynamodb.Table": this.table(c); break;
        case "lambda.Function": this.fn(c); break;
        case "apigateway.RestApi":
        case "apigateway.LambdaRestApi": this.api(c); break;
        case "core.CfnOutput": this.output(c); break;
      }
    }
    if (handlers.providerNeeded) this.provider();
    if (handlers.notifyNeeded) this.notifyHandler();
    const t: Template = { Resources: this.res };
    if (Object.keys(this.out).length) t.Outputs = this.out;
    return t;
  }

  bucket(c: Cons, h: { providerNeeded: boolean; notifyNeeded: boolean }) {
    const p = c.path();
    const id = this.primary(c);
    const pr = c.props;
    const props: Rec = {};
    if (typeof pr.bucketName === "string" || pr.bucketName instanceof Tok) props.BucketName = this.resolve(pr.bucketName);
    const enc = leaf(pr.encryption);
    if (enc === "S3_MANAGED") props.BucketEncryption = { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: "AES256" } }] };
    if (enc === "KMS_MANAGED") props.BucketEncryption = { ServerSideEncryptionConfiguration: [{ ServerSideEncryptionByDefault: { SSEAlgorithm: "aws:kms" } }] };
    if (pr.eventBridgeEnabled === true) props.NotificationConfiguration = { EventBridgeConfiguration: { EventBridgeEnabled: true } };
    const bpa = leaf(pr.blockPublicAccess);
    if (bpa === "BLOCK_ALL") props.PublicAccessBlockConfiguration = { BlockPublicAcls: true, BlockPublicPolicy: true, IgnorePublicAcls: true, RestrictPublicBuckets: true };
    if (bpa === "BLOCK_ACLS" || bpa === "BLOCK_ACLS_ONLY") props.PublicAccessBlockConfiguration = { BlockPublicAcls: true, IgnorePublicAcls: true };
    const bucketTags = [...(this.tagsFor(c) ?? []), ...(pr.autoDeleteObjects === true ? [{ Key: "aws-cdk:auto-delete-objects", Value: "true" }] : [])];
    if (bucketTags.length) props.Tags = bucketTags.sort((x, y) => (x.Key < y.Key ? -1 : 1));
    if (pr.versioned === true) props.VersioningConfiguration = { Status: "Enabled" };
    const policy = removal(pr.removalPolicy, "Retain");
    this.add(id, "AWS::S3::Bucket", c, [...p, "Resource"], props, { UpdateReplacePolicy: policy, DeletionPolicy: policy });

    const arn = getAtt(id, "Arn");
    const statements: Rec[] = [];
    if (pr.enforceSSL === true) {
      statements.push({
        Action: "s3:*",
        Condition: { Bool: { "aws:SecureTransport": "false" } },
        Effect: "Deny",
        Principal: { AWS: "*" },
        Resource: [arn, join(arn, "/*")],
      });
    }
    const auto = pr.autoDeleteObjects === true;
    if (auto) {
      h.providerNeeded = true;
      statements.push({
        Action: ["s3:PutBucketPolicy", "s3:GetBucket*", "s3:List*", "s3:DeleteObject*"],
        Effect: "Allow",
        Principal: { AWS: getAtt(PROVIDER_ROLE, "Arn") },
        Resource: [arn, join(arn, "/*")],
      });
    }
    let policyId: string | null = null;
    if (statements.length) {
      policyId = logicalId([...p, "Policy", "Resource"]);
      this.add(policyId, "AWS::S3::BucketPolicy", c, [...p, "Policy", "Resource"], { Bucket: ref(id), PolicyDocument: { Statement: statements, Version: policyVersion } });
    }
    if (auto) {
      const aid = logicalId([...p, "AutoDeleteObjectsCustomResource", "Default"]);
      this.add(aid, "Custom::S3AutoDeleteObjects", c, [...p, "AutoDeleteObjectsCustomResource", "Default"], { ServiceToken: getAtt(PROVIDER_FN, "Arn"), BucketName: ref(id) }, {
        DependsOn: [policyId],
        UpdateReplacePolicy: "Delete",
        DeletionPolicy: "Delete",
      });
    }
    if (c.notifications.length) {
      h.notifyNeeded = true;
      const perms: string[] = [];
      const configs: Rec[] = [];
      for (const n of c.notifications) {
        const fnId = this.primary(n.dest);
        const permId = logicalId([...p, `AllowBucketNotificationsTo${this.stack.stackName}${fnId}`]);
        perms.push(permId);
        this.add(permId, "AWS::Lambda::Permission", c, [...p, `AllowBucketNotificationsTo${this.stack.stackName}${fnId}`], {
          Action: "lambda:InvokeFunction",
          FunctionName: getAtt(fnId, "Arn"),
          Principal: "s3.amazonaws.com",
          SourceAccount: ref("AWS::AccountId"),
          SourceArn: arn,
        });
        const rules = [n.prefix !== undefined && { Name: "prefix", Value: n.prefix }, n.suffix !== undefined && { Name: "suffix", Value: n.suffix }].filter(Boolean);
        configs.push({ Events: n.events, ...(rules.length ? { Filter: { Key: { FilterRules: rules } } } : {}), LambdaFunctionArn: getAtt(fnId, "Arn") });
      }
      const nid = logicalId([...p, "Notifications", "Resource"]);
      this.add(nid, "Custom::S3BucketNotifications", c, [...p, "Notifications", "Resource"], {
        ServiceToken: getAtt(NOTIFY_FN, "Arn"),
        BucketName: ref(id),
        NotificationConfiguration: { LambdaFunctionConfigurations: configs },
        Managed: true,
      }, { DependsOn: perms });
    }
  }

  table(c: Cons) {
    const p = c.path();
    const id = this.primary(c);
    const pr = c.props;
    const typeCode = (a: unknown) => ({ STRING: "S", NUMBER: "N", BINARY: "B" })[leaf(isRec(a) ? a.type : undefined)] ?? "S";
    const name = (a: unknown) => (isRec(a) ? a.name : undefined);
    const keys: Rec[] = [{ AttributeName: name(pr.partitionKey), KeyType: "HASH" }];
    const attrs = new Map<string, string>([[String(name(pr.partitionKey)), typeCode(pr.partitionKey)]]);
    if (pr.sortKey) {
      keys.push({ AttributeName: name(pr.sortKey), KeyType: "RANGE" });
      attrs.set(String(name(pr.sortKey)), typeCode(pr.sortKey));
    }
    const payPerRequest = leaf(pr.billingMode) === "PAY_PER_REQUEST";
    const throughput = () => ({ ReadCapacityUnits: typeof pr.readCapacity === "number" ? pr.readCapacity : 5, WriteCapacityUnits: typeof pr.writeCapacity === "number" ? pr.writeCapacity : 5 });
    const gsis = c.indexes.map((g) => {
      attrs.set(String(name(g.partitionKey)), typeCode(g.partitionKey));
      const gk: Rec[] = [{ AttributeName: name(g.partitionKey), KeyType: "HASH" }];
      if (g.sortKey) {
        attrs.set(String(name(g.sortKey)), typeCode(g.sortKey));
        gk.push({ AttributeName: name(g.sortKey), KeyType: "RANGE" });
      }
      const projection = leaf(g.projectionType) || "ALL";
      return { IndexName: g.indexName, KeySchema: gk, Projection: { ProjectionType: projection, ...(projection === "INCLUDE" ? { NonKeyAttributes: g.nonKeyAttributes } : {}) }, ...(payPerRequest ? {} : { ProvisionedThroughput: throughput() }) };
    });
    const props: Rec = {
      AttributeDefinitions: [...attrs.entries()].map(([AttributeName, AttributeType]) => ({ AttributeName, AttributeType })),
      ...(payPerRequest ? { BillingMode: "PAY_PER_REQUEST" } : { ProvisionedThroughput: throughput() }),
      ...(gsis.length ? { GlobalSecondaryIndexes: gsis } : {}),
      KeySchema: keys,
    };
    const pitr = pr.pointInTimeRecovery === true || (isRec(pr.pointInTimeRecoverySpecification) && pr.pointInTimeRecoverySpecification.pointInTimeRecoveryEnabled === true);
    if (pitr) props.PointInTimeRecoverySpecification = { PointInTimeRecoveryEnabled: true };
    if (typeof pr.tableName === "string") props.TableName = pr.tableName;
    const tags = this.tagsFor(c);
    if (tags) props.Tags = tags;
    if (typeof pr.timeToLiveAttribute === "string") props.TimeToLiveSpecification = { AttributeName: pr.timeToLiveAttribute, Enabled: true };
    if (pr.deletionProtection === true) props.DeletionProtectionEnabled = true;
    if (pr.stream) props.StreamSpecification = { StreamViewType: leaf(pr.stream) };
    const policy = removal(pr.removalPolicy, "Retain");
    this.add(id, "AWS::DynamoDB::Table", c, [...p, "Resource"], props, { UpdateReplacePolicy: policy, DeletionPolicy: policy });
  }

  fn(c: Cons) {
    const p = c.path();
    const id = this.primary(c);
    const roleId = logicalId([...p, "ServiceRole", "Resource"]);
    const policyId = logicalId([...p, "ServiceRole", "DefaultPolicy", "Resource"]);
    const pr = c.props;
    const tags = this.tagsFor(c);
    this.add(roleId, "AWS::IAM::Role", c, [...p, "ServiceRole", "Resource"], {
      AssumeRolePolicyDocument: { Statement: [{ Action: "sts:AssumeRole", Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" } }], Version: policyVersion },
      ManagedPolicyArns: [join("arn:", ref("AWS::Partition"), ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole")],
      ...(tags ? { Tags: tags } : {}),
    });
    const statements = this.statementsFor(c);
    if (statements.length) {
      this.add(policyId, "AWS::IAM::Policy", c, [...p, "ServiceRole", "DefaultPolicy", "Resource"], {
        PolicyDocument: { Statement: statements, Version: policyVersion },
        PolicyName: policyId,
        Roles: [ref(roleId)],
      });
    }
    const code = pr.code instanceof ValueObj ? pr.code : null;
    const codeProps: Rec = code?.type === "lambda.Code.fromInline"
      ? { ZipFile: code.props.source }
      : { S3Bucket: { "Fn::Sub": "cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}" }, S3Key: `${createHash("sha256").update(String(code?.props.path ?? "")).digest("hex")}.zip` };
    const env = { ...(isRec(pr.environment) ? pr.environment : {}), ...c.envAdds };
    const props: Rec = {
      Code: codeProps,
      ...(typeof pr.description === "string" ? { Description: pr.description } : {}),
      ...(Object.keys(env).length ? { Environment: { Variables: this.resolve(env) } } : {}),
      ...(typeof pr.functionName === "string" ? { FunctionName: pr.functionName } : {}),
      Handler: pr.handler,
      ...(typeof pr.memorySize === "number" ? { MemorySize: pr.memorySize } : {}),
      Role: getAtt(roleId, "Arn"),
      Runtime: pr.runtime instanceof PathVal ? runtimeId(leaf(pr.runtime)) : undefined,
      ...(tags ? { Tags: tags } : {}),
      ...(pr.timeout instanceof Dur ? { Timeout: pr.timeout.seconds } : {}),
    };
    this.add(id, "AWS::Lambda::Function", c, [...p, "Resource"], props, { DependsOn: statements.length ? [policyId, roleId] : [roleId] });
  }

  /** The grants and addToRolePolicy calls made on a function, as policy statements. */
  statementsFor(c: Cons): Rec[] {
    const seen = new Set<string>();
    const out: Rec[] = [];
    for (const s of c.statements) {
      const body: Rec = {
        Action: oneOrMany(s.actions),
        ...(s.conditions ? { Condition: this.resolve(s.conditions) } : {}),
        Effect: s.effect,
        Resource: oneOrMany(s.resources.map((r) => this.resolve(r))),
      };
      const key = JSON.stringify(body);
      if (!seen.has(key)) {
        seen.add(key);
        out.push(body);
      }
    }
    return out;
  }

  api(c: Cons) {
    const p = c.path();
    const id = this.primary(c);
    const pr = c.props;
    this.add(id, "AWS::ApiGateway::RestApi", c, [...p, "Resource"], { Name: typeof pr.restApiName === "string" ? pr.restApiName : c.id });
    const resourceId = (segs: string[]) => logicalId([...p, "Default", ...segs, "Resource"]);
    const parentRef = (segs: string[]) => (segs.length ? ref(resourceId(segs)) : getAtt(id, "RootResourceId"));
    const all: string[][] = [];
    for (const segs of c.apiResources) for (let i = 1; i <= segs.length; i++) if (!all.some((a) => a.join("/") === segs.slice(0, i).join("/"))) all.push(segs.slice(0, i));
    for (const segs of all) {
      this.add(resourceId(segs), "AWS::ApiGateway::Resource", c, [...p, "Default", ...segs, "Resource"], {
        ParentId: parentRef(segs.slice(0, -1)),
        PathPart: segs[segs.length - 1],
        RestApiId: ref(id),
      });
    }
    const methodIds: string[] = [];
    const stage = this.stageName(c);
    for (const m of c.apiMethods) {
      const mid = logicalId([...p, "Default", ...m.path, m.method, "Resource"]);
      methodIds.push(mid);
      const handler = m.integration instanceof ValueObj && m.integration.props.handler instanceof Cons ? m.integration.props.handler : null;
      const fnId = handler ? this.primary(handler) : "";
      this.add(mid, "AWS::ApiGateway::Method", c, [...p, "Default", ...m.path, m.method, "Resource"], {
        AuthorizationType: "NONE",
        HttpMethod: m.method,
        Integration: {
          IntegrationHttpMethod: "POST",
          Type: "AWS_PROXY",
          Uri: join("arn:", ref("AWS::Partition"), ":apigateway:", ref("AWS::Region"), ":lambda:path/2015-03-31/functions/", getAtt(fnId, "Arn"), "/invocations"),
        },
        ResourceId: parentRef(m.path),
        RestApiId: ref(id),
      });
      const shown = m.path.join("/") || "";
      for (const [suffix, stageArn] of [["", stage], [".Test", "test-invoke-stage"]] as const) {
        const segName = `ApiPermission${suffix}.${this.stack.stackName}${id}.${m.method}..${shown}`;
        this.add(logicalId([...p, "Default", ...m.path, m.method, segName]), "AWS::Lambda::Permission", c, [...p, "Default", ...m.path, m.method, segName], {
          Action: "lambda:InvokeFunction",
          FunctionName: getAtt(fnId, "Arn"),
          Principal: "apigateway.amazonaws.com",
          SourceArn: join("arn:", ref("AWS::Partition"), ":execute-api:", ref("AWS::Region"), ":", ref("AWS::AccountId"), ":", ref(id), "/", suffix === "" ? ref(logicalId([...p, `DeploymentStage.${stage}`, "Resource"])) : stageArn, `/${m.method}/${shown.replace(/\{[^}]*\}/g, "*")}`),
        });
      }
    }
    const dep = logicalId([...p, "Deployment", "Resource"]);
    this.add(dep, "AWS::ApiGateway::Deployment", c, [...p, "Deployment", "Resource"], { Description: "Automatically created by the RestApi construct", RestApiId: ref(id) }, { DependsOn: methodIds });
    const stageSeg = `DeploymentStage.${stage}`;
    this.add(logicalId([...p, stageSeg, "Resource"]), "AWS::ApiGateway::Stage", c, [...p, stageSeg, "Resource"], { DeploymentId: ref(dep), RestApiId: ref(id), StageName: stage });
  }

  output(c: Cons) {
    const pr = c.props;
    const id = logicalId(c.path());
    this.out[id] = {
      ...(typeof pr.description === "string" ? { Description: pr.description } : {}),
      Value: this.resolve(pr.value),
      ...(typeof pr.exportName === "string" ? { Export: { Name: pr.exportName } } : {}),
    };
  }

  provider() {
    this.add(PROVIDER_ROLE, "AWS::IAM::Role", null, ["Custom::S3AutoDeleteObjectsCustomResourceProvider", "Role"], {
      AssumeRolePolicyDocument: { Statement: [{ Action: "sts:AssumeRole", Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" } }], Version: policyVersion },
      ManagedPolicyArns: [{ "Fn::Sub": "arn:${AWS::Partition}:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole" }],
    });
    this.add(PROVIDER_FN, "AWS::Lambda::Function", null, ["Custom::S3AutoDeleteObjectsCustomResourceProvider", "Handler"], {
      Code: { S3Bucket: { "Fn::Sub": "cdk-hnb659fds-assets-${AWS::AccountId}-${AWS::Region}" }, S3Key: "<asset-hash>.zip" },
      Description: "Lambda function for auto-deleting objects in your buckets",
      Handler: "index.handler",
      MemorySize: 128,
      Role: getAtt(PROVIDER_ROLE, "Arn"),
      Runtime: "nodejs22.x",
      Timeout: 900,
    }, { DependsOn: [PROVIDER_ROLE] });
  }

  notifyHandler() {
    this.add(NOTIFY_ROLE, "AWS::IAM::Role", null, [NOTIFY, "Role", "Resource"], {
      AssumeRolePolicyDocument: { Statement: [{ Action: "sts:AssumeRole", Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" } }], Version: policyVersion },
      ManagedPolicyArns: [join("arn:", ref("AWS::Partition"), ":iam::aws:policy/service-role/AWSLambdaBasicExecutionRole")],
    });
    this.add(NOTIFY_POLICY, "AWS::IAM::Policy", null, [NOTIFY, "Role", "DefaultPolicy", "Resource"], {
      PolicyDocument: { Statement: [{ Action: "s3:PutBucketNotification", Effect: "Allow", Resource: "*" }], Version: policyVersion },
      PolicyName: NOTIFY_POLICY,
      Roles: [ref(NOTIFY_ROLE)],
    });
    this.add(NOTIFY_FN, "AWS::Lambda::Function", null, [NOTIFY, "Resource"], {
      Description: 'AWS CloudFormation handler for "Custom::S3BucketNotifications" resources (@aws-cdk/aws-s3)',
      Handler: "index.handler",
      Role: getAtt(NOTIFY_ROLE, "Arn"),
      Runtime: "python3.13",
      Timeout: 300,
    }, { DependsOn: [NOTIFY_POLICY, NOTIFY_ROLE] });
  }
}

export function synthesize(stack: Cons, tokens: Tok[]): Template {
  return new Synth(stack, tokens).run();
}

/** Counts per CloudFormation type, e.g. { "AWS::S3::Bucket": 1 }. */
export function countByType(t: Template): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of Object.values(t.Resources)) out[String(r.Type)] = (out[String(r.Type)] ?? 0) + 1;
  return out;
}

export const statementOf = (s: IamStatement) => s;

/* ── assertions-module matching ─────────────────────────────────────────────── */

const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));
const kind = (v: unknown) => (Array.isArray(v) ? "array" : v === null ? "null" : typeof v);

/** Matches like `Match.objectLike`: objects are partial (recursively), arrays and values must be equal. */
export function matches(actual: unknown, exp: unknown, path: string, out: string[]): boolean {
  if (exp instanceof Matcher) {
    switch (exp.kind) {
      case "anyValue":
        if (actual === undefined || actual === null) {
          out.push(`Expected a value but found none at ${path} (using anyValue matcher)`);
          return false;
        }
        return true;
      case "absent":
        if (actual !== undefined) {
          out.push(`Key should be absent at ${path} (using absent matcher)`);
          return false;
        }
        return true;
      case "objectLike":
        return matches(actual, exp.arg, path, out);
      case "exact":
        if (JSON.stringify(actual) !== JSON.stringify(exp.arg)) {
          out.push(`Expected ${show(exp.arg)} but received ${show(actual)} at ${path} (using exact matcher)`);
          return false;
        }
        return true;
      case "arrayWith": {
        const want = Array.isArray(exp.arg) ? exp.arg : [];
        if (!Array.isArray(actual)) {
          out.push(`Expected type array but received ${kind(actual)} at ${path} (using arrayWith matcher)`);
          return false;
        }
        let at = 0;
        for (const w of want) {
          let found = false;
          while (at < actual.length && !found) found = matches(actual[at++], w, path, []);
          if (!found) {
            out.push(`Could not match arrayWith pattern ${want.indexOf(w)} at ${path}`);
            return false;
          }
        }
        return true;
      }
      case "stringLikeRegexp":
        if (typeof actual !== "string" || !new RegExp(String(exp.arg)).test(actual)) {
          out.push(`Expected a string matching /${String(exp.arg)}/ but received ${show(actual)} at ${path}`);
          return false;
        }
        return true;
      default:
        return true;
    }
  }
  if (isRec(exp)) {
    if (!isRec(actual)) {
      out.push(`Expected type object but received ${kind(actual)} at ${path} (using objectLike matcher)`);
      return false;
    }
    let ok = true;
    for (const [k, v] of Object.entries(exp)) {
      if (!(k in actual)) {
        if (v instanceof Matcher && v.kind === "absent") continue;
        out.push(`Missing key at ${path}/${k} (using objectLike matcher)`);
        ok = false;
        continue;
      }
      ok = matches(actual[k], v, `${path}/${k}`, out) && ok;
    }
    return ok;
  }
  if (Array.isArray(exp)) {
    if (!Array.isArray(actual)) {
      out.push(`Expected type array but received ${kind(actual)} at ${path} (using objectLike matcher)`);
      return false;
    }
    if (actual.length !== exp.length) {
      out.push(`Expected array of length ${exp.length} but received ${actual.length} at ${path} (using objectLike matcher)`);
      return false;
    }
    let ok = true;
    exp.forEach((e, i) => {
      ok = matches(actual[i], e, `${path}/${i}`, out) && ok;
    });
    return ok;
  }
  if (actual !== exp) {
    out.push(`Expected ${show(exp)} but received ${show(actual)} at ${path} (using objectLike matcher)`);
    return false;
  }
  return true;
}

export function resourcesOf(t: Template, type: string): [string, Rec][] {
  return Object.entries(t.Resources).filter(([, r]) => r.Type === type);
}
