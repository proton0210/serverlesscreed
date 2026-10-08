import { FiBox, FiCloud, FiCode, FiFileText, FiGitBranch, FiLayers, FiPackage, FiPlay, FiTerminal } from "react-icons/fi";
import { ConstructTree } from "@/components/cdk/construct-tree";
import { SynthExplorer } from "@/components/cdk/synth-explorer";
import { dual, h, plain, type RawContent } from "./shared";

export const part1: RawContent = {
  // -------------------------------------------------------------------------
  "quest-1": {
    intro: (
      <>
        The Pokédex team built its backend by clicking through the AWS console. Nobody remembers which box was ticked, and the staging copy doesn&apos;t match production. The AWS Cloud Development Kit
        (CDK) fixes that: you describe the backend in <strong>TypeScript or Python</strong>, and CDK turns the code into a CloudFormation template that AWS deploys.
      </>
    ),
    keyTakeaways: [
      <>A CDK program is a tree: an <strong>App</strong> contains <strong>Stacks</strong>, and stacks contain <strong>constructs</strong> that stand for AWS resources.</>,
      <><code>cdk synth</code> runs your program and writes CloudFormation to <code>cdk.out</code>. Nothing is deployed until you run <code>cdk deploy</code>.</>,
      <>The second argument of every construct is its <strong>id</strong>. It is part of the resource&apos;s identity, so choose it once and keep it.</>,
    ],
    sections: [
      {
        title: h(FiCode, "Infrastructure as code"),
        paragraphs: [
          <>
            Infrastructure as code means the description of your cloud resources lives in files, in version control, next to the application. A pull request can change a table&apos;s billing mode, a teammate can
            review it, and the same files can create an identical copy of the whole backend in another account or Region.
          </>,
          <>
            CDK is one way to do that. Instead of writing CloudFormation YAML by hand, you write a program in a language you already use. CDK supports TypeScript, JavaScript, Python, Java, C# and Go; this course
            teaches TypeScript and Python, and you can switch between them at any time. The concepts are identical.
          </>,
        ],
        callout: <>CDK doesn&apos;t replace CloudFormation. It generates CloudFormation, and CloudFormation still creates, updates and deletes the resources. That is why you get rollbacks, drift detection and stack events.</>,
      },
      {
        title: h(FiLayers, "App, stack, construct"),
        paragraphs: [
          <>
            A CDK program creates one <strong>App</strong>, the root. Inside it you create one or more <strong>Stacks</strong>; each stack becomes one CloudFormation stack, the unit AWS deploys and deletes
            together. Inside a stack you create <strong>constructs</strong>: a bucket, a table, a function, or a group of them.
          </>,
          <>
            Every construct takes the same first two arguments: its <strong>scope</strong> (the parent that contains it) and its <strong>id</strong> (a name, unique among its siblings). Those two arguments place
            the construct in the tree. Everything after them is configuration, called <strong>props</strong>.
          </>,
        ],
        codeSnippets: [
          dual(
            "A minimal app",
            `import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    // Constructs go here, with \`this\` as their scope.
  }
}

const app = new cdk.App();
new PokedexStack(app, "PokedexStack", {
  description: "Backend for the Unova Pokédex",
});`,
            `import aws_cdk as cdk
from constructs import Construct


class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        # Constructs go here, with \`self\` as their scope.


app = cdk.App()
PokedexStack(app, "PokedexStack",
             description="Backend for the Unova Pokédex")`
          ),
        ],
        table: {
          headers: ["Concept", "What it is", "Becomes"],
          rows: [
            [<strong key="a">App</strong>, "The root of the tree. One per program.", "The cloud assembly in cdk.out"],
            [<strong key="b">Stack</strong>, "A unit of deployment. Its id is the stack name.", "One CloudFormation stack"],
            [<strong key="c">Construct</strong>, "A building block with a scope and an id.", "One or more resources"],
          ],
        },
      },
      {
        title: h(FiPlay, "The CDK workflow"),
        paragraphs: [
          <>You will use only a handful of CDK commands. These are the ones that matter, in the order you use them:</>,
        ],
        codeSnippets: [
          plain(
            "bash",
            "Start, check, deploy",
            `npm install -g aws-cdk        # the CLI (separate from the aws-cdk-lib library)
cdk init app --language typescript   # or: --language python
cdk synth      # run the program, write CloudFormation to cdk.out/
cdk diff       # compare with what is deployed right now
cdk deploy     # synth, then ask CloudFormation to create or update
cdk destroy    # delete the stack and what it owns`
          ),
        ],
        postTableParagraphs: [
          <>
            Everything in this course uses <code>cdk synth</code>: when you press &ldquo;Check solution&rdquo; a simulator reads your code, builds the construct tree, and shows you the CloudFormation it would
            synthesize. No AWS account, no credentials, nothing is deployed.
          </>,
        ],
      },
      {
        title: h(FiFileText, "Why the id matters"),
        visual: <ConstructTree />,
        paragraphs: [
          <>
            CDK turns the path from the root to a construct into its CloudFormation <strong>logical ID</strong>: a stack named <code>PokedexStack</code> with a bucket <code>CardsBucket</code> gets a logical ID
            like <code>CardsBucket685ECB20</code>. If you later rename the id, the logical ID changes, and CloudFormation sees a brand-new resource: it creates a new, empty one and then removes the old one from the stack. With the default RETAIN the old one is orphaned, but with DESTROY it is deleted, data included. Either way, your app now points at an empty resource. Choose ids carefully and treat them as permanent.
          </>,
        ],
        callout: <>Practice below: create the stack and pin it to the Mumbai Region (<code>ap-south-1</code>). Pinning a Region makes the deployment target explicit instead of whatever the CLI is pointed at. (Lookups such as <code>Vpc.fromLookup</code> also need an <code>account</code>; a real app would add one.)</>,
      },
    ],
    quiz: {
      prompt: <>You run <code>cdk synth</code> on the Pokédex app. What happens?</>,
      options: [
        "A) CDK creates the resources in your AWS account, then writes a template for the record",
        "B) CDK uploads your code to a Lambda function that builds the stack",
        "C) CDK runs your program and writes CloudFormation to cdk.out; nothing is deployed",
        "D) CDK compares your code with the deployed stack and prints the differences",
      ],
      answer: <>Synthesis is local. Your program runs, constructs become CloudFormation, and the result lands in <code>cdk.out</code>. Only <code>cdk deploy</code> changes anything in AWS.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-2": {
    intro: (
      <>
        Time for the first real resource: the bucket that holds Pokédex cards. You&apos;ll write a handful of lines, and CDK will fill in the rest: a bucket, a bucket policy and even a small clean-up function.
      </>
    ),
    keyTakeaways: [
      <>CDK has three levels of constructs. <strong>L1</strong> (<code>CfnBucket</code>) mirrors CloudFormation one to one; <strong>L2</strong> (<code>Bucket</code>) adds sensible defaults and helper methods; <strong>L3</strong> are patterns.</>,
      <>Stateful resources default to <strong>RETAIN</strong>: deleting the stack leaves the bucket behind. For a disposable dev stack choose <code>DESTROY</code>.</>,
      <><code>autoDeleteObjects</code> needs <code>removalPolicy: DESTROY</code>. CDK refuses the combination otherwise: it would empty a bucket that CloudFormation then keeps.</>,
    ],
    sections: [
      {
        title: h(FiBox, "L1, L2 and L3"),
        paragraphs: [
          <>
            <strong>L1</strong> constructs are generated from the CloudFormation specification and are named <code>Cfn…</code>. You set every property yourself and get no defaults.{" "}
            <strong>L2</strong> constructs are hand-written, one per service concept: <code>s3.Bucket</code>, <code>dynamodb.Table</code>, <code>lambda.Function</code>. They choose safe defaults, validate your input
            and give you methods like <code>grantRead</code>. <strong>L3</strong> constructs, also called patterns, assemble several resources for a use case.
          </>,
          <>Start with L2. Drop to L1 only when a property you need isn&apos;t exposed yet (an <em>escape hatch</em>, which you&apos;ll meet in Quest 12).</>,
        ],
        table: {
          headers: ["Level", "Example", "You get"],
          rows: [
            [<strong key="a">L1</strong>, <code key="a1">s3.CfnBucket</code>, "Exactly the CloudFormation resource, nothing added"],
            [<strong key="b">L2</strong>, <code key="b1">s3.Bucket</code>, "Defaults, validation, grant and metric methods"],
            [<strong key="c">L3</strong>, <code key="c1">ApplicationLoadBalancedFargateService</code>, "Several resources wired together for one purpose"],
          ],
        },
      },
      {
        title: h(FiPackage, "Create the bucket"),
        paragraphs: [
          <>Props are plain data: strings, booleans and enum values. Python spells them in <code>snake_case</code>; TypeScript in <code>camelCase</code>. They mean the same thing.</>,
        ],
        codeSnippets: [
          dual(
            "A secure card bucket",
            `import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";

const bucket = new s3.Bucket(this, "CardsBucket", {
  versioned: true,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  enforceSSL: true,
  removalPolicy: cdk.RemovalPolicy.DESTROY,   // dev only
  autoDeleteObjects: true,                    // needs DESTROY
});`,
            `import aws_cdk as cdk
from aws_cdk import aws_s3 as s3

bucket = s3.Bucket(self, "CardsBucket",
    versioned=True,
    block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
    enforce_ssl=True,
    removal_policy=cdk.RemovalPolicy.DESTROY,   # dev only
    auto_delete_objects=True,                   # needs DESTROY
)`
          ),
        ],
        bullets: [
          <><code>versioned</code> keeps old versions, so an overwritten card can be restored.</>,
          <><code>blockPublicAccess</code>: new buckets already block public access at the account default, but saying it in code makes the intent reviewable.</>,
          <><code>enforceSSL</code> adds a bucket policy that denies any request not made over TLS.</>,
        ],
      },
      {
        title: h(FiTerminal, "What synth really produces"),
        visual: <SynthExplorer />,
        paragraphs: [
          <>
            A few props produce more than one resource. The bucket itself carries <code>DeletionPolicy: Delete</code> because you chose DESTROY; <code>enforceSSL</code> adds an{" "}
            <code>AWS::S3::BucketPolicy</code>; and <code>autoDeleteObjects</code> adds a custom resource, <code>Custom::S3AutoDeleteObjects</code>, backed by a small Lambda function that empties the bucket when
            the stack is deleted. Run the exercise below and open the output to see all of them.
          </>,
        ],
        codeSnippets: [
          plain(
            "json",
            "Excerpt of the template",
            `"CardsBucket685ECB20": {
  "Type": "AWS::S3::Bucket",
  "Properties": { "VersioningConfiguration": { "Status": "Enabled" }, … },
  "UpdateReplacePolicy": "Delete",
  "DeletionPolicy": "Delete"
}`
          ),
        ],
        callout: <>A real <code>cdk synth</code> prints the logical ID suffix (here <code>685ECB20</code>) as a hash of the construct path. The simulator in this course computes it the same way.</>,
      },
      {
        title: h(FiCloud, "Removal policies"),
        paragraphs: [
          <>
            The removal policy answers: &ldquo;when this resource is removed from the stack, or the stack is deleted, what happens?&rdquo; <code>RETAIN</code> keeps it (the default for buckets and tables), also when CloudFormation replaces it,{" "}
            <code>DESTROY</code> deletes it, <code>SNAPSHOT</code> takes a final snapshot where the service supports it, and <code>RETAIN_ON_UPDATE_OR_DELETE</code> keeps it on update or delete, but still removes a resource whose creation failed and rolled back.
          </>,
          <>
            The exercise starter fails on purpose: it sets <code>autoDeleteObjects</code> without DESTROY. The error text is the real one CDK throws. Fix the combination and finish the bucket.
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>Which statement about <code>s3.Bucket</code> (an L2 construct) versus <code>s3.CfnBucket</code> (L1) is true?</>,
      options: [
        "A) L2 adds defaults, validation and helper methods such as grantRead, while L1 maps one to one to the CloudFormation resource",
        "B) They are identical; L2 is just the newer name",
        "C) L1 gives you helper methods and safe defaults, L2 doesn't",
        "D) L2 constructs can only be used in TypeScript",
      ],
      answer: <>L1 constructs are the raw CloudFormation resource. L2 constructs wrap them with defaults, validation and methods. Both are available in every CDK language.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-3": {
    intro: (
      <>
        The Pokédex needs a table: one item per Pokémon form, fast lookups by number, and a way to list Pokémon by type. If you took Learn DynamoDB, this is the same table, described as code; if not, the keys and index are explained as we go.
      </>
    ),
    keyTakeaways: [
      <><code>partitionKey</code> and <code>sortKey</code> are attribute objects with a name and a type: <code>STRING</code>, <code>NUMBER</code> or <code>BINARY</code>.</>,
      <>The default billing mode is <strong>provisioned</strong>, 5 read and 5 write capacity units. Choose <code>PAY_PER_REQUEST</code> deliberately.</>,
      <>Point-in-time recovery is off by default. In current CDK it is set with <code>pointInTimeRecoverySpecification</code>; the older <code>pointInTimeRecovery</code> boolean is deprecated.</>,
    ],
    sections: [
      {
        title: h(FiLayers, "Keys and billing"),
        paragraphs: [
          <>
            The key schema can&apos;t be changed after the table exists, so the first decision is the most important. The Pokédex uses the Pokédex number as the partition key and a form id as the sort key, so
            one number can hold several forms (a regional variant, a mega evolution). The number is a <em>Number</em>: as a string, &ldquo;10&rdquo; would sort before &ldquo;9&rdquo;.
          </>,
          <>
            <code>billingMode</code> chooses between on-demand and provisioned capacity. On-demand (<code>PAY_PER_REQUEST</code>) is the simplest choice for a new, unpredictable workload.
          </>,
        ],
        codeSnippets: [
          dual(
            "The Pokédex table",
            `import * as dynamodb from "aws-cdk-lib/aws-dynamodb";

const table = new dynamodb.Table(this, "PokedexTable", {
  partitionKey: { name: "pokedexNumber", type: dynamodb.AttributeType.NUMBER },
  sortKey: { name: "formId", type: dynamodb.AttributeType.STRING },
  billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
  pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true },
});`,
            `from aws_cdk import aws_dynamodb as dynamodb

table = dynamodb.Table(self, "PokedexTable",
    partition_key=dynamodb.Attribute(name="pokedexNumber", type=dynamodb.AttributeType.NUMBER),
    sort_key=dynamodb.Attribute(name="formId", type=dynamodb.AttributeType.STRING),
    billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
    point_in_time_recovery_specification=dynamodb.PointInTimeRecoverySpecification(
        point_in_time_recovery_enabled=True),
)`
          ),
        ],
      },
      {
        title: h(FiGitBranch, "A global secondary index"),
        paragraphs: [
          <>
            To list Pokémon by type you add a <strong>global secondary index</strong> (GSI) with <code>primaryType</code> as its partition key. Call a method on the table, rather than passing a prop:
            that is the L2 style for things you can add later.
          </>,
        ],
        codeSnippets: [
          dual(
            "Add the byType index",
            `table.addGlobalSecondaryIndex({
  indexName: "byType",
  partitionKey: { name: "primaryType", type: dynamodb.AttributeType.STRING },
});`,
            `table.add_global_secondary_index(
    index_name="byType",
    partition_key=dynamodb.Attribute(name="primaryType", type=dynamodb.AttributeType.STRING),
)`
          ),
        ],
        callout: <>Attribute names like <code>type</code> and <code>name</code> are DynamoDB reserved words and cause trouble in expressions. That is why the Pokédex says <code>primaryType</code>.</>,
      },
      {
        title: h(FiFileText, "Read the template"),
        paragraphs: [
          <>
            Open the output of the exercise: the table becomes <code>AWS::DynamoDB::Table</code> with <code>KeySchema</code>, <code>AttributeDefinitions</code> (only keys and index keys are listed there, because
            DynamoDB is schemaless for everything else), <code>BillingMode</code> and <code>GlobalSecondaryIndexes</code>. With on-demand billing, CDK also omits provisioned throughput from the index.
          </>,
          <>
            Like buckets, tables default to <code>RETAIN</code>. That is the right default for data you care about. Production keeps it; Quest 9 shows how to choose per environment.
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>You deploy a table, then realise the partition key should have been a Number, not a String. What does CDK do if you change the attribute type in code?</>,
      options: [
        "A) CDK migrates the data in place",
        "B) Nothing happens: the change is ignored",
        "C) CDK runs UpdateTable to change the key type in place",
        "D) CloudFormation must replace the table, because the key schema is immutable. Data is not copied across",
      ],
      answer: <>A key schema change forces a replacement of the table. Plan keys carefully, and keep <code>RETAIN</code> plus backups on tables you care about.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-4": {
    intro: (
      <>
        The lookup logic needs somewhere to run. A Lambda function is the obvious choice, and CDK makes the wiring pleasantly small, with two traps: runtimes that AWS no longer allows, and names that don&apos;t
        exist yet.
      </>
    ),
    keyTakeaways: [
      <>Pick a <strong>currently supported runtime</strong>. Lambda blocks creating or updating functions on deprecated runtimes, so a stack that used to deploy can start failing.</>,
      <>The defaults (3-second timeout, 128 MB) suit tiny functions. Set <code>timeout</code> and <code>memorySize</code> from your measurements.</>,
      <>Never hard-code a generated name. Pass <code>table.tableName</code>: CDK resolves it when CloudFormation deploys.</>,
    ],
    sections: [
      {
        title: h(FiPackage, "A function"),
        paragraphs: [
          <>
            <code>lambda.Function</code> needs a <code>runtime</code>, a <code>handler</code> and <code>code</code>. <code>Code.fromAsset</code> zips a local folder at synth time and uploads it during deploy. In a real project that folder (here <code>lambda/lookup</code>) must exist, or synth fails with &ldquo;Cannot find asset&rdquo;.
          </>,
        ],
        codeSnippets: [
          dual(
            "A lookup function",
            `import * as lambda from "aws-cdk-lib/aws-lambda";

const lookup = new lambda.Function(this, "LookupFn", {
  runtime: lambda.Runtime.NODEJS_22_X,
  handler: "index.handler",
  code: lambda.Code.fromAsset("lambda/lookup"),
  timeout: cdk.Duration.seconds(10),
  memorySize: 256,
  environment: { TABLE_NAME: table.tableName },
});`,
            `from aws_cdk import aws_lambda as lambda_

lookup = lambda_.Function(self, "LookupFn",
    runtime=lambda_.Runtime.PYTHON_3_13,
    handler="index.handler",
    code=lambda_.Code.from_asset("lambda/lookup"),
    timeout=cdk.Duration.seconds(10),
    memory_size=256,
    environment={"TABLE_NAME": table.table_name},
)`
          ),
        ],
        callout: <>In Python, <code>lambda</code> is a reserved word, so the module is imported as <code>lambda_</code>. For Node.js code that you write in TypeScript, <code>NodejsFunction</code> bundles it with esbuild.</>,
      },
      {
        title: h(FiTerminal, "Runtimes get retired"),
        paragraphs: [
          <>
            Each language version has a published deprecation date. After it, you can no longer create new functions on that runtime, and later you can&apos;t update existing ones either. The practice starter uses
            a deprecated runtime, and the error says so. Lambda rejects a deprecated runtime when you deploy (or update), not when you synthesize, but the simulator flags it early. Check the Lambda runtimes table in the AWS documentation for the current list and dates; at the time of writing, Node.js 22 and 24 and Python 3.12 to 3.14 are current.
          </>,
        ],
        bullets: [
          <>Upgrade runtimes on a schedule, not when AWS emails you.</>,
          <>CDK&apos;s <code>Runtime</code> constants are marked deprecated in the library as dates approach, which shows up as a warning when you synth.</>,
        ],
      },
      {
        title: h(FiCloud, "Names that don't exist yet"),
        paragraphs: [
          <>
            When you don&apos;t pass <code>tableName</code>, CloudFormation generates one, something like <code>PokedexStack-PokedexTable-1UVA2OX3Z7WRL</code>. You can&apos;t know it while writing code. So{" "}
            <code>table.tableName</code> isn&apos;t a string at all: it is a <strong>token</strong>, a placeholder that becomes a <code>Ref</code> in the template. Writing the literal
            <code> &quot;PokedexTable&quot;</code> would point the function at a table that doesn&apos;t exist.
          </>,
          <>The next quests build on this idea, so remember it: a value that comes from another construct is a reference, not text.</>,
        ],
      },
    ],
    quiz: {
      prompt: <>The function needs the table name. What is the best way to give it?</>,
      options: [
        "A) environment: { TABLE_NAME: \"PokedexTable\" }, because that is the construct id",
        "B) environment: { TABLE_NAME: table.tableName }, so CDK passes the real, generated name through a reference",
        "C) Copy the name from the console after the first deploy and paste it into the code",
        "D) Read the name from a text file at runtime",
      ],
      answer: <>The construct id is not the table name. <code>table.tableName</code> is a token that resolves to a <code>Ref</code>, so the function always gets the real name, in every environment.</>,
    },
  },
};
