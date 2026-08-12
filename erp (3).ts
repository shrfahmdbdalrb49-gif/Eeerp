/**
 * اختبارات الوحدات الحرجة في شرف ERP:
 *  - FEFO batch picking logic
 *  - Doc numbering format
 *  - Tenant isolation guard (erpProcedure) — محاكاة عبر appRouter
 *  - Posting arithmetic (halala conversion)
 */
import { describe, expect, it } from "vitest";
import { appRouter } from "../server/routers";
import { pickFefo, formatHalala, nextSequence } from "../server/erp/testing";
import { db } from "../server/erp/db";

describe("posting arithmetic", () => {
  it("converts halala to display currency correctly", () => {
    expect(formatHalala(12500)).toBe("125.00");
    expect(formatHalala(0)).toBe("0.00");
    expect(formatHalala(50)).toBe("0.50");
  });
  it("preserves halala precision in line totals", () => {
    const qty = 3;
    const priceHalala = 875; // 8.75
    const total = qty * priceHalala; // 2625 halala
    expect(formatHalala(total)).toBe("26.25");
  });
});

describe("FEFO picking", () => {
  it("picks the batch with the earliest expiry date among non-empty batches", () => {
    const batches = [
      { id: 2, batchNo: "B-2", expDate: new Date("2027-06-30"), qty: 50 },
      { id: 1, batchNo: "B-1", expDate: new Date("2026-12-31"), qty: 30 },
      { id: 3, batchNo: "B-3", expDate: new Date("2028-01-01"), qty: 100 },
    ];
    const picked = pickFefo(batches, 20);
    expect(picked?.batchNo).toBe("B-1");
    expect(picked?.remaining).toBe(10); // 30 - 20
  });
  it("returns null when no batch has enough stock", () => {
    const batches = [{ id: 1, batchNo: "B-1", expDate: new Date("2027-01-01"), qty: 5 }];
    expect(pickFefo(batches, 100)).toBeNull();
  });
  it("skips empty batches", () => {
    const batches = [
      { id: 1, batchNo: "B-1", expDate: new Date("2026-01-01"), qty: 0 },
      { id: 2, batchNo: "B-2", expDate: new Date("2027-01-01"), qty: 40 },
    ];
    expect(pickFefo(batches, 10)?.batchNo).toBe("B-2");
  });
});

describe("document numbering", () => {
  it("builds sequential doc numbers with date prefix", () => {
    const doc = nextSequence("SA", new Date("2026-08-12T10:00:00Z"), 7);
    expect(doc).toBe("SA20260812-0000007");
  });
});

describe("tenant isolation guard", () => {
  const caller = (userId: number) => ({
    user: { id: userId, email: "t@x.sa", name: "T", role: "user" as const },
    req: {} as any,
    res: {} as any,
  });

  it("rejects mutation from an anonymous user", async () => {
    await expect(
      appRouter
        .createCaller({ ...caller(0), user: null } as any)
        .erp.masterdata.items.list({ q: "x" }),
    ).rejects.toThrow();
  });

  it("rejects access to a tenant the user is not a member of", async () => {
    const d = await db();
    // ensure tenant 99999 has no membership for user id 99999
    const res = await d.execute({ sql: "SELECT COUNT(*) AS c FROM tenant_users WHERE tenant_id = 99999" } as any);
    const count = Array.isArray(res) ? Number((res as any[])[0]?.c) : 0;
    expect(count).toBe(0);
    await expect(
      appRouter
        .createCaller({ ...caller(99999), tenantId: 99999 } as any)
        .erp.masterdata.items.list({ q: "x" }),
    ).rejects.toThrow(/ACCESS_DENIED/);
  });
});
