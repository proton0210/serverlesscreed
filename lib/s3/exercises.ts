/**
 * Learn S3 practice tasks. Plain strings (no JSX, no imports) so scripts/check-s3.mjs can
 * read them: every starter must fail the checker and every solution must pass.
 * `brief` and `goal` support `inline code` in backticks.
 */
export type S3Exercise = {
  brief: string;
  goal: string;
  problemCode: string;
  solutionCode: string;
};

const header = (commands: string, extra = "") => `// @ts-nocheck
import { S3Client, ${commands} } from "@aws-sdk/client-s3";${extra}

const client = new S3Client({ region: "ap-south-1" });
`;

export const s3Exercises: Record<string, S3Exercise> = {
  "quest-1": {
    brief:
      "Create the bucket for the Hoenn Pokédex archive. Fix the name so it follows the naming rules — and remember that every bucket name in AWS is global, so the obvious names are already taken. Then tell S3 which Region the bucket belongs in.",
    goal: "A valid, unique `Bucket` name and `CreateBucketConfiguration: { LocationConstraint: \"ap-south-1\" }`.",
    problemCode: `${header("CreateBucketCommand")}
async function createArchive() {
  const command = new CreateBucketCommand({
    // ⬇️ Not a valid bucket name. Fix it (and make it unique).
    Bucket: "Hoenn_Pokedex",
    // ⬇️ The client talks to ap-south-1. Add CreateBucketConfiguration.

  });

  const response = await client.send(command);
  console.log("Bucket created at", response.Location);
}`,
    solutionCode: `${header("CreateBucketCommand")}
async function createArchive() {
  const command = new CreateBucketCommand({
    Bucket: "hoenn-pokedex-archive-4821",
    CreateBucketConfiguration: { LocationConstraint: "ap-south-1" },
  });

  const response = await client.send(command);
  console.log("Bucket created at", response.Location);
}`,
  },

  "quest-2": {
    brief:
      "Upload Treecko's Pokédex card to `cards/0252-treecko.json`. Tell S3 it's JSON with `ContentType`, and tag it with user metadata `generation: \"3\"` so tools can read the generation without downloading the card.",
    goal: "Add `ContentType: \"application/json\"` and `Metadata: { generation: \"3\" }`.",
    problemCode: `${header("PutObjectCommand")}
const card = { number: 252, name: "Treecko", types: ["grass"], region: "Hoenn" };

async function uploadCard() {
  const command = new PutObjectCommand({
    Bucket: "hoenn-pokedex-media",
    Key: "cards/0252-treecko.json",
    Body: JSON.stringify(card),
    // ⬇️ Add ContentType and Metadata.

  });

  const { ETag } = await client.send(command);
  console.log("Stored with ETag", ETag);
}`,
    solutionCode: `${header("PutObjectCommand")}
const card = { number: 252, name: "Treecko", types: ["grass"], region: "Hoenn" };

async function uploadCard() {
  const command = new PutObjectCommand({
    Bucket: "hoenn-pokedex-media",
    Key: "cards/0252-treecko.json",
    Body: JSON.stringify(card),
    ContentType: "application/json",
    Metadata: { generation: "3" },
  });

  const { ETag } = await client.send(command);
  console.log("Stored with ETag", ETag);
}`,
  },

  "quest-3": {
    brief:
      "Read Treecko's card back. This code gets a `NoSuchKey` error and, even with the right key, would log a stream instead of the card. Fix the key and turn the body into an object.",
    goal: "Use the exact key, then `await response.Body.transformToString()` and `JSON.parse` it.",
    problemCode: `${header("GetObjectCommand")}
async function readCard() {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: "hoenn-pokedex-media",
      Key: "cards/0252-Treecko.json",
    })
  );

  // ⬇️ response.Body is a stream. Read it as text, then parse the JSON.
  const card = response.Body;
  console.log(card.name, "is type", card.types);
}`,
    solutionCode: `${header("GetObjectCommand")}
async function readCard() {
  const response = await client.send(
    new GetObjectCommand({
      Bucket: "hoenn-pokedex-media",
      Key: "cards/0252-treecko.json",
    })
  );

  const text = await response.Body.transformToString();
  const card = JSON.parse(text);
  console.log(card.name, "is type", card.types);
}`,
  },

  "quest-4": {
    brief:
      "List every grass-type sprite. There are more than 1,000, so a single `ListObjectsV2` call won't return them all. Scope the listing with a prefix and keep asking for the next page until S3 says there are no more.",
    goal: "`Prefix: \"sprites/grass/\"`, pass `ContinuationToken`, and loop on `NextContinuationToken`.",
    problemCode: `${header("ListObjectsV2Command")}
async function listGrassSprites() {
  const keys = [];

  const page = await client.send(
    new ListObjectsV2Command({
      Bucket: "hoenn-pokedex-media",
      // ⬇️ Only grass sprites, please.
      Prefix: "sprites/",
    })
  );
  for (const obj of page.Contents ?? []) keys.push(obj.Key);

  // ⬇️ This stops after the first 1,000 keys. Loop until the listing is complete.
  console.log("Found", keys.length, "sprites");
}`,
    solutionCode: `${header("ListObjectsV2Command")}
async function listGrassSprites() {
  const keys = [];
  let token = undefined;

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: "hoenn-pokedex-media",
        Prefix: "sprites/grass/",
        ContinuationToken: token,
      })
    );
    for (const obj of page.Contents ?? []) keys.push(obj.Key);
    token = page.NextContinuationToken;
  } while (token);

  console.log("Found", keys.length, "sprites");
}`,
  },

  "quest-5": {
    brief:
      "Tournament battle replays are watched a few times a year, must start playing the moment someone clicks, and are kept for years. Choose the storage class that costs least for that pattern.",
    goal: "Set `StorageClass` on the upload.",
    problemCode: `${header("PutObjectCommand")}
async function archiveReplay(replay) {
  await client.send(
    new PutObjectCommand({
      Bucket: "hoenn-pokedex-media",
      Key: "replays/2026/hoenn-league-final.mp4",
      Body: replay,
      ContentType: "video/mp4",
      // ⬇️ Pick a storage class. (Leaving it out means STANDARD.)

    })
  );
}`,
    solutionCode: `${header("PutObjectCommand")}
async function archiveReplay(replay) {
  await client.send(
    new PutObjectCommand({
      Bucket: "hoenn-pokedex-media",
      Key: "replays/2026/hoenn-league-final.mp4",
      Body: replay,
      ContentType: "video/mp4",
      StorageClass: "GLACIER_IR",
    })
  );
}`,
  },

  "quest-6": {
    brief:
      "Two researchers upload Mudkip's card at almost the same moment. Make your upload create-only, so it fails instead of replacing a card that already exists, and handle that failure.",
    goal: "Add `IfNoneMatch: \"*\"` and catch the `PreconditionFailed` error.",
    problemCode: `${header("PutObjectCommand")}
const card = { number: 258, name: "Mudkip", types: ["water"], region: "Hoenn" };

async function addCard() {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: "hoenn-pokedex-media",
        Key: "cards/0258-mudkip.json",
        Body: JSON.stringify(card),
        ContentType: "application/json",
        // ⬇️ Only write if no object has this key yet.

      })
    );
    console.log("Mudkip's card created");
  } catch (err) {
    throw err;
  }
}`,
    solutionCode: `${header("PutObjectCommand")}
const card = { number: 258, name: "Mudkip", types: ["water"], region: "Hoenn" };

async function addCard() {
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: "hoenn-pokedex-media",
        Key: "cards/0258-mudkip.json",
        Body: JSON.stringify(card),
        ContentType: "application/json",
        IfNoneMatch: "*",
      })
    );
    console.log("Mudkip's card created");
  } catch (err) {
    if (err.name === "PreconditionFailed") {
      console.log("A card for Mudkip already exists — leaving it alone.");
      return;
    }
    throw err;
  }
}`,
  },

  "quest-7": {
    brief:
      "Trainers upload their own sprite PNGs straight from the browser. Your server signs a URL for exactly one upload. This code signs the wrong operation and lets the link live for a day — fix both.",
    goal: "Sign a `PutObjectCommand` with `ContentType: \"image/png\"` and `expiresIn: 300`.",
    problemCode: `${header("GetObjectCommand, PutObjectCommand", '\nimport { getSignedUrl } from "@aws-sdk/s3-request-presigner";')}
export async function createUploadUrl(trainerId) {
  const command = new GetObjectCommand({
    Bucket: "hoenn-pokedex-media",
    Key: \`uploads/\${trainerId}/sprite.png\`,
  });

  // ⬇️ A day is far too long for a one-off upload.
  return getSignedUrl(client, command, { expiresIn: 86400 });
}`,
    solutionCode: `${header("PutObjectCommand", '\nimport { getSignedUrl } from "@aws-sdk/s3-request-presigner";')}
export async function createUploadUrl(trainerId) {
  const command = new PutObjectCommand({
    Bucket: "hoenn-pokedex-media",
    Key: \`uploads/\${trainerId}/sprite.png\`,
    ContentType: "image/png",
  });

  return getSignedUrl(client, command, { expiresIn: 300 });
}`,
  },

  "quest-8": {
    brief:
      "The Sinnoh League final is an 80 GiB replay. `Upload` from `@aws-sdk/lib-storage` splits it into parts and sends several at once, but the part size here breaks S3's limits. Pick a part size that works, and make sure a failed upload doesn't leave billed parts behind.",
    goal: "Choose a `partSize` that keeps the upload within 10,000 parts, and stop keeping parts when an upload fails.",
    problemCode: `${header("", '\nimport { Upload } from "@aws-sdk/lib-storage";\nimport { createReadStream } from "node:fs";').replace("S3Client, ", "S3Client")}
const replaySizeBytes = 80 * 1024 ** 3; // 80 GiB

async function uploadReplay(path) {
  const upload = new Upload({
    client,
    params: {
      Bucket: "hoenn-pokedex-media",
      Key: "replays/2026/sinnoh-league-final.mp4",
      Body: createReadStream(path),
      ContentType: "video/mp4",
    },
    partSize: 5 * 1024 * 1024, // ⬅️ 5 MiB parts
    queueSize: 4,
    leavePartsOnError: true, // "keep the parts so we can debug failures"
  });

  upload.on("httpUploadProgress", (p) => console.log(p.loaded, "/", p.total));
  await upload.done();
}`,
    solutionCode: `${header("", '\nimport { Upload } from "@aws-sdk/lib-storage";\nimport { createReadStream } from "node:fs";').replace("S3Client, ", "S3Client")}
const replaySizeBytes = 80 * 1024 ** 3; // 80 GiB

async function uploadReplay(path) {
  const upload = new Upload({
    client,
    params: {
      Bucket: "hoenn-pokedex-media",
      Key: "replays/2026/sinnoh-league-final.mp4",
      Body: createReadStream(path),
      ContentType: "video/mp4",
    },
    partSize: 16 * 1024 * 1024, // 16 MiB → 5,120 parts
    queueSize: 4,
  });

  upload.on("httpUploadProgress", (p) => console.log(p.loaded, "/", p.total));
  await upload.done();
}`,
  },

  "quest-9": {
    brief:
      "Replays are watched a lot in their first month and rarely after. Move them to Standard-IA at 30 days, delete them after a year, and abort multipart uploads that never finished after 7 days. S3 rejects the transition as written — find out why.",
    goal: "Fix the transition `Days`, then add `Expiration` and `AbortIncompleteMultipartUpload`.",
    problemCode: `${header("PutBucketLifecycleConfigurationCommand")}
async function tidyReplays() {
  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: "hoenn-pokedex-media",
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "replays-archive",
            Status: "Enabled",
            Filter: { Prefix: "replays/" },
            Transitions: [{ Days: 10, StorageClass: "STANDARD_IA" }],
            // ⬇️ Expire after 365 days; abort unfinished uploads after 7.

          },
        ],
      },
    })
  );
}`,
    solutionCode: `${header("PutBucketLifecycleConfigurationCommand")}
async function tidyReplays() {
  await client.send(
    new PutBucketLifecycleConfigurationCommand({
      Bucket: "hoenn-pokedex-media",
      LifecycleConfiguration: {
        Rules: [
          {
            ID: "replays-archive",
            Status: "Enabled",
            Filter: { Prefix: "replays/" },
            Transitions: [{ Days: 30, StorageClass: "STANDARD_IA" }],
            Expiration: { Days: 365 },
            AbortIncompleteMultipartUpload: { DaysAfterInitiation: 7 },
          },
        ],
      },
    })
  );
}`,
  },

  "quest-10": {
    brief:
      "An intern wrote a bucket policy to \"make sprites load faster\" by making every object public. Block Public Access rejects it. Replace that statement with one that keeps the archive private and denies any request that doesn't use TLS.",
    goal: "Remove the public `Allow`; add a `Deny` for `s3:*` when `aws:SecureTransport` is `\"false\"`, on the bucket and its objects.",
    problemCode: `${header("PutBucketPolicyCommand")}
const bucketArn = "arn:aws:s3:::hoenn-pokedex-media";

const policy = {
  Version: "2012-10-17",
  Statement: [
    // ⬇️ This makes every object public. Replace it.
    {
      Sid: "PublicRead",
      Effect: "Allow",
      Principal: "*",
      Action: "s3:GetObject",
      Resource: \`\${bucketArn}/*\`,
    },
  ],
};

async function lockVault() {
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: "hoenn-pokedex-media",
      Policy: JSON.stringify(policy),
    })
  );
}`,
    solutionCode: `${header("PutBucketPolicyCommand")}
const bucketArn = "arn:aws:s3:::hoenn-pokedex-media";

const policy = {
  Version: "2012-10-17",
  Statement: [
    {
      Sid: "DenyInsecureTransport",
      Effect: "Deny",
      Principal: "*",
      Action: "s3:*",
      Resource: [bucketArn, \`\${bucketArn}/*\`],
      Condition: { Bool: { "aws:SecureTransport": "false" } },
    },
  ],
};

async function lockVault() {
  await client.send(
    new PutBucketPolicyCommand({
      Bucket: "hoenn-pokedex-media",
      Policy: JSON.stringify(policy),
    })
  );
}`,
  },

  "quest-11": {
    brief:
      "A Lambda function makes a thumbnail for every new sprite and writes it to `sprites/thumbs/`. The notification below fires for every new object — including the thumbnails the function writes. Filter it so only original PNGs trigger the function.",
    goal: "Add a `Filter` with a `prefix` of `sprites/originals/` and a `suffix` of `.png`.",
    problemCode: `${header("PutBucketNotificationConfigurationCommand")}
async function watchSprites() {
  await client.send(
    new PutBucketNotificationConfigurationCommand({
      Bucket: "hoenn-pokedex-media",
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [
          {
            Id: "make-thumbnails",
            LambdaFunctionArn: "arn:aws:lambda:ap-south-1:111122223333:function:make-thumbnail",
            Events: ["s3:ObjectCreated:*"],
            // ⬇️ Without a filter, each thumbnail triggers the function again.

          },
        ],
      },
    })
  );
}`,
    solutionCode: `${header("PutBucketNotificationConfigurationCommand")}
async function watchSprites() {
  await client.send(
    new PutBucketNotificationConfigurationCommand({
      Bucket: "hoenn-pokedex-media",
      NotificationConfiguration: {
        LambdaFunctionConfigurations: [
          {
            Id: "make-thumbnails",
            LambdaFunctionArn: "arn:aws:lambda:ap-south-1:111122223333:function:make-thumbnail",
            Events: ["s3:ObjectCreated:*"],
            Filter: {
              Key: {
                FilterRules: [
                  { Name: "prefix", Value: "sprites/originals/" },
                  { Name: "suffix", Value: ".png" },
                ],
              },
            },
          },
        ],
      },
    })
  );
}`,
  },
};
