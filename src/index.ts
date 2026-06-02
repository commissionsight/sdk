/** Lightweight typed client for the CommissionSight API. */

/** Member status for a period, file-over-file. */
export type Status = 'green' | 'yellow' | 'red';

/** Explicit delta flags attached to a member's status for a period. */
export type Flag =
  | 'NEW'
  | 'COMMISSION_CHANGED'
  | 'DATA_CHANGED'
  | 'DROPPED'
  | 'REAPPEARED'
  | 'REAPPEARED_WITH_DELTA'
  | 'CHARGEBACK';

/** One chargeback (negative-commission record) enriched with the original payout. */
export interface ChargebackRow {
  memberRefId: string;
  memberExternalId: string | null;
  policyNumber: string | null;
  planName: string | null;
  /** The amount clawed back this period (positive magnitude). */
  chargebackAmount: number;
  /** Whether the carrier ever paid this policy out. */
  paidOut: boolean;
  /** The original payout ("record 0"): when/where the carrier first paid, and how much. */
  originalPayout: {
    period: string;
    amount: number;
    fileId: string | null;
    fileName: string | null;
  } | null;
  /** Whether the chargeback exactly reverses the original payout. */
  fullyReversed: boolean;
}

export interface ClientOptions {
  baseUrl: string;
  token?: string;
  fetch?: typeof fetch;
}

export interface Page<T> {
  data: T[];
  pagination?: { limit: number; offset?: number; nextCursor?: number | null; hasMore: boolean };
}

export interface JobSummary {
  id: string;
  carrierId: string;
  periodYear: number;
  periodMonth: number;
  fileId: string;
  r2Key?: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stats?: Record<string, number> | null;
  error?: string | null;
  webhookUrl?: string | null;
  // Timestamps serialize as ISO strings over JSON; format via `new Date(...)`.
  createdAt: number | string;
  startedAt?: number | string | null;
  completedAt?: number | string | null;
}

export interface FileSummary {
  id: string;
  accountId: string;
  carrierId: string;
  periodYear: number;
  periodMonth: number;
  originalFilename: string;
  byteSize: number;
  checksumSha256: string;
  uploadedAt: number | string;
  /**
   * True when this period's delta/status scoring is stale because an earlier
   * (baseline) period was uploaded out of order. Call `rescoreFile` to refresh
   * it without re-uploading.
   */
  rescoreSuggested?: boolean;
  /** When set, the raw bytes were purged from object storage (retention). */
  r2PurgedAt?: number | string | null;
}

export interface AdminMetrics {
  totalJobs: number;
  jobsLast24h: number;
  byStatus: Record<string, number>;
  failures: number;
  accounts: number;
  accountsByStatus: Record<string, number>;
  pendingAccounts: number;
  users: number;
  webhooks: Record<string, number>;
  webhooksPending: number;
  webhooksFailed: number;
  recentJobs: {
    id: string;
    carrierId: string;
    periodYear: number;
    periodMonth: number;
    status: string;
    error: string | null;
    createdAt: number;
  }[];
  recentAccounts: { id: string; name: string; status: string; createdAt: number }[];
}

export interface AdminJobDetail {
  job: JobSummary & {
    accountId: string;
    webhookUrl?: string | null;
    idempotencyKey?: string | null;
  };
  carrierName: string | null;
  account: { name: string; slug: string } | null;
  file: {
    originalFilename: string;
    byteSize: number;
    checksumSha256: string;
    uploadedAt: number | string;
  } | null;
  durationMs: number | null;
  /** True when this job's period scoring is stale (out-of-order baseline). */
  rescoreSuggested?: boolean;
}

export interface AdminLogEvent {
  id: string;
  ts: number;
  level: 'info' | 'warn' | 'error';
  source: 'job' | 'webhook';
  message: string;
  detail: string | null;
}
export interface AdminAlert {
  id: string;
  severity: 'warning' | 'critical';
  title: string;
  detail: string;
  ts: number;
}
export interface AdminLogs {
  generatedAt: number;
  events: AdminLogEvent[];
  alerts: AdminAlert[];
  pagination?: { limit: number; offset: number; hasMore: boolean };
}

export interface AdminProvisionResult {
  provisioned: boolean;
  alreadyProvisioned?: boolean;
  createdDatabase?: boolean;
  migrationsApplied?: number;
  error?: string;
}

export interface ResultRow {
  memberRefId: string;
  status: Status;
  flags: Flag[];
  commissionAmount: number | null;
  prevCommissionAmount: number | null;
  /** Expected-vs-actual shortfall for this member (recoverable), in dollars. 0
   * when no contracted rate applies. Reconciles to the period's owed rollup. */
  commissionOwed: number;
  comparedAgainstPeriod: string | null;
  memberExternalId: string | null;
  memberName: string | null;
  email: string | null;
  planName: string | null;
  policyNumber: string | null;
  premiumAmount: number | null;
}

export interface ComparisonRow {
  memberRefId: string;
  status: Status;
  flags: Flag[];
  commissionAmount: number | null;
  prevCommissionAmount: number | null;
  comparedAgainstPeriod: string | null;
  memberName: string | null;
  memberExternalId: string | null;
  policyNumber: string | null;
}

export interface BillingDetails {
  contactName?: string;
  companyName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface BillingProfile extends BillingDetails {
  card: { brand: string; last4: string } | null;
  paymentMethod?: 'card' | 'us_bank_account' | null;
  stripeEnabled?: boolean;
}

export interface BillingPreview {
  period: string | null;
  members: number;
  pricePerMemberCents: number;
  amountCents: number;
  method: 'card' | 'us_bank_account';
  feeCents: number;
  totalCents: number;
  achSavingsCents: number;
  surcharge?: boolean;
  dueDate: string | null;
  custom?: boolean;
  lastBilledPeriod: string | null;
}

export interface CarrierConfigEntry {
  id: string;
  version: number;
  fileType: 'csv' | 'xlsx';
  accountId: string | null;
  isActive: boolean;
  config: Record<string, unknown>;
}

export interface AdminAccountBilling {
  accountId: string;
  contactName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  customRateCents: number | null;
  surchargeEnabled: boolean;
  paymentMethodType: 'card' | 'us_bank_account' | null;
  card: { brand: string; last4: string } | null;
  lastBilledPeriod: string | null;
  lastBilledAmountCents: number | null;
}

export interface AdminUser {
  id: string;
  email: string;
  role: 'member' | 'admin';
  accountId: string | null;
  accountName?: string | null;
  createdAt?: number;
}

export type StabilityLevel = 'ok' | 'watch' | 'alert';

export interface DataQualitySignal {
  carrierId: string;
  carrierName: string | null;
  level: StabilityLevel;
  reason: string;
  droppedRate: number;
  newRate: number;
  churnOverlap: number;
  red: number;
  newMembers: number;
  reappeared: number;
  present: number;
}

export interface DataQualityReport {
  period: string | null;
  overall: StabilityLevel;
  carriers: DataQualitySignal[];
}

export interface AttritionPoint {
  period: string;
  year: number;
  month: number;
  red: number;
  memberCount: number;
  attritionRate: number;
  /** Commission at risk this period (MoM shortfall), in dollars. */
  commissionAtRisk: number;
}

export interface Webhook {
  id: string;
  url: string;
  events: string[];
}

export interface ExpectedCommissionRate {
  id: string;
  carrierId: string;
  /** null = the carrier-wide default; a value = a per-plan override. */
  planCode: string | null;
  rateType: 'percent_of_premium' | 'flat_per_member';
  /** Fraction for percent_of_premium (0.20 = 20%); dollars for flat_per_member. */
  rateValue: number;
}

export interface AssistantAnswer {
  question: string;
  answer: string;
  sql: string;
  columns: string[];
  rows: Record<string, unknown>[];
  truncated: boolean;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface InferredConfig {
  config: unknown;
  confidence: number;
  headerRow: number;
  sheets: string[];
  mapped: { header: string; target: string; score: number }[];
  unmapped: string[];
  notes: string[];
  preview: { mapped: number; failed: number; rows: unknown[] } | null;
}

export class CommissionSightClient {
  private readonly baseUrl: string;
  private token: string | undefined;
  private readonly fetchFn: typeof fetch;

  constructor(opts: ClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/+$/, '');
    this.token = opts.token;
    this.fetchFn = opts.fetch ?? globalThis.fetch.bind(globalThis);
  }

  setToken(token: string | undefined): void {
    this.token = token;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers);
    if (this.token) headers.set('authorization', `Bearer ${this.token}`);
    if (init.body && !(init.body instanceof FormData)) {
      headers.set('content-type', 'application/json');
    }
    const res = await this.fetchFn(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    const body = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const message =
        body && typeof body === 'object' && 'title' in body ? String(body.title) : res.statusText;
      throw new ApiError(res.status, message, body);
    }
    return body as T;
  }

  // --- auth ---
  register(email: string, accountName: string) {
    return this.request<{ accountId: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, accountName }),
    });
  }
  requestOtp(email: string) {
    return this.request<{ status: string }>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }
  verifyOtp(email: string, code: string) {
    return this.request<{
      token: string;
      account: { accountId: string; status: string } | null;
      role: string;
    }>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code }) });
  }

  // --- carriers / configs ---
  listCarriers(params: { withConfig?: boolean } = {}) {
    return this.request<Page<{ id: string; name: string; slug: string }>>(
      `/carriers${query({ withConfig: params.withConfig ? 'true' : undefined })}`,
    );
  }
  getCarrier(carrierId: string) {
    return this.request<{ id: string; name: string; slug: string }>(`/carriers/${carrierId}`);
  }
  listConfigs(carrierId: string) {
    return this.request<Page<unknown>>(`/carriers/${carrierId}/configs`);
  }
  getConfigVersion(carrierId: string, version: number) {
    return this.request<unknown>(`/carriers/${carrierId}/configs/${version}`);
  }
  /** Create an account-scoped carrier config override. */
  createConfig(carrierId: string, config: unknown) {
    return this.request<{ id: string; version: number }>(`/carriers/${carrierId}/configs`, {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }
  /** Dry-run a config against a sample file (maps + previews, persists nothing). */
  testConfig(carrierId: string, config: unknown, file: File | Blob) {
    const form = new FormData();
    form.set('config', JSON.stringify(config));
    form.set('file', file);
    return this.request<{ mapped: number; failed: number; rows: unknown[] }>(
      `/carriers/${carrierId}/configs/test`,
      { method: 'POST', body: form },
    );
  }
  /** Infer a draft config from a sample file. */
  inferConfig(carrierId: string, file: File | Blob, opts: { sheetName?: string } = {}) {
    const form = new FormData();
    form.set('file', file);
    if (opts.sheetName) form.set('sheetName', opts.sheetName);
    return this.request<InferredConfig>(`/carriers/${carrierId}/configs/infer`, {
      method: 'POST',
      body: form,
    });
  }

  // --- files ---
  async uploadFile(input: {
    file: File | Blob;
    carrierId: string;
    periodYear: number;
    periodMonth: number;
    webhookUrl?: string;
    idempotencyKey?: string;
    /**
     * Replace an existing statement for this carrier+period. Without it, uploading
     * over an existing period fails with `409` (`period_exists`); with it, the
     * existing data is retracted and the corrected file re-ingested atomically
     * (dropped members leave no orphan rows). The response carries `mode:'replace'`.
     */
    replace?: boolean;
  }): Promise<{ jobId: string; fileId: string; status: string; mode?: string }> {
    const form = new FormData();
    form.set('file', input.file);
    form.set('carrierId', input.carrierId);
    form.set('periodYear', String(input.periodYear));
    form.set('periodMonth', String(input.periodMonth));
    if (input.webhookUrl) form.set('webhookUrl', input.webhookUrl);
    if (input.replace) form.set('replace', 'true');
    const headers = input.idempotencyKey ? { 'idempotency-key': input.idempotencyKey } : undefined;
    return this.request('/files', { method: 'POST', body: form, headers });
  }
  listFiles(params: { carrierId?: string; limit?: number; cursor?: number } = {}) {
    return this.request<Page<FileSummary>>(`/files${query(params)}`);
  }
  getFile(fileId: string) {
    return this.request<FileSummary>(`/files/${fileId}`);
  }
  /**
   * Re-process (re-score) a file's period without re-uploading — recomputes
   * statuses/deltas against the current baseline. Use after uploading an earlier
   * month out of order (see `FileSummary.rescoreSuggested`).
   */
  rescoreFile(fileId: string) {
    return this.request<{ jobId: string; fileId: string; status: string; mode: string }>(
      `/files/${fileId}/rescore`,
      { method: 'POST' },
    );
  }
  /**
   * Retract (unapply) a file's carrier+period — deletes the period's data with no
   * re-upload and re-scores the following month. Scoped to the whole carrier+period
   * (all files for it), so a period split across files clears as a unit. Returns
   * `409` (`already_retracted`) if the file was already retracted/replaced.
   */
  retractFile(fileId: string) {
    return this.request<{ jobId: string; fileId: string; status: string; mode: string }>(
      `/files/${fileId}`,
      { method: 'DELETE' },
    );
  }
  /**
   * Purge the raw statement bytes from object storage (data retention). The file
   * row + scored results remain; the file can no longer be re-ingested. Idempotent.
   */
  purgeFile(fileId: string) {
    return this.request<{ fileId: string; purged: boolean }>(`/files/${fileId}/purge`, {
      method: 'POST',
    });
  }

  // --- jobs ---
  listJobs(
    params: {
      status?: string;
      carrierId?: string;
      periodYear?: number;
      periodMonth?: number;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    return this.request<Page<JobSummary>>(`/jobs${query(params)}`);
  }
  getJob(jobId: string) {
    return this.request<JobSummary>(`/jobs/${jobId}`);
  }
  getJobResults(
    jobId: string,
    params: {
      status?: string;
      owedOnly?: boolean;
      chargeback?: boolean;
      limit?: number;
      offset?: number;
    } = {},
  ) {
    const { owedOnly, chargeback, ...rest } = params;
    return this.request<Page<ResultRow> & { period: { year: number; month: number } }>(
      `/jobs/${jobId}/results${query({
        ...rest,
        owedOnly: owedOnly ? 'true' : undefined,
        chargeback: chargeback ? 'true' : undefined,
      })}`,
    );
  }
  getJobDeltas(jobId: string, params: { memberRefId?: string; changeType?: string } = {}) {
    return this.request<Page<unknown>>(`/jobs/${jobId}/deltas${query(params)}`);
  }
  retryJob(jobId: string) {
    return this.request<{ jobId: string; status: string }>(`/jobs/${jobId}/retry`, {
      method: 'POST',
    });
  }

  // --- members ---
  listMembers(
    params: { carrierId?: string; status?: string; periodYear?: number; periodMonth?: number } = {},
  ) {
    return this.request<Page<unknown>>(`/members${query(params)}`);
  }
  getMember(memberRefId: string) {
    return this.request<unknown>(`/members/${memberRefId}`);
  }
  getMemberTimeline(memberRefId: string) {
    return this.request<Page<unknown>>(`/members/${memberRefId}/timeline`);
  }
  /** Where/when a member was last seen (period + originating file). */
  getMemberLastSeen(memberRefId: string) {
    return this.request<unknown>(`/members/${memberRefId}/last-seen`);
  }

  // --- comparisons / reports ---
  compare(params: { from: string; to: string; carrierId?: string; granularity?: string }) {
    return this.request<{
      from: string;
      to: string;
      summary: {
        green: number;
        yellow: number;
        red: number;
        new: number;
        reappeared: number;
        total: number;
      };
      data: ComparisonRow[];
    }>(`/comparisons${query(params)}`);
  }
  rollup(period?: string, carrierId?: string) {
    return this.request<{
      period: string | null;
      totals: {
        memberCount: number;
        green: number;
        yellow: number;
        red: number;
        new: number;
        reappeared: number;
        /** Commission at risk vs the prior period (MoM shortfall), in dollars. */
        commissionAtRisk: number;
        /** Of `commissionAtRisk`: prior commission of dropped members. */
        commissionDropped: number;
        /** Of `commissionAtRisk`: the decrease for members paid less. */
        commissionReduced: number;
        /** Number of still-present members paid less than the prior period. */
        reducedCount: number;
        /** Expected-vs-actual commission owed (recoverable), in dollars. */
        commissionOwed: number;
        /** Records the owed figure could be computed for (had a rate + inputs). */
        owedEvaluated: number;
        /** All records considered for owed (coverage denominator). */
        owedTotal: number;
        /** Members with a chargeback (net-negative commission) this period. */
        chargebackCount: number;
        /** Total commission clawed back this period (positive magnitude). */
        chargebackAmount: number;
      };
      byCarrier: unknown[];
    }>(`/reports/rollup${query({ period, carrierId })}`);
  }
  /** Chargebacks for a period, each enriched with the policy's original payout. */
  listChargebacks(
    params: { period?: string; carrierId?: string; limit?: number; offset?: number } = {},
  ) {
    return this.request<{ period: string | null; data: ChargebackRow[] } & Page<ChargebackRow>>(
      `/chargebacks${query(params)}`,
    );
  }
  attrition(period: string, carrierId?: string) {
    return this.request<{ attritionRate: number; byCarrier: unknown[] }>(
      `/reports/attrition${query({ period, carrierId })}`,
    );
  }
  attritionSeries(params: { months?: number; carrierId?: string } = {}) {
    return this.request<{ data: AttritionPoint[] }>(`/reports/attrition-series${query(params)}`);
  }
  dataQuality(period?: string) {
    return this.request<DataQualityReport>(`/reports/data-quality${query({ period })}`);
  }

  // --- expected commission rates (the "owed" model inputs) ---
  listExpectedRates(carrierId?: string) {
    return this.request<{ data: ExpectedCommissionRate[] }>(
      `/expected-rates${query({ carrierId })}`,
    );
  }
  /** Upsert the contracted rate for a carrier (+ optional plan). Re-posting the
   * same carrier+plan updates it. `rateValue` is a fraction for percent_of_premium. */
  upsertExpectedRate(input: {
    carrierId: string;
    planCode?: string | null;
    rateType: 'percent_of_premium' | 'flat_per_member';
    rateValue: number;
  }) {
    return this.request<ExpectedCommissionRate>('/expected-rates', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
  deleteExpectedRate(id: string) {
    return this.request<void>(`/expected-rates/${id}`, { method: 'DELETE' });
  }

  // --- webhooks ---
  listWebhooks() {
    return this.request<{ data: Webhook[] }>('/webhooks');
  }
  /** Subscribe to job events. The signing `secret` is returned ONCE on creation. */
  createWebhook(input: { url: string; events: ('job.completed' | 'job.failed')[] }) {
    return this.request<Webhook & { secret: string }>('/webhooks', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }
  deleteWebhook(id: string) {
    return this.request<void>(`/webhooks/${id}`, { method: 'DELETE' });
  }

  // --- session / service ---
  /** The account behind the current token. */
  me() {
    return this.request<{ accountId: string; name: string; status: string }>('/me');
  }
  /** Liveness probe (no auth required). */
  health() {
    return this.request<{ status: string; service: string; environment: string }>('/health');
  }

  // --- billing / profile ---
  getBilling() {
    return this.request<BillingProfile>('/billing');
  }
  updateBilling(body: BillingDetails) {
    return this.request<BillingProfile>('/billing', { method: 'PUT', body: JSON.stringify(body) });
  }
  billingPreview() {
    return this.request<BillingPreview>('/billing/preview');
  }
  createSetupIntent() {
    return this.request<{
      clientSecret: string;
      publishableKey: string | null;
      customerId: string;
    }>('/billing/setup-intent', { method: 'POST' });
  }
  savePaymentMethod(paymentMethodId: string) {
    return this.request<{ method: string; brand: string | null; last4: string | null }>(
      '/billing/payment-method',
      { method: 'POST', body: JSON.stringify({ paymentMethodId }) },
    );
  }

  // --- AI assistant ---
  ask(question: string, history: { question: string; sql?: string }[] = []) {
    return this.request<AssistantAnswer>('/assistant/query', {
      method: 'POST',
      body: JSON.stringify({ question, history }),
    });
  }

  // --- admin (role=admin session required) ---
  readonly admin = {
    listAccounts: (status?: 'active' | 'pending' | 'suspended') =>
      this.request<{
        data: {
          id: string;
          name: string;
          slug: string;
          status: string;
          customRateCents?: number | null;
          provisioned?: boolean;
        }[];
      }>(`/admin/accounts${query({ status })}`),
    setBillingRate: (accountId: string, rateCents: number | null) =>
      this.request<{ accountId: string; customRateCents: number | null }>(
        `/admin/accounts/${accountId}/billing-rate`,
        { method: 'PUT', body: JSON.stringify({ rateCents }) },
      ),
    getAccountBilling: (accountId: string) =>
      this.request<AdminAccountBilling>(`/admin/accounts/${accountId}/billing`),
    setSurcharge: (accountId: string, enabled: boolean) =>
      this.request<{ accountId: string; surchargeEnabled: boolean }>(
        `/admin/accounts/${accountId}/surcharge`,
        { method: 'PUT', body: JSON.stringify({ enabled }) },
      ),
    approveAccount: (accountId: string) =>
      this.request<{
        id: string;
        status: string;
        notified: number;
        provision?: AdminProvisionResult;
      }>(`/admin/accounts/${accountId}/approve`, { method: 'POST' }),
    /** Provision (or re-provision) an account's data store. Pass a connString to
     * use a database created out of band; omit it to auto-create a Neon DB. */
    provisionAccount: (accountId: string, connString?: string) =>
      this.request<AdminProvisionResult>(`/admin/accounts/${accountId}/provision`, {
        method: 'POST',
        body: JSON.stringify(connString ? { connString } : {}),
      }),
    createAccount: (name: string) =>
      this.request<{ id: string; name: string; slug: string }>('/admin/accounts', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    /** Purge ALL raw statement bytes for an account from object storage (retention). */
    purgeAccountFiles: (accountId: string) =>
      this.request<{ accountId: string; purged: number }>(
        `/admin/accounts/${accountId}/purge-files`,
        { method: 'POST' },
      ),
    issueToken: (accountId: string, label?: string) =>
      this.request<{ tokenId: string; token: string; label: string }>(
        `/admin/accounts/${accountId}/tokens`,
        { method: 'POST', body: JSON.stringify({ label }) },
      ),
    /** List an account's API tokens — metadata only (never the secret). */
    listTokens: (accountId: string) =>
      this.request<{
        data: {
          id: string;
          label: string | null;
          revoked: boolean;
          lastUsedAt: number | null;
          createdAt: number;
        }[];
      }>(`/admin/accounts/${accountId}/tokens`),
    revokeToken: (tokenId: string) =>
      this.request<{ tokenId: string; revoked: boolean }>(`/admin/tokens/${tokenId}/revoke`, {
        method: 'POST',
      }),
    storeCredentials: (accountId: string, body: { connString: string; region?: string }) =>
      this.request<{ accountId: string; stored: boolean }>(
        `/admin/accounts/${accountId}/credentials`,
        { method: 'PUT', body: JSON.stringify(body) },
      ),
    createCarrier: (name: string, slug: string) =>
      this.request<{ id: string; name: string; slug: string }>('/admin/carriers', {
        method: 'POST',
        body: JSON.stringify({ name, slug }),
      }),
    renameCarrier: (id: string, name: string, slug?: string) =>
      this.request<{ id: string; name: string; slug?: string }>(`/admin/carriers/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name, ...(slug ? { slug } : {}) }),
      }),
    /** Onboarding: infer a draft config from a sample statement (CSV/XLSX). */
    inferConfig: (
      carrierId: string,
      file: File | Blob,
      opts: { sheetName?: string; fileType?: 'csv' | 'xlsx' } = {},
    ) => {
      const form = new FormData();
      form.append('file', file);
      if (opts.sheetName) form.append('sheetName', opts.sheetName);
      if (opts.fileType) form.append('fileType', opts.fileType);
      return this.request<InferredConfig>(`/admin/carriers/${carrierId}/configs/infer`, {
        method: 'POST',
        body: form,
      });
    },
    listUsers: () => this.request<{ data: AdminUser[] }>('/admin/users'),
    createUser: (body: { email: string; accountId?: string; role?: 'member' | 'admin' }) =>
      this.request<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) }),
    /** Update a user's role. A user's account link is immutable (set at invite). */
    updateUser: (id: string, body: { role: 'member' | 'admin' }) =>
      this.request<{ id: string; updated: boolean }>(`/admin/users/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    deleteUser: (id: string) =>
      this.request<{ id: string; deleted: boolean }>(`/admin/users/${id}`, { method: 'DELETE' }),
    createGlobalConfig: (carrierId: string, config: unknown) =>
      this.request<{ id: string; version: number }>(`/admin/carriers/${carrierId}/configs`, {
        method: 'POST',
        body: JSON.stringify(config),
      }),
    listCarrierConfigs: (carrierId: string) =>
      this.request<{ data: CarrierConfigEntry[] }>(`/admin/carriers/${carrierId}/configs`),
    updateCarrierConfig: (carrierId: string, configId: string, config: unknown) =>
      this.request<{ id: string; version: number; updated: boolean }>(
        `/admin/carriers/${carrierId}/configs/${configId}`,
        { method: 'PUT', body: JSON.stringify(config) },
      ),
    addAllowlist: (email: string) =>
      this.request<{ email: string }>('/admin/allowlist', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),
    listJobs: (params: { status?: string; limit?: number; offset?: number } = {}) =>
      this.request<Page<JobSummary & { accountId: string; rescoreSuggested?: boolean }>>(
        `/admin/jobs${query(params)}`,
      ),
    jobDetail: (jobId: string) => this.request<AdminJobDetail>(`/admin/jobs/${jobId}`),
    retryJob: (jobId: string) =>
      this.request<{ jobId: string; status: string }>(`/admin/jobs/${jobId}/retry`, {
        method: 'POST',
      }),
    rescoreJob: (jobId: string) =>
      this.request<{ jobId: string; status: string; mode: string }>(
        `/admin/jobs/${jobId}/rescore`,
        { method: 'POST' },
      ),
    metrics: () => this.request<AdminMetrics>('/admin/metrics'),
    logs: (params: { limit?: number; offset?: number } = {}) =>
      this.request<AdminLogs>(`/admin/logs${query(params)}`),
  };
}

export function query(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.set(k, String(v));
  return `?${sp.toString()}`;
}
