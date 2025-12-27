# Driver Payout System Implementation

## Overview
This document describes the complete driver payout system implementation for the ChalRe ride-sharing platform. The system allows drivers to receive payouts to their bank accounts after successful ride bookings.

## Implementation Summary

### ✅ Completed Features

1. **Backend Entities**
   - `DriverBankDetails` - Stores driver bank account information
   - `DriverEarnings` - Tracks driver earnings, pending payouts, and commission
   - `Payout` - Records all payout transactions

2. **Backend Services**
   - `DriverBankDetailsService` - Manages bank account details and Razorpay contact/fund account creation
   - `DriverEarningsService` - Tracks and calculates driver earnings
   - `PayoutService` - Handles payout initiation and status updates
   - `RazorpayPayoutService` - Integrates with Razorpay Transfers API

3. **Backend APIs**
   - `POST /api/payouts/bank-details` - Add/update bank details
   - `GET /api/payouts/bank-details` - Get bank details (masked)
   - `GET /api/payouts/bank-details/check` - Check if bank details exist
   - `GET /api/payouts/earnings` - Get driver earnings
   - `POST /api/payouts/initiate` - Initiate payout
   - `GET /api/payouts/history` - Get payout history
   - `GET /api/payouts/{payoutId}` - Get specific payout
   - `POST /api/payouts/webhook` - Razorpay webhook for payout status

4. **Frontend Components**
   - `BankDetailsForm` - Form to add/edit bank details
   - `EarningsDisplay` - Shows total earnings, pending, and paid amounts
   - `PayoutHistory` - Displays payout transaction history
   - `PayoutRequestModal` - Modal to request payouts

5. **Integration**
   - Updated `BookingService` to calculate driver earnings on successful payment
   - Dashboard updated to show earnings and bank details for verified drivers

## Database Schema Changes

### New Tables

1. **driver_bank_details**
   - id (PK)
   - driver_id (FK, unique)
   - account_holder_name
   - bank_name
   - account_number (should be encrypted in production)
   - ifsc_code
   - verification_status (PENDING, VERIFIED, REJECTED)
   - razorpay_contact_id
   - razorpay_fund_account_id
   - created_at, updated_at, verified_at

2. **driver_earnings**
   - id (PK)
   - driver_id (FK, unique)
   - total_earnings (in paise)
   - pending_payout (in paise)
   - paid_amount (in paise)
   - platform_commission (in paise)
   - commission_percentage (default: 10.0)
   - created_at, updated_at

3. **payouts**
   - id (PK)
   - driver_id (FK)
   - amount (in paise)
   - status (PENDING, PROCESSING, SUCCESS, FAILED, CANCELLED)
   - currency (INR)
   - razorpay_payout_id
   - razorpay_transfer_id
   - failure_reason
   - failure_code
   - initiated_at
   - processed_at
   - initiated_by (AUTO or MANUAL_{adminId})
   - notes

## Payment Flow

### Current Flow (Customer Payment)
```
Customer → Razorpay → Platform Account → [No Driver Payout]
```

### New Flow (With Driver Payout)
```
Customer → Razorpay → Platform Account
                    ↓
            Driver Earnings Calculated
            (Payment Amount - 10% Commission)
                    ↓
            Driver Requests Payout
                    ↓
            Razorpay Transfer → Driver Bank Account
```

## Configuration Required

### Environment Variables

Add to your `.env` or `application.properties`:

```properties
# Razorpay Configuration (already exists)
razorpay.key=your_razorpay_key
razorpay.secret=your_razorpay_secret

# NEW: Razorpay Account Number for Payouts
razorpay.account.number=your_razorpay_account_number
```

**Important:** The `RAZORPAY_ACCOUNT_NUMBER` should be your Razorpay account number where customer payments are received. This is used as the source account for transfers.

## Security Considerations

1. **Bank Account Encryption**
   - Currently, account numbers are stored in plain text
   - **TODO:** Implement encryption for `account_number` field in production
   - Consider using Jasypt or Spring Cloud Vault

2. **API Security**
   - All endpoints require authentication
   - Drivers can only access their own data
   - Admin endpoints should have role-based access control

3. **Data Masking**
   - Account numbers are masked in API responses (shows only last 4 digits)
   - Full account numbers only used for Razorpay API calls

## Commission Structure

- **Default Commission:** 10% of payment amount
- **Driver Earnings:** 90% of payment amount
- **Configurable:** Commission percentage can be adjusted per driver in `DriverEarnings` entity

## Payout Process

1. **Driver adds bank details** → Creates Razorpay contact and fund account
2. **Customer pays for ride** → Driver earnings calculated and added to pending
3. **Driver requests payout** → Minimum ₹100, can request specific amount or all pending
4. **System processes payout** → Razorpay transfer initiated
5. **Webhook updates status** → Payout status updated from Razorpay webhook

## Files Changed/Created

### Backend Files Created
- `entity/DriverBankDetails.java`
- `entity/DriverEarnings.java`
- `entity/Payout.java`
- `repository/DriverBankDetailsRepository.java`
- `repository/DriverEarningsRepository.java`
- `repository/PayoutRepository.java`
- `DTO/DriverBankDetailsDTO.java`
- `DTO/DriverEarningsDTO.java`
- `DTO/PayoutDTO.java`
- `DTO/PayoutRequestDTO.java`
- `service/DriverBankDetailsService.java`
- `service/DriverEarningsService.java`
- `service/PayoutService.java`
- `service/RazorpayPayoutService.java`
- `controller/PayoutController.java`

### Backend Files Modified
- `service/BookingService.java` - Added earnings calculation on successful payment

### Frontend Files Created
- `components/BankDetailsForm.jsx`
- `components/EarningsDisplay.jsx`
- `components/PayoutHistory.jsx`
- `components/PayoutRequestModal.jsx`
- `styles/payouts.css`

### Frontend Files Modified
- `pages/Dashboard.jsx` - Added earnings, bank details, and payout sections

## Testing Checklist

- [ ] Driver can add bank details
- [ ] Bank details are validated (IFSC, account number format)
- [ ] Razorpay contact and fund account creation works
- [ ] Earnings are calculated correctly on booking payment
- [ ] Driver can view earnings (total, pending, paid)
- [ ] Driver can request payout
- [ ] Payout minimum amount validation (₹100)
- [ ] Razorpay payout API integration works
- [ ] Webhook updates payout status correctly
- [ ] Payout history displays correctly
- [ ] Error handling for failed payouts

## Known Limitations & TODOs

1. **Account Number Encryption**
   - Currently stored in plain text
   - Should implement encryption before production

2. **Razorpay Account Number**
   - Currently uses placeholder in `RazorpayPayoutService.getRazorpayAccountNumber()`
   - Must be configured via environment variable

3. **Refund Handling**
   - Cancelled bookings mark payment as REFUNDED but don't reverse driver earnings
   - TODO: Implement earnings reversal on refunds

4. **Automatic Payouts**
   - Currently manual (driver-initiated)
   - TODO: Add scheduled automatic payouts (e.g., weekly)

5. **Admin Panel**
   - Admin endpoints exist but no role-based access control implemented
   - TODO: Add `@PreAuthorize("hasRole('ADMIN')")` annotations

6. **Webhook Security**
   - Webhook endpoint doesn't verify Razorpay signature
   - TODO: Add webhook signature verification

## Razorpay Setup Requirements

1. **Enable Transfers API**
   - Go to Razorpay Dashboard → Settings → API Keys
   - Ensure Transfers API is enabled for your account

2. **Configure Webhook**
   - Add webhook URL: `https://your-domain.com/api/payouts/webhook`
   - Select events: `payout.processed`, `payout.failed`

3. **Get Account Number**
   - Your Razorpay account number (where payments are received)
   - Set as `RAZORPAY_ACCOUNT_NUMBER` environment variable

## Usage Instructions

### For Drivers

1. **Get Verified**
   - Complete driver verification process
   - Wait for admin approval

2. **Add Bank Details**
   - Go to Dashboard
   - Scroll to "Bank Account Details" section
   - Fill in account holder name, bank name, account number, and IFSC code
   - Submit form

3. **View Earnings**
   - Dashboard shows total earnings, pending payout, and paid amount
   - Earnings are calculated automatically when customers pay for rides

4. **Request Payout**
   - Click "Request Payout" button when you have pending earnings (minimum ₹100)
   - Enter amount (or leave empty to payout all pending)
   - Add optional notes
   - Submit request

5. **Check Payout Status**
   - View payout history in Dashboard
   - Status updates automatically via webhook

### For Admins

1. **Manual Payout**
   - Use `POST /api/payouts/admin/initiate` endpoint
   - Requires admin role (to be implemented)

2. **Monitor Payouts**
   - Check payout logs in database
   - Monitor failed payouts and retry if needed

## Support & Troubleshooting

### Common Issues

1. **"Bank account must be verified before payout"**
   - Ensure Razorpay contact and fund account were created successfully
   - Check Razorpay dashboard for fund account status

2. **"Insufficient pending payout"**
   - Driver doesn't have enough pending earnings
   - Check earnings in dashboard

3. **"Failed to process payout"**
   - Check Razorpay account balance
   - Verify fund account is active in Razorpay
   - Check Razorpay logs for error details

4. **Webhook not updating status**
   - Verify webhook URL is configured in Razorpay dashboard
   - Check server logs for webhook requests
   - Ensure webhook endpoint is publicly accessible

## Next Steps

1. Configure `RAZORPAY_ACCOUNT_NUMBER` environment variable
2. Test payout flow in Razorpay test mode
3. Implement account number encryption
4. Add webhook signature verification
5. Set up automatic payouts (optional)
6. Add admin role-based access control
7. Implement earnings reversal on refunds

---

**Implementation Date:** 2024
**Status:** ✅ Complete - Ready for Testing

