import type { Masking } from "../mask/masking";

import { describe, expect, it } from "vitest";

import { renderBody } from "./body";

function masking(...fields: string[]): Masking {
  return { listed: (field) => fields.includes(field.toLowerCase()), revealed: false };
}

const REVEALED: Masking = { listed: () => true, revealed: true };

function render(body: string, contentType: string, mask: Masking, formatted: boolean) {
  return renderBody(body, contentType, mask, formatted).text;
}

describe("rendering a captured body", () => {
  describe("JSON", () => {
    const minified = '{"amount":4900,"card":{"token":"tok_live_1"},"tags":["a","b"]}';

    it("is the stored bytes when nothing is masked", () => {
      expect(render(minified, "application/json", masking(), false)).toBe(minified);
      expect(render(minified, "application/json", REVEALED, false)).toBe(minified);
    });

    it("indents on request", () => {
      expect(render(minified, "application/json", masking(), true)).toBe(
        JSON.stringify(JSON.parse(minified), null, 2),
      );
    });

    it("masks by key at any depth and inside arrays", () => {
      const nested = '{"items":[{"token":"one"},{"token":"two"}]}';
      expect(render(nested, "application/json", masking("token"), false)).toBe(
        '{"items":[{"token":"••••••••"},{"token":"••••••••"}]}',
      );
    });

    it("hides the whole subtree when a wrapper is named", () => {
      expect(render(minified, "application/json", masking("card"), false)).toContain(
        '"card":"••••••••"',
      );
      expect(render(minified, "application/json", masking("card"), false)).not.toContain(
        "tok_live_1",
      );
    });

    it("is parsed from a content type that lies, because senders do", () => {
      expect(renderBody(minified, "text/plain", masking(), true).formattable).toBe(true);
    });
  });

  describe("form encoded", () => {
    const body = "channel=%23general&token=tok_live_1&flag";

    it("is the stored bytes when nothing is masked", () => {
      expect(render(body, "application/x-www-form-urlencoded", masking(), false)).toBe(body);
    });

    it("masks by name, decoding the name first", () => {
      expect(
        render("api+key=secret", "application/x-www-form-urlencoded", masking("api key"), false),
      ).toBe("api+key=••••••••");
    });

    it("leaves a pair with no value alone", () => {
      expect(render(body, "application/x-www-form-urlencoded", masking("token"), false)).toBe(
        "channel=%23general&token=••••••••&flag",
      );
    });

    it("puts each pair on its own line when formatted, separators included", () => {
      expect(render(body, "application/x-www-form-urlencoded", masking(), true)).toBe(
        "channel=%23general\n&token=tok_live_1\n&flag",
      );
    });
  });

  describe("XML", () => {
    const body =
      '<payment id="p_1"><card token="tok_live_2">4111</card><amount>4900</amount></payment>';

    it("is the stored bytes when nothing is masked", () => {
      expect(render(body, "application/xml", masking(), false)).toBe(body);
    });

    it("masks an element's subtree and its own attributes, which is where credentials hide", () => {
      const masked = render(body, "application/xml", masking("card"), false);
      expect(masked).not.toContain("4111");
      expect(masked).not.toContain("tok_live_2");
      expect(masked).toContain("4900");
    });

    it("masks attributes by name without touching the element", () => {
      const masked = render(body, "application/xml", masking("token"), false);
      expect(masked).toContain('token="••••••••"');
      expect(masked).toContain("4111");
    });

    it("indents element-only content", () => {
      expect(render("<a><b>1</b><c>2</c></a>", "application/xml", masking(), true)).toBe(
        "<a>\n  <b>1</b>\n  <c>2</c>\n</a>",
      );
    });

    it("leaves mixed content on one line rather than inventing whitespace inside a value", () => {
      const mixed = "<p>hello <b>world</b></p>";
      expect(render(mixed, "application/xml", masking(), true)).toBe(mixed);
    });

    it("keeps attribute escaping intact when indenting", () => {
      expect(
        render('<a note="say &quot;hi&quot;"><b/></a>', "application/xml", masking(), true),
      ).toContain("&quot;hi&quot;");
    });

    it("treats XML that does not parse as having no structure", () => {
      const broken = "<payment><card>4111</payment>";
      const rendered = renderBody(broken, "application/xml", masking("card"), true);
      expect(rendered.text).toBe(broken);
      expect(rendered.formattable).toBe(false);
    });
  });

  it("offers no formatting for a body with nothing to indent", () => {
    const rendered = renderBody("token=abc arrived at 10:31", "text/plain", masking("token"), true);

    expect(rendered.text).toBe("token=abc arrived at 10:31");
    expect(rendered.formattable).toBe(false);
  });
});
