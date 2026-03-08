import { describe, it, expect } from "vitest";
import {
  validateRoutingForm,
  evaluateRoutingRules,
  validateRoutingResponses,
  computeRoutingAnalytics,
  RoutingFormValidationError,
  type RoutingFormDefinition,
  type RoutingResponses,
  type RoutingSubmission,
  type RoutingResult,
} from "../routing-forms.js";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeForm(overrides?: Partial<RoutingFormDefinition>): RoutingFormDefinition {
  return {
    id: "form-1",
    title: "Service Selector",
    fields: [
      {
        key: "service_type",
        label: "What service do you need?",
        type: "dropdown",
        options: ["haircut", "coloring", "consultation"],
        required: true,
      },
      {
        key: "notes",
        label: "Additional notes",
        type: "text",
        required: false,
      },
    ],
    rules: [
      {
        id: "rule-1",
        conditions: [
          { fieldKey: "service_type", operator: "equals", value: "haircut" },
        ],
        logic: "AND",
        eventTypeId: "evt-haircut",
        priority: 1,
      },
      {
        id: "rule-2",
        conditions: [
          { fieldKey: "service_type", operator: "equals", value: "coloring" },
        ],
        logic: "AND",
        eventTypeId: "evt-coloring",
        priority: 2,
      },
    ],
    fallback: { eventTypeId: "evt-consultation" },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// validateRoutingForm
// ---------------------------------------------------------------------------

describe("validateRoutingForm", () => {
  it("accepts a valid form", () => {
    expect(() => validateRoutingForm(makeForm())).not.toThrow();
  });

  it("rejects empty title", () => {
    expect(() => validateRoutingForm(makeForm({ title: "" }))).toThrow(
      RoutingFormValidationError,
    );
  });

  it("rejects form with no fields", () => {
    expect(() => validateRoutingForm(makeForm({ fields: [] }))).toThrow(
      "at least one field",
    );
  });

  it("rejects duplicate field keys", () => {
    expect(() =>
      validateRoutingForm(
        makeForm({
          fields: [
            { key: "a", label: "A", type: "text" },
            { key: "a", label: "A2", type: "text" },
          ],
        }),
      ),
    ).toThrow("Duplicate field key");
  });

  it("rejects dropdown field without options", () => {
    expect(() =>
      validateRoutingForm(
        makeForm({
          fields: [
            { key: "x", label: "X", type: "dropdown", options: [] },
          ],
        }),
      ),
    ).toThrow("must have options");
  });

  it("rejects rule referencing unknown field", () => {
    expect(() =>
      validateRoutingForm(
        makeForm({
          rules: [
            {
              id: "r1",
              conditions: [
                { fieldKey: "nonexistent", operator: "equals", value: "x" },
              ],
              logic: "AND",
              eventTypeId: "evt-1",
              priority: 1,
            },
          ],
        }),
      ),
    ).toThrow("unknown field");
  });

  it("rejects rule with no destination", () => {
    expect(() =>
      validateRoutingForm(
        makeForm({
          rules: [
            {
              id: "r1",
              conditions: [
                {
                  fieldKey: "service_type",
                  operator: "equals",
                  value: "haircut",
                },
              ],
              logic: "AND",
              priority: 1,
            },
          ],
        }),
      ),
    ).toThrow("must have a destination");
  });

  it("rejects form without fallback", () => {
    expect(() =>
      validateRoutingForm(makeForm({ fallback: {} })),
    ).toThrow("fallback destination");
  });
});

// ---------------------------------------------------------------------------
// evaluateRoutingRules
// ---------------------------------------------------------------------------

describe("evaluateRoutingRules", () => {
  const form = makeForm();

  it("matches the first applicable rule by priority", () => {
    const result = evaluateRoutingRules(form, { service_type: "haircut" });
    expect(result.matched).toBe(true);
    expect(result.eventTypeId).toBe("evt-haircut");
    expect(result.matchedRule?.id).toBe("rule-1");
  });

  it("matches a lower-priority rule when higher doesn't match", () => {
    const result = evaluateRoutingRules(form, { service_type: "coloring" });
    expect(result.matched).toBe(true);
    expect(result.eventTypeId).toBe("evt-coloring");
  });

  it("returns fallback when no rule matches", () => {
    const result = evaluateRoutingRules(form, {
      service_type: "consultation",
    });
    expect(result.matched).toBe(false);
    expect(result.matchedRule).toBeNull();
    expect(result.eventTypeId).toBe("evt-consultation");
  });

  it("supports not_equals operator", () => {
    const formWithNot = makeForm({
      rules: [
        {
          id: "r1",
          conditions: [
            {
              fieldKey: "service_type",
              operator: "not_equals",
              value: "haircut",
            },
          ],
          logic: "AND",
          eventTypeId: "evt-not-haircut",
          priority: 1,
        },
      ],
    });

    expect(
      evaluateRoutingRules(formWithNot, { service_type: "coloring" })
        .eventTypeId,
    ).toBe("evt-not-haircut");

    expect(
      evaluateRoutingRules(formWithNot, { service_type: "haircut" }).matched,
    ).toBe(false);
  });

  it("supports contains operator", () => {
    const formWithContains = makeForm({
      fields: [{ key: "notes", label: "Notes", type: "text" }],
      rules: [
        {
          id: "r1",
          conditions: [
            { fieldKey: "notes", operator: "contains", value: "urgent" },
          ],
          logic: "AND",
          eventTypeId: "evt-urgent",
          priority: 1,
        },
      ],
    });

    expect(
      evaluateRoutingRules(formWithContains, { notes: "This is urgent!" })
        .eventTypeId,
    ).toBe("evt-urgent");

    expect(
      evaluateRoutingRules(formWithContains, { notes: "Normal request" })
        .matched,
    ).toBe(false);
  });

  it("supports in operator with array of values", () => {
    const formWithIn = makeForm({
      rules: [
        {
          id: "r1",
          conditions: [
            {
              fieldKey: "service_type",
              operator: "in",
              value: ["haircut", "coloring"],
            },
          ],
          logic: "AND",
          eventTypeId: "evt-styling",
          priority: 1,
        },
      ],
    });

    expect(
      evaluateRoutingRules(formWithIn, { service_type: "haircut" }).eventTypeId,
    ).toBe("evt-styling");
    expect(
      evaluateRoutingRules(formWithIn, { service_type: "coloring" }).eventTypeId,
    ).toBe("evt-styling");
    expect(
      evaluateRoutingRules(formWithIn, { service_type: "consultation" })
        .matched,
    ).toBe(false);
  });

  it("AND logic requires all conditions to match", () => {
    const formWithAnd = makeForm({
      fields: [
        {
          key: "service_type",
          label: "Service",
          type: "dropdown",
          options: ["haircut"],
        },
        { key: "notes", label: "Notes", type: "text" },
      ],
      rules: [
        {
          id: "r1",
          conditions: [
            {
              fieldKey: "service_type",
              operator: "equals",
              value: "haircut",
            },
            { fieldKey: "notes", operator: "contains", value: "vip" },
          ],
          logic: "AND",
          eventTypeId: "evt-vip-haircut",
          priority: 1,
        },
      ],
    });

    // Both match
    expect(
      evaluateRoutingRules(formWithAnd, {
        service_type: "haircut",
        notes: "I am a VIP client",
      }).eventTypeId,
    ).toBe("evt-vip-haircut");

    // Only one matches → fallback
    expect(
      evaluateRoutingRules(formWithAnd, {
        service_type: "haircut",
        notes: "normal",
      }).matched,
    ).toBe(false);
  });

  it("OR logic requires at least one condition to match", () => {
    const formWithOr = makeForm({
      fields: [
        {
          key: "service_type",
          label: "Service",
          type: "dropdown",
          options: ["haircut", "coloring"],
        },
        { key: "notes", label: "Notes", type: "text" },
      ],
      rules: [
        {
          id: "r1",
          conditions: [
            {
              fieldKey: "service_type",
              operator: "equals",
              value: "haircut",
            },
            { fieldKey: "notes", operator: "contains", value: "vip" },
          ],
          logic: "OR",
          eventTypeId: "evt-priority",
          priority: 1,
        },
      ],
    });

    // First condition matches
    expect(
      evaluateRoutingRules(formWithOr, {
        service_type: "haircut",
        notes: "normal",
      }).eventTypeId,
    ).toBe("evt-priority");

    // Second condition matches
    expect(
      evaluateRoutingRules(formWithOr, {
        service_type: "coloring",
        notes: "I am VIP",
      }).eventTypeId,
    ).toBe("evt-priority");
  });

  it("handles missing response values gracefully", () => {
    const result = evaluateRoutingRules(form, {});
    expect(result.matched).toBe(false);
    expect(result.eventTypeId).toBe("evt-consultation"); // fallback
  });
});

// ---------------------------------------------------------------------------
// validateRoutingResponses
// ---------------------------------------------------------------------------

describe("validateRoutingResponses", () => {
  const form = makeForm();

  it("accepts valid responses", () => {
    expect(() =>
      validateRoutingResponses(form, { service_type: "haircut" }),
    ).not.toThrow();
  });

  it("rejects missing required fields", () => {
    expect(() => validateRoutingResponses(form, {})).toThrow(
      "is required",
    );
  });

  it("allows missing optional fields", () => {
    expect(() =>
      validateRoutingResponses(form, { service_type: "haircut" }),
    ).not.toThrow();
  });

  it("rejects empty string for required field", () => {
    expect(() =>
      validateRoutingResponses(form, { service_type: "" }),
    ).toThrow("is required");
  });
});

// ---------------------------------------------------------------------------
// computeRoutingAnalytics
// ---------------------------------------------------------------------------

describe("computeRoutingAnalytics", () => {
  const submissions: RoutingSubmission[] = [
    {
      id: "s1",
      formId: "f1",
      responses: { service_type: "haircut" },
      result: { matched: true, matchedRule: null, eventTypeId: "evt-haircut" },
      createdAt: new Date(),
    },
    {
      id: "s2",
      formId: "f1",
      responses: { service_type: "haircut" },
      result: { matched: true, matchedRule: null, eventTypeId: "evt-haircut" },
      createdAt: new Date(),
    },
    {
      id: "s3",
      formId: "f1",
      responses: { service_type: "coloring" },
      result: { matched: true, matchedRule: null, eventTypeId: "evt-coloring" },
      createdAt: new Date(),
    },
  ];

  it("computes total submissions", () => {
    const analytics = computeRoutingAnalytics(submissions);
    expect(analytics.totalSubmissions).toBe(3);
  });

  it("computes completion rate from form views", () => {
    const analytics = computeRoutingAnalytics(submissions, 10);
    expect(analytics.completionRate).toBe(0.3);
  });

  it("computes route distribution", () => {
    const analytics = computeRoutingAnalytics(submissions);
    expect(analytics.routeDistribution).toHaveLength(2);

    const haircut = analytics.routeDistribution.find(
      (r) => r.count === 2,
    );
    expect(haircut).toBeDefined();
    expect(haircut!.percentage).toBeCloseTo(66.67, 0);

    const coloring = analytics.routeDistribution.find(
      (r) => r.count === 1,
    );
    expect(coloring).toBeDefined();
    expect(coloring!.percentage).toBeCloseTo(33.33, 0);
  });

  it("handles empty submissions", () => {
    const analytics = computeRoutingAnalytics([]);
    expect(analytics.totalSubmissions).toBe(0);
    expect(analytics.routeDistribution).toEqual([]);
  });
});
