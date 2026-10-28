#!/usr/bin/env python3
"""Bounded, read-only API load probe. Requires an explicitly supplied bearer token."""

import argparse
import concurrent.futures
import os
import statistics
import sys
import time
import urllib.error
import urllib.request


MAX_REQUESTS = 500
MAX_CONCURRENCY = 10


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="API root, e.g. https://host/api")
    parser.add_argument("--path", default="/work-orders/search/mini", help="Read-only endpoint")
    parser.add_argument("--requests", type=int, default=30)
    parser.add_argument("--concurrency", type=int, default=2)
    args = parser.parse_args()

    token = os.environ.get("QPM_LOAD_TEST_TOKEN", "").strip()
    if not token:
        parser.error("set QPM_LOAD_TEST_TOKEN to a dedicated, authorized test account token")
    if not 1 <= args.requests <= MAX_REQUESTS:
        parser.error(f"--requests must be between 1 and {MAX_REQUESTS}")
    if not 1 <= args.concurrency <= min(MAX_CONCURRENCY, args.requests):
        parser.error(f"--concurrency must be between 1 and {min(MAX_CONCURRENCY, args.requests)}")
    if not args.path.startswith("/") or "?" in args.path or ".." in args.path:
        parser.error("--path must be a simple absolute API path without query parameters")

    url = args.base_url.rstrip("/") + args.path
    payload = b'{"filterFields":[],"direction":"DESC","pageNum":0,"pageSize":10,"sortField":"id"}'

    def request_once(_: int) -> tuple[int, float, str | None]:
        request = urllib.request.Request(
            url,
            data=payload,
            headers={
                "Authorization": f"Bearer {token}",
                "Content-Type": "application/json",
                "Accept": "application/json",
                "User-Agent": "qpm-bounded-load-probe/1.0",
            },
            method="POST",
        )
        started = time.perf_counter()
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                response.read(4096)
                return response.status, time.perf_counter() - started, None
        except urllib.error.HTTPError as error:
            error.read(4096)
            return error.code, time.perf_counter() - started, None
        except Exception as error:  # report network/timeout failures without secrets
            return 0, time.perf_counter() - started, type(error).__name__

    started = time.perf_counter()
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.concurrency) as pool:
        results = list(pool.map(request_once, range(args.requests)))
    elapsed = time.perf_counter() - started
    latencies = [latency for _, latency, _ in results]
    statuses: dict[int, int] = {}
    errors = 0
    for status, _, error in results:
        if error:
            errors += 1
        statuses[status] = statuses.get(status, 0) + 1

    def percentile(values: list[float], pct: float) -> float:
        ordered = sorted(values)
        return ordered[min(len(ordered) - 1, round((len(ordered) - 1) * pct))]

    print(f"URL: {url}")
    print(f"Requests: {args.requests}; concurrency: {args.concurrency}; duration: {elapsed:.2f}s")
    print(f"Throughput: {args.requests / elapsed:.2f} requests/s")
    print("Statuses: " + ", ".join(f"{code or 'network-error'}={count}" for code, count in sorted(statuses.items())))
    print(f"Latency ms: p50={statistics.median(latencies) * 1000:.0f}, p95={percentile(latencies, .95) * 1000:.0f}, p99={percentile(latencies, .99) * 1000:.0f}")
    if errors:
        print(f"Transport errors: {errors}")
    return 0 if errors == 0 and all(200 <= status < 400 for status, _, _ in results) else 1


if __name__ == "__main__":
    sys.exit(main())
