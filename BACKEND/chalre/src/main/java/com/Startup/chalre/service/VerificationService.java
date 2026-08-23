package com.Startup.chalre.service;

import com.Startup.chalre.entity.User;
import com.Startup.chalre.entity.VerificationDoc;
import com.Startup.chalre.repository.UserRepository;
import com.Startup.chalre.repository.VerificationDocRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class VerificationService {

    private final VerificationDocRepository docRepo;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final CloudinaryService cloudinaryService;

    @Transactional
    public void submitVerification(
            User user,
            List<MultipartFile> files,
            List<String> types) {

        if (files == null || types == null || files.size() != types.size()) {
            throw new RuntimeException("Invalid verification request");
        }

        if (files.isEmpty()) {
            throw new RuntimeException("At least one document is required");
        }

        if (files.size() > 5) {
            throw new RuntimeException("Maximum 5 documents allowed per verification submission");
        }

        // Allowed document types supported by the application
        java.util.Set<String> allowedDocTypes = java.util.Set.of("ID_CARD", "LICENSE", "PROFILE_PHOTO", "OTHER");

        // 🔥 Delete old documents
        List<VerificationDoc> oldDocs = docRepo.findByUser(user);
        docRepo.deleteAll(oldDocs);


        // Cloudinary upload directory (folder name in Cloudinary)
        String cloudinaryFolder = "chalre/verification";

        for (int i = 0; i < files.size(); i++) {
            MultipartFile file = files.get(i);
            String docType = types.get(i);

            if (docType == null || !allowedDocTypes.contains(docType.toUpperCase())) {
                throw new RuntimeException("Invalid document type: " + docType);
            }

            if (file == null || file.isEmpty()) {
                throw new RuntimeException("Uploaded file is empty");
            }

            // MIME type validation
            String contentType = file.getContentType();
            if (contentType == null || (!contentType.equalsIgnoreCase("image/jpeg")
                    && !contentType.equalsIgnoreCase("image/png")
                    && !contentType.equalsIgnoreCase("image/webp")
                    && !contentType.equalsIgnoreCase("application/pdf"))) {
                throw new RuntimeException("Invalid file type. Allowed formats: JPEG, PNG, WebP, PDF.");
            }

            // Upload to Cloudinary
            String secureUrl = cloudinaryService.uploadFile(file, cloudinaryFolder);

            VerificationDoc doc = new VerificationDoc();
            doc.setUser(user);
            doc.setDocType(types.get(i));
            doc.setUrl(secureUrl); // Store Cloudinary URL
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
