# VLMS — API Documentation

## Base URL

`/api/v1`

## Authentication

JWT Bearer Token

## Roles

- `SUPER_ADMIN`
- `USER`

## 1. Auth

| Method | Endpoint |
|---|---|
| `POST` | `/auth/login` |
| `GET` | `/auth/me` |

## 2. Super Admin — User Management

| Method | Endpoint |
|---|---|
| `POST` | `/admin/users` |
| `GET` | `/admin/users` |
| `GET` | `/admin/users/:id` |
| `PATCH` | `/admin/users/:id` |
| `PATCH` | `/admin/users/:id/status` |
| `POST` | `/admin/users/:id/reset-password` |

`SUPER_ADMIN` creates and manages customer accounts. `USER` cannot create users.

## 3. Sites

| Method | Endpoint |
|---|---|
| `POST` | `/sites` |
| `GET` | `/sites` |
| `GET` | `/sites/:id` |
| `PATCH` | `/sites/:id` |
| `DELETE` | `/sites/:id` |

## 4. Vehicle Types

| Method | Endpoint |
|---|---|
| `POST` | `/admin/vehicle-types` |
| `GET` | `/vehicle-types` |
| `PATCH` | `/admin/vehicle-types/:id` |
| `DELETE` | `/admin/vehicle-types/:id` |

## 5. Vehicles

| Method | Endpoint |
|---|---|
| `POST` | `/vehicles` |
| `GET` | `/vehicles` |
| `GET` | `/vehicles/:id` |
| `PATCH` | `/vehicles/:id` |
| `DELETE` | `/vehicles/:id` |

Vehicles belong to a `USER`, not a site.

## 6. Material Types

| Method | Endpoint |
|---|---|
| `POST` | `/admin/material-types` |
| `GET` | `/material-types` |
| `PATCH` | `/admin/material-types/:id` |
| `DELETE` | `/admin/material-types/:id` |

## 7. Contractors / C/O

| Method | Endpoint |
|---|---|
| `POST` | `/contractors` |
| `GET` | `/contractors` |
| `GET` | `/contractors/:id` |
| `PATCH` | `/contractors/:id` |
| `DELETE` | `/contractors/:id` |

Contractors belong to a `USER`, not a site.

## 8. Rates

| Method | Endpoint |
|---|---|
| `POST` | `/rates` |
| `GET` | `/rates` |
| `GET` | `/rates/:id` |
| `PATCH` | `/rates/:id` |
| `DELETE` | `/rates/:id` |
| `GET` | `/rates/lookup` |

Rates are based on **Site + Vehicle Type + Material Type**.

**Unique combination:** `(site_id, vehicle_type_id, material_type_id)`

## 9. Loads

| Method | Endpoint |
|---|---|
| `POST` | `/loads` |
| `GET` | `/loads` |
| `GET` | `/loads/:id` |
| `PATCH` | `/loads/:id` |
| `DELETE` | `/loads/:id` |

### Create a Load

`POST /loads`

#### Request

```json
{
  "siteId": "uuid",
  "date": "2026-08-11",
  "vehicleId": "uuid",
  "materialTypeId": "uuid",
  "contractorId": "uuid",
  "amount": 1500,
  "paymentType": "CREDIT"
}
```

`amount` is optional. If omitted, the applicable rate amount is used. If provided, the provided amount is used.

#### Amount resolution

```text
Vehicle
  ↓
Vehicle Type
  ↓
Site + Vehicle Type + Material
  ↓
Rate
  ↓
Amount
```

## 10. Reports

### Contractor Settlement

`GET /reports/contractor-settlement`

#### Filters

- `siteId`
- `contractorId`
- `fromDate`
- `toDate`

#### Returns

- Load count
- Vehicle
- Vehicle Type
- Material
- Amount
- Total loads
- Total amount

## 11. PDF Reports

`GET /reports/contractor-settlement/pdf`

Supports the same filters as the contractor settlement report and returns a PDF settlement report.

## 12. Authorization

### `SUPER_ADMIN`

- Manage users
- Manage global vehicle types
- Manage global material types

### `USER`

- Manage own sites
- Manage own vehicles
- Manage own contractors
- Manage own rates
- Manage own loads
- Generate own reports

A `USER` must never access another `USER`'s data.

## 13. Important Business Rules

1. A vehicle belongs to a user and can operate at multiple sites.
2. A contractor belongs to a user and can operate at multiple sites.
3. C/O is associated with a load, not a vehicle.
4. Vehicle type is derived from the vehicle.
5. Rate = Site + Vehicle Type + Material Type.
6. Rate is automatically selected when creating a load.
7. The operator can edit the automatically generated amount.
8. Load amount is used for reports.
9. Updating a rate does not change existing load amounts.
10. Deleted loads are excluded from reports.

## 14. Standard Response

### Success

```json
{
  "success": true,
  "data": {}
}
```

### Error

```json
{
  "success": false,
  "message": "Error message",
  "code": "ERROR_CODE"
}
```

## 15. Common Status Codes

| Status | Meaning |
|---:|---|
| `200` | Success |
| `201` | Created |
| `400` | Validation Error |
| `401` | Unauthorized |
| `403` | Forbidden |
| `404` | Not Found |
| `409` | Conflict |
| `500` | Server Error |
