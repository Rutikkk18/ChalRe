package com.Startup.chalre.service;



import com.Startup.chalre.DTO.VerificationDetailDTO;
import com.Startup.chalre.DTO.VerificationListDTO;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.entity.VerificationDoc;
import com.Startup.chalre.repository.UserRepository;
import com.Startup.chalre.repository.VerificationDocRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AdminVerificationService {

    private final UserRepository userRepository;
    private final VerificationDocRepository docRepo;

    // ▬▬▬ 1. Get all users matching status ▬▬▬
    public List<VerificationListDTO> getVerificationsByStatus(String status) {
        List<User> users = userRepository.findByVerificationStatus(status);

        return users.stream().map(user -> {
            List<VerificationDoc> docs = docRepo.findByUser(user);

            return new VerificationListDTO(
                    user.getId(),
                    user.getName(),
                    user.getEmail(),
                    user.getPhone(),
                    user.getVerificationStatus(),
                    docs.size(),
                    docs.isEmpty() ? null : docs.get(0).getUploadedAt()
            );
        }).collect(Collectors.toList());
    }

    // ▬▬▬ 2. Get full details for one user ▬▬▬
    public VerificationDetailDTO getVerificationDetails(Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<VerificationDoc> docs = docRepo.findByUser(user);

        return new VerificationDetailDTO(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getPhone(),
                user.getVerificationStatus(),
                user.getVerificationRemarks(),
                docs.stream().map(doc ->
                        new VerificationDetailDTO.DocumentDTO(
                                doc.getDocType(),
                                doc.getUrl(),
                                doc.getUploadedAt()
                        )
                ).collect(Collectors.toList())
        );
    }
}
