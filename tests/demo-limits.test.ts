import assert from "node:assert/strict";
import { test } from "node:test";
import { getDemoLimits, INTERVIEW_BOOST_END } from "../src/lib/demo-limits";

test("interview-day boost starts at midnight New York and covers the interview afternoon", () => {
  for (const time of ["2026-11-12T05:00:00Z", "2026-11-12T18:00:00Z", "2026-11-13T04:59:59.999Z"]) {
    const limits = getDemoLimits(Date.parse(time));
    assert.equal(limits.boosted, true);
    assert.deepEqual(limits.voice, { perVisitorHour: 100, globalDay: 500 });
    assert.deepEqual(limits.text, { perVisitorHour: 200, globalDay: 2000 });
  }
});

test("the boost expires exactly at midnight New York without a redeploy", () => {
  const limits = getDemoLimits(Date.parse(INTERVIEW_BOOST_END));
  assert.equal(limits.boosted, false);
  assert.deepEqual(limits.voice, { perVisitorHour: 20, globalDay: 100 });
  assert.deepEqual(limits.text, { perVisitorHour: 40, globalDay: 400 });
});

test("normal bounded limits apply before the interview and for invalid timestamps", () => {
  assert.equal(getDemoLimits(Date.parse("2026-11-12T04:59:59Z")).boosted, false);
  assert.equal(getDemoLimits(Number.NaN).boosted, false);
});
