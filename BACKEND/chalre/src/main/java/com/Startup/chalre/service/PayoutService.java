package com.Startup.chalre.service;

import com.razorpay.RazorpayException;
import com.Startup.chalre.DTO.PayoutDTO;
import com.Startup.chalre.DTO.PayoutRequestDTO;
import com.Startup.chalre.entity.DriverBankDetails;
import com.Startup.chalre.entity.DriverEarnings;
import com.Startup.chalre.entity.Payout;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.PayoutRepository;
import com.Startup.chalre.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Service for managing driver payouts
 */
@Service
@RequiredArgsConstructor
public class PayoutService {
    
    private static final Logger logger = LoggerFactory.getLogger(PayoutService.class);
    
    private final PayoutRepository payoutRepository;
    private final UserRepository userRepository;
    private final DriverBankDetailsService bankDetailsService;
    private final DriverEarningsService earningsService;
    private final RazorpayPayoutService razorpayPayoutService;
    private final NotificationService notificationService;
    
    /**
     * Initiate a payout for a driver
     * Can be called by driver (self) or admin
     */
    @Transactional
    public Payout initiatePayout(Long driverId, PayoutRequestDTO request, User initiator) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        
        // Check if driver has bank details
        if (!bankDetailsService.hasBankDetails(driverId)) {
            throw new RuntimeException("Driver must add bank details before requesting payout");
        }
        
        DriverBankDetails bankDetails = bankDetailsService.getBankDetailsEntity(driverId);
        
        // Check if bank account is verified
        if (!"VERIFIED".equals(bankDetails.getVerificationStatus())) {
            throw new RuntimeException("Bank account must be verified before payout");
        }
        
        // Get driver earnings
        DriverEarnings earnings = earningsService.getEarningsEntity(driver);
        
        // Determine payout amount
        Long payoutAmount;
        if (request.getAmount() != null && request.getAmount() > 0) {
            payoutAmount = request.getAmount();
        } else {
            // Payout all pending
            payoutAmount = earnings.getPendingPayout();
        }
        
        // Validate amount
        if (payoutAmount <= 0) {
            throw new RuntimeException("Payout amount must be greater than 0");
        }
        
        if (payoutAmount > earnings.getPendingPayout()) {
            throw new RuntimeException("Insufficient pending payout. Available: ₹" + 
                (earnings.getPendingPayout() / 100.0) + ", Requested: ₹" + (payoutAmount / 100.0));
        }
        
        // Minimum payout amount (₹100)
        if (payoutAmount < 10000) { // 10000 paise = ₹100
            throw new RuntimeException("Minimum payout amount is ₹100");
        }
        
        // Create payout record
        Payout payout = new Payout();
        payout.setDriver(driver);
        payout.setAmount(payoutAmount);
        payout.setStatus("PENDING");
        payout.setCurrency("INR");
        payout.setInitiatedBy(initiator.getId().equals(driverId) ? "AUTO" : "MANUAL_" + initiator.getId());
        payout.setNotes(request.getNotes());
        
        payout = payoutRepository.save(payout);
        
        // Process payout with Razorpay
        try {
            Map<String, Object> razorpayResult = razorpayPayoutService.createPayout(
                    bankDetails.getRazorpayFundAccountId(),
                    payoutAmount,
                    "INR",
                    request.getNotes()
            );
            
            payout.setRazorpayPayoutId((String) razorpayResult.get("payout_id"));
            payout.setRazorpayTransferId((String) razorpayResult.get("transfer_id"));
            payout.setStatus((String) razorpayResult.get("status"));
            
            if ("processed".equalsIgnoreCase(payout.getStatus()) || 
                "queued".equalsIgnoreCase(payout.getStatus())) {
                // Update earnings
                earningsService.processPayout(driver, payoutAmount);
                payout.setStatus("PROCESSING");
            }
            
            payout = payoutRepository.save(payout);
            
            // Send notification
            notificationService.sendNotification(
                    driver,
                    "Payout Initiated",
                    "Payout of ₹" + (payoutAmount / 100.0) + " has been initiated. Status: " + payout.getStatus(),
                    "PAYOUT_INITIATED",
                    java.util.Map.of("payoutId", payout.getId().toString())
            );
            
            logger.info("✅ Payout initiated for driver {} - Amount: {} paise, PayoutId: {}", 
                driverId, payoutAmount, payout.getRazorpayPayoutId());
            
        } catch (RazorpayException e) {
            logger.error("Failed to process payout with Razorpay for driver: {}", driverId, e);
            payout.setStatus("FAILED");
            payout.setFailureReason(e.getMessage());
            payout.setFailureCode(e.getErrorCode() != null ? e.getErrorCode() : "RAZORPAY_ERROR");
            payout.setProcessedAt(LocalDateTime.now());
            payout = payoutRepository.save(payout);
            
            throw new RuntimeException("Failed to process payout: " + e.getMessage());
        }
        
        return payout;
    }
    
    /**
     * Get payout history for a driver
     */
    public List<PayoutDTO> getPayoutHistory(Long driverId) {
        List<Payout> payouts = payoutRepository.findByDriver_IdOrderByInitiatedAtDesc(driverId);
        return payouts.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get payout by ID
     */
    public PayoutDTO getPayout(Long payoutId, Long driverId) {
        Payout payout = payoutRepository.findById(payoutId)
                .orElseThrow(() -> new RuntimeException("Payout not found"));
        
        if (!payout.getDriver().getId().equals(driverId)) {
            throw new RuntimeException("Unauthorized: This payout does not belong to you");
        }
        
        return convertToDTO(payout);
    }
    
    /**
     * Update payout status from Razorpay webhook
     */
    @Transactional
    public void updatePayoutStatus(String razorpayPayoutId, String status, String failureReason) {
        Payout payout = payoutRepository.findByRazorpayPayoutId(razorpayPayoutId)
                .orElseThrow(() -> new RuntimeException("Payout not found: " + razorpayPayoutId));
        
        payout.setStatus(status.toUpperCase());
        if (failureReason != null) {
            payout.setFailureReason(failureReason);
        }
        payout.setProcessedAt(LocalDateTime.now());
        
        payoutRepository.save(payout);
        
        // Send notification
        String message = "Payout status updated: " + status;
        if ("SUCCESS".equalsIgnoreCase(status)) {
            message = "Payout of ₹" + (payout.getAmount() / 100.0) + " completed successfully";
        } else if ("FAILED".equalsIgnoreCase(status)) {
            message = "Payout of ₹" + (payout.getAmount() / 100.0) + " failed. Reason: " + failureReason;
        }
        
        notificationService.sendNotification(
                payout.getDriver(),
                "Payout Status Update",
                message,
                "PAYOUT_STATUS_UPDATE",
                java.util.Map.of("payoutId", payout.getId().toString())
        );
        
        logger.info("Updated payout status - PayoutId: {}, Status: {}", razorpayPayoutId, status);
    }
    
    /**
     * Convert Payout entity to DTO
     */
    private PayoutDTO convertToDTO(Payout payout) {
        PayoutDTO dto = new PayoutDTO();
        dto.setId(payout.getId());
        dto.setDriverId(payout.getDriver().getId());
        dto.setDriverName(payout.getDriver().getName());
        dto.setAmount(payout.getAmount());
        dto.setStatus(payout.getStatus());
        dto.setCurrency(payout.getCurrency());
        dto.setRazorpayPayoutId(payout.getRazorpayPayoutId());
        dto.setFailureReason(payout.getFailureReason());
        dto.setFailureCode(payout.getFailureCode());
        dto.setInitiatedAt(payout.getInitiatedAt());
        dto.setProcessedAt(payout.getProcessedAt());
        dto.setInitiatedBy(payout.getInitiatedBy());
        dto.setNotes(payout.getNotes());
        return dto;
    }
}

