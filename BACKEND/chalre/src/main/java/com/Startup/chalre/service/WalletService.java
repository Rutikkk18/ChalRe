package com.Startup.chalre.service;

import com.Startup.chalre.entity.PaymentRecord;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.entity.Wallet;
import com.Startup.chalre.repository.PaymentRecordRepository;
import com.Startup.chalre.repository.UserRepository;
import com.Startup.chalre.repository.WalletRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class WalletService {

    private final WalletRepository walletRepository;
    private final PaymentRecordRepository paymentRecordRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    /**
     * Step 1: User creates top-up request
     */
    @Transactional
    public PaymentRecord createTopUp(Long userId, Long amountPaise, String idempotencyKey, String provider) {

        if (paymentRecordRepository.findByIdempotencyKey(idempotencyKey).isPresent()) {
            throw new RuntimeException("Duplicate request");
        }

        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));

        PaymentRecord p = new PaymentRecord();
        p.setUser(user);
        p.setAmount(amountPaise);
        p.setCurrency("INR");
        p.setProvider(provider == null ? "SIM" : provider);
        p.setStatus("CREATED");
        p.setCreatedAt(LocalDateTime.now());
        p.setIdempotencyKey(idempotencyKey);

        PaymentRecord saved = paymentRecordRepository.save(p);

        // 🔔 Notification: Top-up Created
        notificationService.sendNotification(
                user,
                "Top-up Created",
                "Your top-up request is created.",
                "TOPUP_CREATED",
                Map.of("paymentRecordId", saved.getId().toString())
        );

        return saved;
    }

    /**
     * Step 2: Provider callback webhook
     */
    @Transactional
    public void handleGatewayCallback(String idempotencyKey, String providerPaymentId, boolean success) {

        PaymentRecord payment = paymentRecordRepository.findByIdempotencyKey(idempotencyKey)
                .orElseThrow(() -> new RuntimeException("Payment not found"));

        if (!"CREATED".equals(payment.getStatus())) return;

        payment.setProviderPaymentId(providerPaymentId);
        payment.setCompletedAt(LocalDateTime.now());
        payment.setStatus(success ? "SUCCESS" : "FAILED");
        paymentRecordRepository.save(payment);

        User user = payment.getUser();

        if (!success) {
            // 🔔 Notification: Payment Failed
            notificationService.sendNotification(
                    user,
                    "Payment Failed",
                    "Your payment was not successful.",
                    "PAYMENT_FAILED",
                    Map.of("paymentRecordId", payment.getId().toString())
            );
            return;
        }

        // Add to wallet
        Wallet w = walletRepository.findByIdForUpdate(user.getId()).orElseGet(() -> {
            Wallet nw = new Wallet();
            nw.setUser(user);
            nw.setBalance(0L);
            return nw;
        });

        w.setBalance(w.getBalance() + payment.getAmount());
        walletRepository.save(w);

        // 🔔 Notification: Payment Success
        notificationService.sendNotification(
                user,
                "Payment Successful",
                "Your payment was successful.",
                "PAYMENT_SUCCESS",
                Map.of("paymentRecordId", payment.getId().toString())
        );

        // 🔔 Notification: Wallet Credited
        notificationService.sendNotification(
                user,
                "Wallet Updated",
                "Amount added to your wallet.",
                "WALLET_CREDIT",
                Map.of("amount", payment.getAmount().toString())
        );
    }

    /**
     * Debit wallet (for booking)
     */
    @Transactional
    public void debitForBooking(Long userId, Long amountPaise) {

        Wallet w = walletRepository.findByIdForUpdate(userId)
                .orElseThrow(() -> new RuntimeException("Wallet not found"));

        if (w.getBalance() < amountPaise)
            throw new RuntimeException("Insufficient wallet balance");

        w.setBalance(w.getBalance() - amountPaise);
        walletRepository.save(w);

        // 🔔 Notification: Wallet Debited
        notificationService.sendNotification(
                w.getUser(),
                "Wallet Debited",
                "Amount deducted for booking.",
                "WALLET_DEBIT",
                Map.of("amount", amountPaise.toString())
        );
    }

    public Wallet getWallet(Long userId) {
        return walletRepository.findById(userId).orElseGet(() -> {
            Wallet w = new Wallet();
            w.setUser(userRepository.findById(userId).orElseThrow());
            w.setBalance(0L);
            return w;
        });
    }

    /**
     * Credit wallet (for booking cancellation refund)
     */
    @Transactional
    public void creditForCancellation(Long userId, Long amountPaise) {
        Wallet w = walletRepository.findByIdForUpdate(userId)
                .orElseGet(() -> {
                    Wallet nw = new Wallet();
                    nw.setUser(userRepository.findById(userId).orElseThrow());
                    nw.setBalance(0L);
                    return nw;
                });

        w.setBalance(w.getBalance() + amountPaise);
        walletRepository.save(w);

        // 🔔 Notification: Wallet Credited (Refund)
        notificationService.sendNotification(
                w.getUser(),
                "Refund Processed",
                "Amount refunded to your wallet for cancelled booking.",
                "WALLET_CREDIT",
                Map.of("amount", amountPaise.toString())
        );
    }

    public List<Map<String, Object>> getUserTransactions(Long userId) {
        List<PaymentRecord> list = paymentRecordRepository
                .getByUser(userId);

        return list.stream().map(p -> {
            Map<String, Object> map = new HashMap<>();
            map.put("id", p.getId());
            map.put("amount", p.getAmount() / 100);
            map.put("type", p.getStatus().equals("SUCCESS") ? "CREDIT" : "FAILED");
            map.put("date", p.getCreatedAt().toString());
            return map;
        }).toList();

    }

}
