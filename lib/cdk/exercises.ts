/**
 * Learn CDK practice tasks, each in TypeScript and Python. Plain strings (no JSX, no imports) so
 * scripts/check-cdk-unit.mjs can read them: every starter must fail the checker and every solution must pass.
 * `brief` and `goal` support `inline code` in backticks.
 */
export type CdkCode = { problemCode: string; solutionCode: string };
export type CdkExercise = {
  brief: string;
  goal: string;
  typescript: CdkCode;
  python: CdkCode;
};

/* ── shared building blocks ─────────────────────────────────────────────── */

const TS_HEAD = (mods: string[] = []) =>
  [
    'import * as cdk from "aws-cdk-lib";',
    ...mods.map((m) => ({
      s3: 'import * as s3 from "aws-cdk-lib/aws-s3";',
      dynamodb: 'import * as dynamodb from "aws-cdk-lib/aws-dynamodb";',
      lambda: 'import * as lambda from "aws-cdk-lib/aws-lambda";',
      iam: 'import * as iam from "aws-cdk-lib/aws-iam";',
      apigw: 'import * as apigw from "aws-cdk-lib/aws-apigateway";',
      s3n: 'import * as s3n from "aws-cdk-lib/aws-s3-notifications";',
      assertions: 'import { Template } from "aws-cdk-lib/assertions";',
    })[m]),
    'import { Construct } from "constructs";',
  ].join("\n");

const PY_HEAD = (mods: string[] = []) =>
  [
    "import aws_cdk as cdk",
    ...mods.map((m) => ({
      s3: "from aws_cdk import aws_s3 as s3",
      dynamodb: "from aws_cdk import aws_dynamodb as dynamodb",
      lambda: "from aws_cdk import aws_lambda as lambda_",
      iam: "from aws_cdk import aws_iam as iam",
      apigw: "from aws_cdk import aws_apigateway as apigw",
      s3n: "from aws_cdk import aws_s3_notifications as s3n",
      assertions: "from aws_cdk import assertions",
    })[m]),
    "from constructs import Construct",
  ].join("\n");

/** The Stack class around a constructor body (already indented by four spaces in TypeScript, eight in Python). */
const TS_STACK = (body: string, tail = 'const app = new cdk.App();\nnew PokedexStack(app, "PokedexStack");') => `export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
${body}
  }
}

${tail}
`;

const PY_STACK = (body: string, tail = 'app = cdk.App()\nPokedexStack(app, "PokedexStack")\napp.synth()') => `class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
${body}


${tail}
`;

const TS_TABLE = `    const table = new dynamodb.Table(this, "PokedexTable", {
      partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "formId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });`;
const PY_TABLE = `        table = dynamodb.Table(
            self, "PokedexTable",
            partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.NUMBER),
            sort_key=dynamodb.Attribute(name="formId", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
        )`;

const TS_BUCKET = `    const bucket = new s3.Bucket(this, "CardsBucket", {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });`;
const PY_BUCKET = `        bucket = s3.Bucket(
            self, "CardsBucket",
            versioned=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
        )`;

const TS_LOOKUP = `    const lookupFn = new lambda.Function(this, "LookupFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/lookup"),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: { TABLE_NAME: table.tableName },
    });`;
const PY_LOOKUP = `        lookup_fn = lambda_.Function(
            self, "LookupFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="index.handler",
            code=lambda_.Code.from_asset("lambda/lookup"),
            timeout=cdk.Duration.seconds(10),
            memory_size=256,
            environment={"TABLE_NAME": table.table_name},
        )`;

/* ── the quests ─────────────────────────────────────────────────────────── */

export const cdkExercises: Record<string, CdkExercise> = {
  "quest-1": {
    brief:
      "The `PokedexStack` class exists, but nothing creates it, so `cdk synth` would produce an empty cloud assembly. Instantiate it once in the app with the id `PokedexStack`, a `description`, and an `env` that pins it to the `ap-south-1` Region.",
    goal: "`new PokedexStack(app, \"PokedexStack\", { description, env: { region: \"ap-south-1\" } })`.",
    typescript: {
      problemCode: `${TS_HEAD()}

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Resources go here. The next quests fill this in.
  }
}

const app = new cdk.App();

// ⬇️ Create the stack: id "PokedexStack", a description, and env: { region: "ap-south-1" }.

app.synth();
`,
      solutionCode: `${TS_HEAD()}

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Resources go here. The next quests fill this in.
  }
}

const app = new cdk.App();

new PokedexStack(app, "PokedexStack", {
  description: "Unova Pokédex backend",
  env: { region: "ap-south-1" },
});

app.synth();
`,
    },
    python: {
      problemCode: `${PY_HEAD()}


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Resources go here. The next quests fill this in.


app = cdk.App()

# ⬇️ Create the stack: id "PokedexStack", a description, and env=cdk.Environment(region="ap-south-1").

app.synth()
`,
      solutionCode: `${PY_HEAD()}


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Resources go here. The next quests fill this in.


app = cdk.App()

PokedexStack(
    app, "PokedexStack",
    description="Unova Pokédex backend",
    env=cdk.Environment(region="ap-south-1"),
)

app.synth()
`,
    },
  },

  "quest-2": {
    brief:
      "Configure the card bucket for the dev stack. It should keep every version of a card, refuse public access and plain-HTTP requests, and — because this is a throwaway dev stack — be deleted together with its objects. The starter already fails: read the error.",
    goal: "`versioned`, `blockPublicAccess: BLOCK_ALL`, `enforceSSL`, and `removalPolicy: DESTROY` with `autoDeleteObjects`.",
    typescript: {
      problemCode: `${TS_HEAD(["s3"])}

${TS_STACK(`    // ⬇️ Configure the card bucket for the dev stack.
    new s3.Bucket(this, "CardsBucket", {
      autoDeleteObjects: true,
    });`, 'const app = new cdk.App();\nnew PokedexStack(app, "PokedexDev");')}`,
      solutionCode: `${TS_HEAD(["s3"])}

${TS_STACK(`    new s3.Bucket(this, "CardsBucket", {
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });`, 'const app = new cdk.App();\nnew PokedexStack(app, "PokedexDev");')}`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3"])}


${PY_STACK(`        # ⬇️ Configure the card bucket for the dev stack.
        s3.Bucket(
            self, "CardsBucket",
            auto_delete_objects=True,
        )`, 'app = cdk.App()\nPokedexStack(app, "PokedexDev")\napp.synth()')}`,
      solutionCode: `${PY_HEAD(["s3"])}


${PY_STACK(`        s3.Bucket(
            self, "CardsBucket",
            versioned=True,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )`, 'app = cdk.App()\nPokedexStack(app, "PokedexDev")\napp.synth()')}`,
    },
  },

  "quest-3": {
    brief:
      "Describe the Pokédex table. Its partition key is the Pokédex number (a Number) and its sort key is the form (a String) — the starter has the wrong key type and no sort key. Bill on demand, turn on point-in-time recovery, and add a global secondary index named `byType` on the `primaryType` String attribute.",
    goal: "`pokedexNumber` NUMBER + `formId` STRING keys, `PAY_PER_REQUEST`, point-in-time recovery, and a `byType` index.",
    typescript: {
      problemCode: `${TS_HEAD(["dynamodb"])}

${TS_STACK(`    // ⬇️ Fix the keys, then add billing, recovery and the byType index.
    const table = new dynamodb.Table(this, "PokedexTable", {
      partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.STRING },
    });`)}`,
      solutionCode: `${TS_HEAD(["dynamodb"])}

${TS_STACK(`    const table = new dynamodb.Table(this, "PokedexTable", {
      partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "formId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    table.addGlobalSecondaryIndex({
      indexName: "byType",
      partitionKey: { name: "primaryType", type: dynamodb.AttributeType.STRING },
    });`)}`,
    },
    python: {
      problemCode: `${PY_HEAD(["dynamodb"])}


${PY_STACK(`        # ⬇️ Fix the keys, then add billing, recovery and the byType index.
        table = dynamodb.Table(
            self, "PokedexTable",
            partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.STRING),
        )`)}`,
      solutionCode: `${PY_HEAD(["dynamodb"])}


${PY_STACK(`        table = dynamodb.Table(
            self, "PokedexTable",
            partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.NUMBER),
            sort_key=dynamodb.Attribute(name="formId", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True,
            ),
        )

        table.add_global_secondary_index(
            index_name="byType",
            partition_key=dynamodb.Attribute(name="primaryType", type=dynamodb.AttributeType.STRING),
        )`)}`,
    },
  },

  "quest-4": {
    brief:
      "Add the lookup function. The starter uses a runtime Lambda no longer supports and hard-codes the table name — which CDK generates at deploy time. Use a current runtime (Node.js 22 or 24, Python 3.12 to 3.14), give the function a 10-second timeout and 256 MB of memory, and pass the real table name through `TABLE_NAME`.",
    goal: "A current runtime, `timeout` 5–29 s, `memorySize` 256–1024 MB (Node.js 22/24 or Python 3.12–3.14), and `TABLE_NAME: table.tableName`.",
    typescript: {
      problemCode: `${TS_HEAD(["dynamodb", "lambda"])}

${TS_STACK(`${TS_TABLE}

    // ⬇️ Fix the runtime, add timeout and memory, and stop hard-coding the table name.
    new lambda.Function(this, "LookupFn", {
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/lookup"),
      environment: { TABLE_NAME: "PokedexTable" },
    });`)}`,
      solutionCode: `${TS_HEAD(["dynamodb", "lambda"])}

${TS_STACK(`${TS_TABLE}

    new lambda.Function(this, "LookupFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/lookup"),
      timeout: cdk.Duration.seconds(10),
      memorySize: 256,
      environment: { TABLE_NAME: table.tableName },
    });`)}`,
    },
    python: {
      problemCode: `${PY_HEAD(["dynamodb", "lambda"])}


${PY_STACK(`${PY_TABLE}

        # ⬇️ Fix the runtime, add timeout and memory, and stop hard-coding the table name.
        lambda_.Function(
            self, "LookupFn",
            runtime=lambda_.Runtime.PYTHON_3_9,
            handler="index.handler",
            code=lambda_.Code.from_asset("lambda/lookup"),
            environment={"TABLE_NAME": "PokedexTable"},
        )`)}`,
      solutionCode: `${PY_HEAD(["dynamodb", "lambda"])}


${PY_STACK(`${PY_TABLE}

        lambda_.Function(
            self, "LookupFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="index.handler",
            code=lambda_.Code.from_asset("lambda/lookup"),
            timeout=cdk.Duration.seconds(10),
            memory_size=256,
            environment={"TABLE_NAME": table.table_name},
        )`)}`,
    },
  },

  "quest-5": {
    brief:
      "Both functions were given every permission on every resource. Delete the wildcard policies and use grants instead: `LookupFn` reads the table and the card bucket (`grantReadData` and `grantRead`; no write access); `UploadFn` may only put objects (`grantPut`) into the bucket and must not read them or touch the table.",
    goal: "Remove `addToRolePolicy`; use `table.grantReadData`, `bucket.grantRead` for the lookup and `bucket.grantPut` for the upload.",
    typescript: {
      problemCode: `${TS_HEAD(["s3", "dynamodb", "lambda", "iam"])}

${TS_STACK(`${TS_TABLE}

${TS_BUCKET}

${TS_LOOKUP}

    const uploadFn = new lambda.Function(this, "UploadFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "upload.handler",
      code: lambda.Code.fromAsset("lambda/upload"),
      environment: { BUCKET_NAME: bucket.bucketName },
    });

    // ⬇️ Too much power! Replace these wildcard policies with grants.
    lookupFn.addToRolePolicy(new iam.PolicyStatement({ actions: ["dynamodb:*", "s3:*"], resources: ["*"] }));
    uploadFn.addToRolePolicy(new iam.PolicyStatement({ actions: ["s3:*"], resources: ["*"] }));`)}`,
      solutionCode: `${TS_HEAD(["s3", "dynamodb", "lambda"])}

${TS_STACK(`${TS_TABLE}

${TS_BUCKET}

${TS_LOOKUP}

    const uploadFn = new lambda.Function(this, "UploadFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "upload.handler",
      code: lambda.Code.fromAsset("lambda/upload"),
      environment: { BUCKET_NAME: bucket.bucketName },
    });

    table.grantReadData(lookupFn);
    bucket.grantRead(lookupFn);
    bucket.grantPut(uploadFn);`)}`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3", "dynamodb", "lambda", "iam"])}


${PY_STACK(`${PY_TABLE}

${PY_BUCKET}

${PY_LOOKUP}

        upload_fn = lambda_.Function(
            self, "UploadFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="upload.handler",
            code=lambda_.Code.from_asset("lambda/upload"),
            environment={"BUCKET_NAME": bucket.bucket_name},
        )

        # ⬇️ Too much power! Replace these wildcard policies with grants.
        lookup_fn.add_to_role_policy(iam.PolicyStatement(actions=["dynamodb:*", "s3:*"], resources=["*"]))
        upload_fn.add_to_role_policy(iam.PolicyStatement(actions=["s3:*"], resources=["*"]))`)}`,
      solutionCode: `${PY_HEAD(["s3", "dynamodb", "lambda"])}


${PY_STACK(`${PY_TABLE}

${PY_BUCKET}

${PY_LOOKUP}

        upload_fn = lambda_.Function(
            self, "UploadFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="upload.handler",
            code=lambda_.Code.from_asset("lambda/upload"),
            environment={"BUCKET_NAME": bucket.bucket_name},
        )

        table.grant_read_data(lookup_fn)
        bucket.grant_read(lookup_fn)
        bucket.grant_put(upload_fn)`)}`,
    },
  },

  "quest-6": {
    brief:
      "`CARD_PREFIX` is a hard-coded guess at the bucket name. Build it from `bucket.bucketName` so it becomes `s3://<real bucket name>/cards/`. Then export two stack outputs: `CardsBucketName` (the bucket name) and `PokedexTableArn` (the table ARN).",
    goal: "`CARD_PREFIX` built from the bucket-name token, plus `CfnOutput`s `CardsBucketName` and `PokedexTableArn`.",
    typescript: {
      problemCode: `${TS_HEAD(["s3", "dynamodb", "lambda"])}

${TS_STACK(`${TS_TABLE}

${TS_BUCKET}

    new lambda.Function(this, "LookupFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/lookup"),
      environment: {
        TABLE_NAME: table.tableName,
        // ⬇️ Not the real bucket name. Build this from bucket.bucketName.
        CARD_PREFIX: "s3://cards-bucket/cards/",
      },
    });

    // ⬇️ Export the bucket name and the table ARN as outputs.
`)}`,
      solutionCode: `${TS_HEAD(["s3", "dynamodb", "lambda"])}

${TS_STACK(`${TS_TABLE}

${TS_BUCKET}

    new lambda.Function(this, "LookupFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "index.handler",
      code: lambda.Code.fromAsset("lambda/lookup"),
      environment: {
        TABLE_NAME: table.tableName,
        CARD_PREFIX: \`s3://\${bucket.bucketName}/cards/\`,
      },
    });

    new cdk.CfnOutput(this, "CardsBucketName", { value: bucket.bucketName });
    new cdk.CfnOutput(this, "PokedexTableArn", { value: table.tableArn });`)}`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3", "dynamodb", "lambda"])}


${PY_STACK(`${PY_TABLE}

${PY_BUCKET}

        lambda_.Function(
            self, "LookupFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="index.handler",
            code=lambda_.Code.from_asset("lambda/lookup"),
            environment={
                "TABLE_NAME": table.table_name,
                # ⬇️ Not the real bucket name. Build this from bucket.bucket_name.
                "CARD_PREFIX": "s3://cards-bucket/cards/",
            },
        )

        # ⬇️ Export the bucket name and the table ARN as outputs.
`)}`,
      solutionCode: `${PY_HEAD(["s3", "dynamodb", "lambda"])}


${PY_STACK(`${PY_TABLE}

${PY_BUCKET}

        lambda_.Function(
            self, "LookupFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="index.handler",
            code=lambda_.Code.from_asset("lambda/lookup"),
            environment={
                "TABLE_NAME": table.table_name,
                "CARD_PREFIX": f"s3://{bucket.bucket_name}/cards/",
            },
        )

        cdk.CfnOutput(self, "CardsBucketName", value=bucket.bucket_name)
        cdk.CfnOutput(self, "PokedexTableArn", value=table.table_arn)`)}`,
    },
  },

  "quest-7": {
    brief:
      "Expose the lookup function as `GET /pokemon/{number}`. Create the API with the stage name `v1`, add a `pokemon` resource with a `{number}` child, and attach a Lambda integration to its GET method. Use explicit routes, not a proxy (`ANY`).",
    goal: "`stageName: \"v1\"` and `GET /pokemon/{number}` routed to `lookupFn` with a `LambdaIntegration`.",
    typescript: {
      problemCode: `${TS_HEAD(["dynamodb", "lambda", "apigw"])}

${TS_STACK(`${TS_TABLE}

${TS_LOOKUP}

    // ⬇️ Give the API a "v1" stage and route GET /pokemon/{number} to lookupFn.
    const api = new apigw.RestApi(this, "PokedexApi", {});`)}`,
      solutionCode: `${TS_HEAD(["dynamodb", "lambda", "apigw"])}

${TS_STACK(`${TS_TABLE}

${TS_LOOKUP}

    const api = new apigw.RestApi(this, "PokedexApi", {
      deployOptions: { stageName: "v1" },
    });

    const pokemon = api.root.addResource("pokemon");
    const byNumber = pokemon.addResource("{number}");
    byNumber.addMethod("GET", new apigw.LambdaIntegration(lookupFn));`)}`,
    },
    python: {
      problemCode: `${PY_HEAD(["dynamodb", "lambda", "apigw"])}


${PY_STACK(`${PY_TABLE}

${PY_LOOKUP}

        # ⬇️ Give the API a "v1" stage and route GET /pokemon/{number} to lookup_fn.
        api = apigw.RestApi(self, "PokedexApi")`)}`,
      solutionCode: `${PY_HEAD(["dynamodb", "lambda", "apigw"])}


${PY_STACK(`${PY_TABLE}

${PY_LOOKUP}

        api = apigw.RestApi(
            self, "PokedexApi",
            deploy_options=apigw.StageOptions(stage_name="v1"),
        )

        pokemon = api.root.add_resource("pokemon")
        by_number = pokemon.add_resource("{number}")
        by_number.add_method("GET", apigw.LambdaIntegration(lookup_fn))`)}`,
    },
  },

  "quest-8": {
    brief:
      "`ProcessorFn` makes a thumbnail for every new sprite and writes it back to `sprites/thumbs/` in the same bucket. As written, each thumbnail triggers the function again. Trigger it only for PNG files under `sprites/originals/`.",
    goal: "`OBJECT_CREATED` notification with `prefix: \"sprites/originals/\"` and `suffix: \".png\"`.",
    typescript: {
      problemCode: `${TS_HEAD(["s3", "lambda", "s3n"])}

${TS_STACK(`${TS_BUCKET}

    const processorFn = new lambda.Function(this, "ProcessorFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "thumbnail.handler",
      code: lambda.Code.fromAsset("lambda/thumbnail"),
      timeout: cdk.Duration.seconds(30),
    });
    bucket.grantRead(processorFn);
    bucket.grantPut(processorFn);

    // ⬇️ This runs for every new object, including its own thumbnails. Add a prefix and suffix filter.
    bucket.addEventNotification(s3.EventType.OBJECT_CREATED, new s3n.LambdaDestination(processorFn));`)}`,
      solutionCode: `${TS_HEAD(["s3", "lambda", "s3n"])}

${TS_STACK(`${TS_BUCKET}

    const processorFn = new lambda.Function(this, "ProcessorFn", {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: "thumbnail.handler",
      code: lambda.Code.fromAsset("lambda/thumbnail"),
      timeout: cdk.Duration.seconds(30),
    });
    bucket.grantRead(processorFn);
    bucket.grantPut(processorFn);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(processorFn),
      { prefix: "sprites/originals/", suffix: ".png" },
    );`)}`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3", "lambda", "s3n"])}


${PY_STACK(`${PY_BUCKET}

        processor_fn = lambda_.Function(
            self, "ProcessorFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="thumbnail.handler",
            code=lambda_.Code.from_asset("lambda/thumbnail"),
            timeout=cdk.Duration.seconds(30),
        )
        bucket.grant_read(processor_fn)
        bucket.grant_put(processor_fn)

        # ⬇️ This runs for every new object, including its own thumbnails. Add a prefix and suffix filter.
        bucket.add_event_notification(s3.EventType.OBJECT_CREATED, s3n.LambdaDestination(processor_fn))`)}`,
      solutionCode: `${PY_HEAD(["s3", "lambda", "s3n"])}


${PY_STACK(`${PY_BUCKET}

        processor_fn = lambda_.Function(
            self, "ProcessorFn",
            runtime=lambda_.Runtime.PYTHON_3_13,
            handler="thumbnail.handler",
            code=lambda_.Code.from_asset("lambda/thumbnail"),
            timeout=cdk.Duration.seconds(30),
        )
        bucket.grant_read(processor_fn)
        bucket.grant_put(processor_fn)

        bucket.add_event_notification(
            s3.EventType.OBJECT_CREATED,
            s3n.LambdaDestination(processor_fn),
            s3.NotificationKeyFilter(prefix="sprites/originals/", suffix=".png"),
        )`)}`,
    },
  },

  "quest-9": {
    brief:
      "The stack takes a `stage` prop, but it destroys the bucket in every stage — including production. Make production keep its data (retain, no auto-delete) and dev stay disposable (no termination protection). Then create `PokedexDev` and `PokedexProd` from the same class: production gets termination protection and the `ap-south-1` Region, and the whole app is tagged `Project=Pokedex`.",
    goal: "`stage` chooses the removal policy and `autoDeleteObjects`; two stacks; prod has `terminationProtection` and `env.region`; `Tags.of(app)`.",
    typescript: {
      problemCode: `${TS_HEAD(["s3"])}

interface PokedexStackProps extends cdk.StackProps {
  stage: "dev" | "prod";
}

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PokedexStackProps) {
    super(scope, id, props);
    const isProd = props.stage === "prod";

    // ⬇️ Bug: every stage destroys its data. Use isProd to retain production's bucket.
    new s3.Bucket(this, "CardsBucket", {
      versioned: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
  }
}

const app = new cdk.App();

// ⬇️ Create PokedexDev (stage "dev") and PokedexProd (stage "prod", terminationProtection, env.region "ap-south-1").
//    Then tag everything with Project=Pokedex.
`,
      solutionCode: `${TS_HEAD(["s3"])}

interface PokedexStackProps extends cdk.StackProps {
  stage: "dev" | "prod";
}

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PokedexStackProps) {
    super(scope, id, props);
    const isProd = props.stage === "prod";

    new s3.Bucket(this, "CardsBucket", {
      versioned: true,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });
  }
}

const app = new cdk.App();

new PokedexStack(app, "PokedexDev", { stage: "dev" });
new PokedexStack(app, "PokedexProd", {
  stage: "prod",
  terminationProtection: true,
  env: { region: "ap-south-1" },
});

cdk.Tags.of(app).add("Project", "Pokedex");
`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3"])}


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, *, stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        is_prod = stage == "prod"

        # ⬇️ Bug: every stage destroys its data. Use is_prod to retain production's bucket.
        s3.Bucket(
            self, "CardsBucket",
            versioned=True,
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )


app = cdk.App()

# ⬇️ Create PokedexDev (stage "dev") and PokedexProd (stage "prod", termination_protection, env region "ap-south-1").
#    Then tag everything with Project=Pokedex.

app.synth()
`,
      solutionCode: `${PY_HEAD(["s3"])}


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, *, stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        is_prod = stage == "prod"

        s3.Bucket(
            self, "CardsBucket",
            versioned=True,
            removal_policy=cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=not is_prod,
        )


app = cdk.App()

PokedexStack(app, "PokedexDev", stage="dev")
PokedexStack(
    app, "PokedexProd",
    stage="prod",
    termination_protection=True,
    env=cdk.Environment(region="ap-south-1"),
)

cdk.Tags.of(app).add("Project", "Pokedex")

app.synth()
`,
    },
  },

  "quest-10": {
    brief:
      "Write the test. Synthesize the stack into a `Template`, then assert three things: the bucket has versioning enabled, the table bills `PAY_PER_REQUEST`, and the stack contains exactly one table. A test with no assertions can never fail.",
    goal: "Two `hasResourceProperties` assertions and one `resourceCountIs`.",
    typescript: {
      problemCode: `${TS_HEAD(["s3", "dynamodb", "assertions"])}

class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new s3.Bucket(this, "CardsBucket", { versioned: true, enforceSSL: true });
    new dynamodb.Table(this, "PokedexTable", {
      partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }
}

test("the Pokédex stack is safe by default", () => {
  const app = new cdk.App();
  const stack = new PokedexStack(app, "TestStack");
  const template = Template.fromStack(stack);

  // ⬇️ Assert: the bucket is versioned, the table is on demand, and there is exactly one table.
});
`,
      solutionCode: `${TS_HEAD(["s3", "dynamodb", "assertions"])}

class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new s3.Bucket(this, "CardsBucket", { versioned: true, enforceSSL: true });
    new dynamodb.Table(this, "PokedexTable", {
      partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });
  }
}

test("the Pokédex stack is safe by default", () => {
  const app = new cdk.App();
  const stack = new PokedexStack(app, "TestStack");
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::Bucket", {
    VersioningConfiguration: { Status: "Enabled" },
  });
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    BillingMode: "PAY_PER_REQUEST",
  });
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
});
`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3", "dynamodb", "assertions"])}


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        s3.Bucket(self, "CardsBucket", versioned=True, enforce_ssl=True)
        dynamodb.Table(
            self, "PokedexTable",
            partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.NUMBER),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
        )


def test_pokedex_stack_is_safe_by_default():
    app = cdk.App()
    stack = PokedexStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)

    # ⬇️ Assert: the bucket is versioned, the table is on demand, and there is exactly one table.
`,
      solutionCode: `${PY_HEAD(["s3", "dynamodb", "assertions"])}


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        s3.Bucket(self, "CardsBucket", versioned=True, enforce_ssl=True)
        dynamodb.Table(
            self, "PokedexTable",
            partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.NUMBER),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
        )


def test_pokedex_stack_is_safe_by_default():
    app = cdk.App()
    stack = PokedexStack(app, "TestStack")
    template = assertions.Template.from_stack(stack)

    template.has_resource_properties("AWS::S3::Bucket", {
        "VersioningConfiguration": {"Status": "Enabled"},
    })
    template.has_resource_properties("AWS::DynamoDB::Table", {
        "BillingMode": "PAY_PER_REQUEST",
    })
    template.resource_count_is("AWS::DynamoDB::Table", 1)
`,
    },
  },

  "quest-11": {
    brief:
      "Finish `SecureBucket`, a construct every team can reuse. It must create its bucket inside itself (scope `this`, not the outer `scope`) with versioning, S3-managed encryption, Block Public Access and `enforceSSL`. Then use it twice in the stack: `Cards` and `Sprites`. Each `SecureBucket` holds exactly one bucket.",
    goal: "A bucket created with `this` as scope and the four secure settings, and two `SecureBucket`s: `Cards` and `Sprites`.",
    typescript: {
      problemCode: `${TS_HEAD(["s3"])}

export class SecureBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    // ⬇️ Create the bucket inside this construct, with the secure defaults every team must use.
    this.bucket = new s3.Bucket(scope, "Bucket", {});
  }
}

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // ⬇️ Use the construct twice: "Cards" and "Sprites".
  }
}

const app = new cdk.App();
new PokedexStack(app, "PokedexStack");
`,
      solutionCode: `${TS_HEAD(["s3"])}

export class SecureBucket extends Construct {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "Bucket", {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });
  }
}

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    new SecureBucket(this, "Cards");
    new SecureBucket(this, "Sprites");
  }
}

const app = new cdk.App();
new PokedexStack(app, "PokedexStack");
`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3"])}


class SecureBucket(Construct):
    def __init__(self, scope: Construct, construct_id: str) -> None:
        super().__init__(scope, construct_id)

        # ⬇️ Create the bucket inside this construct, with the secure defaults every team must use.
        self.bucket = s3.Bucket(scope, "Bucket")


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # ⬇️ Use the construct twice: "Cards" and "Sprites".


app = cdk.App()
PokedexStack(app, "PokedexStack")
app.synth()
`,
      solutionCode: `${PY_HEAD(["s3"])}


class SecureBucket(Construct):
    def __init__(self, scope: Construct, construct_id: str) -> None:
        super().__init__(scope, construct_id)

        self.bucket = s3.Bucket(
            self, "Bucket",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
        )


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        SecureBucket(self, "Cards")
        SecureBucket(self, "Sprites")


app = cdk.App()
PokedexStack(app, "PokedexStack")
app.synth()
`,
    },
  },

  "quest-12": {
    brief:
      "The launch review found problems in the production stack. The table and the bucket would be deleted with the stack, and the bucket also auto-deletes its objects (remove `autoDeleteObjects`: it only works with DESTROY). The table has no deletion protection or point-in-time recovery. The bucket isn't versioned and accepts plain HTTP. The stack itself can be deleted by accident. Fix all of them.",
    goal: "Table: `RETAIN`, `deletionProtection`, point-in-time recovery. Bucket: `RETAIN` (no auto-delete), versioned, `enforceSSL`. Stack: `terminationProtection`.",
    typescript: {
      problemCode: `${TS_HEAD(["s3", "dynamodb"])}

${TS_STACK("    // ⬇️ Harden the table and the bucket for production.\n" + `    const table = new dynamodb.Table(this, "PokedexTable", {
      partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "formId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new s3.Bucket(this, "CardsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });`, `const app = new cdk.App();
new PokedexStack(app, "PokedexStack", {
  env: { region: "ap-south-1" },
  // ⬇️ Protect the stack itself from being deleted by accident.
});`)}`,
      solutionCode: `${TS_HEAD(["s3", "dynamodb"])}

${TS_STACK(`    const table = new dynamodb.Table(this, "PokedexTable", {
      partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.NUMBER },
      sortKey: { name: "formId", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
      pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
    });

    new s3.Bucket(this, "CardsBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      versioned: true,
      enforceSSL: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });`, `const app = new cdk.App();
new PokedexStack(app, "PokedexStack", {
  env: { region: "ap-south-1" },
  terminationProtection: true,
});`)}`,
    },
    python: {
      problemCode: `${PY_HEAD(["s3", "dynamodb"])}


${PY_STACK("        # ⬇️ Harden the table and the bucket for production.\n" + `        table = dynamodb.Table(
            self, "PokedexTable",
            partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.NUMBER),
            sort_key=dynamodb.Attribute(name="formId", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.DESTROY,
        )

        s3.Bucket(
            self, "CardsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )`, `app = cdk.App()
PokedexStack(app, "PokedexStack",
             env=cdk.Environment(region="ap-south-1"),
             # ⬇️ Protect the stack itself from being deleted by accident.
             )
app.synth()`)}`,
      solutionCode: `${PY_HEAD(["s3", "dynamodb"])}


${PY_STACK(`        table = dynamodb.Table(
            self, "PokedexTable",
            partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.NUMBER),
            sort_key=dynamodb.Attribute(name="formId", type=dynamodb.AttributeType.STRING),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            removal_policy=cdk.RemovalPolicy.RETAIN,
            deletion_protection=True,
            point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
                point_in_time_recovery_enabled=True),
        )

        s3.Bucket(
            self, "CardsBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            versioned=True,
            enforce_ssl=True,
            removal_policy=cdk.RemovalPolicy.RETAIN,
        )`, `app = cdk.App()
PokedexStack(app, "PokedexStack",
             env=cdk.Environment(region="ap-south-1"),
             termination_protection=True)
app.synth()`)}`,
    },
  },
};
