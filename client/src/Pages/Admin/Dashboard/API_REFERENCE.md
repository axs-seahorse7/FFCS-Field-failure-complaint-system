# PG Group FFS — Admin Dashboard API Reference

All routes are prefixed with your API base URL (e.g. `/api`).
The dashboard uses `axios-interceptore/api.js` for auth headers automatically.

---

## 📊 Complaint Stats  
**GET** `/complaints/stats`  
Returns aggregate counts for KPI cards.

```json
{
  "data": {
    "total": 20883,
    "defects": 18863,
    "avgPpm": 5804,
    "open": 312,
    "resolved": 1450,
    "pending": 215,
    "ppm2022": 2063,
    "ppm2023": 1093,
    "ppm2024": 4800
  }
}
```

---

## 📅 Monthly Trend  
**GET** `/complaints/monthly`  
Returns month-by-month defect and PPM data.

```json
{
  "data": [
    { "m": "JAN", "defects": 4590, "ppm": 6050 },
    { "m": "FEB", "defects": 3377, "ppm": 5896 },
    ...12 items
  ]
}
```

**MongoDB Aggregation Example:**
```js
Complaint.aggregate([
  {
    $group: {
      _id: { $month: "$complaintDate" },
      defects: { $sum: 1 },
    }
  },
  { $sort: { "_id": 1 } }
])
```

---

## 🍩 By Category  
**GET** `/complaints/by-category`

```json
{
  "data": [
    { "_id": "ELEC PART DEFECTS", "count": 17778 },
    { "_id": "PART BROKEN / DAMAGED / MISSING", "count": 1998 },
    ...
  ]
}
```

**Aggregation:**
```js
Complaint.aggregate([
  { $group: { _id: "$defectCategory", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## 🔧 Top Defects  
**GET** `/complaints/top-defects`

```json
{
  "data": [
    { "name": "PCB - MOTOR NOT WORK", "count": 4977 },
    ...
  ]
}
```

**Aggregation:**
```js
Complaint.aggregate([
  { $group: { _id: "$defectDetails", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 20 },
  { $project: { name: "$_id", count: 1 } }
])
```

---

## 🏭 By Supplier  
**GET** `/complaints/by-supplier`  
Group by a `supplier` field (add to schema if not present, or map from `defectivePart`).

```json
{
  "data": [
    { "_id": "CVTE", "count": 12662 },
    { "_id": "Laxmi", "count": 1423 },
    ...
  ]
}
```

---

## 🔩 By Part  
**GET** `/complaints/by-part`

```json
{
  "data": [
    { "_id": "IDU PCB", "count": 5200 },
    { "_id": "ODU PCB", "count": 3100 },
    ...
  ]
}
```

**Aggregation:**
```js
Complaint.aggregate([
  { $group: { _id: "$defectivePart", count: { $sum: 1 } } },
  { $sort: { count: -1 } }
])
```

---

## 🏘 By Customer  
**GET** `/complaints/by-customer`

```json
{
  "data": [
    { "_id": "GODREJ", "count": 2921, "ppm": 9462, "produced": 308699 },
    ...
  ]
}
```

**Aggregation:**
```js
Complaint.aggregate([
  {
    $group: {
      _id: "$customerName",
      count: { $sum: 1 },
    }
  },
  { $sort: { count: -1 } }
])
// Then join with a production volume collection for `produced` and calculate ppm = (count/produced)*1e6
```

---

## 📈 PPM Trend  
**GET** `/complaints/ppm-trend`  
Returns monthly PPM with unit ship data.

```json
{
  "data": [
    { "m": "JAN", "ppm": 6050, "units": 9864 },
    ...
  ]
}
```

---

## 📋 Get Complaints (with filters)  
**GET** `/get-complaint`  
Optional query params: `search`, `status`, `customerName`, `defectCategory`, `defectDetails`

```json
{
  "data": [
    {
      "_id": "...",
      "complaintNo": "PG-20260101-00001",
      "complaintDate": "2026-01-15T00:00:00.000Z",
      "customerName": "GODREJ",
      "commodity": "IDU",
      "modelName": "GIC 18XTC5-WTA",
      "defectCategory": "ELEC PART DEFECTS",
      "defectivePart": "IDU PCB",
      "defectDetails": "PCB - MOTOR NOT WORK",
      "doa": "IW",
      "status": "Open",
      "createdAt": "2026-01-15T10:30:00.000Z"
    }
  ]
}
```

---

## ✏️ Update Complaint Status  
**POST** `/complaints/status`  
Body: `{ "id": "<mongoId>", "status": "Resolved" }`

---

## 🗑 Delete Complaint  
**POST** `/complaints/delete`  
Body: `{ "id": "<mongoId>" }`

---

## 👥 Get Users  
**GET** `/users`  
Optional query params: `search`, `role`, `isBlocked`

```json
{
  "data": [
    {
      "_id": "...",
      "email": "user@example.com",
      "role": "user",
      "isBlocked": false,
      "complaintCount": 12,
      "createdAt": "2025-06-01T00:00:00.000Z"
    }
  ]
}
```

> Note: `complaintCount` should be a virtual or computed field — count of complaints where `createdBy === user._id`.

---

## 🚫 Block / Unblock User  
**POST** `/users/block`   → Body: `{ "id": "<userId>" }`  
**POST** `/users/unblock` → Body: `{ "id": "<userId>" }`

---

## 🔑 Change Role  
**POST** `/users/role`  
Body: `{ "id": "<userId>", "role": "admin" | "user" }`

---

## 🗑 Delete User  
**POST** `/users/delete`  
Body: `{ "id": "<userId>" }`

---

## 📝 Action Plans  
**GET** `/action-plans`

```json
{
  "data": [
    {
      "_id": "...",
      "defect": "PCB - MOTOR NOT WORK",
      "supplier": "CVTE",
      "qty": 3424,
      "pct": "25%",
      "analysis": "Relay NG after few months...",
      "action": "Switch to SANYOU brand relay...",
      "resp": "CVTE / PG",
      "target": "20-Nov-2024",
      "status": "Closed"
    }
  ]
}
```

---

## 🔐 Auth  
**POST** `/auth/logout` — clears session/token

---

## 💡 Backend Tips

### Adding `complaintCount` virtual to User model:
```js
userSchema.virtual("complaintCount", {
  ref: "Complaint",
  localField: "_id",
  foreignField: "createdBy",
  count: true,
});
// Then in your GET /users route:
User.find().populate("complaintCount")
```

### Blocking middleware for complaint submission:
```js
// In your complaint creation route:
const user = await User.findById(req.user.id);
if (user.isBlocked) {
  return res.status(403).json({ message: "Your account has been blocked." });
}
```
