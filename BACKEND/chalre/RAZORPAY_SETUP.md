# Razorpay Configuration Guide

## Setup Instructions

### Option 1: Using Environment Variables (Recommended for Production)

Set the following environment variables:

**Windows (PowerShell):**
```powershell
$env:RAZORPAY_KEY="rzp_live_your_key_here"
$env:RAZORPAY_SECRET="your_secret_here"
```

**Windows (CMD):**
```cmd
set RAZORPAY_KEY=rzp_live_your_key_here
set RAZORPAY_SECRET=your_secret_here
```

**Linux/Mac:**
```bash
export RAZORPAY_KEY="rzp_live_your_key_here"
export RAZORPAY_SECRET="your_secret_here"
```

### Option 2: Using application.yaml (For Development)

Edit `src/main/resources/application.yaml`:

```yaml
razorpay:
  key: rzp_live_your_key_here
  secret: your_secret_here
```

**Note:** The application.yaml uses environment variables first, then falls back to the values in the file.

### Option 3: Using .env file (Requires dotenv library)

If you want to use a `.env` file, you'll need to add the `dotenv-java` library to your `pom.xml`:

```xml
<dependency>
    <groupId>io.github.cdimascio</groupId>
    <artifactId>dotenv-java</artifactId>
    <version>3.0.0</version>
</dependency>
```

Then create a `.env` file in the root directory:

```
RAZORPAY_KEY=rzp_live_your_key_here
RAZORPAY_SECRET=your_secret_here
```

## Key Format

- **Test keys** start with: `rzp_test_`
- **Live keys** start with: `rzp_live_`

## Verification

After setting up, check the application logs on startup. You should see:
```
Loading Razorpay configuration from: environment variable (or application.yaml)
Razorpay client initialized successfully
```

## Troubleshooting

### Error: "Razorpay authentication failed"

1. **Check your keys are correct:**
   - Verify the key starts with `rzp_test_` or `rzp_live_`
   - Verify the secret matches the key

2. **Check environment variables are set:**
   ```bash
   # Windows
   echo %RAZORPAY_KEY%
   
   # Linux/Mac
   echo $RAZORPAY_KEY
   ```

3. **Check application.yaml:**
   - Ensure keys are not empty
   - Ensure no extra spaces or quotes

4. **Restart the application** after changing environment variables

### Error: "Razorpay keys are not configured"

- Ensure either environment variables OR application.yaml has the keys
- Check for typos in variable names (RAZORPAY_KEY, not RAZORPAY_KEY_ID)

## Current Configuration Priority

1. **Environment variables** (`RAZORPAY_KEY`, `RAZORPAY_SECRET`) - Highest priority
2. **application.yaml** values - Fallback if env vars not set

