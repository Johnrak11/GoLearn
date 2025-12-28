# GoLearn Architecture & Strategy

## 1. Overview

GoLearn is a scalable e-learning platform designed for 3-month delivery with high security and future-proofing.
This document outlines the architectural decisions for **Video Storage** and **Payment Integration**.

## 2. Database Schema (MariaDB)

The schema has been upgraded to support:

- **RBAC**: Roles (`admin`, `instructor`, `student`) and Permissions.
- **Content**: Courses, Modules, Lessons, Videos (External), Resources, Quizzes.
- **Sales**: Orders, OrderItems, Payments, Coupons.
- **Community**: Reviews, Forum Posts.
- **System**: Activity Logs, Notifications.

## 3. Video Storage Strategy

**Constraint**: Small server space.
**Solution**: Use a dedicated Video Hosting Provider (VOD).

### Recommended Providers:

1.  **Cloudflare Stream** (Best for cost/performance)
    - **Pros**: Cheap ($5/1000min), handles encoding, storage, and delivery (CDN).
    - **Cons**: Proprietary API.
2.  **Mux** (Developer friendly)
    - **Pros**: Excellent API, great documentation.
    - **Cons**: Slightly more expensive than Cloudflare.
3.  **AWS S3 + CloudFront** (DIY)
    - **Pros**: Full control, industry standard.
    - **Cons**: High engineering effort (encoding with MediaConvert, signed URLs).

### Implementation Flow:

1.  **Instructor uploads video**: Frontend requests a "Upload URL" from Backend.
2.  **Backend**: Calls Provider API (e.g., Mux) to get a secure upload URL.
3.  **Frontend**: Uploads file directly to Provider (bypassing your small server).
4.  **Provider**: Webhook notifies Backend when video is `READY`.
5.  **Backend**: Updates `Video` table with `external_id`, `playback_id`, and `duration`.

## 4. Payment Integration (Stripe)

**Security First**: Never store credit card details.

### Implementation Flow:

1.  **Checkout**: Mobile App calls `POST /api/orders/checkout`.
2.  **Backend**: Creates a Stripe **PaymentIntent** and returns `client_secret`.
3.  **Mobile App**: Uses Stripe SDK to present payment sheet.
4.  **Stripe**: Processes payment securely.
5.  **Webhook**: Stripe notifies Backend (`payment_intent.succeeded`).
6.  **Backend**:
    - Updates `Order` status to `COMPLETED`.
    - Creates `Enrollment` for the user.
    - Sends receipt email.

## 5. Security Measures

- **JWT Auth**: Access tokens (short-lived) + Refresh tokens (database backed).
- **RBAC**: Middleware checks `user.roles` for sensitive endpoints.
- **Input Validation**: `Zod` schema validation for all inputs.
- **Passwords**: Bcrypt hashing (cost factor 10).
- **API**: Rate limiting (to be added via Nginx or Express middleware).
  \
