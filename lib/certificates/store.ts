import { promises as fs } from "node:fs";
import path from "node:path";
import { DynamoDBClient, TransactionCanceledException } from "@aws-sdk/client-dynamodb";
import { DeleteCommand, DynamoDBDocumentClient, GetCommand, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";
import type { TierId } from "./tiers";

export type CertificateRecord = {
  id: string;
  tier: TierId;
  name: string;
  learnerId: string;
  issuedAt: string;
  edition: string;
  quests: { slug: string; passedAt: string }[];
  public: boolean;
  manageKeyHash: string;
  status: "active" | "hidden";
};

export interface CertificateStore {
  kind: "dynamodb" | "file";
  get(id: string): Promise<CertificateRecord | null>;
  claimFor(learnerId: string, tier: TierId): Promise<string | null>;
  /** Writes the certificate and the learner's claim atomically. Returns the existing id when the learner already claimed this tier. */
  create(record: CertificateRecord): Promise<{ id: string; created: boolean }>;
  remove(record: CertificateRecord): Promise<void>;
}

const certKey = (id: string) => ({ PK: `CERT#${id}`, SK: "META" });
const claimKey = (learnerId: string, tier: TierId) => ({ PK: `LEARNER#${learnerId}`, SK: `TIER#${tier}` });

/**
 * Single-table design, table `ServerlessCreedCertificates` (infra/certificates-table.yaml):
 *   CERT#<id>          / META        → the certificate
 *   LEARNER#<learnerId> / TIER#<tier> → { certId }, which makes claiming idempotent
 */
class DynamoStore implements CertificateStore {
  kind = "dynamodb" as const;
  private doc: DynamoDBDocumentClient;
  constructor(private table: string) {
    const accessKeyId = process.env.CERT_AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CERT_AWS_SECRET_ACCESS_KEY;
    const client = new DynamoDBClient({
      region: process.env.CERT_TABLE_REGION || process.env.AWS_REGION || "ap-south-1",
      ...(accessKeyId && secretAccessKey ? { credentials: { accessKeyId, secretAccessKey } } : {}),
    });
    this.doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }
  async get(id: string) {
    const { Item } = await this.doc.send(new GetCommand({ TableName: this.table, Key: certKey(id) }));
    return (Item?.cert as CertificateRecord | undefined) ?? null;
  }
  async claimFor(learnerId: string, tier: TierId) {
    const { Item } = await this.doc.send(new GetCommand({ TableName: this.table, Key: claimKey(learnerId, tier), ConsistentRead: true }));
    return (Item?.certId as string | undefined) ?? null;
  }
  async create(record: CertificateRecord) {
    try {
      await this.doc.send(
        new TransactWriteCommand({
          TransactItems: [
            { Put: { TableName: this.table, Item: { ...claimKey(record.learnerId, record.tier), certId: record.id }, ConditionExpression: "attribute_not_exists(PK)" } },
            { Put: { TableName: this.table, Item: { ...certKey(record.id), cert: record }, ConditionExpression: "attribute_not_exists(PK)" } },
          ],
        })
      );
      return { id: record.id, created: true };
    } catch (error) {
      // The learner already holds this tier (claim put failed its condition): return that certificate.
      if (error instanceof TransactionCanceledException && error.CancellationReasons?.[0]?.Code === "ConditionalCheckFailed") {
        const existing = await this.claimFor(record.learnerId, record.tier);
        if (existing) return { id: existing, created: false };
      }
      throw error;
    }
  }
  async remove(record: CertificateRecord) {
    await this.doc.send(
      new TransactWriteCommand({
        TransactItems: [
          { Delete: { TableName: this.table, Key: certKey(record.id) } },
          { Delete: { TableName: this.table, Key: claimKey(record.learnerId, record.tier) } },
        ],
      })
    );
  }
}

/** Development store: a JSON file under .data/ (git-ignored). Never used in production. */
class FileStore implements CertificateStore {
  kind = "file" as const;
  private file = path.join(process.cwd(), ".data", "certificates.json");
  private async load(): Promise<Record<string, unknown>> {
    try {
      return JSON.parse(await fs.readFile(this.file, "utf8"));
    } catch {
      return {};
    }
  }
  private async save(data: Record<string, unknown>) {
    await fs.mkdir(path.dirname(this.file), { recursive: true });
    await fs.writeFile(this.file, JSON.stringify(data, null, 2));
  }
  async get(id: string) {
    return ((await this.load())[`CERT#${id}`] as CertificateRecord | undefined) ?? null;
  }
  async claimFor(learnerId: string, tier: TierId) {
    return ((await this.load())[`LEARNER#${learnerId}#${tier}`] as string | undefined) ?? null;
  }
  async create(record: CertificateRecord) {
    const data = await this.load();
    const claim = `LEARNER#${record.learnerId}#${record.tier}`;
    if (typeof data[claim] === "string") return { id: data[claim] as string, created: false };
    data[claim] = record.id;
    data[`CERT#${record.id}`] = record;
    await this.save(data);
    return { id: record.id, created: true };
  }
  async remove(record: CertificateRecord) {
    const data = await this.load();
    delete data[`CERT#${record.id}`];
    delete data[`LEARNER#${record.learnerId}#${record.tier}`];
    await this.save(data);
  }
}

let cached: CertificateStore | null | undefined;

/** The configured store, or null when certificates aren't set up (production without a table). */
export function certificateStore(): CertificateStore | null {
  if (cached !== undefined) return cached;
  const table = process.env.CERT_TABLE_NAME;
  if (table) cached = new DynamoStore(table);
  else if (process.env.CERT_STORE === "file" || process.env.NODE_ENV !== "production") cached = new FileStore();
  else cached = null;
  return cached;
}
