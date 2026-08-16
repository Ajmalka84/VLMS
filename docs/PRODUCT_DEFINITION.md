# VLMS — Product Definition

## 1. Product

**Name:** Vehicle Load Management System (VLMS)

**Type:** Mobile-first SaaS web application.

**Primary purpose:**

VLMS helps quarry/sand-site operators record vehicle loads and generate C/O settlement reports automatically.

---

# 2. Problem

Many quarry/sand-site operations currently maintain simple manual records of vehicle loads.

A typical entry may contain:

- Date
- Vehicle number
- C/O
- Material
- Amount
- Cash/Credit

At the end of a period, the operator needs to calculate how many loads were handled by each C/O and prepare a settlement report.

This process can involve:

- Manual writing
- Repeated calculations
- Searching through records
- Counting loads manually
- Preparing settlement reports manually
- Errors in calculations

VLMS converts this workflow into a simple digital system.

---

# 3. Target Customer

Primary customer:

**Quarry / sand-site / material-loading site operators**

The initial target is a small operation where one person may manage most of the site.

The application is designed for businesses where:

- Vehicles enter the site
- Loads are recorded
- Different materials have different rates
- Rates depend on vehicle type and material
- Vehicles may be owned/operated by different parties
- C/Os/contractors may handle multiple loads
- Settlement reports are required

---

# 4. Primary User

The main operational user is the person managing the site.

This may be:

- Owner
- Site supervisor
- Site operator
- Manager

V1 does not distinguish between these roles.

There is only one customer-facing USER account with access to the complete site-management functionality.

Multiple roles and permissions may be added later if required.

---

# 5. SaaS Model

VLMS is a SaaS product.

There are two roles:

- SUPER_ADMIN
- USER

## SUPER_ADMIN

The SaaS owner.

The Super Admin creates customer accounts.

Customers do not register themselves.

Workflow:

SUPER_ADMIN
→ Create Customer
→ Give Credentials
→ Customer Login
→ Use VLMS

## USER

Represents one customer/business account.

The USER manages all data belonging to that account.

---

# 6. Core Product Promise

The product should solve one problem extremely well:

> **Record vehicle loads quickly and produce an accurate C/O settlement report.**

The application should not attempt to become a complete ERP in V1.

---

# 7. Core Business Workflow

The overall workflow is:

Customer Login
↓
Configure Site
↓
Configure Vehicles
↓
Configure Materials
↓
Configure C/Os
↓
Configure Rates
↓
Record Loads
↓
Review/Edit Loads
↓
Generate C/O Settlement Report
↓
Generate PDF

---

# 8. Load Entry Workflow

Load entry is the most important operational workflow.

The operator should be able to enter a load quickly.

### Step 1 — Date

Default to today's date.

Operator can change it if necessary.

### Step 2 — Vehicle

Search/select vehicle number.

Example:

KL40Q552

The system already knows the Vehicle Type associated with that vehicle.

### Step 3 — Material

Select the material.

Examples:

- M-Sand
- 20mm
- 40mm
- 6mm

### Step 4 — C/O

Search/select the C/O/contractor.

### Step 5 — Rate

The system determines the standard rate using:

Site
+
Vehicle Type
+
Material

Example:

Perumbavoor Site
+
Torus 10
+
M-Sand

= ₹1,500

### Step 6 — Amount

The standard rate is automatically displayed.

The operator can edit the amount.

Example:

Standard Rate: ₹1,500

Actual Amount: ₹1,400

### Step 7 — Payment Type

Select:

- CASH
- CREDIT

### Step 8 — Save

The Load is saved.

---

# 9. Rate Concept

Rates are standard rates.

A Rate is determined by:

**Site + Vehicle Type + Material**

Example:

| Site | Vehicle Type | Material | Rate |
|---|---|---|---:|
| Site A | Torus 10 | M-Sand | ₹1,500 |
| Site A | Torus 10 | 20mm | ₹1,700 |
| Site A | Taurus | M-Sand | ₹1,400 |

There can only be one current rate for each combination.

---

# 10. Actual Amount

The Rate and Load Amount are different concepts.

Rate:

The standard configured rate.

Load Amount:

The actual amount recorded for that load.

Example:

Standard Rate = ₹1,500

Operator changes the amount to:

₹1,400

The Load stores:

Amount = ₹1,400

Reports use the Load Amount.

---

# 11. Historical Accuracy

If a Rate changes later, old Loads must not change.

Example:

August 1:

Rate = ₹1,500

Load:

₹1,500

August 10:

Rate changes to ₹1,600.

The August 1 Load must remain:

₹1,500

Therefore settlement reports always use:

**Load.amount**

not the current Rate.

---

# 12. Vehicle Concept

A Vehicle belongs to the customer's account.

A Vehicle is not tied to one Site.

The same vehicle can operate at multiple Sites.

Example:

KL40Q552

can have loads at:

- Site A
- Site B
- Site C

A Vehicle belongs to one Vehicle Type.

Example:

KL40Q552
→ Torus 10

---

# 13. C/O / Contractor Concept

A C/O/contractor belongs to the customer's account.

A C/O is not tied to one Site.

The same C/O can operate across multiple Sites.

The C/O is associated with each individual Load.

Example:

Vehicle:

KL40Q552

Load 1 → C/O A

Load 2 → C/O B

Load 3 → C/O A

Therefore the C/O must be selected during Load Entry.

---

# 14. Site Concept

A customer may have multiple Sites.

Example:

Customer:

ABC Sands

Sites:

- Perumbavoor Site
- Aluva Site
- Angamaly Site

Each Site contains its own:

- Location
- Pincode
- Rates
- Loads

Vehicles and C/Os remain customer-level resources and can be used across multiple Sites.

---

# 15. Load Concept

A Load represents one vehicle-load transaction.

A Load contains:

- Site
- Date
- Vehicle
- Material
- C/O
- Rate
- Actual Amount
- Payment Type

Example:

```text
Date: 16-Aug-2026
Site: Perumbavoor
Vehicle: KL40Q552
Vehicle Type: Torus 10
Material: M-Sand
C/O: Bava
Rate: ₹1,500
Amount: ₹1,500
Payment: CREDIT