// // Proxy to FastAPI model service
// export const runModel = async (payload) => {
//   try {
//     const response = await fetch("http://localhost:8000/predict", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) {
//       throw new Error(`Model service error: ${response.statusText}`);
//     }

//     const result = await response.json();
//     return result;
//   } catch (error) {
//     console.error("Error calling model service:", error);
//     throw error;
//   }
// };


// runModelProxy.js - Prediction API Backend
import dotenv from "dotenv";

dotenv.config();

// Proxy to FastAPI model service
export const runModel = async (payload) => {
  try {
    const modelServiceUrl = process.env.MODEL_SERVICE_URL || "http://localhost:8000";
    const response = await fetch(`${modelServiceUrl}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
        // --- Added specific 422 error handling for schema validation failures ---
        if (response.status === 422) {
            // Attempt to parse the detailed error body from FastAPI
            const errorBody = await response.json().catch(() => ({ detail: 'Unknown validation error' }));
            console.error("Model validation failed (422) with payload:", payload);
            throw new Error(`Model validation failed (422): ${JSON.stringify(errorBody.detail || errorBody)}`);
        }
        throw new Error(`Model service error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // This block catches network errors (e.g., Port 8000 is down) or re-thrown errors
    console.error("Error calling model service:", error.message);
    throw error;
  }
};