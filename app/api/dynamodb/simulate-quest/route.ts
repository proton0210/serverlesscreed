import { NextRequest, NextResponse } from "next/server";
import { parse } from "acorn";
import { traceForQuest } from "@/lib/dynamodb/quest-traces";
import { signStamp } from "@/lib/certificates/stamps";

export async function POST(request: NextRequest) {
  // Every response carries a trace (see lib/dynamodb/trace.ts) so the scene player can replay it.
  let qid: string | undefined;
  let learnerId: unknown;
  const respond = (body: Record<string, unknown>, init?: ResponseInit) => {
    if (init?.status && init.status >= 500) return NextResponse.json(body, init);
    // A passing challenge earns a signed stamp toward a certificate (lib/certificates).
    const stamp = body.success === true && qid ? signStamp(qid, "code", learnerId) : null;
    return NextResponse.json({ ...body, ...traceForQuest(qid, body), ...(stamp ? { stamp } : {}) }, init);
  };

  try {
    const body = await request.json();
    const { questId, code } = body;
    qid = typeof questId === "string" ? questId : undefined;
    learnerId = body.learnerId;

    if (!questId || !code) {
      return respond(
        { error: "Missing questId or code" },
        { status: 400 }
      );
    }

    try {
      parse(code, { ecmaVersion: "latest", sourceType: "module" });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Invalid JavaScript";
      return respond({ success: false, message: `❌ Syntax error: ${detail}` });
    }

    // Validate aliases needed by these guided exercises before checking the task.
    const requiredAlias = questId === "quest-6" ? ["#level", "Level"]
      : ["quest-5", "quest-8", "quest-11"].includes(questId) ? ["#name", "Name"] : null;
    if (requiredAlias) {
      const names = code.match(/ExpressionAttributeNames\s*:\s*\{([^}]*)\}/)?.[1] ?? "";
      const binding = new RegExp(`["']${requiredAlias[0]}["']\\s*:\\s*["']${requiredAlias[1]}["']`);
      if (!binding.test(names)) return respond({ success: false, message: `Alias the reserved word ${requiredAlias[1]} with ExpressionAttributeNames: { "${requiredAlias[0]}": "${requiredAlias[1]}" }.` });
    }

    // Quest 5: Put Mew with ConditionExpression
    if (questId === "quest-5") {
      const hasPutCommand = /new\s+PutCommand/.test(code);
      if (!hasPutCommand) {
        return respond({ success: false, message: "❌ Missing PutCommand. You need to use the PutCommand class." });
      }
      const hasTableName = /TableName\s*:\s*["']Pokemon["']/.test(code);
      if (!hasTableName) {
        return respond({ success: false, message: "❌ Invalid TableName. Please use 'Pokemon' as the table name." });
      }
      const hasMew = /Name\s*:\s*["']Mew["']/.test(code);
      if (!hasMew) {
        return respond({ success: false, message: "❌ You are not adding Mew! key 'Name' must be 'Mew'." });
      }
      const hasCondition = /ConditionExpression\s*:\s*["']\s*attribute_not_exists\(\s*#name\s*\)\s*["']/.test(code);
      if (hasCondition) {
        return respond({ success: true, message: "✅ Success! Mew was added to your party safely.", data: { consumedCapacity: 1, item: { Name: "Mew", Type: "Psychic", Level: 5, Status: "Caught" } } });
      } else {
        return respond({ success: false, error: "ConditionalCheckFailedException", message: "❌ Unsafe write: without ConditionExpression: \"attribute_not_exists(#name)\", PutItem would silently overwrite an existing Mew." });
      }
    }

    // Quest 6: Update Expression (Evolve Mew/Level Up)
    if (questId === "quest-6") {
      const hasUpdateCommand = /new\s+UpdateCommand/.test(code);
      if (!hasUpdateCommand) {
        return respond({ success: false, message: "❌ Missing UpdateCommand. You need to use the UpdateCommand class." });
      }
      const hasTableName = /TableName\s*:\s*["']Pokemon["']/.test(code);
      if (!hasTableName) {
         return respond({ success: false, message: "❌ Invalid TableName. Please use 'Pokemon'." });
      }
      const normalizedCode = code.replace(/\s+/g, " ");
      const hasKey = /Key\s*:\s*{\s*Name\s*:\s*["']Mew["']\s*}/.test(normalizedCode);
      if (!hasKey) {
         return respond({ success: false, message: "❌ You must update Mew! The Key 'Name' must be 'Mew'." });
      }
      const hasUpdateExp = /UpdateExpression\s*:\s*["']\s*SET\s+#level\s*=\s*:\w+\s*["']/i.test(code);
      if (!hasUpdateExp) {
        return respond({ success: false, message: "❌ Invalid UpdateExpression. You need to use 'SET #level = :value'." });
      }
      const hasAttrValues = /ExpressionAttributeValues\s*:\s*{/.test(code);
      if (!hasAttrValues) {
        return respond({ success: false, message: "❌ Missing ExpressionAttributeValues. You must bind your variables securely." });
      }
      const hasNumericValue = /["']?:\w+["']?\s*:\s*\d+/.test(code);
      if (!hasNumericValue) {
        return respond({ success: false, message: "❌ You must assign a numeric value to your expression attribute (e.g., { ':newLevel': 6 })." })
      }
      return respond({ success: true, message: "✅ Success! Mew leveled up!", data: { consumedCapacity: 1, updatedAttributes: { Name: "Mew", Level: 6, Type: "Psychic", Status: "Caught" } } });
    }

    // Quest 7: Atomic Counters (BattlesWon)
    if (questId === "quest-7") {
      const hasUpdateCommand = /new\s+UpdateCommand/.test(code);
      if (!hasUpdateCommand) {
        return respond({ success: false, message: "❌ Missing UpdateCommand. You need to use the UpdateCommand class." });
      }
      const hasTableName = /TableName\s*:\s*["']Pokemon["']/.test(code);
      if (!hasTableName) {
         return respond({ success: false, message: "❌ Invalid TableName. Please use 'Pokemon'." });
      }
      const hasAddExp = /UpdateExpression\s*:\s*["']\s*ADD\s+BattlesWon\s+:[\w]+\s*["']/i.test(code);
      if (!hasAddExp) {
        return respond({ success: false, message: "❌ Invalid UpdateExpression. Use 'ADD BattlesWon :increment' to atomically update the counter." });
      }
      const hasNumericValue = /["']?:\w+["']?\s*:\s*1(?!\d)/.test(code);
      if (!hasNumericValue) {
        return respond({ success: false, message: "❌ You should increment the battle counter by 1 (e.g., { ':inc': 1 })." })
      }
      return respond({ success: true, message: "✅ Success! Mew's battle stats updated atomically.", data: { consumedCapacity: 1, updatedAttributes: { Name: "Mew", Level: 6, BattlesWon: 1 } } });
    }

    // Quest 8: Delete Item (Release Mew)
    if (questId === "quest-8") {
      const hasDeleteCommand = /new\s+DeleteCommand/.test(code);
      if (!hasDeleteCommand) {
        return respond({
          success: false,
          message: "❌ Missing DeleteCommand. You need to use the DeleteCommand class.",
        });
      }

      const hasTableName = /TableName\s*:\s*["']Pokemon["']/.test(code);
      if (!hasTableName) {
         return respond({
          success: false,
          message: "❌ Invalid TableName. Please use 'Pokemon'.",
        });
      }

      // Check Key
      const normalizedCode = code.replace(/\s+/g, " ");
      const hasKey = /Key\s*:\s*{\s*Name\s*:\s*["']Mew["']\s*}/.test(normalizedCode);
      if (!hasKey) {
         return respond({
          success: false,
          message: "❌ You are releasing the wrong Pokemon! Key 'Name' must be 'Mew'.",
        });
      }

      const hasCondition = /ConditionExpression\s*:\s*["']\s*attribute_exists\(\s*#name\s*\)\s+AND\s+#\w+\s*=\s*:\w+\s*["']/i.test(code);
      const hasOwnerBinding = /ExpressionAttributeNames\s*:\s*{[^}]*["']#\w+["']\s*:\s*["']Owner["'][^}]*}/.test(normalizedCode) && /ExpressionAttributeValues\s*:\s*{[^}]*["']?:\w+["']?\s*:\s*["']Ash["'][^}]*}/.test(normalizedCode);
      if (!hasCondition || !hasOwnerBinding) {
        return respond({
          success: false,
          error: "SafetyCheckFailed",
          message: "❌ Unsafe delete. Require the item to exist and still belong to Ash: attribute_exists(#name) AND #own = :trainer, with Owner aliased and :trainer bound.",
        });
      }

      return respond({
        success: true,
        message: "✅ Success! Mew has been safely released back into the wild.",
        data: {
          consumedCapacity: 1,
          deletedItem: { Name: "Mew" } 
        }
      });
    }

    // ============================================================
    // JOHTO REGION — Advanced DynamoDB (Quests 9–16)
    // Real Johto stats sourced from johto.csv to make outputs authentic.
    // ============================================================

    // Helper: collapse whitespace so validation is forgiving of formatting.
    const flat = code.replace(/\s+/g, " ");

    // Bridge quest: Expression Attributes — set a reserved-word attribute (Status)
    // using both ExpressionAttributeNames (#) and ExpressionAttributeValues (:).
    if (questId === "quest-expressions") {
      if (!/new\s+UpdateCommand/.test(code)) {
        return respond({ success: false, message: "❌ Missing UpdateCommand. Crowning Mew changes its Status — use the UpdateCommand class." });
      }
      if (!/TableName\s*:\s*["']Pokemon["']/.test(code)) {
        return respond({ success: false, message: "❌ Invalid TableName. Please use 'Pokemon'." });
      }
      if (!/Key\s*:\s*{\s*Name\s*:\s*["']Mew["']\s*}/.test(flat)) {
        return respond({ success: false, message: "❌ Wrong target! The Key 'Name' must be 'Mew'." });
      }
      // Must alias the reserved word with a # placeholder, not reference Status directly.
      if (/UpdateExpression\s*:\s*["']\s*SET\s+Status\s*=/i.test(flat)) {
        return respond({ success: false, error: "ValidationException", message: "❌ 'Status' is a reserved word — DynamoDB rejects it in the expression directly. Alias it with a #name placeholder instead." });
      }
      if (!/UpdateExpression\s*:\s*["']\s*SET\s+#\w+\s*=\s*:\w+\s*["']/i.test(flat)) {
        return respond({ success: false, message: "❌ Invalid UpdateExpression. Use a #name alias and a :value placeholder, e.g. \"SET #status = :status\"." });
      }
      if (!/ExpressionAttributeNames\s*:\s*{[^}]*["']#\w+["']\s*:\s*["']Status["'][^}]*}/.test(flat)) {
        return respond({ success: false, message: "❌ Missing ExpressionAttributeNames. Map your # placeholder to the real attribute name, e.g. { \"#status\": \"Status\" }." });
      }
      if (!/:\w+["']?\s*:\s*["']Champion["']/i.test(flat)) {
        return respond({ success: false, message: "❌ Bind your :value placeholder to \"Champion\" in ExpressionAttributeValues, e.g. { \":status\": \"Champion\" }." });
      }
      return respond({
        success: true,
        message: "✅ Long live the Champion! The #name alias dodged the reserved word and the :value placeholder set Mew's Status safely.",
        data: { consumedCapacity: 1, updatedAttributes: { Name: "Mew", Type: "Psychic", Status: "Champion" } },
      });
    }

    // Quest 9: Global Secondary Index — query Water types on Type1-Index
    if (questId === "quest-9") {
      if (!/new\s+QueryCommand/.test(code)) {
        return respond({ success: false, message: "❌ Missing QueryCommand. Query the GSI instead of scanning the table — use the QueryCommand class." });
      }
      if (!/TableName\s*:\s*["']JohtoPokemon["']/.test(code)) {
        return respond({ success: false, message: "❌ Invalid TableName. Please query the 'JohtoPokemon' table." });
      }
      if (!/IndexName\s*:\s*["']Type1-Index["']/.test(code)) {
        return respond({ success: false, message: "❌ Missing IndexName. To query a non-key attribute you must point at the GSI: IndexName: \"Type1-Index\"." });
      }
      if (!/KeyConditionExpression\s*:\s*["']\s*Type1\s*=\s*:type\s*["']/.test(code)) {
        return respond({ success: false, message: "❌ Invalid KeyConditionExpression. Use \"Type1 = :type\" to query the index partition key." });
      }
      if (!/:type["']?\s*:\s*["']water["']/i.test(flat)) {
        return respond({ success: false, message: "❌ Bind :type to \"water\" in ExpressionAttributeValues so we fetch the Water-type Pokémon." });
      }
      return respond({
        success: true,
        message: "✅ Success! The Type1-Index returned every Water-type Pokémon — no full-table Scan required.",
        data: {
          consumedCapacity: 0.5,
          count: 3,
          items: [
            { Name: "Totodile", Type1: "water", Attack: 65, Total: 314 },
            { Name: "Feraligatr", Type1: "water", Attack: 105, Total: 530 },
            { Name: "Quagsire", Type1: "water", Attack: 85, Total: 430 },
          ],
        },
      });
    }

    // Quest 10: Sort Keys — strongest Fire types, descending by Attack
    if (questId === "quest-10") {
      if (!/new\s+QueryCommand/.test(code)) {
        return respond({ success: false, message: "❌ Missing QueryCommand. You need to use the QueryCommand class." });
      }
      if (!/IndexName\s*:\s*["']Type1-Attack-Index["']/.test(code)) {
        return respond({ success: false, message: "❌ Missing IndexName. Query the composite index: IndexName: \"Type1-Attack-Index\"." });
      }
      if (!/:type["']?\s*:\s*["']fire["']/i.test(flat)) {
        return respond({ success: false, message: "❌ Bind :type to \"fire\" so we rank the Fire-type Pokémon." });
      }
      if (!/ScanIndexForward\s*:\s*false/.test(code)) {
        return respond({ success: false, message: "❌ Missing ScanIndexForward: false. By default DynamoDB sorts ascending — set it to false to put the strongest (highest Attack) first." });
      }
      return respond({
        success: true,
        message: "✅ Success! Fire-types returned strongest-first using the sort key.",
        data: {
          consumedCapacity: 0.5,
          scanIndexForward: false,
          items: [
            { Name: "Ho-Oh", Type1: "fire", Attack: 130 },
            { Name: "Typhlosion", Type1: "fire", Attack: 84 },
            { Name: "Cyndaquil", Type1: "fire", Attack: 52 },
          ],
        },
      });
    }

    // Quest 11: Conditional Writes — catch Lugia only if unowned
    if (questId === "quest-11") {
      if (!/new\s+UpdateCommand/.test(code)) {
        return respond({ success: false, message: "❌ Missing UpdateCommand. Catching Lugia stamps an Owner — use the UpdateCommand class." });
      }
      if (!/Key\s*:\s*{\s*Name\s*:\s*["']Lugia["']\s*}/.test(flat)) {
        return respond({ success: false, message: "❌ Wrong target! The Key 'Name' must be 'Lugia'." });
      }
      if (!/UpdateExpression\s*:\s*["']\s*SET\s+#\w+\s*=\s*:\w+\s*["']/i.test(code)) {
        return respond({ success: false, message: "❌ Invalid UpdateExpression. \"Owner\" is a reserved word — alias it, e.g. \"SET #own = :trainer\", to claim Lugia." });
      }
      if (!/ConditionExpression\s*:\s*["'][^"']*attribute_exists\(\s*#name\s*\)[^"']*AND[^"']*attribute_not_exists\(\s*#\w+\s*\)[^"']*["']/i.test(code)) {
        return respond({ success: false, error: "ConditionalCheckFailedException", message: "❌ Require both attribute_exists(#name) and attribute_not_exists(#own). UpdateItem can otherwise create a new phantom Lugia item." });
      }
      return respond({
        success: true,
        message: "✅ Gotcha! Lugia was caught — the conditional write guaranteed only one trainer could claim it.",
        data: { consumedCapacity: 1, updatedAttributes: { Name: "Lugia", Type1: "Psychic", SpDef: 154, Owner: "Ash" } },
      });
    }

    // Quest 12: Transactions — trade Scyther for Onix (all-or-nothing)
    if (questId === "quest-12") {
      if (!/new\s+TransactWriteCommand/.test(code)) {
        return respond({ success: false, message: "❌ Missing TransactWriteCommand. A trade must be atomic — use the TransactWriteCommand class." });
      }
      if (!/TransactItems\s*:\s*\[/.test(code)) {
        return respond({ success: false, message: "❌ Missing TransactItems array. List every write that must succeed together." });
      }
      const updateBlocks = (flat.match(/Update\s*:\s*{/g) || []).length;
      if (updateBlocks < 2) {
        return respond({ success: false, message: "❌ A trade has two sides. Add a second Update block so both Scyther and Onix change owner together." });
      }
      if (!/Name\s*:\s*["']Scyther["']/.test(code) || !/Name\s*:\s*["']Onix["']/.test(code)) {
        return respond({ success: false, message: "❌ Both Pokémon must be in the transaction. Update 'Scyther' (to your rival) and 'Onix' (to you)." });
      }
      const ownershipConditions = flat.match(/ConditionExpression\s*:\s*["']\s*#own\s*=\s*:expected\s*["']/g) || [];
      if (ownershipConditions.length < 2 || !/:expected["']?\s*:\s*["'](?:Ash|Gary)["']/.test(flat)) {
        return respond({ success: false, message: "❌ Protect both sides of the trade with '#own = :expected' so stale ownership cannot be overwritten." });
      }
      return respond({
        success: true,
        message: "✅ Trade complete! Scyther and Onix swapped owners atomically — if either write had failed, both would roll back.",
        data: {
          consumedCapacity: 4,
          transactItems: [
            { Update: { Name: "Scyther", Owner: "Gary" } },
            { Update: { Name: "Onix", Owner: "Ash" } },
          ],
        },
      });
    }

    // Quest 13: Batch Operations — heal the party in one request
    if (questId === "quest-13") {
      if (!/new\s+BatchGetCommand/.test(code)) {
        return respond({ success: false, message: "❌ Missing BatchGetCommand. Fetch the whole party in one call with the BatchGetCommand class." });
      }
      if (!/RequestItems\s*:\s*(?:{|requestItems\b)/.test(code)) {
        return respond({ success: false, message: "❌ Missing RequestItems. Batch reads are keyed by table name inside RequestItems." });
      }
      if (!/JohtoPokemon["']?\s*:\s*{\s*Keys\s*:\s*\[/.test(flat)) {
        return respond({ success: false, message: "❌ Missing Keys array. Under \"JohtoPokemon\" provide a Keys: [ ... ] list of the Pokémon to heal." });
      }
      const keyCount = (flat.match(/Name\s*:\s*["'][^"']+["']/g) || []).length;
      if (keyCount < 3) {
        return respond({ success: false, message: `❌ Add the full party. You listed ${keyCount} Pokémon — include at least 3 (e.g. Chikorita, Cyndaquil, Totodile).` });
      }
      if (!/UnprocessedKeys/.test(code)) {
        return respond({ success: false, message: "❌ BatchGet can return partial results. Inspect response.UnprocessedKeys and retry those keys with backoff." });
      }
      return respond({
        success: true,
        message: "✅ Party loaded! Your loop also retries any UnprocessedKeys instead of silently losing partial results.",
        data: {
          consumedCapacity: 1.5,
          responses: [
            { Name: "Chikorita", HP: 45, Total: 318 },
            { Name: "Cyndaquil", HP: 39, Total: 309 },
            { Name: "Totodile", HP: 50, Total: 314 },
          ],
        },
      });
    }

    // Quest 14: Pagination — scroll the Pokegear with ExclusiveStartKey
    if (questId === "quest-14") {
      if (!/new\s+(ScanCommand|QueryCommand)/.test(code)) {
        return respond({ success: false, message: "❌ Missing ScanCommand. Page through the Pokédex with a ScanCommand (or QueryCommand)." });
      }
      if (!/Limit\s*:\s*\d+/.test(code)) {
        return respond({ success: false, message: "❌ Missing Limit. Fetch a single page by setting a Limit (e.g. Limit: 10)." });
      }
      if (!/ExclusiveStartKey\s*:\s*{\s*Name\s*:\s*["'][^"']+["']\s*}/.test(flat)) {
        return respond({ success: false, message: "❌ Missing ExclusiveStartKey. Pass the previous page's LastEvaluatedKey here, e.g. ExclusiveStartKey: { Name: \"Meganium\" }, to fetch the next page." });
      }
      return respond({
        success: true,
        message: "✅ Next page loaded! ExclusiveStartKey resumed exactly where the last page stopped.",
        data: {
          consumedCapacity: 1,
          count: 3,
          items: [
            { Name: "Chinchou", Type1: "water" },
            { Name: "Lanturn", Type1: "water" },
            { Name: "Pichu", Type1: "electric" },
          ],
          lastEvaluatedKey: { Name: "Pichu" },
        },
      });
    }

    // Quest 15: Time To Live — burn status that auto-expires
    if (questId === "quest-15") {
      if (!/new\s+PutCommand/.test(code)) {
        return respond({ success: false, message: "❌ Missing PutCommand. Write the status effect with the PutCommand class." });
      }
      if (!/TableName\s*:\s*["']StatusEffects["']/.test(code)) {
        return respond({ success: false, message: "❌ Invalid TableName. Store status effects in the 'StatusEffects' table." });
      }
      if (!/Effect\s*:\s*["']Burn["']/.test(code)) {
        return respond({ success: false, message: "❌ This quest applies the 'Burn' effect — set Effect: \"Burn\"." });
      }
      if (!/ExpirationTime\s*:/.test(code)) {
        return respond({ success: false, message: "❌ Missing the ExpirationTime attribute — that's the field TTL watches." });
      }
      if (!/Date\.now\(\)\s*\/\s*1000/.test(code) || !/\+\s*\d+/.test(flat)) {
        return respond({ success: false, message: "❌ TTL expects an epoch timestamp in seconds. Use Math.floor(Date.now() / 1000) + 300 so the Burn clears in 5 minutes." });
      }
      return respond({
        success: true,
        message: "✅ Burn marked for expiry. It is now eligible for asynchronous TTL cleanup; production reads must still exclude expired items until deletion occurs.",
        data: {
          consumedCapacity: 1,
          item: { PokemonId: "Pikachu", Effect: "Burn", ExpirationTime: "<epoch+300>" },
        },
      });
    }

    if (questId === "quest-16") {
      const checks = [
        ["consistency", /globalTableConsistency\s*:\s*["']MREC["']/, "choose MREC for this lab, which requires TTL and regional transactions"],
        ["billing", /billingMode\s*:\s*["']PAY_PER_REQUEST["']/, "use PAY_PER_REQUEST for this unpredictable workload"],
        ["reads", /consistency\s*:\s*["']EVENTUAL_BY_DEFAULT["']/, "make eventual consistency the default and opt into strong reads only when required"],
        ["shards", /partitionShardCount\s*:\s*(?:[4-9]|[1-9]\d+)/, "use at least four write shards for the hot battle feed"],
        ["streams", /streamViewType\s*:\s*["']NEW_AND_OLD_IMAGES["']/, "capture both old and new images in the Stream"],
        ["pitr", /pointInTimeRecovery\s*:\s*true/, "enable point-in-time recovery"],
        ["kms", /encryption\s*:\s*["']KMS["']/, "select KMS encryption"],
        ["s3", /largeItemStore\s*:\s*["']S3["']/, "store large payloads in S3 and keep their pointer in DynamoDB"],
        ["globalTable", /multiRegion\s*:\s*["']GLOBAL_TABLE["']/, "use Global Tables for the multi-Region requirement"],
        ["alarms", /alarms\s*:\s*\[[^\]]*["']THROTTLED_REQUESTS["'][^\]]*["']SYSTEM_ERRORS["'][^\]]*["']LATENCY["'][^\]]*\]/, "alarm on throttles, system errors, and latency"],
      ] as const;
      // Every check is reported so the architecture board can light up each piece.
      const results = checks.map(([id, pattern, fix]) => ({ id, pass: pattern.test(code), fix }));
      const missing = results.find((r) => !r.pass);
      if (missing) return respond({ success: false, message: `❌ Production review incomplete: ${missing.fix}.`, checks: results });
      return respond({ success: true, message: "✅ Elite Four approved. Every choice is explicit—but production teams must still load-test keys, set numeric alarm thresholds, test restores, and rehearse regional failure.", data: { review: "approved", caveat: "Validate assumptions with traffic, cost models, restore drills, and least-privilege IAM." }, checks: results });
    }

    return respond(
      { error: "Invalid quest ID" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Simulation error:", error);
    return respond(
      { error: "Internal simulation error" },
      { status: 500 }
    );
  }
}
