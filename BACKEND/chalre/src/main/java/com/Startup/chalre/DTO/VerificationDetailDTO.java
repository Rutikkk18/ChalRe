package com.Startup.chalre.DTO;


import lombok.AllArgsConstructor;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
public class VerificationDetailDTO {

    private Long userId;
    private String name;
    private String email;
    private String phone;
    private String status;
    private String remarks;

    private List<DocumentDTO> documents;

    @Data
    @AllArgsConstructor
    public static class DocumentDTO {
        private String docType;
        private String url;
        private LocalDateTime uploadedAt;
    }
}
