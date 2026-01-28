# API Endpoints Documentation

**Base URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app`

This document lists all available API endpoints in the SmartWebSecurity backend application.

---

## 📋 Table of Contents

- [Authentication Endpoints](#authentication-endpoints)
- [API Key Management Endpoints](#api-key-management-endpoints)
- [Prediction Endpoints](#prediction-endpoints)
- [Dashboard Endpoints](#dashboard-endpoints)
- [General Endpoints](#general-endpoints)

---

## 🔐 Authentication Endpoints

Base path: `/api/auth`

### 1. User Registration (Signup)

- **Method:** `POST`
- **Endpoint:** `/api/auth/signup`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/auth/signup`
- **Authentication:** None (Public)
- **Purpose:** Register a new user account
- **Request Body:**
  ```json
  {
    "name": "string",
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "number",
      "name": "string",
      "email": "string"
    }
  }
  ```

### 2. User Login

- **Method:** `POST`
- **Endpoint:** `/api/auth/login`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/auth/login`
- **Authentication:** None (Public)
- **Purpose:** Authenticate user and receive JWT token
- **Request Body:**
  ```json
  {
    "email": "string",
    "password": "string"
  }
  ```
- **Response:**
  ```json
  {
    "message": "Login success",
    "token": "string (JWT)",
    "user": {
      "id": "number",
      "email": "string",
      "name": "string"
    }
  }
  ```

---

## 🔑 API Key Management Endpoints

Base path: `/api/apikeys`

> **Note:** All API key management endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

### 3. List API Keys

- **Method:** `GET`
- **Endpoint:** `/api/apikeys`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/apikeys`
- **Authentication:** JWT Token (Required)
- **Purpose:** Retrieve all API keys for the authenticated user
- **Response:**
  ```json
  {
    "keys": [
      {
        "id": "number",
        "key": "string (masked: first 6 chars + **** + last 4 chars)",
        "label": "string",
        "created_at": "timestamp",
        "expires_at": "timestamp",
        "key_masked": true
      }
    ]
  }
  ```

### 4. Create API Key

- **Method:** `POST`
- **Endpoint:** `/api/apikeys`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/apikeys`
- **Authentication:** JWT Token (Required)
- **Purpose:** Generate a new API key for the authenticated user
- **Request Body:**
  ```json
  {
    "label": "string (optional)"
  }
  ```
- **Response:**
  ```json
  {
    "message": "API key created successfully",
    "key": {
      "id": "number",
      "key": "string (full key - save this, it won't be shown again)",
      "label": "string",
      "created_at": "timestamp"
    }
  }
  ```

### 5. Regenerate API Key

- **Method:** `PUT`
- **Endpoint:** `/api/apikeys/:keyId/regenerate`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/apikeys/:keyId/regenerate`
- **Authentication:** JWT Token (Required)
- **Purpose:** Regenerate an existing API key (creates a new key value)
- **URL Parameters:**
  - `keyId` - The ID of the API key to regenerate
- **Response:**
  ```json
  {
    "message": "API key regenerated successfully",
    "key": {
      "id": "number",
      "key": "string (new full key)",
      "label": "string",
      "created_at": "timestamp"
    }
  }
  ```

### 6. Delete API Key

- **Method:** `DELETE`
- **Endpoint:** `/api/apikeys/:keyId`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/apikeys/:keyId`
- **Authentication:** JWT Token (Required)
- **Purpose:** Delete an API key
- **URL Parameters:**
  - `keyId` - The ID of the API key to delete
- **Response:**
  ```json
  {
    "message": "API key deleted successfully"
  }
  ```

---

## 🤖 Prediction Endpoints

Base path: `/api`

### 7. Make Prediction

- **Method:** `POST`
- **Endpoint:** `/api/predict`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/predict`
- **Authentication:** API Key (Required via `X-API-Key` header)
- **Purpose:** Submit data for security threat prediction using the ML model
- **Headers:**
  ```
  X-API-Key: <your-api-key>
  ```
- **Request Body:**
  ```json
  {
    // Payload structure depends on your ML model requirements
    // The payload is passed to the model service
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "prediction": {
      // Model prediction results
      // May include fields like "prediction", "attack_detected", etc.
    }
  }
  ```
- **Additional Features:**
  - Saves prediction to database
  - Emits real-time Socket.IO event to user's room
  - Records IP address and endpoint information

---

## 📊 Dashboard Endpoints

Base path: `/api/dashboard`

> **Note:** All dashboard endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

### 8. Get Dashboard Overview

- **Method:** `GET`
- **Endpoint:** `/api/dashboard/overview`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/dashboard/overview`
- **Authentication:** JWT Token (Required)
- **Purpose:** Retrieve overview statistics for the authenticated user's dashboard
- **Response:**
  ```json
  {
    "total_predictions": "number",
    "total_attacks": "number (predictions where attack was detected)",
    "latest_prediction": {
      "id": "number",
      "timestamp": "timestamp",
      "prediction": "object",
      "payload": "object"
    },
    "recent_predictions": [
      {
        "id": "number",
        "timestamp": "timestamp",
        "prediction": "object",
        "payload": "object"
      }
      // ... up to 10 most recent predictions
    ]
  }
  ```

### 9. Get Predictions List

- **Method:** `GET`
- **Endpoint:** `/api/dashboard/predictions`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/api/dashboard/predictions`
- **Authentication:** JWT Token (Required)
- **Purpose:** Retrieve a filtered list of predictions for the authenticated user
- **Query Parameters:**
  - `limit` (optional) - Number of predictions to return (default: 50)
  - `since` (optional) - ISO timestamp to filter predictions from a specific time
- **Example URLs:**
  - Get last 50 predictions: `/api/dashboard/predictions`
  - Get last 100 predictions: `/api/dashboard/predictions?limit=100`
  - Get predictions since a date: `/api/dashboard/predictions?since=2024-01-01T00:00:00Z`
- **Response:**
  ```json
  {
    "predictions": [
      {
        "id": "number",
        "timestamp": "timestamp",
        "prediction": "object",
        "payload": "object",
        "ip": "string",
        "endpoint": "string"
      }
      // ... array of predictions
    ]
  }
  ```

---

## 🏠 General Endpoints

### 10. Health Check / Root

- **Method:** `GET`
- **Endpoint:** `/`
- **Full URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app/`
- **Authentication:** None (Public)
- **Purpose:** Check if the API is running
- **Response:**
  ```
  API is running!
  ```

---

## 🔒 Authentication Methods

This API uses two authentication methods:

### 1. JWT Token Authentication
- Used for: User-specific operations (API key management, dashboard access)
- Header format: `Authorization: Bearer <jwt-token>`
- Obtained from: `/api/auth/login` endpoint

### 2. API Key Authentication
- Used for: Public prediction endpoint
- Header format: `X-API-Key: <api-key>`
- Obtained from: `/api/apikeys` endpoint (after JWT authentication)

---

## 🌐 WebSocket / Socket.IO

The application also supports real-time updates via Socket.IO:

- **Connection URL:** `https://smartwebsecurity-main-backend-production-33df.up.railway.app`
- **Events:**
  - `prediction` - Emitted when a new prediction is made for a user
  - Users are automatically joined to room `user_<userId>` upon connection

---

## 📝 Notes

- All endpoints return JSON responses
- Error responses follow the format: `{ "error": "error message" }`
- The API uses PostgreSQL database for data persistence
- CORS is configured to allow requests from specified origins
- Predictions are processed through an ML model service

---

## 🛠️ Technologies Used

- **Framework:** Express.js
- **Database:** PostgreSQL
- **Authentication:** JWT (jsonwebtoken) + bcrypt for password hashing
- **Real-time:** Socket.IO
- **Security:** API key generation using crypto module

---

**Last Updated:** January 28, 2026
