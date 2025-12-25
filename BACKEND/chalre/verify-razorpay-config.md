# Quick Razorpay Configuration Verification

## Quick Check Script

Run these checks to verify your Razorpay setup:

### 1. Check Environment Variables (Run in terminal)

**Windows PowerShell:**
```powershell
Write-Host "RAZORPAY_KEY: $env:RAZORPAY_KEY"
Write-Host "RAZORPAY_SECRET: $($env:RAZORPAY_SECRET.Substring(0, [Math]::Min(10, $env:RAZORPAY_SECRET.Length)))..."
```

**Linux/Mac:**
```bash
echo "RAZORPAY_KEY: $RAZORPAY_KEY"
echo "RAZORPAY_SECRET: ${RAZORPAY_SECRET:0:10}..."
```

### 2. Check application.yaml

Verify the file contains:
```yaml
razorpay:
  key: ${RAZORPAY_KEY:rzp_live_xxx}
  secret: ${RAZORPAY_SECRET:xxx}
```

### 3. Check Backend Logs on Startup

Look for these log messages:
```
INFO: Loading Razorpay configuration from: [environment variable/application.yaml]
INFO: Initializing Razorpay client with key: rzp_[test/live]_...
INFO: Razorpay client initialized successfully
INFO: PaymentController initialized with [TEST/LIVE] key: rzp_[test/live]_...
```

### 4. Test Order Creation

Call `/api/payments/order` and check response:
```json
{
  "orderId": "order_xxx",
  "amount": 10000,
  "key": "rzp_live_xxx",
  "paymentId": 123,
  "currency": "INR"
}
```

**Verify**:
- ✅ `orderId` starts with `order_`
- ✅ `amount` is in paise (e.g., 10000 = ₹100)
- ✅ `key` starts with `rzp_test_` or `rzp_live_`
- ✅ `key` matches the key in backend logs

### 5. Check Frontend Console

When clicking "Proceed to Pay", check console:
```
🔍 Razorpay Order Details:
   Order ID: order_xxx
   Amount: 10000 paise (₹100.00)
   Key: rzp_live_xxx...
   Payment ID: 123
```

**Verify**:
- ✅ Order ID matches backend log
- ✅ Key matches backend log
- ✅ Amount matches backend log

## Common Mistakes to Avoid

❌ **Mixing Test and Live Keys**
- Backend uses test key, frontend gets live key
- **Fix**: Use same key type everywhere

❌ **Key-Secret Mismatch**
- Key `rzp_test_xxx` with secret for `rzp_live_yyy`
- **Fix**: Use matching key-secret pair

❌ **Hardcoding Key in Frontend**
- Frontend uses hardcoded key instead of backend response
- **Fix**: Always use `key` from `/api/payments/order` response

❌ **Amount Format Mismatch**
- Backend sends paise, frontend uses rupees
- **Fix**: Always use amount from backend response

## If Verification Fails

1. **Check Key Type**:
   - Backend log shows: `rzp_test_...` or `rzp_live_...`
   - Frontend console shows: `rzp_test_...` or `rzp_live_...`
   - They MUST match

2. **Check Key Value**:
   - Backend log: `rzp_live_Ruvl00SN...`
   - Frontend console: `rzp_live_Ruvl00SN...`
   - They MUST match exactly

3. **Check Environment Variables**:
   - If backend uses env vars, ensure they're set
   - If backend uses yaml, ensure values are correct
   - Restart backend after changing

4. **Check Razorpay Dashboard**:
   - Login to dashboard
   - Verify keys are active
   - Verify key-secret pair matches config

