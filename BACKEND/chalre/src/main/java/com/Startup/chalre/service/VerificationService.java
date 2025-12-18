package com.Startup.chalre.service;

import com.Startup.chalre.entity.User;
import com.Startup.chalre.entity.VerificationDoc;
import com.Startup.chalre.repository.UserRepository;
import com.Startup.chalre.repository.VerificationDocRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationDocRepository docRepo;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Transactional
    public void submitVerification(User user, List<String> urls, List<String> types) {

        if (urls == null || types == null || urls.size() != types.size())
            throw new RuntimeException("Invalid verification request");

        // Delete old docs
        List<VerificationDoc> oldDocs = docRepo.findByUser(user);
        docRepo.deleteAll(oldDocs);

        // Save new docs
        for (int i = 0; i < urls.size(); i++) {
            VerificationDoc doc = new VerificationDoc();
            doc.setUser(user);
            doc.setUrl(urls.get(i));
            doc.setDocType(types.get(i));
            doc.setUploadedAt(LocalDateTime.now());
            docRepo.save(doc);
        }

        user.setVerificationStatus("PENDING");
        user.setIsDriverVerified(false);
        user.setVerificationRemarks(null);
        userRepository.save(user);

        // 🔔 Notification to user
        notificationService.sendNotification(
                user,
                "Verification Submitted",
                "Your verification documents were submitted. Admin will review shortly.",
                "VERIFICATION_SUBMITTED",
                Map.of("userId", user.getId().toString())
        );
    }

    @Transactional
    public void adminReview(Long userId, boolean approve, String remarks) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (approve) {
            user.setIsDriverVerified(true);
            user.setVerificationStatus("APPROVED");

            // 🔔 Approved notification
            notificationService.sendNotification(
                    user,
                    "Verification Approved",
                    "Congratulations! Your driver verification has been approved.",
                    "VERIFICATION_APPROVED",
                    Map.of("userId", userId.toString())
            );

        } else {
            user.setIsDriverVerified(false);
            user.setVerificationStatus("REJECTED");
            user.setVerificationRemarks(remarks);

            // 🔔 Rejected notification
            notificationService.sendNotification(
                    user,
                    "Verification Rejected",
                    "Your verification was rejected. Reason: " + (remarks != null ? remarks : "No remarks provided."),
                    "VERIFICATION_REJECTED",
                    Map.of("userId", userId.toString())
            );
        }

        userRepository.save(user);
    }
}
