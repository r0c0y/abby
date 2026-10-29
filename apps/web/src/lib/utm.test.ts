import {
  UTM_COOKIE_NAME,
  getUtmParams,
  parseUtmCookie,
  rememberUtmParams,
} from "./utm";

const getUtmCookie = () =>
  document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${UTM_COOKIE_NAME}=`))
    ?.slice(UTM_COOKIE_NAME.length + 1);

afterEach(() => {
  document.cookie = `${UTM_COOKIE_NAME}=; path=/; max-age=0`;
});

describe("getUtmParams", () => {
  it("maps all UTM parameters", () => {
    const params = new URLSearchParams(
      "utm_source=twitter&utm_medium=social&utm_campaign=launch&utm_term=feature+flags&utm_content=hero"
    );

    expect(getUtmParams(params)).toEqual({
      utmSource: "twitter",
      utmMedium: "social",
      utmCampaign: "launch",
      utmTerm: "feature flags",
      utmContent: "hero",
    });
  });

  it("ignores other and empty parameters", () => {
    const params = new URLSearchParams(
      "utm_source=newsletter&utm_medium=&ref=producthunt"
    );

    expect(getUtmParams(params)).toEqual({ utmSource: "newsletter" });
  });

  it("returns null without UTM parameters", () => {
    expect(getUtmParams(new URLSearchParams("ref=producthunt"))).toBeNull();
    expect(getUtmParams(new URLSearchParams("utm_source=%20"))).toBeNull();
  });

  it("truncates values that do not fit into the database", () => {
    const params = new URLSearchParams({ utm_campaign: "a".repeat(500) });

    expect(getUtmParams(params)?.utmCampaign).toHaveLength(191);
  });
});

describe("rememberUtmParams", () => {
  it("stores the UTM parameters in a cookie", () => {
    rememberUtmParams("?utm_source=github&utm_campaign=hacktoberfest");

    expect(parseUtmCookie(decodeURIComponent(getUtmCookie()!))).toEqual({
      utmSource: "github",
      utmCampaign: "hacktoberfest",
    });
  });

  it("keeps the stored parameters on visits without UTM parameters", () => {
    rememberUtmParams("?utm_source=github");
    rememberUtmParams("?foo=bar");
    rememberUtmParams("");

    expect(parseUtmCookie(decodeURIComponent(getUtmCookie()!))).toEqual({
      utmSource: "github",
    });
  });

  it("overwrites the stored parameters with newer ones", () => {
    rememberUtmParams("?utm_source=github&utm_medium=readme");
    rememberUtmParams("?utm_source=twitter");

    expect(parseUtmCookie(decodeURIComponent(getUtmCookie()!))).toEqual({
      utmSource: "twitter",
    });
  });
});

describe("parseUtmCookie", () => {
  it("returns null for missing or malformed cookies", () => {
    expect(parseUtmCookie(undefined)).toBeNull();
    expect(parseUtmCookie("")).toBeNull();
    expect(parseUtmCookie("not json")).toBeNull();
    expect(parseUtmCookie("[]")).toBeNull();
    expect(parseUtmCookie("{}")).toBeNull();
  });

  it("rejects invalid values", () => {
    expect(parseUtmCookie(JSON.stringify({ utmSource: 42 }))).toBeNull();
    expect(
      parseUtmCookie(JSON.stringify({ utmSource: "a".repeat(192) }))
    ).toBeNull();
  });

  it("drops unknown keys", () => {
    expect(
      parseUtmCookie(JSON.stringify({ utmSource: "github", id: "admin" }))
    ).toEqual({ utmSource: "github" });
  });
});
