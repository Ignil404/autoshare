# Диаграмма классов системы AutoShare

**Готовая диаграмма (PNG):** ![Диаграмма классов](uml/class-diagram.png)

Источник диаграммы: [`uml/class-diagram.puml`](uml/class-diagram.puml) (PlantUML) — перерисовка:

```bash
java -jar plantuml.jar -tpng docs/uml/class-diagram.puml
```

Ниже — та же диаграмма в нотации Mermaid (отображается на GitLab/GitHub).

```mermaid
classDiagram
  namespace Identification {
    class Client {
      +int client_id PK
      -String last_name
      -String first_name
      -String middle_name
      -Date birth_date
      -String phone UQ
      -String email UQ
      -String password_hash
      -String two_factor_secret
      -boolean is_email_verified
      -String license_number UQ
      -Date license_issued
      -String status PENDING|ACTIVE|BLOCKED
      -Decimal balance
      -DateTime created_at
      +register() void
      +verify() void
      +block() void
      +topUp(amount) void
      +changePassword(old, new) void
    }
    class Staff {
      +int staff_id PK
      -String full_name
      -String email UQ
      -String phone
      -String password_hash
      -String role OPERATOR|ADMIN|MAINTENANCE
      -String status ACTIVE|BLOCKED
      +login() Token
      +block() void
    }
  }

  namespace Fleet {
    class Car {
      +int car_id PK
      -String plate_number UQ
      -String brand
      -String model
      -int year
      -String color
      -String car_class ECONOMY|COMFORT|BUSINESS
      -String status FREE|BOOKED|RENTED|MAINTENANCE|UNAVAILABLE
      -int mileage
      -Date last_service
      -float lat
      -float lng
      +isAvailable() boolean
      +setStatus(s) void
      +addMileage(km) void
    }
    class Zone {
      +int zone_id PK
      -String name
      -String zone_type AVAILABLE|RESTRICTED
      -String boundary GeoJSON
      -String status ACTIVE|INACTIVE
      +contains(lat, lng) boolean
    }
    class Tariff {
      +int tariff_id PK
      -String name
      -String tariff_type MINUTE|HOUR|DAY
      -Decimal rate_active
      -Decimal rate_pause
      -Decimal rate_km
      -Decimal min_charge
      -String status ACTIVE|INACTIVE
      -Date valid_from
      +deactivate() void
      +calculateCost(a, p, km) Decimal
    }
  }

  namespace RentalProcess {
    class Booking {
      +int booking_id PK
      -DateTime created_at
      -DateTime expires_at
      -String status CREATED|CONVERTED|CANCELLED_*
      +cancel(reason) void
      +isExpired(now) boolean
      +convertToRental() Rental
    }
    class Rental {
      +int rental_id PK
      -DateTime started_at
      -DateTime paused_at
      -DateTime finished_at
      -int active_minutes
      -int pause_minutes
      -Decimal distance_km
      -Decimal total_cost
      -String status ACTIVE|PAUSED|COMPLETED|FORCE_COMPLETED
      +start() void
      +pause() void
      +resume() void
      +complete(distance_km) Decimal
      +calculateCost(tariff) Decimal
    }
  }

  namespace Finance {
    class Payment {
      +int payment_id PK
      -Decimal amount
      -String payment_type RENTAL|FINE|REFUND|TOPUP
      -String status PENDING|COMPLETED|FAILED|REFUNDED
      -String external_id
      -DateTime processed_at
      +commit() void
      +refund() void
    }
    class Discount {
      +int discount_id PK
      -String code UQ
      -String type PERCENT|FIXED
      -Decimal value
      -Date valid_from
      -Date valid_until
      -int usage_limit
      -int used_count
      -boolean is_active
      +isValidOn(date) boolean
      +apply(amount) Decimal
    }
    class ClientDiscount {
      +int id PK
      -DateTime applied_at
    }
  }

  namespace Operations {
    class Maintenance {
      +int maintenance_id PK
      -String work_type SERVICE|REPAIR|WASH
      -String description
      -DateTime created_at
      -DateTime completed_at
      -String status OPEN|IN_PROGRESS|CLOSED
      -int mileage_at_open
      +assign(staff) void
      +start() void
      +close() void
    }
    class AuditLog {
      +int log_id PK
      -String actor_type CLIENT|STAFF|SYSTEM
      -int actor_id
      -String action
      -String entity
      -int entity_id
      -JSON details
      -DateTime created_at
    }
  }

  Client "1" -- "0..*" Booking : creates
  Client "1" -- "0..*" Rental : performs
  Client "1" -- "0..*" Payment : owns
  Client "1" -- "0..*" ClientDiscount : uses
  Discount "1" -- "0..*" ClientDiscount : redeemed by
  Discount "1" -- "0..*" Booking : applied in
  Booking "0..1" -- "0..1" Rental : converted to
  Booking "*" -- "1" Car : reserves
  Rental "*" -- "1" Car : uses
  Rental "*" -- "1" Tariff : priced by
  Rental "1" -- "0..*" Payment : billed by
  Car "*" -- "0..1" Tariff : priced by
  Car "*" -- "0..1" Zone : located in
  Car "1" -- "0..*" Maintenance : serviced in
  Zone "1" -- "0..*" Tariff : applies to
  Staff "0..1" -- "0..*" Maintenance : assigned
```

## 1. Описание классов

| Класс | Ответственность | Ключевые операции |
|---|---|---|
| **Client** | Учётная запись клиента, верификация, баланс | `register()`, `verify()`, `block()`, `topUp()`, `changePassword()` |
| **Staff** | Учётная запись сотрудника и его роль | `login()`, `block()` |
| **Car** | Автомобиль автопарка, статус, геопозиция, пробег | `isAvailable()`, `setStatus()`, `addMileage()` |
| **Zone** | Географическая зона обслуживания | `contains(lat, lng)` |
| **Tariff** | Правило ценообразования (мин./час/день + км) | `deactivate()`, `calculateCost()` |
| **Booking** | Бронирование с TTL 20 минут | `cancel()`, `isExpired()`, `convertToRental()` |
| **Rental** | Аренда: тайминги, пробег, стоимость | `start()`, `pause()`, `resume()`, `complete()`, `calculateCost()` |
| **Payment** | Платёж (аренда, штраф, возврат, пополнение) | `commit()`, `refund()` |
| **Discount** | Промокод: процент/фикс, лимиты, сроки | `isValidOn()`, `apply()` |
| **ClientDiscount** | Факт применения промокода клиентом | — (связующая сущность) |
| **Maintenance** | Заявка на ТО/ремонт/мойку | `assign()`, `start()`, `close()` |
| **AuditLog** | Неизменяемый журнал действий | — (append-only) |

## 2. Основные связи

| Связь | Множественность | Семантика |
|---|---|---|
| Client — Booking | 1 : 0..* | Клиент создаёт бронирования |
| Booking — Car | * : 1 | Бронь резервирует автомобиль |
| Booking — Rental | 0..1 : 0..1 | Бронь конвертируется в аренду (обратное — необязательно) |
| Rental — Tariff | * : 1 | Аренда тарифицируется выбранным тарифом |
| Rental — Payment | 1 : 0..* | По аренде может быть несколько платежей |
| Car — Tariff / Zone | * : 0..1 | Автомобиль привязан к тарифу и зоне |
| Zone — Tariff | 1 : 0..* | В зоне действуют свои тарифы |
| Car — Maintenance | 1 : 0..* | История обслуживания автомобиля |
| Staff — Maintenance | 0..1 : 0..* | Исполнитель заявки |
| Discount — ClientDiscount — Client | 1 : 0..* : 1 | Учёт использований промокода |

## 3. Ограничения целостности, отражённые в модели

* `Booking`: частичные уникальные индексы — не более одного `CREATED`-бронирования на клиента и на автомобиль; `expires_at > created_at`.
* `Rental`: `finished_at > started_at`; допустимые статусы фиксированы перечислением.
* `Payment`: `amount <> 0`; тип `RENTAL` требует непустого `rental_id`.
* `Tariff`: `rate_active > 0`, `rate_pause ≥ 0`.
* `Discount`: `value > 0`, `valid_until > valid_from`.
* Все статусы сущностей ограничены `CHECK`-ограничениями на уровне БД.

## 4. Бизнес-правило расчёта стоимости (инвариант класса Rental)

```
total_cost = max( min_charge ,
                  rate_active × active_minutes +
                  rate_pause  × pause_minutes  +
                  rate_km     × distance_km )
```

Реализация: `Rental.calculateCost()` → `POST /api/v1/rentals/{id}/complete`
(`app/api/v1/rentals.py`, строки 123–128).
