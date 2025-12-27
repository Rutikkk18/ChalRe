package com.Startup.chalre.service;

import com.Startup.chalre.DTO.DriverEarningsDTO;
import com.Startup.chalre.entity.DriverEarnings;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.DriverEarningsRepository;
import com.Startup.chalre.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Service for managing driver earnings
 */
@Service
@RequiredArgsConstructor
public class DriverEarningsService {
    
    private static final Logger logger = LoggerFactory.getLogger(DriverEarningsService.class);
    
    private final DriverEarningsRepository earningsRepository;
    private final UserRepository userRepository;
    
    private static final Double DEFAULT_COMMISSION_PERCENTAGE = 10.0; // 10% platform commission
    
    /**
     * Get or create earnings record for a driver
     */
    @Transactional
    public DriverEarnings getOrCreateEarnings(User driver) {
        return earningsRepository.findByDriver(driver)
                .orElseGet(() -> {
                    DriverEarnings earnings = new DriverEarnings();
                    earnings.setDriver(driver);
                    earnings.setTotalEarnings(0L);
                    earnings.setPendingPayout(0L);
                    earnings.setPaidAmount(0L);
                    earnings.setPlatformCommission(0L);
                    earnings.setCommissionPercentage(DEFAULT_COMMISSION_PERCENTAGE);
                    return earningsRepository.save(earnings);
                });
    }
    
    /**
     * Add earnings from a successful booking payment
     * Calculates platform commission and updates driver earnings
     */
    @Transactional
    public void addEarnings(User driver, Long paymentAmountPaise) {
        DriverEarnings earnings = getOrCreateEarnings(driver);
        
        // Calculate platform commission
        Double commissionPercentage = earnings.getCommissionPercentage() != null 
                ? earnings.getCommissionPercentage() 
                : DEFAULT_COMMISSION_PERCENTAGE;
        
        Long commissionAmount = (long) (paymentAmountPaise * commissionPercentage / 100.0);
        Long driverEarningsAmount = paymentAmountPaise - commissionAmount;
        
        // Update earnings
        earnings.setTotalEarnings(earnings.getTotalEarnings() + paymentAmountPaise);
        earnings.setPendingPayout(earnings.getPendingPayout() + driverEarningsAmount);
        earnings.setPlatformCommission(earnings.getPlatformCommission() + commissionAmount);
        
        earningsRepository.save(earnings);
        
        logger.info("Added earnings for driver {} - Payment: {} paise, Driver Earnings: {} paise, Commission: {} paise",
                driver.getId(), paymentAmountPaise, driverEarningsAmount, commissionAmount);
    }
    
    /**
     * Update earnings when payout is processed
     * Moves amount from pending to paid
     */
    @Transactional
    public void processPayout(User driver, Long payoutAmountPaise) {
        DriverEarnings earnings = getOrCreateEarnings(driver);
        
        if (earnings.getPendingPayout() < payoutAmountPaise) {
            throw new RuntimeException("Insufficient pending payout. Available: " + 
                earnings.getPendingPayout() + " paise, Requested: " + payoutAmountPaise + " paise");
        }
        
        earnings.setPendingPayout(earnings.getPendingPayout() - payoutAmountPaise);
        earnings.setPaidAmount(earnings.getPaidAmount() + payoutAmountPaise);
        
        earningsRepository.save(earnings);
        
        logger.info("Processed payout for driver {} - Amount: {} paise", driver.getId(), payoutAmountPaise);
    }
    
    /**
     * Get earnings DTO for a driver
     */
    public DriverEarningsDTO getEarnings(Long driverId) {
        User driver = userRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found"));
        
        DriverEarnings earnings = getOrCreateEarnings(driver);
        
        DriverEarningsDTO dto = new DriverEarningsDTO();
        dto.setTotalEarnings(earnings.getTotalEarnings());
        dto.setPendingPayout(earnings.getPendingPayout());
        dto.setPaidAmount(earnings.getPaidAmount());
        dto.setPlatformCommission(earnings.getPlatformCommission());
        dto.setCommissionPercentage(earnings.getCommissionPercentage());
        
        return dto;
    }
    
    /**
     * Get earnings entity (for internal use)
     */
    public DriverEarnings getEarningsEntity(User driver) {
        return getOrCreateEarnings(driver);
    }
}

