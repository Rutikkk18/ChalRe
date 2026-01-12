package com.Startup.chalre.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.util.Base64;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            String firebaseBase64 = System.getenv("FIREBASE_SERVICE_ACCOUNT");

            // 🔹 Do NOT crash app if Firebase is optional
            if (firebaseBase64 == null || firebaseBase64.isBlank()) {
                System.out.println("⚠️ Firebase not initialized (FIREBASE_SERVICE_ACCOUNT missing)");
                return;
            }

            byte[] decodedBytes = Base64.getDecoder().decode(firebaseBase64);
            ByteArrayInputStream serviceAccount =
                    new ByteArrayInputStream(decodedBytes);

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println("✅ Firebase initialized successfully");
            }

        } catch (Exception e) {
            System.err.println("❌ Firebase initialization failed (app will continue)");
            e.printStackTrace();
        }
    }
}
