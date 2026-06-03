# @commissionsight/sdk

[![npm version](https://img.shields.io/npm/v/@commissionsight/sdk.svg)](https://www.npmjs.com/package/@commissionsight/sdk)
[![license](https://img.shields.io/npm/l/@commissionsight/sdk.svg)](./LICENSE)

A lightweight, **zero-dependency** TypeScript client for the [CommissionSight](https://commissionsight.com) API.

CommissionSight ingests carrier commission statements (CSV/XLSX), normalizes them across carriers, and scores every member period-over-period as **🟢 green / 🟡 yellow / 🔴 red** with explicit change flags — so you can see new business, commission changes, and attrition at a glance. This SDK wraps the REST API with full type definitions.

- **Zero runtime dependencies** — just `fetch`.
- **Fully typed** — every request and response is described by an exported interface.
- **ESM-only** — modern `import` syntax (Node 18+, Bun, Deno, browsers, Cloudflare Workers).
- **Isomorphic** — pass your own `fetch` for non-standard runtimes or tests.

---

## Installation

```bash
npm install @commissionsight/sdk
# or
bun add @commissionsight/sdk
# or
pnpm add @commissionsight/sdk
```

> **ESM-only.** This package ships `type: "module"` and only exposes an `import` entry point. Use `import`, not `require()`. Requires a runtime with a global `fetch` (Node 18+).

---

## Quick start

```ts
import { CommissionSightClient } from '@commissionsight/sdk';

const cs = new CommissionSightClient({
  baseUrl: 'https://api.commissionsight.com/v1',
  token: process.env.COMMISSIONSIGHT_TOKEN, // a per-account API token
});

const carriers = await cs.listCarriers();
console.log(carriers.data); // [{ id, name, slug }, ...]
```

### Client options

```ts
interface ClientOptions {
  baseUrl: string;          // e.g. https://api.commissionsight.com/v1
  token?: string;           // Bearer token; can also be set later via setToken()
  fetch?: typeof fetch;     // custom fetch (defaults to globalThis.fetch)
}
```

`baseUrl` may include or omit a trailing slash — it's normalized. Set or rotate the token at any time:

```ts
cs.setToken(newToken);
cs.setToken(undefined); // clear it
```

---

## Authentication

The SDK is for **server-to-server integrations**, authenticated with a **per-account API token**
issued to you by CommissionSight. Pass it as `token` when constructing the client (or set/rotate it
later); every request is sent as `Authorization: Bearer <token>`.

```ts
const cs = new CommissionSightClient({
  baseUrl: 'https://api.commissionsight.com/v1',
  token: process.env.COMMISSIONSIGHT_TOKEN, // your per-account API token
});

cs.setToken(newToken); // rotate at any time
```

---

## Uploading a statement & tracking the job

Uploading a file kicks off an asynchronous ingest **job**. Poll the job until it's `completed`, then read the scored results.

```ts
// `file` is a File or Blob — e.g. from an <input type="file"> or fs in Node.
const { jobId, fileId } = await cs.uploadFile({
  file,
  carrierId: 'car_123',
  periodYear: 2026,
  periodMonth: 5,
  // Optional: get a signed webhook callback when the job finishes.
  webhookUrl: 'https://acme.com/hooks/commissionsight',
  // Optional: safe retries — re-uploading with the same key won't double-ingest.
  idempotencyKey: 'acme-2026-05-aetna',
});

// Poll until done.
let job = await cs.getJob(jobId);
while (job.status === 'queued' || job.status === 'processing') {
  await new Promise((r) => setTimeout(r, 1500));
  job = await cs.getJob(jobId);
}
if (job.status === 'failed') throw new Error(job.error ?? 'ingest failed');

// Read the scored rows for this period.
const results = await cs.getJobResults(jobId, { status: 'yellow' });
for (const row of results.data) {
  console.log(row.memberRefId, row.status, row.flags, row.commissionAmount);
}
```

### Re-scoring after an out-of-order upload

If you upload an earlier month *after* a later one, the later period's scoring becomes stale. `listFiles()` flags this with `rescoreSuggested`; refresh it without re-uploading:

```ts
const files = await cs.listFiles({ carrierId: 'car_123' });
for (const f of files.data) {
  if (f.rescoreSuggested) await cs.rescoreFile(f.id);
}
```

### Correcting or removing a statement

Uploading over a carrier+period that already has a file fails with `409` (`period_exists`) — re-uploads are never silently destructive. To apply a **corrected file**, pass `replace: true`: the existing data is retracted and the corrected file re-ingested atomically, so members the correction drops leave no orphan rows. The following month is re-scored automatically.

```ts
// Carrier sent a corrected April file — replace the one on record.
const { jobId, mode } = await cs.uploadFile({
  file: correctedFile,
  carrierId: 'car_123',
  periodYear: 2026,
  periodMonth: 4,
  replace: true, // omit → 409 period_exists if the period already exists
});
// mode === 'replace'

// Or remove a period entirely (no re-upload), re-scoring the next month:
await cs.retractFile(fileId);
```

---

## Status & flags

Every scored member row carries a `status` and zero or more `flags`:

| `status`  | Meaning |
| --------- | ------- |
| 🟢 `green`  | Present and unchanged vs. the prior period. |
| 🟡 `yellow` | Present but something tracked changed (see flags). |
| 🔴 `red`    | Present in the prior period, **absent now** (dropped). |

| `flag`                    | Meaning |
| ------------------------- | ------- |
| `NEW`                     | First time this member is seen. |
| `COMMISSION_CHANGED`      | Commission amount differs from the prior period. |
| `DATA_CHANGED`            | A tracked non-commission field changed. |
| `DROPPED`                 | Was present before, missing now. |
| `REAPPEARED`              | Returned after being absent. |
| `REAPPEARED_WITH_DELTA`   | Returned **and** came back with a different commission. |

```ts
import type { Status, Flag, ResultRow } from '@commissionsight/sdk';
```

---

## Reading data

```ts
// Files & jobs
await cs.listFiles({ carrierId, limit: 50 });
await cs.listJobs({ status: 'completed' });
await cs.getJobResults(jobId, { status: 'red', limit: 100, offset: 0 });
await cs.getJobDeltas(jobId, { changeType: 'COMMISSION_CHANGED' });
await cs.retryJob(jobId);

// Members & policies — status, timeline, and the full audit journey
await cs.listMembers({ carrierId, status: 'yellow' });
await cs.getMemberTimeline(memberRefId);
await cs.getMemberJourney(memberRefId); // every period, source file, status + field changes
await cs.getPolicyJourney(policyRefId);

// Rejected rows from an ingest (exception file, as CSV text)
const csv = await cs.downloadExceptions(jobId);

// Carriers & their mapping configs
await cs.listCarriers({ withConfig: true });
await cs.listConfigs(carrierId);
```

### Commission owed (expected vs. actual)

Set your contracted rate per carrier; the API computes the recoverable shortfall vs. what the
carrier actually paid (it's also a per-member field on the results grid).

```ts
await cs.upsertExpectedRate({ carrierId, rateType: 'percent_of_premium', rateValue: 0.2 });
const rollup = await cs.rollup('2026-05', carrierId);
console.log(rollup.totals.commissionOwed, rollup.totals.owedEvaluated, rollup.totals.owedTotal);
```

### Chargebacks

```ts
const cb = await cs.listChargebacks({ carrierId }); // negative-commission events + original payout
```

### Webhooks

Subscribe to signed callbacks instead of polling:

```ts
await cs.createWebhook({ url: 'https://acme.com/hooks/cs', events: ['job.completed'] });
```

### Audit trail

```ts
await cs.listAudit({ limit: 50 }); // append-only record of account actions
```

### Compare any two periods

```ts
const cmp = await cs.compare({ from: '2026-04', to: '2026-05', carrierId });
console.log(cmp.summary); // { green, yellow, red, new, reappeared, total }
```

### Reports

```ts
await cs.rollup('2026-05', carrierId);          // period totals by status + by carrier
await cs.attrition('2026-05', carrierId);        // attrition rate for a period
await cs.attritionSeries({ months: 12 });        // attrition trend
await cs.dataQuality('2026-05');                 // statement-quality signals (ok/watch/alert)
```

---

## AI assistant

Ask natural-language questions against your data. The API translates the question to read-only SQL, runs it, and returns both the answer and the rows.

```ts
const res = await cs.ask('Which members had the biggest commission drop last month?');
console.log(res.answer); // prose answer
console.log(res.sql);    // the SQL that was run (read-only)
console.log(res.rows);   // the underlying result rows
```

---

## Pagination

List endpoints return a `Page<T>`:

```ts
interface Page<T> {
  data: T[];
  pagination?: {
    limit: number;
    offset?: number;
    nextCursor?: number | null;
    hasMore: boolean;
  };
}
```

Offset-based endpoints accept `{ limit, offset }`; cursor-based ones (e.g. `listFiles`) accept `{ limit, cursor }` and return `nextCursor`.

---

## Error handling

Any non-2xx response throws an `ApiError`. It carries the HTTP status and the parsed [RFC 9457](https://www.rfc-editor.org/rfc/rfc9457) `problem+json` body when present.

```ts
import { ApiError } from '@commissionsight/sdk';

try {
  await cs.getJob('does-not-exist');
} catch (err) {
  if (err instanceof ApiError) {
    console.error(err.status); // e.g. 404
    console.error(err.message); // problem `title`
    console.error(err.body);    // full problem+json payload
  }
}
```

---

## TypeScript

Every payload is exported as a named type — `ResultRow`, `ComparisonRow`, `JobSummary`, `FileSummary`, `Journey`, `ChargebackRow`, `ExpectedCommissionRate`, `AuditEvent`, `DataQualityReport`, `AttritionPoint`, and the `Status` / `Flag` unions. Import what you need:

```ts
import type {
  CommissionSightClient,
  ResultRow,
  JobSummary,
  Journey,
  Status,
  Flag,
} from '@commissionsight/sdk';
```

---

## Links

- **Website:** https://commissionsight.com
- **API docs:** https://docs.commissionsight.com
- **Issues:** https://github.com/commissionsight/sdk/issues

## License

[MIT](./LICENSE) © CommissionSight
