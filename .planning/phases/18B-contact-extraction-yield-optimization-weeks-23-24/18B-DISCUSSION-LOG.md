# Phase 18B Discussion Log

## Gray Areas Discussed

| # | Area | Options Presented | User Selection |
|---|------|-------------------|----------------|
| 1 | Header spoofing scope (CE-01) | All outbound fetchers / just direct-crawl+web-scrape | All outbound fetchers |
| 2 | LLM fallback trigger (CE-02) | Total failure only / partial failure | Total failure only; NVIDIA API replaces OpenRouter |
| 3 | Rate limiter design (CE-03) | Agent recommendation / user alternative | Agent recommendation accepted |

## Agent Recommendations Given

- Rate limiter: shared `crawlDelay(baseMs)`, jitter −100/+150 ms, central config in
  `worker.ts` per job type (800/1200/600/400/1000/500/500/500/700 mapping).

## Deferred Ideas

- None raised.

## Notes

- User confirmed no cost constraints for NVIDIA API — free tier endpoint.
- User clarified "all fields" in this context — stop all three contact fields being null
  before LLM is invoked.
