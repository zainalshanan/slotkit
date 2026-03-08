import { describe, it, expect } from "vitest";
import {
  validateEventType,
  generateSlug,
  validateQuestionResponses,
  EventTypeValidationError,
  type BookingQuestion,
} from "../index.js";

describe("validateEventType", () => {
  it("accepts valid event type input", () => {
    expect(() =>
      validateEventType({
        title: "Consultation",
        slug: "consultation-30",
        durationMinutes: 30,
        bufferBefore: 5,
        bufferAfter: 5,
      }),
    ).not.toThrow();
  });

  it("rejects empty title", () => {
    expect(() => validateEventType({ title: "" })).toThrow(EventTypeValidationError);
  });

  it("rejects empty slug", () => {
    expect(() => validateEventType({ slug: "" })).toThrow(EventTypeValidationError);
  });

  it("rejects invalid slug characters", () => {
    expect(() => validateEventType({ slug: "My Event!" })).toThrow(
      EventTypeValidationError,
    );
  });

  it("rejects duration below minimum (5 minutes)", () => {
    expect(() => validateEventType({ durationMinutes: 3 })).toThrow(
      EventTypeValidationError,
    );
  });

  it("rejects duration above maximum (480 minutes)", () => {
    expect(() => validateEventType({ durationMinutes: 500 })).toThrow(
      EventTypeValidationError,
    );
  });

  it("rejects negative buffer time", () => {
    expect(() => validateEventType({ bufferBefore: -1 })).toThrow(
      EventTypeValidationError,
    );
  });

  it("rejects more than 10 custom questions", () => {
    const questions: BookingQuestion[] = Array.from({ length: 11 }, (_, i) => ({
      key: `q${i}`,
      label: `Question ${i}`,
      type: "short_text" as const,
      isRequired: false,
    }));

    expect(() => validateEventType({ customQuestions: questions })).toThrow(
      EventTypeValidationError,
    );
  });

  it("rejects duplicate question keys", () => {
    const questions: BookingQuestion[] = [
      { key: "name", label: "Name", type: "short_text", isRequired: true },
      { key: "name", label: "Full Name", type: "short_text", isRequired: false },
    ];

    expect(() => validateEventType({ customQuestions: questions })).toThrow(
      "Duplicate question key",
    );
  });

  it("rejects select question without options", () => {
    const questions: BookingQuestion[] = [
      {
        key: "service",
        label: "Service",
        type: "single_select",
        isRequired: true,
        options: [],
      },
    ];

    expect(() => validateEventType({ customQuestions: questions })).toThrow(
      "at least one option",
    );
  });

  it("rejects negative minimum notice", () => {
    expect(() => validateEventType({ minimumNoticeMinutes: -10 })).toThrow(
      EventTypeValidationError,
    );
  });

  it("rejects maxFutureDays less than 1", () => {
    expect(() => validateEventType({ maxFutureDays: 0 })).toThrow(
      EventTypeValidationError,
    );
  });

  it("rejects maxSeats less than 1", () => {
    expect(() => validateEventType({ maxSeats: 0 })).toThrow(
      EventTypeValidationError,
    );
  });
});

describe("generateSlug", () => {
  it("converts title to slug", () => {
    expect(generateSlug("30-Minute Consultation")).toBe("30-minute-consultation");
  });

  it("removes special characters", () => {
    expect(generateSlug("Hair & Beard Trim!")).toBe("hair-beard-trim");
  });

  it("handles multiple spaces", () => {
    expect(generateSlug("Full   Service")).toBe("full-service");
  });
});

describe("validateQuestionResponses", () => {
  const questions: BookingQuestion[] = [
    { key: "name", label: "Your Name", type: "short_text", isRequired: true },
    {
      key: "email",
      label: "Contact Email",
      type: "email",
      isRequired: true,
    },
    {
      key: "phone",
      label: "Phone",
      type: "phone",
      isRequired: false,
    },
    {
      key: "service",
      label: "Service Type",
      type: "single_select",
      options: ["haircut", "shave", "full-service"],
      isRequired: true,
    },
    {
      key: "notes",
      label: "Notes",
      type: "long_text",
      isRequired: false,
    },
  ];

  it("returns no errors for valid responses", () => {
    const errors = validateQuestionResponses(questions, {
      name: "John",
      email: "john@example.com",
      service: "haircut",
    });
    expect(errors).toHaveLength(0);
  });

  it("returns error for missing required field", () => {
    const errors = validateQuestionResponses(questions, {
      email: "john@example.com",
      service: "haircut",
    });
    expect(errors).toContain('"Your Name" is required.');
  });

  it("returns error for invalid email", () => {
    const errors = validateQuestionResponses(questions, {
      name: "John",
      email: "not-an-email",
      service: "haircut",
    });
    expect(errors).toContain('"Contact Email" must be a valid email address.');
  });

  it("returns error for invalid select option", () => {
    const errors = validateQuestionResponses(questions, {
      name: "John",
      email: "john@example.com",
      service: "massage",
    });
    expect(errors).toContain(
      '"Service Type" must be one of: haircut, shave, full-service.',
    );
  });

  it("skips validation for optional empty fields", () => {
    const errors = validateQuestionResponses(questions, {
      name: "John",
      email: "john@example.com",
      service: "haircut",
      phone: "",
    });
    expect(errors).toHaveLength(0);
  });
});
