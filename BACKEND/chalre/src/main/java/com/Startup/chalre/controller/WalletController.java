package com.Startup.chalre.controller;

import com.Startup.chalre.DTO.TopupDTO;
import com.Startup.chalre.entity.PaymentRecord;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.entity.Wallet;
import com.Startup.chalre.service.WalletService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {
    private final WalletService walletService;

    @PostMapping("/topup")
    public ResponseEntity<?> topup(@RequestBody TopupDTO dto,
                                   @AuthenticationPrincipal User user) {
        PaymentRecord p = walletService.createTopUp(user.getId(), dto.getAmountPaise(), dto.getIdempotencyKey(), dto.getProvider());
        // In real integration, return gateway order info; here we return the record for testing
        return ResponseEntity.ok(p);
    }

    @GetMapping("/transactions")
    public ResponseEntity<?> getTransactions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(walletService.getUserTransactions(user.getId()));
    }


    // Simulated webhook - In prod this must be protected and verify provider signature
    @PostMapping("/webhook/simulate")
    public ResponseEntity<?> simulateWebhook(@RequestParam String idempotencyKey,
                                             @RequestParam String providerPaymentId,
                                             @RequestParam boolean success) {
        walletService.handleGatewayCallback(idempotencyKey, providerPaymentId, success);
        return ResponseEntity.ok("ok");
    }

    @GetMapping
    public ResponseEntity<?> getWallet(@AuthenticationPrincipal User user) {
        Wallet w = walletService.getWallet(user.getId());
        return ResponseEntity.ok(w);
    }
}
