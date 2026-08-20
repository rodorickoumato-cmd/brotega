/**
 * Tests for Payment Webhook Normalization
 *
 * Tests the generic webhook handler that normalizes different provider formats
 * (Singpay, PVIT, Pawapay, Mock) into internal format.
 */

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => void | Promise<void>) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      result
        .then(() => {
          results.push({ name, passed: true });
        })
        .catch((err) => {
          results.push({ name, passed: false, error: String(err) });
        });
    } else {
      results.push({ name, passed: true });
    }
  } catch (err) {
    results.push({ name, passed: false, error: String(err) });
  }
}

function expect(actual: unknown) {
  return {
    toBe(expected: unknown) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toEqual(expected: unknown) {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    },
    toBeNull() {
      if (actual !== null) {
        throw new Error(`Expected null, got ${actual}`);
      }
    },
  };
}

// Status mapping function (from webhook)
function mapStatut(s: string): "reussi" | "echec" | "en_attente" {
  const low = s.toLowerCase();
  if (["success", "successful", "completed", "reussi"].includes(low)) return "reussi";
  if (["failed", "failure", "error", "rejected", "cancelled", "echec"].includes(low)) return "echec";
  return "en_attente";
}

// Normalization function (from webhook)
function normaliser(payload: Record<string, unknown>): {
  providerRef: string;
  statut: "reussi" | "echec" | "en_attente";
} | null {
  // Format interne (mock / test direct)
  if (typeof payload["providerRef"] === "string" && typeof payload["statut"] === "string") {
    return { providerRef: payload["providerRef"], statut: mapStatut(payload["statut"]) };
  }
  // Format PVIT callback : { transactionId, merchantReferenceId, status, ... }
  const paymentRef = (payload["transactionId"] ?? payload["reference_id"] ?? payload["transaction_id"] ?? payload["reference"] ?? payload["id"]) as string | undefined;
  if (paymentRef && typeof payload["status"] === "string") {
    return { providerRef: paymentRef, statut: mapStatut(payload["status"]) };
  }
  // Format PawaPay : { depositId, status }
  if (typeof payload["depositId"] === "string" && typeof payload["status"] === "string") {
    return { providerRef: payload["depositId"], statut: mapStatut(payload["status"]) };
  }
  // Format Singpay : { transaction_id, status } ou { id, status }
  if (paymentRef && typeof payload["status"] === "string") {
    return { providerRef: paymentRef, statut: mapStatut(payload["status"]) };
  }
  return null;
}

// ────────────────────────────────────────────────────────────────────────────
// Test Suite: Webhook Normalization
// ────────────────────────────────────────────────────────────────────────────

describe("Webhook Normalization", () => {
  describe("Mock format", () => {
    test("should normalize mock payload", () => {
      const payload = {
        providerRef: "mock-123456-abcdef",
        statut: "reussi",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "mock-123456-abcdef",
        statut: "reussi",
      });
    });

    test("should handle mock failure", () => {
      const payload = {
        providerRef: "mock-123456-xyz",
        statut: "echec",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "mock-123456-xyz",
        statut: "echec",
      });
    });
  });

  describe("Singpay format", () => {
    test("should normalize Singpay with transaction_id", () => {
      const payload = {
        transaction_id: "txn_abc123def",
        status: "completed",
        amount: 5000,
        phone: "241123456789",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "txn_abc123def",
        statut: "reussi",
      });
    });

    test("should normalize Singpay with id field", () => {
      const payload = {
        id: "pay_xyz789",
        status: "failed",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "pay_xyz789",
        statut: "echec",
      });
    });

    test("should handle Singpay pending status", () => {
      const payload = {
        transaction_id: "txn_pending",
        status: "pending",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "txn_pending",
        statut: "en_attente",
      });
    });

    test("should handle Singpay accepted status", () => {
      const payload = {
        transaction_id: "txn_accepted",
        status: "accepted",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "txn_accepted",
        statut: "en_attente",
      });
    });
  });

  describe("PVIT format", () => {
    test("should normalize PVIT with transactionId", () => {
      const payload = {
        transactionId: "pvit_trans_123",
        status: "success",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "pvit_trans_123",
        statut: "reussi",
      });
    });

    test("should normalize PVIT with reference field", () => {
      const payload = {
        reference: "CMDABC123",
        status: "failed",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "CMDABC123",
        statut: "echec",
      });
    });
  });

  describe("PawaPay format", () => {
    test("should normalize PawaPay format", () => {
      const payload = {
        depositId: "dep_pawapay_123",
        status: "COMPLETED",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "dep_pawapay_123",
        statut: "reussi",
      });
    });

    test("should handle PawaPay rejection", () => {
      const payload = {
        depositId: "dep_rejected",
        status: "REJECTED",
      };
      const normalized = normaliser(payload);
      expect(normalized).toEqual({
        providerRef: "dep_rejected",
        statut: "echec",
      });
    });
  });

  describe("Edge cases", () => {
    test("should return null for unknown format", () => {
      const payload = {
        foo: "bar",
        baz: "qux",
      };
      const normalized = normaliser(payload);
      expect(normalized).toBeNull();
    });

    test("should return null for missing status", () => {
      const payload = {
        transaction_id: "txn_123",
        // missing status
      };
      const normalized = normaliser(payload);
      expect(normalized).toBeNull();
    });

    test("should return null for missing transaction_id-like field", () => {
      const payload = {
        status: "completed",
        // missing all ID fields
      };
      const normalized = normaliser(payload);
      expect(normalized).toBeNull();
    });

    test("should be case-insensitive for status", () => {
      const tests = [
        { status: "COMPLETED", expected: "reussi" },
        { status: "Completed", expected: "reussi" },
        { status: "completed", expected: "reussi" },
        { status: "FAILED", expected: "echec" },
        { status: "Failed", expected: "echec" },
      ];

      tests.forEach(({ status, expected }) => {
        const payload = {
          transaction_id: "txn_test",
          status,
        };
        const normalized = normaliser(payload);
        expect(normalized?.statut).toBe(expected);
      });
    });
  });

  describe("Status mapping", () => {
    test("should map success variants to reussi", () => {
      const statuses = ["success", "successful", "completed", "reussi"];
      statuses.forEach((status) => {
        expect(mapStatut(status)).toBe("reussi");
      });
    });

    test("should map failure variants to echec", () => {
      const statuses = ["failed", "failure", "error", "rejected", "cancelled", "echec"];
      statuses.forEach((status) => {
        expect(mapStatut(status)).toBe("echec");
      });
    });

    test("should default unknown statuses to en_attente", () => {
      const statuses = ["pending", "processing", "unknown", "processing"];
      statuses.forEach((status) => {
        expect(mapStatut(status)).toBe("en_attente");
      });
    });
  });
});

// ────────────────────────────────────────────────────────────────────────────
// Helper functions
// ────────────────────────────────────────────────────────────────────────────

function describe(suiteName: string, fn: () => void) {
  console.log(`\n📋 ${suiteName}`);
  fn();
}

// Print results
setTimeout(() => {
  console.log("\n" + "=".repeat(70));
  console.log("WEBHOOK NORMALIZATION TEST RESULTS");
  console.log("=".repeat(70));

  let passed = 0;
  let failed = 0;

  results.forEach((result) => {
    if (result.passed) {
      console.log(`✅ ${result.name}`);
      passed++;
    } else {
      console.log(`❌ ${result.name}`);
      if (result.error) console.log(`   Error: ${result.error}`);
      failed++;
    }
  });

  console.log("=".repeat(70));
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  console.log("=".repeat(70));

  process.exit(failed > 0 ? 1 : 0);
}, 100);
