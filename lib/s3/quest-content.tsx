import type { IconType } from "react-icons";
import {
  FiArchive, FiBell, FiBox, FiCheckCircle, FiClock, FiCloud, FiDatabase, FiDownload, FiEye, FiFileText, FiFolder,
  FiGitBranch, FiKey, FiLayers, FiLink, FiList, FiLock, FiRepeat, FiShield, FiTrendingUp, FiUploadCloud, FiZap,
} from "react-icons/fi";
import { nodeText } from "@/components/learn/lesson/node-text";
import { PrefixExplorer } from "@/components/s3/prefix-explorer";
import { LifecycleTimeline } from "@/components/s3/lifecycle-timeline";
import { withKeys } from "@/lib/learn/with-keys";
import type { QuestContent } from "@/lib/learn/types";

const h = (Icon: IconType, label: string) => (
  <span className="inline-flex items-center gap-2">
    <Icon aria-hidden className="h-5 w-5" />
    <span>{label}</span>
  </span>
);

const client = `import { S3Client } from "@aws-sdk/client-s3";

// One client per Region, created once and reused.
const client = new S3Client({ region: "ap-south-1" });`;

const raw: Record<string, QuestContent> = {
  // -------------------------------------------------------------------------
  "quest-1": {
    intro: (
      <>
        Professor Birch&apos;s Pokédex team has cards, sprites and battle replays scattered across laptops. Amazon S3 will hold all of it. Before the first upload you need a{" "}
        <strong>bucket</strong>, and you need to understand what S3 means by a <strong>key</strong>.
      </>
    ),
    keyTakeaways: [
      <>An S3 object is bytes plus metadata, stored under a key inside a bucket.</>,
      <>General purpose bucket names are global across all AWS accounts, so they must be unique — and they follow strict naming rules.</>,
      <>S3 has no folders: a key like <code>sprites/grass/0252-treecko.png</code> is one string, and the slashes only look like folders.</>,
    ],
    sections: [
      {
        title: h(FiBox, "Buckets and objects"),
        paragraphs: [
          <>S3 stores <strong>objects</strong>. An object is the data itself (a JSON card, a PNG, an 80 GiB video) plus metadata such as its content type and size.</>,
          <>Objects live in <strong>buckets</strong>. A bucket belongs to one AWS Region, and the data in it stays in that Region unless you copy or replicate it somewhere else.</>,
          <>An account can create up to 10,000 general purpose buckets by default (you can ask for more). Most applications need only a few: one per environment or data set, not one per user.</>,
        ],
        callout: <>Think of the bucket as the Pokédex archive building and each object as one labelled item on its shelves. The label is the key.</>,
      },
      {
        title: h(FiKey, "Naming a bucket"),
        paragraphs: [
          <>A general purpose bucket name must be unique across every AWS account in the partition, not just yours. If someone anywhere already owns <code>hoenn-pokedex</code>, you can&apos;t have it.</>,
        ],
        bullets: [
          <>3–63 characters: lowercase letters, numbers, hyphens (<code>-</code>) and dots (<code>.</code>).</>,
          <>Must begin and end with a letter or number. No uppercase, no underscores, no two dots in a row.</>,
          <>Can&apos;t look like an IP address, and can&apos;t use reserved prefixes (<code>xn--</code>, <code>sthree-</code>) or suffixes (<code>-s3alias</code>, <code>--ol-s3</code>).</>,
          <>Avoid dots unless you need them for static website hosting: they break virtual-hosted-style HTTPS certificates.</>,
        ],
        postTableParagraphs: [<>Add something that makes the name yours — a team name, the environment and a short random suffix, like <code>hoenn-pokedex-prod-4821</code>.</>],
      },
      {
        title: h(FiCloud, "Choosing the Region"),
        paragraphs: [
          <>Create the bucket in the Region closest to the users and services that read it. The Region is part of the bucket&apos;s identity: you can&apos;t move a bucket later, only copy its objects.</>,
          <>
            When your client sends a <code>CreateBucket</code> request to any Region other than <code>us-east-1</code>, S3 needs the Region repeated in{" "}
            <code>CreateBucketConfiguration.LocationConstraint</code>. Leave it out and you get <code>IllegalLocationConstraintException</code>.
          </>,
        ],
        codeSnippets: [
          {
            language: "javascript",
            label: "Create a bucket in Mumbai",
            code: `${client}
import { CreateBucketCommand } from "@aws-sdk/client-s3";

await client.send(
  new CreateBucketCommand({
    Bucket: "hoenn-pokedex-prod-4821",
    CreateBucketConfiguration: { LocationConstraint: "ap-south-1" },
  })
);`,
          },
        ],
      },
      {
        title: h(FiFolder, "Keys, not folders"),
        paragraphs: [
          <>
            Every object has a <strong>key</strong> — a UTF-8 string of up to 1,024 bytes that is unique within the bucket. The bucket is a flat map from keys to objects. The
            key <code>sprites/grass/0252-treecko.png</code> doesn&apos;t live &ldquo;inside&rdquo; a <code>grass</code> folder; the whole string is the name.
          </>,
          <>
            The console shows folders because it groups keys that share a <strong>prefix</strong> up to a <strong>delimiter</strong> (usually <code>/</code>). You&apos;ll use
            the same trick in code in Quest 4. Design keys so the prefixes match the way you&apos;ll list and secure data: <code>cards/</code>, <code>sprites/&lt;type&gt;/</code>,{" "}
            <code>replays/&lt;year&gt;/</code>.
          </>,
        ],
        table: {
          headers: ["Key", "What it tells you"],
          rows: [
            [<code key="a">cards/0252-treecko.json</code>, "A Pokédex card; the number keeps cards sorted."],
            [<code key="b">sprites/grass/0252-treecko.png</code>, "A sprite, grouped by type so you can list one type at a time."],
            [<code key="c">replays/2026/hoenn-league-final.mp4</code>, "A replay, grouped by year for lifecycle rules later."],
          ],
          caption: "Keys are case-sensitive: Treecko.json and treecko.json are different objects.",
        },
      },
    ],
    quiz: {
      prompt: <>A teammate creates a folder called <code>sprites/</code> in the S3 console and uploads <code>treecko.png</code> into it. What did S3 actually store?</>,
      options: [
        "A) A directory object and a file inside it, like a file system",
        "B) An object with the key sprites/treecko.png (plus, from the console, an empty sprites/ placeholder object)",
        "C) Two buckets: sprites and treecko.png",
        "D) Nothing until the folder is saved",
      ],
      answer: <>S3 is flat. The console creates a zero-byte <code>sprites/</code> object so the empty &ldquo;folder&rdquo; shows up, and the upload is stored under the full key <code>sprites/treecko.png</code>.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-2": {
    intro: (
      <>
        Time to store the first card: Treecko, #252, the Grass-type starter of Hoenn. One <code>PutObject</code> call uploads it — but a few extra fields decide how browsers, tools and
        caches treat it later.
      </>
    ),
    keyTakeaways: [
      <><code>PutObject</code> uploads a whole object (up to 5 GiB) and replaces anything already stored under that key.</>,
      <>Set <code>ContentType</code> on every upload, and use user metadata for small facts about the object.</>,
      <>S3 is strongly consistent: once a write succeeds, every read and listing sees it.</>,
    ],
    sections: [
      {
        title: h(FiUploadCloud, "Uploading with PutObject"),
        paragraphs: [
          <>
            <code>PutObjectCommand</code> takes the bucket, the key and a <code>Body</code> — a string, a <code>Buffer</code>, a <code>Uint8Array</code> or a stream. A single
            PUT can upload up to 5 GiB; above that (and usually above 100 MB) you use multipart upload, which is Quest 8.
          </>,
          <>If an object already exists under the key, the PUT replaces it. There&apos;s no &ldquo;insert only&rdquo; by default — Quest 6 shows how to ask for one.</>,
        ],
        codeSnippets: [
          {
            language: "javascript",
            label: "Upload a card",
            code: `import { PutObjectCommand } from "@aws-sdk/client-s3";

const card = { number: 252, name: "Treecko", types: ["grass"], region: "Hoenn" };

const { ETag } = await client.send(
  new PutObjectCommand({
    Bucket: "hoenn-pokedex-media",
    Key: "cards/0252-treecko.json",
    Body: JSON.stringify(card),
    ContentType: "application/json",
    Metadata: { generation: "3" },
  })
);`,
          },
        ],
      },
      {
        title: h(FiFileText, "Content type and metadata"),
        paragraphs: [
          <>
            S3 doesn&apos;t guess types from file names. Without <code>ContentType</code> the object is served as <code>binary/octet-stream</code>, so a browser downloads your
            card instead of displaying it and CloudFront can&apos;t compress it.
          </>,
          <>
            <strong>User metadata</strong> is a set of string key–value pairs sent as <code>x-amz-meta-*</code> headers. It comes back with every GET and HEAD, so tools can read
            the generation without downloading the card. Keep it small (2 KB in total), use lowercase keys, and remember you can&apos;t search by it — it&apos;s not an index.
          </>,
        ],
        table: {
          headers: ["Field", "Use it for"],
          rows: [
            [<code key="a">ContentType</code>, "How clients should interpret the bytes"],
            [<code key="b">CacheControl</code>, "How long browsers and CDNs may cache it"],
            [<code key="c">Metadata</code>, "Small, string-only facts about the object"],
            [<code key="d">Tagging</code>, "Labels for lifecycle rules, access control and cost reports (up to 10 per object)"],
          ],
        },
      },
      {
        title: h(FiCheckCircle, "What comes back"),
        paragraphs: [
          <>
            A successful PUT returns an <strong>ETag</strong>, a fingerprint of the object. For a single-part upload without SSE-KMS it&apos;s the MD5 of the body; for multipart
            uploads it isn&apos;t, so treat it as an opaque version marker, not a checksum. Recent AWS SDKs also add a CRC32 checksum to uploads by default, and S3 verifies it.
          </>,
          <>
            New objects are encrypted at rest with SSE-S3 automatically (you&apos;ll see <code>ServerSideEncryption: &quot;AES256&quot;</code>). And since December 2020 S3 has
            been <strong>strongly consistent</strong>: after the PUT succeeds, any GET, HEAD or LIST sees the new object — no waiting, no stale reads.
          </>,
        ],
        callout: <>Uploading from a server is fine for cards. For large files from users&apos; browsers, don&apos;t proxy the bytes through your server — Quest 7 hands the browser a presigned URL instead.</>,
      },
    ],
    quiz: {
      prompt: <>You upload <code>cards/0252-treecko.json</code> and immediately list <code>cards/</code> from another Lambda function. What does the listing show?</>,
      options: [
        "A) The old listing for a few seconds, until S3 catches up",
        "B) The new card — S3 has strong read-after-write consistency for PUTs and LISTs",
        "C) The card only if both functions run in the same Availability Zone",
        "D) Nothing until the ETag is confirmed",
      ],
      answer: <>Since December 2020, S3 is strongly consistent for GET, PUT, LIST and DELETE: a successful write is visible to every later read and listing.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-3": {
    intro: (
      <>
        The card is stored; now the Pokédex app needs it back. <code>GetObject</code> returns the bytes as a <strong>stream</strong>, <code>HeadObject</code> returns only the
        metadata, and a byte range returns just part of a large file.
      </>
    ),
    keyTakeaways: [
      <>In SDK v3, <code>GetObject</code>&apos;s <code>Body</code> is a stream; turn it into text with <code>transformToString()</code>.</>,
      <>Use <code>HeadObject</code> to check that an object exists or to read its size and metadata without downloading it.</>,
      <>Keys are exact and case-sensitive; a missing key is <code>NoSuchKey</code> (or <code>AccessDenied</code> if you can&apos;t list the bucket).</>,
    ],
    sections: [
      {
        title: h(FiDownload, "GetObject returns a stream"),
        paragraphs: [
          <>
            Objects can be gigabytes, so the SDK doesn&apos;t load the body into memory for you. <code>response.Body</code> is a stream with helper methods:
            <code>transformToString()</code>, <code>transformToByteArray()</code> and <code>transformToWebStream()</code>. Call one of them once — a stream can only be read once.
          </>,
        ],
        codeSnippets: [
          {
            language: "javascript",
            label: "Read a JSON card",
            code: `import { GetObjectCommand } from "@aws-sdk/client-s3";

const res = await client.send(
  new GetObjectCommand({ Bucket: "hoenn-pokedex-media", Key: "cards/0252-treecko.json" })
);
const card = JSON.parse(await res.Body.transformToString());
console.log(res.ContentType, res.Metadata.generation, card.name);`,
          },
        ],
        callout: <>For a replay or a large export, pipe the stream to its destination (a file, an HTTP response) instead of buffering it.</>,
      },
      {
        title: h(FiEye, "HeadObject: metadata only"),
        paragraphs: [
          <>
            <code>HeadObject</code> returns the same headers as a GET — <code>ContentLength</code>, <code>ContentType</code>, <code>ETag</code>, <code>LastModified</code>,{" "}
            <code>Metadata</code> — with no body. It&apos;s the cheap way to ask &ldquo;is it there, and how big is it?&rdquo;
          </>,
          <>Because a HEAD response has no body, a missing object shows up as a plain <code>NotFound</code> (HTTP 404) rather than <code>NoSuchKey</code>.</>,
        ],
      },
      {
        title: h(FiLayers, "Byte ranges"),
        paragraphs: [
          <>
            Add <code>Range: &quot;bytes=0-1048575&quot;</code> to fetch just the first MiB. S3 answers <code>206 Partial Content</code>. Video players use ranges to seek, and download
            tools fetch several ranges in parallel for speed.
          </>,
        ],
      },
      {
        title: h(FiKey, "When the key is wrong"),
        table: {
          headers: ["You asked for", "You get", "Why"],
          rows: [
            [<code key="a">cards/0252-Treecko.json</code>, <code key="b">NoSuchKey</code>, "Keys are case-sensitive."],
            ["A key that doesn't exist, without s3:ListBucket", <code key="c">AccessDenied</code>, "S3 won't reveal whether the key exists to callers who can't list the bucket."],
            ["An object in a Glacier Flexible or Deep Archive class", <code key="d">InvalidObjectState</code>, "It must be restored first (Quest 5)."],
          ],
        },
      },
    ],
    quiz: {
      prompt: <>Your function only needs to know whether a 4 GiB replay exists and how big it is. Which call should it make?</>,
      options: ["A) GetObject and read ContentLength", "B) HeadObject", "C) ListObjectsV2 on the whole bucket", "D) GetObject with Range: bytes=0-0"],
      answer: <><code>HeadObject</code> returns the object&apos;s metadata — including <code>ContentLength</code> — without transferring any of the body.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-4": {
    intro: (
      <>
        The archive now holds thousands of sprite frames. To show one type&apos;s gallery you&apos;ll <strong>list</strong> keys by prefix — and page through the results,
        because S3 returns at most 1,000 keys per request.
      </>
    ),
    keyTakeaways: [
      <><code>Prefix</code> filters keys by their start; <code>Delimiter</code> groups the rest into <code>CommonPrefixes</code> — the &ldquo;folders&rdquo;.</>,
      <>Each <code>ListObjectsV2</code> page has up to 1,000 keys; follow <code>NextContinuationToken</code> until <code>IsTruncated</code> is false.</>,
      <>Listing is for browsing and batch jobs, not lookups: if you know the key, GET it directly.</>,
    ],
    sections: [
      {
        title: h(FiFolder, "Prefix and delimiter"),
        paragraphs: [
          <>
            <code>Prefix</code> keeps only keys that start with that string. <code>Delimiter</code> (usually <code>/</code>) tells S3 to roll up everything after the next delimiter
            into a <code>CommonPrefixes</code> entry, so one level at a time looks like a folder listing.
          </>,
          <>A prefix is plain string matching. <code>sprites/grass</code> also matches <code>sprites/grass-old/…</code> — end it with the delimiter when you mean one folder.</>,
        ],
        visual: <PrefixExplorer />,
      },
      {
        title: h(FiList, "Pages of 1,000"),
        paragraphs: [
          <>
            Keys come back in UTF-8 binary order, up to 1,000 per response (<code>MaxKeys</code> can lower that, never raise it). When there are more,{" "}
            <code>IsTruncated</code> is <code>true</code> and <code>NextContinuationToken</code> tells S3 where to resume.
          </>,
        ],
        codeSnippets: [
          {
            language: "javascript",
            label: "The SDK paginator does the loop for you",
            code: `import { paginateListObjectsV2 } from "@aws-sdk/client-s3";

const keys = [];
for await (const page of paginateListObjectsV2(
  { client },
  { Bucket: "hoenn-pokedex-media", Prefix: "sprites/grass/" }
)) {
  for (const obj of page.Contents ?? []) keys.push(obj.Key);
}`,
          },
        ],
        callout: <>In the practice you&apos;ll write the loop by hand, so you know exactly what the paginator is doing.</>,
      },
      {
        title: h(FiTrendingUp, "Prefixes and throughput"),
        paragraphs: [
          <>
            S3 supports at least 3,500 PUT/COPY/POST/DELETE and 5,500 GET/HEAD requests per second <strong>per partitioned prefix</strong>, and there&apos;s no limit on the number
            of prefixes. If traffic grows suddenly S3 may answer <code>503 SlowDown</code> while it scales; the SDK retries with backoff.
          </>,
          <>You rarely need to design for this at Pokédex scale, but spreading hot data over several prefixes is the lever when you do (Quest 12).</>,
        ],
      },
    ],
    quiz: {
      prompt: <>You call <code>ListObjectsV2</code> with <code>Prefix: &quot;sprites/&quot;</code> and <code>Delimiter: &quot;/&quot;</code>. Where does <code>sprites/grass/0252-treecko.png</code> appear?</>,
      options: [
        "A) In Contents, as sprites/grass/0252-treecko.png",
        "B) Rolled up into CommonPrefixes as sprites/grass/",
        "C) Nowhere — delimiters hide nested keys",
        "D) In both Contents and CommonPrefixes",
      ],
      answer: <>After the prefix, the key still contains a <code>/</code>, so S3 groups it under the common prefix <code>sprites/grass/</code>. List that prefix to see the key itself.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-5": {
    intro: (
      <>
        Cards are read constantly, sprites often, and tournament replays almost never — yet every replay must play the moment someone asks. S3 <strong>storage classes</strong> let
        you pay for exactly that.
      </>
    ),
    keyTakeaways: [
      <>Every class except One Zone and Express One Zone keeps data across at least three Availability Zones; they differ in price, retrieval cost and retrieval time.</>,
      <>Infrequent-access and Glacier classes have minimum storage durations and per-GB retrieval charges.</>,
      <>Glacier Flexible Retrieval and Deep Archive need a restore before you can read the object.</>,
    ],
    sections: [
      {
        title: h(FiLayers, "The shelves"),
        table: {
          headers: ["Class", "Best for", "First byte", "Minimum duration"],
          rows: [
            [<code key="a">STANDARD</code>, "Hot data read often", "Milliseconds", "—"],
            [<code key="b">INTELLIGENT_TIERING</code>, "Unknown or changing patterns", "Milliseconds (optional archive tiers need a restore)", "—"],
            [<code key="c">STANDARD_IA</code>, "Read about once a month", "Milliseconds", "30 days"],
            [<code key="d">ONEZONE_IA</code>, "Re-creatable data, one AZ", "Milliseconds", "30 days"],
            [<code key="e">GLACIER_IR</code>, "Read a few times a year, needed instantly", "Milliseconds", "90 days"],
            [<code key="f">GLACIER</code> , "Archives you can wait minutes to hours for", "Restore: 1–5 min to 12 h", "90 days"],
            [<code key="g">DEEP_ARCHIVE</code>, "Compliance archives, rarely if ever read", "Restore: up to 12 h (48 h bulk)", "180 days"],
          ],
          caption: "GLACIER is the API name for S3 Glacier Flexible Retrieval. Infrequent-access and Glacier Instant Retrieval bill a minimum of 128 KB per object.",
        },
      },
      {
        title: h(FiClock, "Minimums and retrieval fees"),
        paragraphs: [
          <>
            Cheaper storage comes with conditions. Delete a Standard-IA object after 10 days and you still pay for 30. Read a gigabyte from Standard-IA or Glacier Instant Retrieval
            and you pay a retrieval fee per GB. Small objects are billed as if they were 128 KB.
          </>,
          <>So the right class depends on the access pattern, not just the price per GB-month. For hot, small cards, <code>STANDARD</code> is often the cheapest in total.</>,
        ],
      },
      {
        title: h(FiArchive, "Restores"),
        paragraphs: [
          <>
            Objects in Glacier Flexible Retrieval and Deep Archive aren&apos;t directly readable: <code>GetObject</code> returns <code>InvalidObjectState</code>. Call{" "}
            <code>RestoreObject</code> to make a temporary copy readable for a number of days, and wait for the restore to finish.
          </>,
        ],
      },
      {
        title: h(FiRepeat, "Intelligent-Tiering"),
        paragraphs: [
          <>
            If you can&apos;t predict access, Intelligent-Tiering moves each object between tiers for you: to an infrequent tier after 30 days without access and to an archive
            instant-access tier after 90, and back to frequent the moment it&apos;s read. It charges a small monitoring fee per object (objects under 128 KB aren&apos;t monitored
            or moved).
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>Raw sensor dumps can be regenerated from the source, are read about once a month, and must be available instantly. Which class fits best?</>,
      options: ["A) DEEP_ARCHIVE", "B) ONEZONE_IA", "C) GLACIER", "D) STANDARD"],
      answer: <>Data you can re-create doesn&apos;t need multi-AZ resilience, and monthly reads with instant access match an infrequent-access class. <code>ONEZONE_IA</code> is the cheapest fit.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-6": {
    intro: (
      <>
        A PUT to an existing key silently replaces the object. When two researchers upload Mudkip&apos;s card at once, one of them loses. <strong>Versioning</strong> keeps
        every overwrite recoverable, and <strong>conditional writes</strong> stop the overwrite from happening at all.
      </>
    ),
    keyTakeaways: [
      <>With versioning on, every write creates a new version and a delete adds a <strong>delete marker</strong> instead of removing data.</>,
      <><code>IfNoneMatch: &quot;*&quot;</code> makes a PUT create-only; <code>IfMatch: etag</code> makes it update-only-if-unchanged.</>,
      <>A failed condition returns <code>412 PreconditionFailed</code> — handle it as a normal outcome.</>,
    ],
    sections: [
      {
        title: h(FiGitBranch, "Versioning"),
        paragraphs: [
          <>
            Turn on versioning with <code>PutBucketVersioning</code>. From then on each PUT gets a new <code>VersionId</code>, and older versions stay (and are billed) as
            <strong> noncurrent versions</strong>. A bucket can be unversioned, versioning-enabled, or versioning-suspended — once enabled, it can never go back to unversioned.
          </>,
          <>
            A DELETE without a version ID adds a <strong>delete marker</strong>: GET now returns 404, but every version is still there. Delete the marker and the object is back. Only a
            DELETE with a specific <code>VersionId</code> removes data permanently.
          </>,
        ],
        callout: <>Versioning plus a lifecycle rule for noncurrent versions (Quest 9) is the usual pair: protection against mistakes without keeping every old copy forever.</>,
      },
      {
        title: h(FiShield, "Conditional writes"),
        paragraphs: [
          <>
            Versioning lets you <em>recover</em> from a lost update; a conditional write <em>prevents</em> it. S3 checks the condition atomically on the server, so no read-then-write
            race is possible.
          </>,
        ],
        table: {
          headers: ["Header", "Meaning", "Use it to"],
          rows: [
            [<code key="a">IfNoneMatch: &quot;*&quot;</code>, "Write only if no object has this key", "Create a card exactly once"],
            [<code key="b">IfMatch: &quot;&lt;etag&gt;&quot;</code>, "Write only if the current ETag matches", "Update a card you just read, without clobbering someone else's edit"],
          ],
          caption: "Both work on PutObject and CompleteMultipartUpload. If another write to the same key is in flight, S3 may answer 409 ConditionalRequestConflict — retry.",
        },
        codeSnippets: [
          {
            language: "javascript",
            label: "Optimistic update with IfMatch",
            code: `const current = await client.send(new GetObjectCommand({ Bucket, Key }));
const card = JSON.parse(await current.Body.transformToString());
card.types.push("ground"); // Marshtomp evolves!

try {
  await client.send(new PutObjectCommand({
    Bucket, Key, Body: JSON.stringify(card), ContentType: "application/json",
    IfMatch: current.ETag,
  }));
} catch (err) {
  if (err.name === "PreconditionFailed") { /* someone else changed it: re-read and retry */ }
  else throw err;
}`,
          },
        ],
      },
    ],
    quiz: {
      prompt: <>Versioning is on. You run <code>DeleteObject</code> on <code>cards/0258-mudkip.json</code> without a version ID. What happens?</>,
      options: [
        "A) All versions are permanently deleted",
        "B) The newest version is permanently deleted and the previous one becomes current",
        "C) S3 adds a delete marker; GET returns 404, and every version can still be restored",
        "D) The request fails because versioned objects can't be deleted",
      ],
      answer: <>In a versioned bucket a simple DELETE only adds a delete marker. Remove the marker (or GET a specific version) and the data is still there.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-7": {
    intro: (
      <>
        Sinnoh trainers want to submit their own sprites. Routing every upload through your server wastes bandwidth and Lambda time. A <strong>presigned URL</strong> lets the
        browser talk to S3 directly — for one operation, on one key, for a few minutes.
      </>
    ),
    keyTakeaways: [
      <>A presigned URL carries a signature made with your credentials; whoever holds it can perform exactly the signed request until it expires.</>,
      <>Sign the narrowest request: one method, one key, the content type, and a short <code>expiresIn</code>.</>,
      <>SigV4 URLs last at most 7 days, and never longer than the credentials that signed them.</>,
    ],
    sections: [
      {
        title: h(FiLink, "How presigning works"),
        paragraphs: [
          <>
            Your server builds a normal S3 request — say, <code>PutObject</code> for <code>uploads/trainer-42/sprite.png</code> — and signs it with its own credentials, but
            puts the signature in the URL&apos;s query string instead of a header. No call to AWS happens while signing.
          </>,
          <>
            The browser then sends a plain HTTP PUT to that URL. S3 checks the signature, the expiry and the signer&apos;s permissions. The browser never sees your credentials, and
            the URL is useless for any other key or method.
          </>,
        ],
        codeSnippets: [
          {
            language: "javascript",
            label: "Server: sign an upload",
            code: `import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const url = await getSignedUrl(
  client,
  new PutObjectCommand({ Bucket, Key: \`uploads/\${trainerId}/sprite.png\`, ContentType: "image/png" }),
  { expiresIn: 300 } // seconds
);`,
          },
          {
            language: "javascript",
            label: "Browser: upload the file",
            code: `await fetch(url, { method: "PUT", headers: { "Content-Type": "image/png" }, body: file });`,
          },
        ],
      },
      {
        title: h(FiClock, "Expiry"),
        bullets: [
          <><code>expiresIn</code> defaults to 900 seconds (15 minutes). Set it explicitly and keep it short: long enough to finish the upload, no longer.</>,
          <>Signature Version 4 caps it at 604,800 seconds (7 days).</>,
          <>If the signer used temporary credentials (a Lambda role, for example), the URL stops working when those credentials expire — even if <code>expiresIn</code> is longer.</>,
        ],
      },
      {
        title: h(FiShield, "Keep uploads safe"),
        bullets: [
          <>Write untrusted uploads under their own prefix (<code>uploads/</code>) and process them before promoting them to <code>sprites/</code>.</>,
          <>A presigned PUT can&apos;t limit the file size. When you need that, use a presigned <strong>POST</strong> (<code>@aws-sdk/s3-presigned-post</code>) with a <code>content-length-range</code> condition.</>,
          <>Browsers need a CORS rule on the bucket allowing <code>PUT</code> from your site&apos;s origin.</>,
          <>Anyone who gets the URL can use it. Don&apos;t log it, and don&apos;t reuse one URL for many users.</>,
        ],
      },
    ],
    quiz: {
      prompt: <>A Lambda function signs a download URL with <code>expiresIn: 604800</code>. Users report the link stops working after a few hours. Why?</>,
      options: [
        "A) S3 ignores expiresIn above 1 hour",
        "B) The function signed with temporary role credentials, and the URL can't outlive them",
        "C) Presigned URLs only work for uploads",
        "D) The bucket must enable 'long URLs'",
      ],
      answer: <>A presigned URL is only as valid as the credentials that signed it. Lambda role credentials are temporary, so the URL dies with them.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-8": {
    intro: (
      <>
        The Sinnoh League final — Dialga versus Palkia — is an 80 GiB replay. One PUT can&apos;t carry it, and one dropped connection shouldn&apos;t restart it.{" "}
        <strong>Multipart upload</strong> splits it into parts that upload in parallel and retry on their own.
      </>
    ),
    keyTakeaways: [
      <>Parts are 5 MiB–5 GiB (the last can be smaller), numbered 1–10,000; an object can reach about 50 TB (48.8 TiB).</>,
      <>Choose the part size from the file size: 10,000 parts is the ceiling.</>,
      <>Parts of an unfinished upload are billed until you complete or abort it.</>,
    ],
    sections: [
      {
        title: h(FiLayers, "Three steps"),
        paragraphs: [
          <>
            <code>CreateMultipartUpload</code> returns an <code>UploadId</code>. Each <code>UploadPart</code> sends one numbered part and returns its ETag.{" "}
            <code>CompleteMultipartUpload</code> lists every part number with its ETag, and S3 stitches them into one object.
          </>,
          <>Parts can upload in any order and in parallel; a failed part is retried alone. AWS recommends multipart once objects reach about 100 MB.</>,
        ],
        table: {
          headers: ["Limit", "Value"],
          rows: [
            ["Part size", "5 MiB to 5 GiB (last part: any size)"],
            ["Parts per upload", "1 to 10,000"],
            ["Single PUT", "Up to 5 GiB"],
            ["Largest object", "48.8 TiB (about 50 TB)"],
          ],
          caption: "Limits from the Amazon S3 User Guide. The multipart ETag ends in -<number of parts>.",
        },
      },
      {
        title: h(FiZap, "Let lib-storage do it"),
        paragraphs: [
          <>
            <code>Upload</code> from <code>@aws-sdk/lib-storage</code> runs all three steps, uploads <code>queueSize</code> parts at a time (default 4) and reports progress. Its
            default part size is 5 MiB — fine for a 1 GiB file, too small for 80 GiB: 5 MiB × 10,000 is only about 49 GiB.
          </>,
          <>Work it out: 80 GiB ÷ 10,000 ≈ 8.2 MiB, so any part size from 9 MiB up works. Bigger parts mean fewer requests; smaller ones mean less to resend when a part fails.</>,
        ],
      },
      {
        title: h(FiArchive, "Don't pay for ghosts"),
        paragraphs: [
          <>
            An upload that&apos;s never completed or aborted leaves its parts behind. They don&apos;t appear in <code>ListObjectsV2</code>, but you pay for their storage. On failure,
            lib-storage aborts the upload by default (<code>leavePartsOnError: false</code>); code that uses the low-level commands must call <code>AbortMultipartUpload</code> itself.
          </>,
          <>As a safety net, add a lifecycle rule that aborts incomplete uploads after a few days — you&apos;ll write it in the next quest.</>,
        ],
      },
    ],
    quiz: {
      prompt: <>A 200 GiB file must be uploaded. What is the smallest whole-MiB part size that works?</>,
      options: ["A) 5 MiB", "B) 16 MiB", "C) 21 MiB", "D) 5 GiB"],
      answer: <>200 GiB = 204,800 MiB; ÷ 10,000 parts = 20.48 MiB, so each part must be at least 21 MiB.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-9": {
    intro: (
      <>
        Replays are popular for a month, then gather dust. Nobody should have to move them by hand. <strong>Lifecycle rules</strong> tell S3 to change an object&apos;s storage class
        or delete it once it reaches a certain age.
      </>
    ),
    keyTakeaways: [
      <>A rule has a filter (prefix, tags, size), and actions: transitions, expiration, noncurrent-version cleanup, and aborting incomplete uploads.</>,
      <>Transitions to Standard-IA or One Zone-IA need objects to be at least 30 days old.</>,
      <>S3 applies rules asynchronously; on versioned buckets, expiration adds a delete marker.</>,
    ],
    sections: [
      {
        title: h(FiClock, "Anatomy of a rule"),
        codeSnippets: [
          {
            language: "javascript",
            label: "Archive replays, clean up after a year",
            code: `{
  ID: "replays-archive",
  Status: "Enabled",
  Filter: { Prefix: "replays/" },
  Transitions: [{ Days: 30, StorageClass: "STANDARD_IA" }],
  Expiration: { Days: 365 },
  AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
}`,
          },
        ],
        paragraphs: [
          <>
            <code>Days</code> counts from the object&apos;s creation. Rules apply to objects already in the bucket as well as new ones, and S3 evaluates them once a day, so an action
            can land a little after the exact day.
          </>,
        ],
        visual: <LifecycleTimeline />,
      },
      {
        title: h(FiLayers, "Rules S3 enforces"),
        bullets: [
          <>Objects must stay in STANDARD for at least 30 days before moving to STANDARD_IA or ONEZONE_IA; S3 rejects a rule with fewer days.</>,
          <>Transitions only go &ldquo;down&rdquo; the ladder: STANDARD → IA → Glacier Instant → Glacier Flexible → Deep Archive.</>,
          <>By default, objects smaller than 128 KB aren&apos;t transitioned — per-object transition charges would outweigh any saving.</>,
          <>Each transition is billed as a request, so moving millions of tiny objects can cost more than it saves.</>,
        ],
      },
      {
        title: h(FiGitBranch, "Lifecycle and versioning"),
        paragraphs: [
          <>
            In a versioned bucket, <code>Expiration</code> doesn&apos;t delete data: it adds a delete marker and the old version becomes noncurrent. Pair it with{" "}
            <code>NoncurrentVersionExpiration: {"{ NoncurrentDays: 30 }"}</code> to remove old versions after a grace period, and{" "}
            <code>ExpiredObjectDeleteMarker</code> to tidy up markers left with nothing behind them.
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>A rule moves <code>logs/</code> to STANDARD_IA after 7 days. What happens when you save it?</>,
      options: [
        "A) It works; objects move on day 7",
        "B) S3 rejects it: transitions to STANDARD_IA need at least 30 days",
        "C) It works, but S3 silently changes it to 30",
        "D) It only applies to objects uploaded after the rule",
      ],
      answer: <>S3 validates the rule and returns <code>InvalidArgument</code>: the minimum age for a transition to STANDARD_IA (or ONEZONE_IA) is 30 days.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-10": {
    intro: (
      <>
        The archive holds unreleased research on Giratina. It must never become public, every request must use TLS, and data must be encrypted at rest. S3&apos;s defaults do most of
        this already — as long as nobody undoes them.
      </>
    ),
    keyTakeaways: [
      <>Access is allowed only if a policy allows it and nothing denies it; an explicit Deny always wins.</>,
      <>New buckets have Block Public Access on and ACLs disabled; keep it that way and grant access with IAM and bucket policies.</>,
      <>Every new object is encrypted (SSE-S3 by default); use SSE-KMS when you need key-level control and audit.</>,
    ],
    sections: [
      {
        title: h(FiLock, "Who can do what"),
        table: {
          headers: ["Mechanism", "Attached to", "Use it for"],
          rows: [
            ["IAM policy", "A role or user", "What your own functions and people can do — the default choice"],
            ["Bucket policy", "The bucket", "Rules for everyone: deny non-TLS, require encryption, allow another account or a CloudFront distribution"],
            ["Access points", "A named endpoint on the bucket", "Separate policies per application or team on a shared bucket"],
            ["ACLs", "Buckets and objects", "Legacy. Disabled by default (Object Ownership: BucketOwnerEnforced) — leave them off"],
          ],
          caption: "Within one account, either an IAM policy or the bucket policy can allow access. Across accounts, both sides must allow it.",
        },
      },
      {
        title: h(FiShield, "Block Public Access"),
        paragraphs: [
          <>
            Four settings stop buckets from becoming public through ACLs or policies. Since April 2023 they&apos;re all on for new buckets, and you can enforce them for the whole
            account. With <code>BlockPublicPolicy</code> on, S3 rejects any bucket policy that grants public access — the intern&apos;s &ldquo;public read&rdquo; statement fails with{" "}
            <code>AccessDenied</code>.
          </>,
          <>Need public images for a website? Serve them through CloudFront with origin access control, and keep the bucket private.</>,
        ],
      },
      {
        title: h(FiKey, "Encryption"),
        bullets: [
          <><strong>SSE-S3</strong> — the default since January 2023. S3 manages the keys; nothing to configure.</>,
          <><strong>SSE-KMS</strong> — keys in AWS KMS: separate permission to decrypt, CloudTrail records of key use. Turn on <strong>S3 Bucket Keys</strong> to cut KMS request costs.</>,
          <><strong>DSSE-KMS</strong> — two layers of encryption for workloads that require it.</>,
          <><strong>SSE-C</strong> — you send your own key with every request. Since April 2026 it&apos;s disabled by default for new buckets.</>,
        ],
        postTableParagraphs: [<>In transit, deny plain HTTP with a bucket-policy statement on <code>aws:SecureTransport</code> — the practice below.</>],
      },
    ],
    quiz: {
      prompt: <>A role&apos;s IAM policy allows <code>s3:GetObject</code> on the bucket. The bucket policy denies <code>s3:*</code> when <code>aws:SecureTransport</code> is <code>false</code>. The role calls GetObject over HTTP. Result?</>,
      options: [
        "A) Allowed — the IAM policy grants it",
        "B) Denied — an explicit Deny overrides any Allow",
        "C) Allowed, but logged as insecure",
        "D) Denied only if Block Public Access is on",
      ],
      answer: <>Policy evaluation always lets an explicit Deny win. The request isn&apos;t over TLS, so the bucket policy&apos;s Deny applies.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-11": {
    intro: (
      <>
        Every new sprite needs a thumbnail for the Pokédex grid. Instead of polling the bucket, let S3 tell you: <strong>event notifications</strong> invoke a Lambda function
        (or send a message) the moment an object is created.
      </>
    ),
    keyTakeaways: [
      <>S3 can notify Lambda, SQS (standard queues), SNS or EventBridge about object created, deleted, restored and other events.</>,
      <>Filter by key prefix and suffix — and make sure the function&apos;s own output can&apos;t trigger it again.</>,
      <>Delivery is at least once and not strictly ordered: make handlers idempotent.</>,
    ],
    sections: [
      {
        title: h(FiBell, "Destinations"),
        table: {
          headers: ["Destination", "Choose it when"],
          rows: [
            ["Lambda", "One function should react directly"],
            ["SQS", "You want buffering, batching and retries under your control"],
            ["SNS", "Several subscribers need the same event"],
            ["EventBridge", "You want rich filtering (key patterns, object size), many targets, archive and replay. Turn it on once per bucket; it receives all events"],
          ],
        },
      },
      {
        title: h(FiRepeat, "The recursion trap"),
        paragraphs: [
          <>
            The thumbnail function writes <code>sprites/thumbs/0252-treecko.png</code>. If the notification fires on every <code>ObjectCreated</code> event in the bucket, that
            thumbnail triggers the function again, which writes another thumbnail… and your bill climbs.
          </>,
          <>
            Fix it by design: filter on a prefix and suffix that only originals match (<code>sprites/originals/</code> + <code>.png</code>), or write outputs to a different
            bucket. Filters on the same event type can&apos;t overlap within one bucket.
          </>,
        ],
      },
      {
        title: h(FiDatabase, "Reading the event"),
        codeSnippets: [
          {
            language: "javascript",
            label: "Lambda handler",
            code: `export const handler = async (event) => {
  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    // Keys arrive URL-encoded, with spaces as "+".
    const key = decodeURIComponent(record.s3.object.key.replace(/\\+/g, " "));
    await makeThumbnail(bucket, key); // must be safe to run twice
  }
};`,
          },
        ],
        bullets: [
          <>Events usually arrive within seconds, but occasionally more than once or out of order. Use the <code>sequencer</code> field to order events for the same key.</>,
          <>Writing the thumbnail to a deterministic key makes a duplicate event harmless: the second run just overwrites the same file.</>,
        ],
      },
    ],
    quiz: {
      prompt: <>Your handler occasionally processes the same upload twice. What is the right fix?</>,
      options: [
        "A) Switch to EventBridge, which guarantees exactly-once delivery",
        "B) Make the handler idempotent, e.g. write to a deterministic key or record processed ETags",
        "C) Disable retries on the Lambda function",
        "D) Add a second notification to confirm the first",
      ],
      answer: <>S3 event delivery is at least once. Design the handler so repeating it has no extra effect.</>,
    },
  },

  // -------------------------------------------------------------------------
  "quest-12": {
    intro: (
      <>
        The archive works. Before the Champion signs off, review it like a production system: how it scales, how it recovers, how you&apos;ll know something is wrong, and what it
        costs.
      </>
    ),
    keyTakeaways: [
      <>S3 is built for 99.999999999% durability, but durability doesn&apos;t protect you from your own deletes or a Regional outage — versioning, replication and Object Lock do.</>,
      <>Observe object-level activity with CloudTrail data events and request metrics; see the whole estate with Storage Lens.</>,
      <>Most S3 bills are driven by storage class choice, request counts and data transfer out — all of which you can see and tune.</>,
    ],
    sections: [
      {
        title: h(FiTrendingUp, "Throughput"),
        bullets: [
          <>Plan on at least 3,500 writes and 5,500 reads per second per prefix, and spread very hot traffic over several prefixes.</>,
          <>Expect occasional <code>503 SlowDown</code> while S3 scales; keep the SDK&apos;s retries on.</>,
          <>Use byte-range GETs and multipart uploads in parallel for large objects; put CloudFront in front of popular sprites.</>,
          <>For single-digit-millisecond access to hot data in one Availability Zone, S3 Express One Zone uses a separate <em>directory bucket</em> type.</>,
        ],
      },
      {
        title: h(FiGitBranch, "Recovery"),
        table: {
          headers: ["Risk", "Control"],
          rows: [
            ["Someone deletes or overwrites a card", "Versioning, plus conditional writes (Quest 6)"],
            ["A Region becomes unavailable", "Cross-Region Replication (needs versioning on both buckets); Replication Time Control for a 15-minute objective"],
            ["Ransomware or a rogue admin deletes versions", "Object Lock in compliance mode — WORM retention nobody can shorten"],
            ["You need point-in-time copies", "AWS Backup for S3"],
          ],
        },
      },
      {
        title: h(FiEye, "Monitoring"),
        bullets: [
          <><strong>CloudTrail data events</strong> record who read, wrote or deleted which object. Bucket-level calls are logged by default; object-level ones aren&apos;t until you enable them.</>,
          <><strong>CloudWatch request metrics</strong> show 4xx/5xx rates and latency per bucket or prefix.</>,
          <><strong>S3 Storage Lens</strong> summarises usage and activity across accounts, and flags buckets without versioning or with incomplete multipart uploads.</>,
          <><strong>IAM Access Analyzer for S3</strong> lists buckets shared outside your account.</>,
        ],
      },
      {
        title: h(FiDatabase, "Cost"),
        paragraphs: [
          <>
            Storage is billed per GB-month and class; requests per thousand; and data transfer out to the internet per GB. Reads through CloudFront are usually cheaper than direct.
            Storage Class Analysis and Storage Lens show which prefixes would save money in another class.
          </>,
          <>
            And if a tool insists on a file system, S3 Files (launched April 2026) can present a bucket as one — the objects underneath are the same ones your code writes with the
            SDK.
          </>,
        ],
      },
    ],
    quiz: {
      prompt: <>Regulations require tournament results to be kept unaltered for 5 years, even from administrators. Which feature meets that?</>,
      options: [
        "A) Versioning alone",
        "B) A lifecycle rule to DEEP_ARCHIVE",
        "C) Object Lock in compliance mode with a 5-year retention period",
        "D) A bucket policy that denies s3:DeleteObject",
      ],
      answer: <>Only Object Lock in compliance mode prevents any user — including the root user — from deleting or overwriting a locked version before its retention date. A bucket policy can be changed by an admin.</>,
    },
  },
};

/** Section labels are computed on the server, while titles are still plain elements. */
const labelled = Object.fromEntries(
  Object.entries(raw).map(([slug, c]) => [slug, { ...c, sections: c.sections.map((s) => ({ ...s, label: s.label ?? nodeText(s.title).trim() })) }])
) as Record<string, QuestContent>;

export const s3QuestContent = withKeys(labelled);
