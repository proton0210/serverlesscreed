// Update this record only after verifying the curriculum against these sources.
export const curriculumReview = {
  reviewedOn: "2026-09-26",
  sdkVersion: "3.1132.0",
  sources: [
    { title: "Partitions and item collections", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.Partitions.html" },
    { title: "Reserved expression names", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ReservedWords.html" },
    { title: "AWS SDK v3 document client", url: "https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html" },
    { title: "Read consistency", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html" },
    { title: "Scan and pagination", url: "https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html" },
    { title: "BatchGetItem limits and retries", url: "https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html" },
    { title: "Transaction limits and idempotency", url: "https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_TransactWriteItems.html" },
    { title: "TTL cleanup", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html" },
    { title: "Global table consistency modes", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html" },
    { title: "Global table TTL and transaction support", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables-CoreConcepts.html" },
    { title: "Atomic counters", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/WorkingWithItems.html" },
    { title: "Point-in-time recovery", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Point-in-time-recovery.html" },
    { title: "Burst and adaptive capacity (per-partition limits)", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/burst-adaptive-capacity.html" },
    { title: "Partition key design", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-partition-key-design.html" },
    { title: "Read and write operations (capacity units)", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/read-write-operations.html" },
    { title: "Transactions: capacity and behaviour", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/transaction-apis.html" },
    { title: "DynamoDB Streams", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html" },
    { title: "Query key condition expressions", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Query.KeyConditionExpressions.html" },
    { title: "Global secondary indexes", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html" },
    { title: "Encryption at rest", url: "https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/EncryptionAtRest.html" },
    { title: "UpdateItem", url: "https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html" },
    { title: "DeleteItem", url: "https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_DeleteItem.html" },
    { title: "Pokédex stats (Johto entries)", url: "https://pokemondb.net/pokedex" },
  ],
  /**
   * Scene accuracy review (components/dynamodb/scene, lib/dynamodb/*-traces.ts), checked on reviewedOn:
   * - Partition limits shown as 3,000 RCU / 1,000 WCU per partition; adaptive capacity mentioned, not overstated.
   * - Hashing and the 4-partition table are labelled as a teaching model, not DynamoDB's real hash or layout.
   * - Capacity: GetItem 0.5 RCU (eventually consistent, ≤4 KB); transactional writes 2 WCU per item;
   *   100-item Scan ≈ 2.5 RCU assuming ~200-byte items.
   * - UpdateItem without attribute_exists creates a new item (phantom); PutItem without a condition replaces.
   * - BatchGetItem may return UnprocessedKeys; the scene retries with backoff.
   * - TTL deletion is asynchronous; expired items can appear in reads until removed.
   *
   * Content audit (2026-09-26), all 18 pages:
   * - Copy, snippets, validators and scenes agree on table names, aliases (#name/#status/#own/#level) and
   *   stored lowercase Type1/Type2 values; Johto stats checked against the Pokédex source above.
   * - Capacity numbers aligned (single GetItem/Query 0.5 RCU, 3-key BatchGet 1.5 RCU).
   * - Streams: exactly-once per stream record, ordered per item; KeyConditionExpression operators listed;
   *   TransactionCanceledException with CancellationReasons; encryption at rest always on.
   * - Previously hidden bullets/tables in Quests 6–8 now render; Quest 3 has a quiz like Quest 4.
   */
  scenesReviewed: true,
};
