// src/utils/errorHandler.js

/**
 * Centralized error handling utility
 * Provides consistent error handling across the application
 */

/**
 * Extract user-friendly error message from error object
 * @param {Error|Object} error - The error object from axios or other sources
 * @returns {string} - User-friendly error message
 */
export const getErrorMessage = (error) => {
  /* ===============================
     🔐 AUTH / FIREBASE ERRORS
     =============================== */
  if (error?.code) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password";

      case "auth/invalid-email":
        return "Please enter a valid email address";

      case "auth/user-disabled":
        return "This account has been disabled";

      case "auth/too-many-requests":
        return "Too many login attempts. Please try again later";

      default:
        return "Authentication failed. Please try again.";
    }
  }

  /* ===============================
     🌐 NETWORK ERRORS
     =============================== */
  if (!error.response) {
    if (error.message === "Network Error") {
      return "Unable to connect to server. Please check your internet connection.";
    }
    return "An unexpected error occurred. Please try again.";
  }

  const { status, data } = error.response;

  // Extract error message from various response formats
  let errorMessage = null;

  if (typeof data === "string") {
    errorMessage = data;
  } else if (data && typeof data === "object") {
    // Handle GlobalExceptionHandler format
    errorMessage = data.error || data.message || data.details;
  }

  /* ===============================
     🧠 HTTP STATUS HANDLING
     =============================== */
  switch (status) {
    case 400:
      return errorMessage || "Invalid request. Please check your input.";
    case 401:
      return "Invalid email or password";
    case 403:
      return "You don't have permission to perform this action.";
    case 404:
      return "The requested resource was not found.";
    case 409:
      return data?.message || "This action conflicts with existing data.";
    case 422:
      return data?.message || "Validation failed. Please check your input.";
    case 500:
      return "Server error. Please try again later.";
    case 503:
      return "Service temporarily unavailable. Please try again later.";
    default:
      return data?.message || data?.error || `An error occurred (${status}). Please try again.`;
  }
};

/**
 * Handle error and optionally show notification
 * @param {Error|Object} error - The error object
 * @param {Object} options - Options for error handling
 * @param {Function} options.onError - Callback function to handle error
 * @param {boolean} options.showAlert - Whether to show browser alert (default: false)
 * @param {Function} options.logger - Custom logger function (default: console.error)
 * @returns {string} - Error message
 */
export const handleError = (error, options = {}) => {
  const {
    onError,
    showAlert = false,
    logger = console.error
  } = options;

  const errorMessage = getErrorMessage(error);

  // Log error for debugging
  logger("Error:", error);

  // Show alert if requested
  if (showAlert) {
    alert(errorMessage);
  }

  // Call custom error handler if provided
  if (onError && typeof onError === "function") {
    onError(errorMessage, error);
  }

  return errorMessage;
};

/**
 * Handle API errors with consistent formatting
 * @param {Error} error - Axios error object
 * @param {Object} options - Error handling options
 * @returns {Promise<never>} - Rejected promise with formatted error
 */
export const handleApiError = async (error, options = {}) => {
  const errorMessage = getErrorMessage(error);

  if (options.log !== false) {
    console.error("API Error:", {
      message: errorMessage,
      status: error.response?.status,
      data: error.response?.data,
      originalError: error
    });
  }

  if (options.showAlert) {
    alert(errorMessage);
  }

  if (options.onError) {
    options.onError(errorMessage, error);
  }

  throw new Error(errorMessage);
};

/**
 * Validation error formatter
 * @param {Error} error - Axios error with validation data
 * @returns {string|Object}
 */
export const formatValidationErrors = (error) => {
  if (!error.response || error.response.status !== 422) {
    return getErrorMessage(error);
  }

  const { data } = error.response;

  if (data?.errors && Array.isArray(data.errors)) {
    return data.errors.map(err => err.message || err).join(", ");
  }

  if (data?.message) {
    return data.message;
  }

  return "Validation failed. Please check your input.";
};

/**
 * Check if error is a network error
 */
export const isNetworkError = (error) => {
  return !error.response && (error.message === "Network Error" || error.code === "ERR_NETWORK");
};

/**
 * Check if error is an authentication error
 */
export const isAuthError = (error) => {
  return error.response?.status === 401 || error.response?.status === 403;
};

/**
 * Handle authentication errors (redirect to login)
 */
export const handleAuthError = (error, navigate) => {
  if (isAuthError(error)) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    if (navigate) {
      navigate("/login", {
        state: {
          message: "Your session has expired. Please login again."
        }
      });
    }
  }
};
