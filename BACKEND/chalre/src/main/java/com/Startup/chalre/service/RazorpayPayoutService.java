package com.Startup.chalre.service;

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
 */
@Service
public class RazorpayPayoutService {
    
    private static final Logger logger = LoggerFactory.getLogger(RazorpayPayoutService.class);
    
    private final RazorpayClient razorpayClient;
    private final String razorpaySecret;
    
    public RazorpayPayoutService(
            RazorpayClient razorpayClient,
            @Qualifier("razorpaySecret") String razorpaySecret) {
        this.razorpayClient = razorpayClient;
        this.razorpaySecret = razorpaySecret;
    }
    
    /**
     * Create a Razorpay contact for the driver
     * Contact is required before creating fund accounts
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
            
            JSONObject contact = razorpayClient.contacts.create(contactRequest);
            String contactId = contact.getString("id");
            
            logger.info("✅ Razorpay contact created: {}", contactId);
            return contactId;
        } catch (RazorpayException e) {
            logger.error("Failed to create Razorpay contact for driver: {}", driver.getId(), e);
            throw e;
        }
    }
    
    /**
     * Create a Razorpay fund account linked to driver's bank account
     * Fund account is required for transfers/payouts
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
            
            JSONObject fundAccount = razorpayClient.fundAccounts.create(fundAccountRequest);
            String fundAccountId = fundAccount.getString("id");
            
            logger.info("✅ Razorpay fund account created: {}", fundAccountId);
            return fundAccountId;
        } catch (RazorpayException e) {
            logger.error("Failed to create Razorpay fund account for driver: {}", 
                bankDetails.getDriver().getId(), e);
            throw e;
        }
    }
    
    /**
     * Create a payout/transfer to driver's bank account
     * @param fundAccountId Razorpay fund account ID
     * @param amount Amount in paise
     * @param currency Currency (default: INR)
     * @param notes Optional notes
     * @return Map containing payout_id, transfer_id, and status
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
            
            logger.info("Creating Razorpay payout - FundAccount: {}, Amount: {} paise", fundAccountId, amount);
            
            JSONObject payout = razorpayClient.payouts.create(payoutRequest);
            
            Map<String, Object> result = new HashMap<>();
            result.put("payout_id", payout.has("id") ? payout.getString("id") : null);
            result.put("transfer_id", payout.has("id") ? payout.getString("id") : null); // Same as payout_id
            result.put("status", payout.has("status") ? payout.getString("status") : "pending");
            result.put("razorpay_response", payout.toString());
            
            logger.info("✅ Razorpay payout created - PayoutId: {}, Status: {}", 
                result.get("payout_id"), result.get("status"));
            
            return result;
        } catch (RazorpayException e) {
            logger.error("Failed to create Razorpay payout - FundAccount: {}, Amount: {}", 
                fundAccountId, amount, e);
            throw e;
        }
    }
    
    /**
     * Fetch payout status from Razorpay
     */
    public Map<String, Object> getPayoutStatus(String payoutId) throws RazorpayException {
        try {
            JSONObject payout = razorpayClient.payouts.fetch(payoutId);
            
            Map<String, Object> result = new HashMap<>();
            result.put("payout_id", payout.has("id") ? payout.getString("id") : null);
            result.put("status", payout.has("status") ? payout.getString("status") : "unknown");
            result.put("amount", payout.has("amount") ? payout.getLong("amount") : null);
            result.put("currency", payout.has("currency") ? payout.getString("currency") : null);
            result.put("failure_reason", payout.has("failure_reason") ? payout.getString("failure_reason") : null);
            result.put("razorpay_response", payout.toString());
            
            return result;
        } catch (RazorpayException e) {
            logger.error("Failed to fetch payout status: {}", payoutId, e);
            throw e;
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

