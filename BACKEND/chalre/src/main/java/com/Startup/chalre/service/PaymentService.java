package com.Startup.chalre.service;

import com.Startup.chalre.entity.PaymentRecord;
import com.Startup.chalre.entity.SignatureUtil;
import com.Startup.chalre.repository.PaymentRecordRepository;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import lombok.RequiredArgsConstructor;
import org.json.JSONObject;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class PaymentService {

    private final RazorpayClient razorpayClient;
    private final String razorpaySecret;
    private final PaymentRecordRepository paymentRecordRepository;
    private final NotificationService notificationService;

    /**
     * Create Razorpay Order for Wallet Top-up
     */
    public Map<String, Object> createOrderForTopup(PaymentRecord record) throws Exception {

        // Create Razorpay Order
        JSONObject orderRequest = new JSONObject();
        orderRequest.put("amount", record.getAmount());
        orderRequest.put("currency", "INR");
        orderRequest.put("receipt", "payrec_" + record.getId());

        Order order = razorpayClient.orders.create(orderRequest);

        // Save orderId
        String providerOrderId = order.get("id");
        record.setProviderOrderId(providerOrderId);
        record.setStatus("CREATED");
        paymentRecordRepository.save(record);

        // Notification
        notificationService.sendNotification(
                record.getUser(),
                "Top-up Initiated",
                "Your top-up request is created.",
                "TOPUP_ORDER_GENERATED",
                Map.of("paymentRecordId", record.getId().toString())
        );

        // Return to frontend
        Map<String, Object> response = new HashMap<>();
        response.put("orderId", providerOrderId);
        response.put("amount", record.getAmount());
        response.put("currency", "INR");
        response.put("paymentRecordId", record.getId());
        response.put("idempotencyKey", record.getIdempotencyKey());

        return response;
    }

    /**
     * Verify Razorpay Signature
     */
    public boolean verifyPayment(String orderId, String paymentId, String signature) throws Exception {

        String data = orderId + "|" + paymentId;
        String generated = SignatureUtil.hmacSHA256(data, razorpaySecret);

        return generated.equals(signature);
    }

    /**
     * Mark payment as SUCCESS or FAILED (used by WalletService)
     */
    public void updatePaymentStatus(PaymentRecord p, boolean success, String paymentId) {

        p.setProviderPaymentId(paymentId);
        p.setCompletedAt(LocalDateTime.now());

        if (success) {
            p.setStatus("SUCCESS");
        } else {
            p.setStatus("FAILED");
        }

        paymentRecordRepository.save(p);

        // Notification
        notificationService.sendNotification(
                p.getUser(),
                "Wallet Top-up " + (success ? "Successful" : "Failed"),
                success ? "Money added to your wallet." : "Payment failed.",
                success ? "TOPUP_SUCCESS" : "TOPUP_FAILED",
                Map.of("paymentRecordId", p.getId().toString())
        );
    }
}
