"""Bounded local health smoke load. Not a capacity certification."""

import concurrent.futures
import statistics
import time
import urllib.request


def call(_):
    start = time.perf_counter()
    with urllib.request.urlopen("http://127.0.0.1:8000/api/health", timeout=10) as response:
        assert response.status == 200
    return time.perf_counter() - start


if __name__ == "__main__":
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        times = sorted(pool.map(call, range(40)))
    print(
        {
            "requests": len(times),
            "concurrency": 4,
            "median_seconds": statistics.median(times),
            "p95_seconds": times[37],
        }
    )
