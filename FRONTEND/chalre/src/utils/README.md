# Error Handling Utility

## Overview

The `errorHandler.js` utility provides centralized error handling across the application, ensuring consistent error messages and handling patterns.

## Usage

### Basic Error Handling

```javascript
import { handleError } from "../utils/errorHandler";

try {
  await api.post("/endpoint", data);
} catch (error) {
  const errorMessage = handleError(error, { showAlert: true });
  setError(errorMessage);
}
```

### Get Error Message Only

```javascript
import { getErrorMessage } from "../utils/errorHandler";

try {
  await api.get("/data");
} catch (error) {
  const message = getErrorMessage(error);
  console.log(message);
}
```

### Handle API Errors with Custom Handler

```javascript
import { handleApiError } from "../utils/errorHandler";

try {
  await api.post("/endpoint", data);
} catch (error) {
  await handleApiError(error, {
    showAlert: true,
    onError: (message, error) => {
      // Custom error handling
      console.log("Custom handler:", message);
    }
  });
}
```

### Check Error Types

```javascript
import { isNetworkError, isAuthError } from "../utils/errorHandler";

if (isNetworkError(error)) {
  // Handle network error
}

if (isAuthError(error)) {
  // Handle authentication error
}
```

### Handle Authentication Errors

```javascript
import { handleAuthError } from "../utils/errorHandler";
import { useNavigate } from "react-router-dom";

const navigate = useNavigate();

try {
  await api.get("/protected");
} catch (error) {
  handleAuthError(error, navigate);
}
```

## Functions

- `getErrorMessage(error)` - Extract user-friendly error message
- `handleError(error, options)` - Handle error with optional alert and callback
- `handleApiError(error, options)` - Handle API errors with consistent formatting
- `formatValidationErrors(error)` - Format validation errors from backend
- `isNetworkError(error)` - Check if error is a network error
- `isAuthError(error)` - Check if error is an authentication error
- `handleAuthError(error, navigate)` - Handle auth errors and redirect to login

## Error Types Handled

- Network errors (no connection)
- HTTP status codes (400, 401, 403, 404, 422, 500, 503)
- Validation errors
- Authentication errors (with auto-redirect)
