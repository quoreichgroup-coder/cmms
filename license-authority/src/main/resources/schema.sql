CREATE TABLE IF NOT EXISTS license_record (
    id UUID PRIMARY KEY,
    key_hash CHAR(64) NOT NULL UNIQUE,
    key_hint VARCHAR(12) NOT NULL,
    customer_name VARCHAR(240) NOT NULL,
    edition VARCHAR(80) NOT NULL,
    license_type VARCHAR(24) NOT NULL CHECK (license_type IN ('SUBSCRIPTION', 'PERPETUAL')),
    status VARCHAR(24) NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED')),
    seats_full INTEGER NOT NULL CHECK (seats_full >= 0),
    seats_light INTEGER NOT NULL CHECK (seats_light >= 0),
    entitlements TEXT NOT NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    maintenance_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (license_type <> 'SUBSCRIPTION' OR expires_at IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS license_activation (
    id UUID PRIMARY KEY,
    license_id UUID NOT NULL REFERENCES license_record(id),
    fingerprint CHAR(64) NOT NULL,
    environment VARCHAR(24) NOT NULL CHECK (environment IN ('PRODUCTION', 'PREPRODUCTION')),
    activated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deactivated_at TIMESTAMPTZ,
    UNIQUE (license_id, fingerprint)
);

CREATE TABLE IF NOT EXISTS license_event (
    id BIGSERIAL PRIMARY KEY,
    license_id UUID NOT NULL REFERENCES license_record(id),
    activation_id UUID,
    event_type VARCHAR(32) NOT NULL,
    details TEXT NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS license_activation_license_idx ON license_activation(license_id);
CREATE UNIQUE INDEX IF NOT EXISTS license_one_active_environment_idx
    ON license_activation(license_id, environment) WHERE deactivated_at IS NULL;
CREATE INDEX IF NOT EXISTS license_record_status_idx ON license_record(status);
CREATE INDEX IF NOT EXISTS license_event_license_idx ON license_event(license_id, created_at DESC);
