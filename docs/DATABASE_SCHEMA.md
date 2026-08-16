# VLMS — V1 Database Schema

## 1. Users

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `business_name` | VARCHAR | Not null |
| `mobile` | VARCHAR | Unique, not null |
| `password_hash` | VARCHAR | Not null |
| `gstin` | VARCHAR | Nullable |
| `is_active` | BOOLEAN | Not null, default `true` |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |

## 2. Sites

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users.id` |
| `site_name` | VARCHAR | Not null |
| `location` | VARCHAR | Not null |
| `pincode` | VARCHAR | Not null |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |

## 3. Vehicle Types

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Unique, not null |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |

## 4. Vehicles

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users.id` |
| `vehicle_number` | VARCHAR | Not null |
| `vehicle_type_id` | UUID | Foreign key → `vehicle_types.id` |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |

**Unique constraint:** `UNIQUE(user_id, vehicle_number)`

## 5. Material Types

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | VARCHAR | Unique, not null |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |

## 6. Contractors (C/O)

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key → `users.id` |
| `name` | VARCHAR | Not null |
| `mobile` | VARCHAR | Not null |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |

## 7. Rates

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `site_id` | UUID | Foreign key → `sites.id` |
| `vehicle_type_id` | UUID | Foreign key → `vehicle_types.id` |
| `material_type_id` | UUID | Foreign key → `material_types.id` |
| `amount` | DECIMAL | Not null |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |

**Unique constraint:** `UNIQUE(site_id, vehicle_type_id, material_type_id)`

## 8. Loads

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | Primary key |
| `site_id` | UUID | Foreign key → `sites.id` |
| `date` | DATE | Not null |
| `vehicle_id` | UUID | Foreign key → `vehicles.id` |
| `material_type_id` | UUID | Foreign key → `material_types.id` |
| `contractor_id` | UUID | Foreign key → `contractors.id` |
| `rate_id` | UUID | Foreign key → `rates.id` |
| `amount` | DECIMAL | Not null |
| `payment_type` | ENUM | Not null |
| `created_at` | TIMESTAMP | Not null |
| `updated_at` | TIMESTAMP | Not null |
| `deleted_at` | TIMESTAMP | Nullable |

### `payment_type` values

- `CASH`
- `CREDIT`
