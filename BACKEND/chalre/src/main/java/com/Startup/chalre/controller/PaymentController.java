package com.Startup.chalre.controller;

import com.Startup.chalre.service.PaymentService;
import com.Startup.chalre.service.WalletService;
import com.Startup.chalre.repository.PaymentRecordRepository;
import com.Startup.chalre.entity.PaymentRecord;
import com.Startup.chalre.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/payment")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentRecordRepository paymentRecordRepository;
    private final WalletService walletService;

    // ------------------------------
    // CREATE RAZORPAY ORDER
    // ------------------------------
    @PostMapping("/create-order")
    public ResponseEntity<?> createOrder(
            @RequestBody Map<String, Object> request,
            @AuthenticationPrincipal User user
    ) {
        try {
            Long topupId = Long.valueOf(request.get("topupId").toString());

            Optional<PaymentRecord> maybe = paymentRecordRepository.findById(topupId);
            if (maybe.isEmpty())
                return ResponseEntity.badRequest().body("PaymentRecord not found");

            PaymentRecord paymentRecord = maybe.get();

            if (!paymentRecord.getUser().getId().equals(user.getId()))
                return ResponseEntity.status(403).body("PaymentRecord does not belong to user");

            Map<String, Object> resp = paymentService.createOrderForTopup(paymentRecord);
            return ResponseEntity.ok(resp);

        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    // ------------------------------
    // VERIFY PAYMENT
    // ------------------------------
    @PostMapping("/verify")
    public ResponseEntity<?> verifyPayment(@RequestBody Map<String, Object> body) {
        try {
            Long topupId = Long.valueOf(body.get("topupId").toString());
            String razorpayOrderId = body.get("razorpayOrderId").toString();
            String razorpayPaymentId = body.get("razorpayPaymentId").toString();
            String razorpaySignature = body.get("razorpaySignature").toString();

            boolean valid = paymentService.verifyPayment(
                    razorpayOrderId,
                    razorpayPaymentId,
                    razorpaySignature
            );

            if (!valid) {
                return ResponseEntity.ok(Map.of("verified", false));
            }

            Optional<PaymentRecord> maybe = paymentRecordRepository.findById(topupId);
            if (maybe.isEmpty()) {
                return ResponseEntity.badRequest().body("PaymentRecord not found");
            }

            PaymentRecord payment = maybe.get();

            // If already processed, skip
            if (!"CREATED".equals(payment.getStatus())) {
                return ResponseEntity.ok(Map.of("verified", true, "alreadyProcessed", true));
            }

            // Auto-credit wallet
            walletService.handleGatewayCallback(
                    payment.getIdempotencyKey(),
                    razorpayPaymentId,
                    true
            );

            return ResponseEntity.ok(Map.of("verified", true, "processed", true));

        } catch (Exception e) {
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }
}
