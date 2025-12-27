package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.DriverBankDetailsDTO;
import com.Startup.chalre.DTO.DriverEarningsDTO;
import com.Startup.chalre.DTO.PayoutDTO;
import com.Startup.chalre.DTO.PayoutRequestDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.service.DriverBankDetailsService;
import com.Startup.chalre.service.DriverEarningsService;
import com.Startup.chalre.service.PayoutService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller for driver payout operations
 * Handles bank details, earnings, and payout requests
 */
@RestController
@RequestMapping("/api/payouts")
@RequiredArgsConstructor
public class PayoutController {
    
    private static final Logger logger = LoggerFactory.getLogger(PayoutController.class);
    
    private final DriverBankDetailsService bankDetailsService;
    private final DriverEarningsService earningsService;
    private final PayoutService payoutService;
    
    // ==================== BANK DETAILS ====================
    
    /**
     * Add or update bank details for authenticated driver
     * POST /api/payouts/bank-details
     */
    @PostMapping("/bank-details")
    public ResponseEntity<?> addOrUpdateBankDetails(
            @RequestBody DriverBankDetailsDTO dto,
            @AuthenticationPrincipal User user) {
        try {
            // Validate driver is verified
            if (!Boolean.TRUE.equals(user.getIsDriverVerified())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Driver must be verified before adding bank details"));
            }
            
            bankDetailsService.addOrUpdateBankDetails(user.getId(), dto);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Bank details added/updated successfully");
            response.put("status", "success");
            
            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            logger.error("Error adding/updating bank details", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Internal error adding/updating bank details", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    /**
     * Get bank details for authenticated driver (masked)
     * GET /api/payouts/bank-details
     */
    @GetMapping("/bank-details")
    public ResponseEntity<?> getBankDetails(@AuthenticationPrincipal User user) {
        try {
            DriverBankDetailsDTO dto = bankDetailsService.getBankDetails(user.getId());
            return ResponseEntity.ok(dto);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error fetching bank details", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    /**
     * Check if driver has bank details
     * GET /api/payouts/bank-details/check
     */
    @GetMapping("/bank-details/check")
    public ResponseEntity<?> checkBankDetails(@AuthenticationPrincipal User user) {
        try {
            boolean hasBankDetails = bankDetailsService.hasBankDetails(user.getId());
            return ResponseEntity.ok(Map.of("hasBankDetails", hasBankDetails));
        } catch (Exception e) {
            logger.error("Error checking bank details", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    // ==================== EARNINGS ====================
    
    /**
     * Get earnings for authenticated driver
     * GET /api/payouts/earnings
     */
    @GetMapping("/earnings")
    public ResponseEntity<?> getEarnings(@AuthenticationPrincipal User user) {
        try {
            DriverEarningsDTO earnings = earningsService.getEarnings(user.getId());
            return ResponseEntity.ok(earnings);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error fetching earnings", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    // ==================== PAYOUTS ====================
    
    /**
     * Initiate a payout for authenticated driver
     * POST /api/payouts/initiate
     */
    @PostMapping("/initiate")
    public ResponseEntity<?> initiatePayout(
            @RequestBody(required = false) PayoutRequestDTO request,
            @AuthenticationPrincipal User user) {
        try {
            // Validate driver is verified
            if (!Boolean.TRUE.equals(user.getIsDriverVerified())) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Driver must be verified before requesting payout"));
            }
            
            if (request == null) {
                request = new PayoutRequestDTO();
            }
            
            // Ensure driverId matches authenticated user (for security)
            request.setDriverId(user.getId());
            
            Payout payout = payoutService.initiatePayout(user.getId(), request, user);
            PayoutDTO payoutDTO = payoutService.getPayout(payout.getId(), user.getId());
            
            return ResponseEntity.ok(payoutDTO);
        } catch (RuntimeException e) {
            logger.error("Error initiating payout", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Internal error initiating payout", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    /**
     * Get payout history for authenticated driver
     * GET /api/payouts/history
     */
    @GetMapping("/history")
    public ResponseEntity<?> getPayoutHistory(@AuthenticationPrincipal User user) {
        try {
            List<PayoutDTO> payouts = payoutService.getPayoutHistory(user.getId());
            return ResponseEntity.ok(payouts);
        } catch (Exception e) {
            logger.error("Error fetching payout history", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    /**
     * Get specific payout by ID
     * GET /api/payouts/{payoutId}
     */
    @GetMapping("/{payoutId}")
    public ResponseEntity<?> getPayout(
            @PathVariable Long payoutId,
            @AuthenticationPrincipal User user) {
        try {
            PayoutDTO payout = payoutService.getPayout(payoutId, user.getId());
            return ResponseEntity.ok(payout);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Error fetching payout", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    // ==================== ADMIN ENDPOINTS (Optional) ====================
    
    /**
     * Admin endpoint: Initiate payout for any driver
     * POST /api/payouts/admin/initiate
     * Note: Add @PreAuthorize("hasRole('ADMIN')") if you have admin role setup
     */
    @PostMapping("/admin/initiate")
    public ResponseEntity<?> adminInitiatePayout(
            @RequestBody PayoutRequestDTO request,
            @AuthenticationPrincipal User admin) {
        try {
            if (request.getDriverId() == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "driverId is required"));
            }
            
            Payout payout = payoutService.initiatePayout(request.getDriverId(), request, admin);
            PayoutDTO payoutDTO = payoutService.getPayout(payout.getId(), request.getDriverId());
            
            return ResponseEntity.ok(payoutDTO);
        } catch (RuntimeException e) {
            logger.error("Error initiating payout (admin)", e);
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            logger.error("Internal error initiating payout (admin)", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
    
    /**
     * Webhook endpoint for Razorpay payout status updates
     * POST /api/payouts/webhook
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> payoutWebhook(@RequestBody Map<String, Object> webhookData) {
        try {
            // Extract payout information from webhook
            Map<String, Object> payload = (Map<String, Object>) webhookData.get("payload");
            if (payload == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid webhook payload"));
            }
            
            Map<String, Object> payout = (Map<String, Object>) payload.get("payout");
            if (payout == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Payout data not found"));
            }
            
            String payoutId = (String) payout.get("id");
            String status = (String) payout.get("status");
            String failureReason = payout.containsKey("failure_reason") 
                    ? (String) payout.get("failure_reason") 
                    : null;
            
            // Update payout status
            payoutService.updatePayoutStatus(payoutId, status, failureReason);
            
            return ResponseEntity.ok(Map.of("status", "success"));
        } catch (Exception e) {
            logger.error("Error processing payout webhook", e);
            return ResponseEntity.status(500).body(Map.of("error", "Internal server error"));
        }
    }
}

