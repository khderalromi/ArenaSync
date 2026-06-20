# ArenaSync 

ArenaSync is a high-performance, robust backend system designed for sports venue discovery, booking management, and real-time availability tracking. Built using the **Mongoose/Node.js/Express** ecosystem, the platform optimizes location-based searches and complex booking schedules using advanced MongoDB features.

---

##  Key Features

*   **Advanced Geo-Spatial Search:** Uses MongoDB's `$geoNear` aggregation stage to fetch and rank venues based on precise spherical coordinates (Longitude, Latitude) within specific coverage polygons.
*   **Dynamic Availability Mapping:** Implements complex `$lookup` aggregation pipelines instead of traditional populates to merge sports venues with their real-time operational hours, preventing booking overlaps and ensuring maximum efficiency.
*   **Secure Authentication & Authorization:** Robust user management featuring password hashing via `bcrypt` and stateless session handling using JSON Web Tokens (JWT).
*   **Data Integrity & Validation:** Strict data validation via `validator` and custom Regex rules for strict time formats (`HH:mm`), alongside Mongoose hooks (`pre-find` and `pre-save`) for automated server-side data cleaning.

---

##  Tech Stack & Tools

*   **Runtime Environment:** Node.js (v18+)
*   **Backend Framework:** Express.js
*   **Database:** MongoDB Atlas
*   **ODM:** Mongoose
*   **Security & Auth:** JWT (JSON Web Tokens), Bcrypt.js
*   **Validation:** Custom Mongoose Validators & Validator.js

---

##  Architecture Overview

The system is engineered following standard RESTful API best practices and clean architecture principles. It leverages two core interdependent models:

### 1. Venues Model (`Venues`)
Handles venue specifications, core location metrics (`Point` and `Polygon` types for `2dsphere` indexing), and hourly pricing.
*   *Performance Optimization:* Indexed using `2dsphere` on location attributes for sub-millisecond querying.

### 2. Availability Model (`Available`)
Manages custom operational time slots mapped directly to unique venue ObjectIDs.
*   *Validation:* Enforces strict time formatting and ensures no orphan schedules exist.

---

##  Core Pipeline Showcase (The Engineering Trade-off)

Instead of relying on convenience methods like `.populate()`, ArenaSync handles location queries through an optimized aggregation pipeline for heavy-duty production performance:

```javascript
// Example of the geoNear + lookup strategy used in ArenaSync
const stats = await Venues.aggregate([
    {
        $geoNear: {
            near: { type: 'Point', coordinates: [lng * 1, lat * 1] },
            distanceField: 'distance',
            distanceMultiplier: 0.001, // Convert meters to km
            spherical: true
        }
    },
    {
        $lookup: {
            from: 'availables',
            localField: '_id',
            foreignField: 'venues',
            as: 'venuesAvailability'
        }
    }
]);