CREATE SCHEMA IF NOT EXISTS autoshare;

CREATE TABLE autoshare.clients (
    client_id SERIAL PRIMARY KEY,
    last_name VARCHAR(100) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    middle_name VARCHAR(100),
    birth_date DATE NOT NULL,
    phone VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    two_factor_secret VARCHAR(64),
    is_email_verified BOOLEAN DEFAULT FALSE NOT NULL,
    license_number VARCHAR(20) NOT NULL UNIQUE,
    license_issued DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'BLOCKED')),
    balance NUMERIC(10,2) DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE autoshare.staff (
    staff_id SERIAL PRIMARY KEY,
    full_name VARCHAR(150) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('OPERATOR', 'ADMIN', 'MAINTENANCE')),
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'BLOCKED')),
    created_at TIMESTAMP DEFAULT now() NOT NULL
);

CREATE TABLE autoshare.zones (
    zone_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    zone_type VARCHAR(20) NOT NULL CHECK (zone_type IN ('AVAILABLE', 'RESTRICTED')),
    boundary TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE autoshare.tariffs (
    tariff_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tariff_type VARCHAR(20) NOT NULL CHECK (tariff_type IN ('MINUTE', 'HOUR', 'DAY')),
    rate_active NUMERIC(8,2) NOT NULL CHECK (rate_active > 0),
    rate_pause NUMERIC(8,2) NOT NULL CHECK (rate_pause >= 0),
    min_charge NUMERIC(8,2) DEFAULT 0 NOT NULL,
    zone_id INTEGER REFERENCES autoshare.zones(zone_id),
    status VARCHAR(20) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'INACTIVE')),
    valid_from DATE DEFAULT CURRENT_DATE NOT NULL
);

CREATE TABLE autoshare.cars (
    car_id SERIAL PRIMARY KEY,
    plate_number VARCHAR(20) NOT NULL UNIQUE,
    brand VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    YEAR SMALLINT NOT NULL,
    color VARCHAR(30),
    car_class VARCHAR(20) NOT NULL CHECK (car_class IN ('ECONOMY', 'COMFORT', 'BUSINESS')),
    status VARCHAR(20) DEFAULT 'FREE' NOT NULL CHECK (status IN ('FREE', 'BOOKED', 'RENTED', 'MAINTENANCE', 'UNAVAILABLE')),
    mileage INTEGER DEFAULT 0 NOT NULL,
    tariff_id INTEGER REFERENCES autoshare.tariffs(tariff_id),
    zone_id INTEGER REFERENCES autoshare.zones(zone_id),
    last_service DATE
);
CREATE INDEX idx_cars_status ON autoshare.cars(status);
CREATE INDEX idx_cars_tariff ON autoshare.cars(tariff_id);
CREATE INDEX idx_cars_zone ON autoshare.cars(zone_id);

CREATE TABLE autoshare.discounts (
    discount_id SERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('PERCENT', 'FIXED')),
    value NUMERIC(8,2) NOT NULL CHECK (value > 0),
    valid_from DATE DEFAULT CURRENT_DATE NOT NULL,
    valid_until DATE,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0 NOT NULL,
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    CHECK (valid_until IS NULL OR valid_until > valid_from)
);

CREATE TABLE autoshare.client_discounts (
    id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES autoshare.clients(client_id),
    discount_id INTEGER NOT NULL REFERENCES autoshare.discounts(discount_id),
    applied_at TIMESTAMP DEFAULT now() NOT NULL
);
CREATE INDEX idx_client_discounts_client ON autoshare.client_discounts(client_id);

CREATE TABLE autoshare.bookings (
    booking_id SERIAL PRIMARY KEY,
    client_id INTEGER NOT NULL REFERENCES autoshare.clients(client_id),
    car_id INTEGER NOT NULL REFERENCES autoshare.cars(car_id),
    discount_id INTEGER REFERENCES autoshare.discounts(discount_id),
    created_at TIMESTAMP DEFAULT now() NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    status VARCHAR(30) DEFAULT 'CREATED' NOT NULL CHECK (status IN ('CREATED', 'CONVERTED', 'CANCELLED_CLIENT', 'CANCELLED_TIMER')),
    CHECK (expires_at > created_at)
);
CREATE INDEX idx_bookings_client ON autoshare.bookings(client_id);
CREATE INDEX idx_bookings_car ON autoshare.bookings(car_id);
CREATE INDEX idx_bookings_status ON autoshare.bookings(status);
CREATE UNIQUE INDEX idx_bookings_one_active_per_car ON autoshare.bookings(car_id) WHERE status = 'CREATED';
CREATE UNIQUE INDEX idx_bookings_one_active_per_client ON autoshare.bookings(client_id) WHERE status = 'CREATED';

CREATE TABLE autoshare.rentals (
    rental_id SERIAL PRIMARY KEY,
    booking_id INTEGER NOT NULL REFERENCES autoshare.bookings(booking_id),
    client_id INTEGER NOT NULL REFERENCES autoshare.clients(client_id),
    car_id INTEGER NOT NULL REFERENCES autoshare.cars(car_id),
    tariff_id INTEGER NOT NULL REFERENCES autoshare.tariffs(tariff_id),
    started_at TIMESTAMP NOT NULL,
    finished_at TIMESTAMP,
    active_minutes INTEGER DEFAULT 0 NOT NULL,
    pause_minutes INTEGER DEFAULT 0 NOT NULL,
    distance_km NUMERIC(8,2) DEFAULT 0 NOT NULL,
    total_cost NUMERIC(10,2),
    status VARCHAR(30) DEFAULT 'ACTIVE' NOT NULL CHECK (status IN ('ACTIVE', 'PAUSED', 'COMPLETED', 'FORCE_COMPLETED')),
    CHECK (finished_at IS NULL OR finished_at > started_at)
);
CREATE INDEX idx_rentals_client ON autoshare.rentals(client_id);
CREATE INDEX idx_rentals_car ON autoshare.rentals(car_id);
CREATE INDEX idx_rentals_status ON autoshare.rentals(status);
CREATE INDEX idx_rentals_started ON autoshare.rentals(started_at);

CREATE TABLE autoshare.payments (
    payment_id SERIAL PRIMARY KEY,
    rental_id INTEGER REFERENCES autoshare.rentals(rental_id),
    client_id INTEGER NOT NULL REFERENCES autoshare.clients(client_id),
    amount NUMERIC(10,2) NOT NULL CHECK (amount <> 0),
    payment_type VARCHAR(20) NOT NULL CHECK (payment_type IN ('RENTAL', 'FINE', 'REFUND')),
    status VARCHAR(20) DEFAULT 'PENDING' NOT NULL CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED')),
    external_id VARCHAR(100),
    processed_at TIMESTAMP DEFAULT now() NOT NULL,
    CHECK (payment_type != 'RENTAL' OR rental_id IS NOT NULL)
);
CREATE INDEX idx_payments_client ON autoshare.payments(client_id);
CREATE INDEX idx_payments_rental ON autoshare.payments(rental_id);

CREATE TABLE autoshare.maintenance (
    maintenance_id SERIAL PRIMARY KEY,
    car_id INTEGER NOT NULL REFERENCES autoshare.cars(car_id),
    work_type VARCHAR(30) NOT NULL CHECK (work_type IN ('SERVICE', 'REPAIR', 'WASH')),
    description TEXT,
    assigned_to_staff_id INTEGER REFERENCES autoshare.staff(staff_id),
    created_at TIMESTAMP DEFAULT now() NOT NULL,
    completed_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'OPEN' NOT NULL CHECK (status IN ('OPEN', 'IN_PROGRESS', 'CLOSED')),
    mileage_at_open INTEGER,
    CHECK (completed_at IS NULL OR completed_at >= created_at)
);
CREATE INDEX idx_maintenance_car ON autoshare.maintenance(car_id);
CREATE INDEX idx_maintenance_staff ON autoshare.maintenance(assigned_to_staff_id);
CREATE INDEX idx_maintenance_status ON autoshare.maintenance(status);

CREATE TABLE autoshare.audit_log (
    log_id BIGSERIAL PRIMARY KEY,
    actor_type VARCHAR(10) NOT NULL CHECK (actor_type IN ('CLIENT', 'STAFF', 'SYSTEM')),
    actor_id INTEGER,
    action VARCHAR(50) NOT NULL,
    entity VARCHAR(50) NOT NULL,
    entity_id INTEGER,
    details JSONB,
    created_at TIMESTAMP DEFAULT now() NOT NULL
);
CREATE INDEX idx_audit_log_actor ON autoshare.audit_log(actor_type, actor_id);
CREATE INDEX idx_audit_log_entity ON autoshare.audit_log(entity, entity_id);
