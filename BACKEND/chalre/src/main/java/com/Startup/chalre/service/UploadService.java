package com.Startup.chalre.service;

import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

@Service
public class UploadService {

    private static final String UPLOAD_DIR = "uploads/profile/";

    public String uploadProfileImage(MultipartFile file) throws IOException {

        // Ensure directory exists
        Path uploadPath = Paths.get(UPLOAD_DIR);
        if (!Files.exists(uploadPath)) {
            Files.createDirectories(uploadPath);
        }

        // Clean filename
        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = "";

        if (originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }

        // Generate unique filename
        String newFileName = UUID.randomUUID() + fileExtension;

        // Save file
        Path filePath = uploadPath.resolve(newFileName);
        Files.copy(file.getInputStream(), filePath, java.nio.file.StandardCopyOption.REPLACE_EXISTING);

        // Return public URL
        return "/uploads/profile/" + newFileName;
    }
}
