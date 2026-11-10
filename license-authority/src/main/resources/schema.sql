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

-- ---------------------------------------------------------------------------------------------
-- Licence console (customers, plans catalogue, personal accounts). Idempotent: new tables and
-- nullable/defaulted columns only, so existing licences are untouched.
-- ---------------------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS customer (
    id UUID PRIMARY KEY,
    name VARCHAR(240) NOT NULL,
    legal_name VARCHAR(240),
    country VARCHAR(80),
    city VARCHAR(120),
    contact_name VARCHAR(160),
    contact_email VARCHAR(254),
    contact_phone VARCHAR(40),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by VARCHAR(254),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS customer_name_unique_idx ON customer (lower(name));

CREATE TABLE IF NOT EXISTS license_plan (
    code VARCHAR(40) PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(500),
    license_type VARCHAR(24) NOT NULL CHECK (license_type IN ('SUBSCRIPTION', 'PERPETUAL')),
    duration_months INTEGER CHECK (duration_months IS NULL OR duration_months BETWEEN 1 AND 120),
    seats_full INTEGER NOT NULL CHECK (seats_full >= 0),
    seats_light INTEGER NOT NULL CHECK (seats_light >= 0),
    entitlements TEXT NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INTEGER NOT NULL DEFAULT 100,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by VARCHAR(254)
);

CREATE TABLE IF NOT EXISTS console_user (
    id UUID PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    display_name VARCHAR(160) NOT NULL,
    role VARCHAR(16) NOT NULL CHECK (role IN ('ADMIN', 'SALES')),
    password_hash VARCHAR(100) NOT NULL,
    totp_secret VARCHAR(64),
    totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    last_totp_step BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS console_user_email_unique_idx ON console_user (lower(email));

CREATE TABLE IF NOT EXISTS console_session (
    token_hash CHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES console_user(id) ON DELETE CASCADE,
    second_factor_done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS console_session_user_idx ON console_session(user_id);

ALTER TABLE license_record ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES customer(id);
ALTER TABLE license_record ADD COLUMN IF NOT EXISTS plan_code VARCHAR(40);
ALTER TABLE license_record ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
ALTER TABLE license_record ADD COLUMN IF NOT EXISTS suspension_reason VARCHAR(500);
-- 1 = licences issued before the module catalogue (QPM keeps every module for them), 2 = catalogue licences.
ALTER TABLE license_record ADD COLUMN IF NOT EXISTS catalog_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE license_event ADD COLUMN IF NOT EXISTS actor VARCHAR(254);
CREATE INDEX IF NOT EXISTS license_record_customer_idx ON license_record(customer_id);
CREATE INDEX IF NOT EXISTS license_record_expires_idx ON license_record(expires_at);
