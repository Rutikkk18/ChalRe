package com.Startup.chalre.service;

import com.Startup.chalre.entity.User;
import com.Startup.chalre.entity.VerificationDoc;
import com.Startup.chalre.repository.UserRepository;
import com.Startup.chalre.repository.VerificationDocRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationDocRepository docRepo;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    private static final String UPLOAD_DIR = "uploads/verification/";

    @Transactional
    public void submitVerification(
            User user,
            List<MultipartFile> files,
            List<String> types) {

        if (files == null || types == null || files.size() != types.size()) {
            throw new RuntimeException("Invalid verification request");
        }

        // 🔥 Delete old documents
        List<VerificationDoc> oldDocs = docRepo.findByUser(user);
        docRepo.deleteAll(oldDocs);

        try {
            Files.createDirectories(Paths.get(UPLOAD_DIR));
        } catch (IOException e) {
            throw new RuntimeException("Could not create upload directory");
        }

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);

            if (file.isEmpty()) {
                throw new RuntimeException("Uploaded file is empty");
            }

            // Basic validation
            if (!file.getContentType().startsWith("image/")
                    && !file.getContentType().equals("application/pdf")) {
                throw new RuntimeException("Invalid file type");
            }

            String fileName = System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(UPLOAD_DIR).resolve(fileName);

            try {
                Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                throw new RuntimeException("Failed to store verification file");
            }

            VerificationDoc doc = new VerificationDoc();
            doc.setUser(user);
            doc.setDocType(types.get(i));
            doc.setUrl("/uploads/verification/" + fileName);
            doc.setUploadedAt(LocalDateTime.now());

            docRepo.save(doc);
        }

        // 🔄 Update user status
        user.setVerificationStatus("PENDING");
        user.setIsDriverVerified(false);
        user.setVerificationRemarks(null);
        userRepository.save(user);

        // 🔔 Notify user
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

            notificationService.sendNotification(
                    user,
                    "Verification Rejected",
                    "Your verification was rejected. Reason: " +
                            (remarks != null ? remarks : "No remarks provided."),
                    "VERIFICATION_REJECTED",
                    Map.of("userId", userId.toString())
            );
        }

        userRepository.save(user);
    }
}
