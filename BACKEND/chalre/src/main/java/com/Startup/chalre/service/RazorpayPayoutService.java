package com.Startup.chalre.service;

import com.razorpay.Contact;
import com.razorpay.FundAccount;
import com.razorpay.Payout;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import com.Startup.chalre.entity.DriverBankDetails;
import com.Startup.chalre.entity.User;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

/**
 * Service for Razorpay payout operations
 * Handles contact creation, fund account creation, and transfers
 * 
 * Uses official Razorpay Java SDK classes:
 * - Contact: For creating contacts (required before fund accounts)
 * - FundAccount: For creating fund accounts linked to bank details
 * - Payout: For creating payouts/transfers to driver bank accounts
 */
@Service
public class RazorpayPayoutService {
    
    private static final Logger logger = LoggerFactory.getLogger(RazorpayPayoutService.class);
    
    private final RazorpayClient razorpayClient;
    
    public RazorpayPayoutService(
            RazorpayClient razorpayClient,
            @Qualifier("razorpaySecret") String razorpaySecret) {
        this.razorpayClient = razorpayClient;
        // Note: razorpaySecret is kept in constructor for potential future use (e.g., webhook verification)
        // Currently not used but kept for API compatibility
    }
    
    /**
     * Create a Razorpay contact for the driver
     * Contact is required before creating fund accounts
     * 
     * @param driver The driver user entity
     * @return Razorpay contact ID
     * @throws RazorpayException if contact creation fails
     */
    public String createContact(User driver) throws RazorpayException {
        try {
            JSONObject contactRequest = new JSONObject();
            contactRequest.put("name", driver.getName());
            contactRequest.put("email", driver.getEmail());
            contactRequest.put("contact", driver.getPhone());
            contactRequest.put("type", "vendor"); // vendor for payouts
            contactRequest.put("reference_id", "driver_" + driver.getId());
            
            logger.info("Creating Razorpay contact for driver: {}", driver.getId());
            
            // Use Contact class from Razorpay Java SDK
            Contact contact = new Contact(razorpayClient);
            JSONObject contactResponse = contact.create(contactRequest);
            String contactId = contactResponse.getString("id");
            
            logger.info("✅ Razorpay contact created: {}", contactId);
            return contactId;
        } catch (RazorpayException e) {
            logger.error("Failed to create Razorpay contact for driver: {}", driver.getId(), e);
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error creating Razorpay contact for driver: {}", driver.getId(), e);
            throw new RazorpayException("Failed to create contact: " + e.getMessage());
        }
    }
    
    /**
     * Create a Razorpay fund account linked to driver's bank account
     * Fund account is required for transfers/payouts
     * 
     * @param bankDetails Driver bank details entity
     * @param contactId Razorpay contact ID (must be created first)
     * @return Razorpay fund account ID
     * @throws RazorpayException if fund account creation fails
     */
    public String createFundAccount(DriverBankDetails bankDetails, String contactId) throws RazorpayException {
        try {
            JSONObject fundAccountRequest = new JSONObject();
            fundAccountRequest.put("contact_id", contactId);
            fundAccountRequest.put("account_type", "bank_account");
            
            // Bank account details
            JSONObject bankAccount = new JSONObject();
            bankAccount.put("name", bankDetails.getAccountHolderName());
            bankAccount.put("ifsc", bankDetails.getIfscCode());
            bankAccount.put("account_number", bankDetails.getAccountNumber());
            fundAccountRequest.put("bank_account", bankAccount);
            
            logger.info("Creating Razorpay fund account for driver: {}", bankDetails.getDriver().getId());
            
            // Use FundAccount class from Razorpay Java SDK
            FundAccount fundAccount = new FundAccount(razorpayClient);
            JSONObject fundAccountResponse = fundAccount.create(fundAccountRequest);
            String fundAccountId = fundAccountResponse.getString("id");
            
            logger.info("✅ Razorpay fund account created: {}", fundAccountId);
            return fundAccountId;
        } catch (RazorpayException e) {
            logger.error("Failed to create Razorpay fund account for driver: {}", 
                bankDetails.getDriver().getId(), e);
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error creating Razorpay fund account for driver: {}", 
                bankDetails.getDriver().getId(), e);
            throw new RazorpayException("Failed to create fund account: " + e.getMessage());
        }
    }
    
    /**
     * Create a payout/transfer to driver's bank account
     * 
     * Flow:
     * 1. Create contact (if not exists)
     * 2. Create fund account linked to contact
     * 3. Create payout using fund account
     * 
     * @param fundAccountId Razorpay fund account ID
     * @param amount Amount in paise
     * @param currency Currency (default: INR)
     * @param notes Optional notes
     * @return Map containing payout_id, transfer_id, and status
     * @throws RazorpayException if payout creation fails
     */
    public Map<String, Object> createPayout(String fundAccountId, Long amount, String currency, String notes) 
            throws RazorpayException {
        try {
            JSONObject payoutRequest = new JSONObject();
            payoutRequest.put("account_number", getRazorpayAccountNumber()); // Your Razorpay account number
            payoutRequest.put("fund_account_id", fundAccountId);
            payoutRequest.put("amount", amount);
            payoutRequest.put("currency", currency != null ? currency : "INR");
            payoutRequest.put("mode", "IMPS"); // IMPS, NEFT, RTGS
            payoutRequest.put("purpose", "payout");
            payoutRequest.put("queue_if_low_balance", true);
            
            if (notes != null && !notes.isEmpty()) {
                payoutRequest.put("narration", notes);
            }
            
            logger.info("Creating Razorpay payout - FundAccount: {}, Amount: {} paise (₹{})", 
                fundAccountId, amount, amount / 100.0);
            
            // Use Payout class from Razorpay Java SDK
            Payout payout = new Payout(razorpayClient);
            JSONObject payoutResponse = payout.create(payoutRequest);
            
            Map<String, Object> result = new HashMap<>();
            result.put("payout_id", payoutResponse.has("id") ? payoutResponse.getString("id") : null);
            result.put("transfer_id", payoutResponse.has("id") ? payoutResponse.getString("id") : null); // Same as payout_id
            result.put("status", payoutResponse.has("status") ? payoutResponse.getString("status") : "pending");
            result.put("razorpay_response", payoutResponse.toString());
            
            logger.info("✅ Razorpay payout created - PayoutId: {}, Status: {}", 
                result.get("payout_id"), result.get("status"));
            
            return result;
        } catch (RazorpayException e) {
            logger.error("Failed to create Razorpay payout - FundAccount: {}, Amount: {} paise", 
                fundAccountId, amount, e);
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error creating Razorpay payout - FundAccount: {}, Amount: {}", 
                fundAccountId, amount, e);
            throw new RazorpayException("Failed to create payout: " + e.getMessage());
        }
    }
    
    /**
     * Fetch payout status from Razorpay
     * 
     * @param payoutId Razorpay payout ID
     * @return Map containing payout details and status
     * @throws RazorpayException if payout fetch fails
     */
    public Map<String, Object> getPayoutStatus(String payoutId) throws RazorpayException {
        try {
            logger.info("Fetching payout status for payout ID: {}", payoutId);
            
            // Use Payout class from Razorpay Java SDK
            Payout payout = new Payout(razorpayClient);
            JSONObject payoutResponse = payout.fetch(payoutId);
            
            Map<String, Object> result = new HashMap<>();
            result.put("payout_id", payoutResponse.has("id") ? payoutResponse.getString("id") : null);
            result.put("status", payoutResponse.has("status") ? payoutResponse.getString("status") : "unknown");
            result.put("amount", payoutResponse.has("amount") ? payoutResponse.getLong("amount") : null);
            result.put("currency", payoutResponse.has("currency") ? payoutResponse.getString("currency") : null);
            result.put("failure_reason", payoutResponse.has("failure_reason") ? payoutResponse.getString("failure_reason") : null);
            result.put("razorpay_response", payoutResponse.toString());
            
            logger.info("✅ Payout status fetched - PayoutId: {}, Status: {}", 
                result.get("payout_id"), result.get("status"));
            
            return result;
        } catch (RazorpayException e) {
            logger.error("Failed to fetch payout status: {}", payoutId, e);
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error fetching payout status: {}", payoutId, e);
            throw new RazorpayException("Failed to fetch payout status: " + e.getMessage());
        }
    }
    
    /**
     * Get Razorpay account number from environment or config
     * This should be your Razorpay account number where payments are received
     */
    private String getRazorpayAccountNumber() {
        String accountNumber = System.getenv("RAZORPAY_ACCOUNT_NUMBER");
        if (accountNumber == null || accountNumber.isEmpty()) {
            logger.error("RAZORPAY_ACCOUNT_NUMBER not configured. Payouts will fail.");
            throw new IllegalStateException(
                "RAZORPAY_ACCOUNT_NUMBER environment variable is not set. " +
                "Please configure your Razorpay account number for payouts to work."
            );
        }
        return accountNumber;
    }
}

