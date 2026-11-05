# Monitoring QPM

This optional Compose profile provisions Prometheus, Grafana and node-exporter. It monitors API request rate/latency/errors, JVM heap and Hikari pool, plus host CPU, memory and disk. Prometheus retains 15 days, capped at 2 GB.

## Enable

1. Create a strong `GRAFANA_ADMIN_PASSWORD` entry in the root `.env` file (do not commit it).
2. Start the profile with `docker compose --profile monitoring up -d --build api prometheus grafana node-exporter`.
3. Open Grafana at `https://169-58-86-7.sslip.io/grafana/`. Sign in with `GRAFANA_ADMIN_USER` (default `admin`) and the private password from `.env`.
4. Open the provisioned dashboard **QPM → QPM · Santé et performances**. Grafana queries Prometheus over the internal Compose network. The Prometheus web interface stays restricted to localhost at `http://127.0.0.1:9090` and can be reached through an SSH tunnel; it is not publicly exposed.

Grafana binds its port to loopback for local access, and Caddy serves it under `/grafana/` with Grafana authentication. Prometheus binds to loopback and is not routed publicly. The API metrics endpoint uses port 8081 on the internal Compose network; Nginx does not route to it. Prometheus alert rules are evaluated and visible in Prometheus; email/chat delivery requires configuring Alertmanager separately.

## Controlled read-only load probe

Use a dedicated test account token, never a personal or customer token:

```sh
QPM_LOAD_TEST_TOKEN='…' python3 monitoring/load_test.py \
  --base-url https://your-host/api --requests 30 --concurrency 2
```

The probe sends only bounded `POST /work-orders/search/mini` queries, with at most 500 requests and 10 concurrent workers. It does not mutate data or retry errors. Check the dashboard during the run. Start small and increase gradually; stop if latency, error rate or resource usage rises sharply.
