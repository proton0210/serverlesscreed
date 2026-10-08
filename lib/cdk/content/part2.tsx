import { FiAlertTriangle, FiCloud, FiFileText, FiGitBranch, FiKey, FiLink, FiRepeat, FiShield, FiTerminal, FiZap } from "react-icons/fi";
import { dual, h, type RawContent } from "./shared";

export const part2: RawContent = {
  // -------------------------------------------------------------------------
  "quest-5": {
    intro: (
      <>
        A new function can&apos;t do anything: its role starts empty. The quick fix, a policy that allows <code>dynamodb:*</code> on <code>*</code>, works and is a security finding waiting to happen. CDK has a
        better way: <strong>grants</strong>.
      </>
    ),
    keyTakeaways: [
      <>Every Lambda function gets its own IAM role, with no permissions beyond writing its logs.</>,
      <><strong>Grant methods</strong> such as <code>table.grantReadData(fn)</code> add a narrow policy for exactly one resource and the actions the method name promises.</>,
      <>Prefer the narrowest grant: <code>grantRead</code>, <code>grantPut</code> or <code>grantReadData</code> over <code>grantReadWrite</code>, and never wildcards.</>,
    ],
    sections: [
      {
        title: h(FiAlertTriangle, "The wildcard trap"),
        paragraphs: [
          <>
            Hand-written policy statements are easy to get wrong in the generous direction. A function that only reads cards ends up able to delete the table, and a bug or a compromised dependency inherits all of
            it. Least privilege means giving each function exactly the actions it needs on exactly the resources it touches.
          </>,
        ],
        codeSnippets: [
          dual(
            "What to replace",
            `// Too broad: any DynamoDB or S3 action on anything
lookup.addToRolePolicy(new iam.PolicyStatement({
  actions: ["dynamodb:*", "s3:*"],
  resources: ["*"],
}));`,
            `# Too broad: any DynamoDB or S3 action on anything
lookup.add_to_role_policy(iam.PolicyStatement(
    actions=["dynamodb:*", "s3:*"],
    resources=["*"],
))`
          ),
        ],
      },
      {
        title: h(FiKey, "Grants"),
        paragraphs: [
          <>
            Most L2 constructs that own data have grant methods. You pass the principal, which can be a function, a role or a user; CDK adds a statement to that principal&apos;s policy with the right actions and
            the resource&apos;s ARN. If the table has indexes, the grant also covers them.
          </>,
        ],
        codeSnippets: [
          dual(
            "Narrow grants",
            `table.grantReadData(lookupFn);   // GetItem, Query, Scan, BatchGetItem, …
bucket.grantRead(lookupFn);      // s3:GetObject*, s3:GetBucket*, s3:List*
bucket.grantPut(uploadFn);       // s3:PutObject, s3:PutObjectLegalHold, … (no read)`,
            `table.grant_read_data(lookup_fn)   # GetItem, Query, Scan, BatchGetItem, …
bucket.grant_read(lookup_fn)       # s3:GetObject*, s3:GetBucket*, s3:List*
bucket.grant_put(upload_fn)        # s3:PutObject, s3:PutObjectLegalHold, … (no read)`
          ),
        ],
        table: {
          headers: ["Method", "Lets the function", "Use for"],
          rows: [
            [<code key="a">grantReadData</code>, "Read items from the table", "Lookups"],
            [<code key="b">grantWriteData</code>, "Write and delete items", "Importers"],
            [<code key="c">grantRead</code>, "Get and list objects", "Serving cards"],
            [<code key="d">grantPut</code>, "Put objects only", "Uploaders"],
            [<code key="e">grantReadWrite</code>, "Both directions", "Only when it truly does both"],
          ],
        },
      },
      {
        title: h(FiTerminal, "Read the policy it wrote"),
        paragraphs: [
          <>
            Open the exercise output and find the <code>AWS::IAM::Policy</code> resources. The <code>Resource</code> lists are references to the table and bucket, not <code>*</code>. One detail looks odd the first
            time: a DynamoDB grant ends with <code>Ref: AWS::NoValue</code> in its resource list. CDK adds the table&apos;s indexes there when it has any; with no index the slot is empty, and CloudFormation drops it.
          </>,
        ],
        callout: <>Grants are also one-directional by design. <code>table.grantReadData(fn)</code> changes the function&apos;s role, so you can read the policy next to the function, and the table needs no policy at all.</>,
      },
    ],
    quiz: {
      prompt: <><code>UploadFn</code> only has to store card images in the bucket. Which grant fits?</>,
      options: [
        "A) bucket.grantReadWrite(uploadFn), so it never needs another change",
        "B) A policy statement allowing s3:* on the bucket ARN only",
        "C) bucket.grantPut(uploadFn), which allows putting objects and nothing else",
        "D) bucket.grantWrite(uploadFn), which allows every write action",
      ],
      answer: <><code>grantPut</code> generates only the write-side actions on this one bucket. A read grant would let a compromised uploader read every card, which it never needs.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-6": {
    intro: (
      <>
        You have already used a token without naming it: <code>table.tableName</code>. Tokens are the idea that makes CDK feel odd for a day and obvious forever after, and stack outputs are how you show the real
        values to people.
      </>
    ),
    keyTakeaways: [
      <>A <strong>token</strong> stands for a value that CloudFormation only knows at deploy time: a generated name, an ARN, an endpoint URL.</>,
      <>You can put tokens in strings (template literals and f-strings). CDK turns the result into <code>Fn::Join</code>.</>,
      <>Don&apos;t compare or branch on a token&apos;s value, and don&apos;t print it expecting the real name. Pass it onward, or export it with a <code>CfnOutput</code>.</>,
    ],
    sections: [
      {
        title: h(FiLink, "What a token is"),
        paragraphs: [
          <>
            While your program runs, there is no bucket yet, so there is no bucket name. <code>bucket.bucketName</code> returns a string that <em>looks</em> like <code>${"{Token[TOKEN.123]}"}</code>: a marker. When
            CDK writes the template, it replaces the marker with the reference that CloudFormation understands: <code>{"{ \"Ref\": \"CardsBucket685ECB20\" }"}</code>.
          </>,
        ],
        codeSnippets: [
          dual(
            "Tokens inside a string",
            `const prefix = \`s3://\${bucket.bucketName}/cards/\`;
// synthesizes to: { "Fn::Join": ["", ["s3://", { "Ref": "CardsBucket…" }, "/cards/"]] }`,
            `prefix = f"s3://{bucket.bucket_name}/cards/"
# synthesizes to: { "Fn::Join": ["", ["s3://", { "Ref": "CardsBucket…" }, "/cards/"]] }`
          ),
        ],
        callout: <>Since the value is unknown while your code runs, a comparison such as <code>bucket.bucketName === &quot;x&quot;</code> (Python: <code>bucket.bucket_name == &quot;x&quot;</code>) is never true, and the length of <code>bucketName</code> (<code>len(bucket.bucket_name)</code>) measures the marker, not the name.</>,
      },
      {
        title: h(FiRepeat, "Ref, GetAtt and Join"),
        paragraphs: [
          <>Three CloudFormation functions carry nearly every token:</>,
        ],
        table: {
          headers: ["Function", "What it returns", "Example token"],
          rows: [
            [<code key="a">Ref</code>, "The resource's main identifier (often the name)", <code key="a1">bucket.bucketName</code>],
            [<code key="b">Fn::GetAtt</code>, "Another attribute, such as the ARN", <code key="b1">table.tableArn</code>],
            [<code key="c">Fn::Join</code>, "Several pieces glued into a string", "Any string that contains a token"],
          ],
        },
      },
      {
        title: h(FiFileText, "Stack outputs"),
        paragraphs: [
          <>
            A <code>CfnOutput</code> publishes a value after a deploy: it appears in the CLI, in the console, and can be exported for other stacks. Use outputs for what people and pipelines need: an API URL, a bucket
            name, a table ARN.
          </>,
        ],
        codeSnippets: [
          dual(
            "Export the real values",
            `new cdk.CfnOutput(this, "CardsBucketName", { value: bucket.bucketName });
new cdk.CfnOutput(this, "PokedexTableArn", { value: table.tableArn });`,
            `cdk.CfnOutput(self, "CardsBucketName", value=bucket.bucket_name)
cdk.CfnOutput(self, "PokedexTableArn", value=table.table_arn)`
          ),
        ],
        postTableParagraphs: [
          <>
            In the exercise you also fix <code>CARD_PREFIX</code>, which guesses the bucket name. The starter&apos;s message explains why the guess would fail only after deploy, which is the worst time to find out.
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>Your code reads <code>bucket.bucketName</code> and logs it during <code>cdk synth</code>. What do you see?</>,
      options: [
        "A) The real bucket name",
        "B) An empty string",
        "C) An error, because buckets have no name",
        "D) A placeholder token such as ${Token[TOKEN.123]}, because the real name only exists after deployment",
      ],
      answer: <>The name is generated by CloudFormation at deploy time, so synth only has a marker. Pass it on to other constructs or to a <code>CfnOutput</code>; don&apos;t inspect it.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-7": {
    intro: (
      <>
        Trainers don&apos;t call Lambda directly. They call a URL. API Gateway provides the front door: paths, methods, throttling and a stage name. CDK describes it with a few lines per route.
      </>
    ),
    keyTakeaways: [
      <>A REST API is built from <strong>resources</strong> (path segments), <strong>methods</strong> (GET, POST …) and <strong>integrations</strong> (what answers).</>,
      <>A <code>{"{number}"}</code> segment is a path parameter. Lambda receives it in <code>event.pathParameters</code> (in a Python handler, <code>event[&quot;pathParameters&quot;]</code>).</>,
      <>CDK creates the deployment, the stage and the permission for API Gateway to invoke the function. You write none of that.</>,
    ],
    sections: [
      {
        title: h(FiCloud, "A REST API"),
        paragraphs: [
          <>
            <code>apigw.RestApi</code> creates the API; <code>deployOptions</code> configures the stage. The default stage is <code>prod</code>; many teams name it after the API version instead, here <code>v1</code>.
          </>,
        ],
        codeSnippets: [
          dual(
            "Create the API",
            `import * as apigw from "aws-cdk-lib/aws-apigateway";

const api = new apigw.RestApi(this, "PokedexApi", {
  deployOptions: { stageName: "v1" },
});`,
            `from aws_cdk import aws_apigateway as apigw

api = apigw.RestApi(self, "PokedexApi",
    deploy_options=apigw.StageOptions(stage_name="v1"),
)`
          ),
        ],
      },
      {
        title: h(FiGitBranch, "Resources and methods"),
        paragraphs: [
          <>
            <code>api.root</code> is the <code>/</code> resource. <code>addResource</code> adds one path segment, and <code>addMethod</code> attaches a verb with an integration. A <code>LambdaIntegration</code>{" "}
            calls the function in proxy mode: API Gateway passes the whole request in, and the function returns the status code and body.
          </>,
        ],
        codeSnippets: [
          dual(
            "GET /pokemon/{number}",
            `api.root
  .addResource("pokemon")
  .addResource("{number}")
  .addMethod("GET", new apigw.LambdaIntegration(lookupFn));`,
            `api.root \\
    .add_resource("pokemon") \\
    .add_resource("{number}") \\
    .add_method("GET", apigw.LambdaIntegration(lookup_fn))`
          ),
        ],
        bullets: [
          <>Don&apos;t reach for <code>addProxy</code> or an <code>ANY</code> method: that sends every path and verb to one function and gives up per-route throttling, validation and authorization.</>,
          <>The same <code>pokemon</code> resource can hold more methods later (<code>POST</code> for new entries) without repeating the path.</>,
        ],
      },
      {
        title: h(FiShield, "What CDK adds for you"),
        paragraphs: [
          <>
            Check the exercise output: besides <code>AWS::ApiGateway::RestApi</code>, <code>Resource</code> and <code>Method</code>, CDK adds a <code>Deployment</code>, a <code>Stage</code> and{" "}
            <code>AWS::Lambda::Permission</code> resources. Without the permission, API Gateway can&apos;t invoke the function and callers get a 500 &ldquo;Internal server error&rdquo;, a classic hand-written-template bug. The integration
            makes it for you, one for the test console and one for real traffic.
          </>,
        ],
        callout: <>REST APIs are one of several choices. HTTP APIs (<code>aws-apigatewayv2</code>) are cheaper and simpler when you don&apos;t need API keys, usage plans or request validation, and Function URLs skip API Gateway entirely.</>,
      },
    ],
    quiz: {
      prompt: <>You want <code>GET /pokemon/252</code> to reach the lookup function. Which construct chain is right?</>,
      options: [
        "A) api.root → addResource(\"pokemon\") → addResource(\"{number}\") → addMethod(\"GET\", new LambdaIntegration(fn))",
        "B) A RestApi with a single addProxy(), so every route works automatically",
        "C) A Lambda function with a public URL and no API Gateway",
        "D) A CfnOutput with the path",
      ],
      answer: <>Resources build the path, the method adds the verb, and the integration names who answers. Explicit routes keep throttling, auth and validation per route.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-8": {
    intro: (
      <>
        When a new sprite lands in the bucket, a function should create a thumbnail. S3 event notifications do exactly that, and they hide one of the most expensive bugs in serverless: a function that triggers itself
        forever.
      </>
    ),
    keyTakeaways: [
      <><code>bucket.addEventNotification</code> subscribes a function to events such as <code>OBJECT_CREATED</code>. CDK wires the invoke permission for you.</>,
      <>If a function writes into the same bucket it listens to, filter by <strong>prefix</strong> and <strong>suffix</strong> so its own output can&apos;t trigger it.</>,
      <>Behind the scenes CDK uses a custom resource to set the bucket&apos;s notification configuration.</>,
    ],
    sections: [
      {
        title: h(FiZap, "Subscribe a function"),
        paragraphs: [
          <>
            An event notification has an <strong>event type</strong>, a <strong>destination</strong> and optional <strong>filters</strong>. The destination classes live in <code>aws-s3-notifications</code>:{" "}
            <code>LambdaDestination</code>, <code>SqsDestination</code> and <code>SnsDestination</code>.
          </>,
        ],
        codeSnippets: [
          dual(
            "Thumbnail on upload",
            `import * as s3n from "aws-cdk-lib/aws-s3-notifications";

bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(processorFn),
  { prefix: "sprites/originals/", suffix: ".png" },
);`,
            `from aws_cdk import aws_s3_notifications as s3n

bucket.add_event_notification(
    s3.EventType.OBJECT_CREATED,
    s3n.LambdaDestination(processor_fn),
    s3.NotificationKeyFilter(prefix="sprites/originals/", suffix=".png"),
)`
          ),
        ],
      },
      {
        title: h(FiRepeat, "The infinite loop"),
        paragraphs: [
          <>
            The processor reads <code>sprites/originals/0252-treecko.png</code> and writes <code>sprites/thumbs/0252-treecko.png</code> into the <em>same bucket</em>. If the notification has no filter, that new
            object is also an <code>OBJECT_CREATED</code> event, which invokes the function, which writes another object. Each invocation triggers the next, one after another, and Lambda&apos;s recursive-loop detection may eventually cut it off, but you have already paid for every invocation and every object written.
          </>,
          <>
            Two defences, both cheap: use filters so the function only sees inputs, or write outputs to a different bucket. The starter in the exercise has the loop; the checker tests which keys your filter would
            match, the way S3 would.
          </>,
        ],
        callout: <>Related: in the Learn S3 course, the events quest shows the notification from the S3 side. The filter rules are the same.</>,
      },
      {
        title: h(FiFileText, "A hidden custom resource"),
        paragraphs: [
          <>
            CloudFormation can only declare a bucket&apos;s notification configuration on the bucket itself, which would make the bucket depend on the function and the function&apos;s permission depend on the bucket.
            CDK avoids that cycle with a custom resource, <code>Custom::S3BucketNotifications</code>, backed by a small Lambda function. You will see it, and its role, in the template.
          </>,
          <>
            If you already manage the bucket&apos;s notifications in the console or another stack, importing the bucket and adding a notification can overwrite them. Know who owns the configuration.
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>A function writes thumbnails to <code>sprites/thumbs/</code> in the same bucket that triggers it. Which setup avoids a loop and still processes new PNGs?</>,
      options: [
        "A) No filter, with a lower memory size",
        "B) A prefix filter of sprites/originals/ and a suffix filter of .png",
        "C) A suffix filter of .png only",
        "D) A longer function timeout",
      ],
      answer: <>The suffix alone would still match <code>sprites/thumbs/…png</code>. The prefix keeps the function to inputs. Memory or timeout don&apos;t stop a function from being re-invoked.</>,
    },
  },
};
