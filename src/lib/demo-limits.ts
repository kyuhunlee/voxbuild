const INTERVIEW_START = Date.parse("2026-11-12T05:00:00Z");
export const INTERVIEW_BOOST_END = "2026-11-13T05:00:00Z";

/** Interview-day allowance expires at midnight in New York without another deployment. */
export function getDemoLimits(now = Date.now()) {
  const boosted = now >= INTERVIEW_START && now < Date.parse(INTERVIEW_BOOST_END);
  return {
    boosted,
    voice: { perVisitorHour: boosted ? 100 : 20, globalDay: boosted ? 500 : 100 },
    text: { perVisitorHour: boosted ? 200 : 40, globalDay: boosted ? 2000 : 400 },
  };
}
