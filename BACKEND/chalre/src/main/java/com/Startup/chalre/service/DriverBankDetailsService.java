package com.Startup.chalre.service;

import com.razorpay.RazorpayException;
import com.Startup.chalre.DTO.DriverBankDetailsDTO;
import com.Startup.chalre.entity.DriverBankDetails;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.DriverBankDetailsRepository;
import com.Startup.chalre.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Service for managing driver bank account details
 */
@Service
@RequiredArgsConstructor
public class DriverBankDetailsService {
    
    private static final Logger logger = LoggerFactory.getLogger(DriverBankDetailsService.class);
    
    private final DriverBankDetailsRepository bankDetailsRepository;
    private final UserRepository userRepository;
    private final RazorpayPayoutService razorpayPayoutService;
    private final NotificationService notificationService;
    
    /**
     * Add or update bank details for a driver
     * Creates Razorpay contact and fund account if not exists
     */
    @Transactional
    public DriverBankDetails addOrUpdateBankDetails(Long driverId, DriverBankDetailsDTO dto) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        
        // Validate driver is verified
        if (!Boolean.TRUE.equals(driver.getIsDriverVerified())) {
            throw new RuntimeException("Driver must be verified before adding bank details");
        }
        
        // Validate IFSC format (basic validation)
        if (dto.getIfscCode() == null || !dto.getIfscCode().matches("^[A-Z]{4}0[A-Z0-9]{6}$")) {
            throw new RuntimeException("Invalid IFSC code format. Format: AAAA0XXXXXX");
        }
        
        // Validate account number (should be numeric, 9-18 digits)
        if (dto.getAccountNumber() == null || !dto.getAccountNumber().matches("^[0-9]{9,18}$")) {
            throw new RuntimeException("Invalid account number. Must be 9-18 digits");
        }
        
        DriverBankDetails bankDetails = bankDetailsRepository.findByDriver(driver)
                .orElse(new DriverBankDetails());
        
        boolean isNew = bankDetails.getId() == null;
        
        // Update bank details
        bankDetails.setDriver(driver);
        bankDetails.setAccountHolderName(dto.getAccountHolderName());
        bankDetails.setBankName(dto.getBankName());
        bankDetails.setAccountNumber(dto.getAccountNumber()); // In production, encrypt this
        bankDetails.setIfscCode(dto.getIfscCode());
        
        // If new or contact/fund account not created, create them
        if (isNew || bankDetails.getRazorpayContactId() == null) {
            try {
                // Create Razorpay contact
                String contactId = razorpayPayoutService.createContact(driver);
                bankDetails.setRazorpayContactId(contactId);
                
                // Create Razorpay fund account
                String fundAccountId = razorpayPayoutService.createFundAccount(bankDetails, contactId);
                bankDetails.setRazorpayFundAccountId(fundAccountId);
                
                bankDetails.setVerificationStatus("VERIFIED");
                bankDetails.setVerifiedAt(java.time.LocalDateTime.now());
                
                logger.info("✅ Bank details created and verified for driver: {}", driverId);
            } catch (RazorpayException e) {
                logger.error("Failed to create Razorpay contact/fund account for driver: {}", driverId, e);
                bankDetails.setVerificationStatus("PENDING");
                throw new RuntimeException("Failed to verify bank account with payment gateway: " + e.getMessage());
            }
        } else {
            // If updating existing, mark as pending verification
            bankDetails.setVerificationStatus("PENDING");
        }
        
        DriverBankDetails saved = bankDetailsRepository.save(bankDetails);
        
        // Send notification
        notificationService.sendNotification(
                driver,
                isNew ? "Bank Details Added" : "Bank Details Updated",
                "Your bank account details have been " + (isNew ? "added" : "updated") + ". " +
                "Verification status: " + saved.getVerificationStatus(),
                "BANK_DETAILS_UPDATED",
                java.util.Map.of("bankDetailsId", saved.getId().toString())
        );
        
        return saved;
    }
    
    /**
     * Get bank details for a driver (masked for security)
     */
    public DriverBankDetailsDTO getBankDetails(Long driverId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        
        DriverBankDetails bankDetails = bankDetailsRepository.findByDriver(driver)
                .orElseThrow(() -> new RuntimeException("Bank details not found. Please add bank details first."));
        
        // Return masked account number
        DriverBankDetailsDTO dto = new DriverBankDetailsDTO();
        dto.setAccountHolderName(bankDetails.getAccountHolderName());
        dto.setBankName(bankDetails.getBankName());
        dto.setAccountNumber(maskAccountNumber(bankDetails.getAccountNumber()));
        dto.setIfscCode(bankDetails.getIfscCode());
        
        return dto;
    }
    
    /**
     * Check if driver has bank details
     */
    public boolean hasBankDetails(Long driverId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        return bankDetailsRepository.existsByDriver(driver);
    }
    
    /**
     * Get full bank details entity (for internal use)
     */
    public DriverBankDetails getBankDetailsEntity(Long driverId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        return bankDetailsRepository.findByDriver(driver)
                .orElseThrow(() -> new RuntimeException("Bank details not found"));
    }
    
    /**
     * Mask account number for display (show only last 4 digits)
     */
    private String maskAccountNumber(String accountNumber) {
        if (accountNumber == null || accountNumber.length() <= 4) {
            return "****";
        }
        return "****" + accountNumber.substring(accountNumber.length() - 4);
    }
}

