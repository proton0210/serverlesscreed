import { FiAlertTriangle, FiBox, FiCheckCircle, FiCompass, FiDollarSign, FiEye, FiGitBranch, FiLayers, FiPackage, FiRepeat, FiShield, FiTag, FiTool } from "react-icons/fi";
import { dual, h, plain, type RawContent } from "./shared";

export const part3: RawContent = {
  // -------------------------------------------------------------------------
  "quest-9": {
    intro: (
      <>
        One stack class, several environments. The Pokédex needs a throwaway dev copy that anyone can delete, and a production copy that must never lose a card. In CDK that difference is a few lines of code, not a
        second project.
      </>
    ),
    keyTakeaways: [
      <>Make the stack a class with <strong>props</strong>, then instantiate it once per environment with different ids and settings.</>,
      <>Decide removal behaviour per environment: <code>DESTROY</code> + auto-delete for dev, <code>RETAIN</code> for prod.</>,
      <><code>terminationProtection</code> makes CloudFormation refuse to delete a stack. <code>Tags.of(app).add(…)</code> tags every taggable resource beneath the app.</>,
    ],
    sections: [
      {
        title: h(FiLayers, "One class, many stacks"),
        paragraphs: [
          <>
            A stack is just a class. Give it a prop such as <code>stage</code> and it can create the same resources with different settings. Each instance needs a different <strong>id</strong>, because the id is
            the CloudFormation stack name.
          </>,
        ],
        codeSnippets: [
          dual(
            "Stage-aware stack",
            `interface PokedexProps extends cdk.StackProps {
  stage: "dev" | "prod";
}

export class PokedexStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: PokedexProps) {
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
});`,
            `class PokedexStack(cdk.Stack):
    def __init__(self, scope: Construct, construct_id: str, *, stage: str, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        is_prod = stage == "prod"
        s3.Bucket(self, "CardsBucket",
            versioned=True,
            removal_policy=cdk.RemovalPolicy.RETAIN if is_prod else cdk.RemovalPolicy.DESTROY,
            auto_delete_objects=not is_prod,
        )


app = cdk.App()
PokedexStack(app, "PokedexDev", stage="dev")
PokedexStack(app, "PokedexProd", stage="prod",
             termination_protection=True,
             env=cdk.Environment(region="ap-south-1"))`
          ),
        ],
      },
      {
        title: h(FiAlertTriangle, "Protect production"),
        paragraphs: [
          <>
            Prod keeps its bucket, and the stack itself can&apos;t be deleted until someone turns termination protection off: two independent safeguards against the same mistake. Dev stays easy to throw away, so
            people actually delete it, which keeps cost down.
          </>,
          <>
            For real accounts, split environments across <strong>accounts</strong>, not just stacks: a mistake in dev can then never touch prod data. <code>env</code> takes <code>account</code> and{" "}
            <code>region</code>; the exercise uses only the Region so it stays account-neutral.
          </>,
        ],
      },
      {
        title: h(FiTag, "Tags"),
        paragraphs: [
          <>
            Tags are how cost reports and policies find your resources. Because constructs form a tree, you tag a node and everything below it inherits the tag. Put the project tag on the app, and every bucket,
            table and function in every stack carries it.
          </>,
        ],
        codeSnippets: [
          dual(
            "Tag the whole app",
            `cdk.Tags.of(app).add("Project", "Pokedex");`,
            `cdk.Tags.of(app).add("Project", "Pokedex")`
          ),
        ],
        callout: <>Branching on <code>stage</code> is fine because it is a plain value you pass in. Branching on a token (Quest 6) is not: the real value doesn&apos;t exist yet.</>,
      },
    ],
    quiz: {
      prompt: <>What should the production stack do differently from dev, to protect the Pokédex data?</>,
      options: [
        "A) Use DESTROY with autoDeleteObjects, so it is easy to rebuild",
        "B) Use a different construct id for each resource",
        "C) Nothing: CloudFormation never deletes data",
        "D) Use RETAIN for stateful resources and turn on terminationProtection",
      ],
      answer: <>RETAIN keeps the bucket when the stack is removed, and termination protection stops the stack being deleted by accident. Dev uses DESTROY so it can be cleaned up completely.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-10": {
    intro: (
      <>
        Infrastructure is code, so you can test it. CDK&apos;s <strong>assertions</strong> module synthesizes your stack in memory and lets you check the template. It runs in milliseconds and never touches AWS.
      </>
    ),
    keyTakeaways: [
      <><code>Template.fromStack(stack)</code> gives you the synthesized template to assert against.</>,
      <><strong>Fine-grained assertions</strong> (<code>hasResourceProperties</code>, <code>resourceCountIs</code>) check what you care about; snapshot tests catch every change.</>,
      <>A test with no assertions can&apos;t fail. Test the properties that protect users: encryption, versioning, public access, billing, retention.</>,
    ],
    sections: [
      {
        title: h(FiCheckCircle, "Fine-grained assertions"),
        paragraphs: [
          <>
            Create the stack inside the test, take its template, and assert. <code>hasResourceProperties</code> passes when some resource of that type contains <em>at least</em> the properties you list; extra properties
            are ignored. <code>resourceCountIs</code> pins how many resources of a type exist.
          </>,
        ],
        codeSnippets: [
          dual(
            "A test (assumes the full Pokédex stack from the earlier quests)",
            `import { App } from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { PokedexStack } from "../lib/pokedex-stack";

test("cards are versioned and the table is on demand", () => {
  const stack = new PokedexStack(new App(), "TestStack", { stage: "dev" });
  const template = Template.fromStack(stack);

  template.hasResourceProperties("AWS::S3::Bucket", {
    VersioningConfiguration: { Status: "Enabled" },
  });
  template.hasResourceProperties("AWS::DynamoDB::Table", {
    BillingMode: "PAY_PER_REQUEST",
  });
  template.resourceCountIs("AWS::DynamoDB::Table", 1);
});`,
            `import aws_cdk as cdk
from aws_cdk.assertions import Template, Match
from pokedex.pokedex_stack import PokedexStack


def test_cards_are_versioned_and_table_on_demand():
    stack = PokedexStack(cdk.App(), "TestStack", stage="dev")
    template = Template.from_stack(stack)

    template.has_resource_properties("AWS::S3::Bucket", {
        "VersioningConfiguration": {"Status": "Enabled"},
    })
    template.has_resource_properties("AWS::DynamoDB::Table", {
        "BillingMode": "PAY_PER_REQUEST",
    })
    template.resource_count_is("AWS::DynamoDB::Table", 1)`
          ),
        ],
      },
      {
        title: h(FiEye, "Matchers"),
        paragraphs: [
          <>
            Template values are CloudFormation JSON, so tokens show up as <code>Ref</code> objects. <code>Match</code> helpers let you assert on the shape without writing out every key:{" "}
            <code>Match.objectLike</code> (the default for nested objects), <code>Match.arrayWith</code>, <code>Match.anyValue</code> and <code>Match.absent</code>.
          </>,
        ],
        codeSnippets: [
          dual(
            "A matcher",
            `template.hasResourceProperties("AWS::Lambda::Function", {
  Environment: { Variables: { TABLE_NAME: Match.anyValue() } },
});`,
            `template.has_resource_properties("AWS::Lambda::Function", {
    "Environment": {"Variables": {"TABLE_NAME": Match.any_value()}},
})`
          ),
        ],
      },
      {
        title: h(FiCompass, "What to test"),
        paragraphs: [
          <>
            Don&apos;t assert every property: the test will break on harmless changes and people will stop trusting it. Assert decisions someone could regress by accident.
          </>,
        ],
        bullets: [
          <><strong>Safety</strong>: public access blocked, encryption on, versioning on, termination protection in prod.</>,
          <><strong>Data</strong>: removal policy and deletion policy of stateful resources, key schemas.</>,
          <><strong>Wiring</strong>: the function has the table name; the right function is behind each route.</>,
          <><strong>Snapshots</strong>: useful for a large construct library, where any change should be a deliberate review.</>,
        ],
        callout: <>The exercise&apos;s test starts with no assertions at all: it &ldquo;passes&rdquo; forever. Add the three that matter.</>,
      },
    ],
    quiz: {
      prompt: <>Which test would have caught a table accidentally switched to provisioned billing?</>,
      options: [
        "A) template.hasResourceProperties(\"AWS::DynamoDB::Table\", { BillingMode: \"PAY_PER_REQUEST\" })",
        "B) A test that only checks Template.fromStack() doesn't throw",
        "C) A snapshot test that is updated whenever it fails",
        "D) A test that asserts the table has a partition key",
      ],
      answer: <>An explicit assertion on <code>BillingMode</code> fails the moment it changes. Synthesizing without asserting only proves the code runs, and an unreviewed snapshot is updated without anyone reading it.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-11": {
    intro: (
      <>
        Two buckets, two teams, the same checklist every time: versioned, encrypted, private, TLS-only. Copy-paste works until someone forgets one line. A <strong>custom construct</strong> turns the checklist into
        code that every team imports.
      </>
    ),
    keyTakeaways: [
      <>A construct is a class that extends <code>Construct</code>. Its children use <code>this</code> (or <code>self</code>) as their scope.</>,
      <>The construct&apos;s id becomes part of its children&apos;s path, so two instances never collide: <code>Cards/Bucket</code> and <code>Sprites/Bucket</code>.</>,
      <>Expose the pieces callers need (the inner bucket), and keep the defaults you want to enforce inside.</>,
    ],
    sections: [
      {
        title: h(FiPackage, "Compose"),
        paragraphs: [
          <>
            A custom construct is the same pattern you have used all along: <code>(scope, id, props)</code>. Inside the constructor, create other constructs and pass <code>this</code> as their scope. The result is a
            subtree that behaves like one component.
          </>,
        ],
        codeSnippets: [
          dual(
            "SecureBucket",
            `export class SecureBucket extends Construct {
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

// In the stack:
new SecureBucket(this, "Cards");
new SecureBucket(this, "Sprites");`,
            `class SecureBucket(Construct):
    def __init__(self, scope: Construct, construct_id: str) -> None:
        super().__init__(scope, construct_id)
        self.bucket = s3.Bucket(self, "Bucket",
            versioned=True,
            encryption=s3.BucketEncryption.S3_MANAGED,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            enforce_ssl=True,
        )


# In the stack:
SecureBucket(self, "Cards")
SecureBucket(self, "Sprites")`
          ),
        ],
      },
      {
        title: h(FiGitBranch, "Paths and logical IDs"),
        paragraphs: [
          <>
            Logical IDs come from the construct path, so the buckets are <code>Cards/Bucket</code> and <code>Sprites/Bucket</code>, and their logical IDs look like <code>CardsBucketD3B90174</code> and{" "}
            <code>SpritesBucket622D65C5</code>. Run the exercise and read both IDs and their <code>aws:cdk:path</code> metadata.
          </>,
          <>
            This is the whole reason the id is mandatory: it makes composition safe. A construct can be used ten times in one stack without any author thinking about name clashes. Reusing an id among siblings fails
            with <em>&ldquo;There is already a Construct with name …&rdquo;</em>.
          </>,
        ],
        callout: <>Moving a construct into a wrapper changes its path, so its logical ID changes too. If you refactor an existing stateful resource into a construct, use <code>stack.renameLogicalId</code> or an escape hatch, or CloudFormation will replace it.</>,
      },
      {
        title: h(FiBox, "Sharing it"),
        paragraphs: [
          <>
            A construct library is an ordinary package (npm, PyPI). Teams add the dependency and get the defaults. Keep the surface small: expose props for what truly varies, not every property of the bucket, so the
            safe choice is also the easy one. Add a test per default (Quest 10) so a refactor can&apos;t quietly weaken it.
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>Why can <code>new SecureBucket(this, &quot;Cards&quot;)</code> and <code>new SecureBucket(this, &quot;Sprites&quot;)</code> both create an inner bucket with id <code>&quot;Bucket&quot;</code>?</>,
      options: [
        "A) CDK silently renames one of them",
        "B) It doesn't: this throws an error",
        "C) Ids only have to be unique among siblings. The inner buckets have different parents, so their paths differ",
        "D) Only the second one is created",
      ],
      answer: <>The identity is the whole path from the root: <code>Cards/Bucket</code> and <code>Sprites/Bucket</code>. That is what lets constructs be reused freely.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-12": {
    intro: (
      <>
        This final quest is the launch review: you work through the checklist, fix a production stack, and pass one question. The code is written and tested, so the questions left are about safety, change and cost. Before launch, a champion asks the boring, valuable questions: what exactly will change, who is allowed to change it, what can&apos;t be undone, and what will it cost? This
        quest is a checklist you can reuse on any CDK app.
      </>
    ),
    keyTakeaways: [
      <>Always read <code>cdk diff</code> before <code>cdk deploy</code>. Look for <strong>replacements</strong> and IAM changes first.</>,
      <><code>cdk bootstrap</code> prepares each account and Region once. Deployments in CI use the roles it creates.</>,
      <>Automate with a pipeline, scan for misconfigurations, keep stateful resources protected, and know your escape hatches.</>,
    ],
    sections: [
      {
        title: h(FiEye, "Read the diff"),
        paragraphs: [
          <>
            <code>cdk diff</code> compares your synthesized template with the deployed stack and prints what would change. Two things deserve a pause: a resource marked <strong>replace</strong> (CloudFormation will
            create a new one and delete the old, which for a table or bucket can mean data loss), and any change to <strong>IAM statements</strong>. Make the diff part of code review.
          </>,
        ],
        codeSnippets: [
          plain(
            "bash",
            "Before every deploy",
            `cdk diff PokedexProd
# [~] AWS::DynamoDB::Table PokedexTable PokedexTable<hash> replace   <- stop and ask why
# "IAM Statement Changes" lists every new permission                  <- read them`
          ),
        ],
      },
      {
        title: h(FiTool, "Bootstrapping"),
        paragraphs: [
          <>
            Before the first deploy to an account and Region you run <code>cdk bootstrap aws://ACCOUNT/REGION</code>. It creates the <code>CDKToolkit</code> stack: an asset bucket, an image repository, and roles for
            deploying, publishing and looking up context. Lookups need a concrete account and Region, so real apps pin both in <code>env</code>; bootstrapping then prepares that account and Region to receive deployments.
          </>,
        ],
        bullets: [
          <>Run it once per account and Region, and again when a new CDK version needs a newer bootstrap template.</>,
          <>Use a custom qualifier or a permissions boundary if your organization requires one.</>,
        ],
      },
      {
        title: h(FiRepeat, "Pipelines"),
        paragraphs: [
          <>
            Deploying from a laptop doesn&apos;t scale. <code>CodePipeline</code> from <code>aws-cdk-lib/pipelines</code> builds a self-mutating pipeline: you push, it synthesizes, tests, and deploys to each stage
            in order. You can also use GitHub Actions or any CI, calling <code>cdk deploy</code> with OIDC credentials, so there are no long-lived keys.
          </>,
          <>Pipelines give you the place for approvals: a manual gate before production, and the test suite from Quest 10 before anything deploys.</>,
        ],
      },
      {
        title: h(FiShield, "Guardrails"),
        paragraphs: [
          <>
            <strong>cdk-nag</strong> is an open-source Aspect (open source, maintained under the cdklabs organization) that checks your constructs against rule packs (AWS Solutions, HIPAA, NIST, PCI) and fails the synth on findings. CDK&apos;s own{" "}
            <strong>Aspects</strong> let you enforce your own rules across a whole app, like &ldquo;every bucket is encrypted&rdquo;. Add <code>RemovalPolicy</code> review, termination protection and the tests
            from before, and you have defence in depth.
          </>,
        ],
        table: {
          headers: ["Risk", "Guardrail"],
          rows: [
            ["Data loss on replacement or delete", "RETAIN, termination protection, reading cdk diff"],
            ["Overly broad permissions", "Grants, cdk-nag, IAM Access Analyzer"],
            ["Insecure defaults", "Custom constructs, Aspects, tests"],
            ["Surprise cost", "On-demand vs provisioned decisions, tags, budgets"],
            ["Drift from the template", "CloudFormation drift detection, no console edits"],
          ],
        },
      },
      {
        title: h(FiDollarSign, "Cost and escape hatches"),
        paragraphs: [
          <>
            CDK itself is free: you pay for the resources it creates. Tag everything (Quest 9), delete dev stacks, and prefer pay-per-use services for spiky workloads. When an L2 doesn&apos;t expose a property yet, use
            an <strong>escape hatch</strong>: reach the underlying L1 with <code>bucket.node.defaultChild</code> and set the raw CloudFormation property.
          </>,
        ],
        codeSnippets: [
          dual(
            "Escape hatch",
            `const cfnBucket = bucket.node.defaultChild as s3.CfnBucket;
// A property the L2 does not expose yet (placeholder name):
cfnBucket.addPropertyOverride("NewCloudFormationProperty", "value");`,
            `cfn_bucket = bucket.node.default_child
# A property the L2 does not expose yet (placeholder name):
cfn_bucket.add_property_override("NewCloudFormationProperty", "value")`
          ),
        ],
        callout: <>Next steps: build something small and real, then read the CDK API reference and the AWS Solutions Constructs library.</>,
      },
    ],
    quiz: {
      prompt: <>In <code>cdk diff</code> for production, a DynamoDB table is marked as <em>replace</em> after a small key change. What do you do?</>,
      options: [
        "A) Deploy: the diff is just informational",
        "B) Stop. A replacement creates a new, empty table and deletes the old one. Find a way to avoid it, or plan a migration first",
        "C) Deploy and restore from backup if needed",
        "D) Switch to a different AWS Region",
      ],
      answer: <>Replacement is the most dangerous word in a diff. Revert the change, give the construct its old id or key, or migrate the data on purpose.</>,
    },
  },
};
