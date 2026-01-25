package com.Startup.chalre.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;

    public String uploadFile(MultipartFile file, String folder) {
        try {
            String contentType = file.getContentType();

            if (contentType == null) {
                throw new RuntimeException("File content type is null");
            }

            Map<String, Object> options;

            // ✅ FORCE resource_type for correct browser rendering
            if ("application/pdf".equals(contentType)) {
                options = ObjectUtils.asMap(
                        "folder", folder,
                        "resource_type", "raw"
                );
            } else if (contentType.startsWith("image/")) {
                options = ObjectUtils.asMap(
                        "folder", folder,
                        "resource_type", "image"
                );
            } else {
                throw new RuntimeException("Unsupported file type: " + contentType);
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult =
                    cloudinary.uploader().upload(file.getBytes(), options);

            return uploadResult.get("secure_url").toString();

        } catch (IOException e) {
            throw new RuntimeException("Cloudinary upload failed", e);
        }
    }
}
