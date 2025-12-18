package com.Startup.chalre.service;



import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UploadService {

    private final Cloudinary cloudinary;

    public String uploadFile(byte[] fileBytes, String fileName) throws IOException {
        Map upload = cloudinary.uploader().upload(fileBytes,
                ObjectUtils.asMap("public_id", "driver_docs/" + fileName));

        return upload.get("secure_url").toString();
    }
}
