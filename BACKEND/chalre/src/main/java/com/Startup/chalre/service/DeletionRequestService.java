package com.Startup.chalre.service;

import com.Startup.chalre.DTO.DeletionRequestDTO;
import com.Startup.chalre.entity.DeletionRequest;
import com.Startup.chalre.entity.User;
import com.Startup.chalre.repository.DeletionRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import jakarta.transaction.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DeletionRequestService {

    private final DeletionRequestRepository repository;

    @Transactional
    public DeletionRequestDTO createRequest(User user) {
        if (repository.existsByUserAndStatus(user, "PENDING")) {
            throw new IllegalStateException("A pending deletion request already exists for this user.");
        }
        DeletionRequest request = new DeletionRequest();
        request.setUser(user);
        request.setStatus("PENDING");
        DeletionRequest saved = repository.save(request);
        return mapToDTO(saved);
    }

    public DeletionRequestDTO getLatestRequest(User user) {
        return repository.findTopByUserOrderByCreatedAtDesc(user)
                .map(this::mapToDTO)
                .orElse(null);
    }

    public List<DeletionRequestDTO> getAllRequests() {
        return repository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    @Transactional
    public DeletionRequestDTO markCompleted(Long id) {
        DeletionRequest request = repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Deletion request not found with id: " + id));
        request.setStatus("COMPLETED");
        request.setCompletedAt(LocalDateTime.now());
        DeletionRequest saved = repository.save(request);
        return mapToDTO(saved);
    }

    private DeletionRequestDTO mapToDTO(DeletionRequest request) {
        DeletionRequestDTO dto = new DeletionRequestDTO();
        dto.setId(request.getId());
        if (request.getUser() != null) {
            dto.setUserId(request.getUser().getId());
            dto.setUserName(request.getUser().getName());
            dto.setEmail(request.getUser().getEmail());
            dto.setPhone(request.getUser().getPhone());
        }
        dto.setCreatedAt(request.getCreatedAt());
        dto.setCompletedAt(request.getCompletedAt());
        dto.setStatus(request.getStatus());
        return dto;
    }
}
