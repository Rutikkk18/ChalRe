package com.Startup.chalre.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            String firebaseEnv = System.getenv("FIREBASE_SERVICE_ACCOUNT");

            // 🔹 Local environment: skip Firebase safely
            if (firebaseEnv == null || firebaseEnv.isBlank()) {
                System.out.println("⚠ Firebase disabled (FIREBASE_SERVICE_ACCOUNT not set)");
                return;
            }

            // 🔹 Detect Base64 vs raw JSON
            String firebaseJson;
            if (firebaseEnv.trim().startsWith("{")) {
                // Production case (Render) → raw JSON
                firebaseJson = firebaseEnv;
            } else {
                // Local-safe case → Base64 encoded JSON
                firebaseJson = new String(
                        Base64.getDecoder().decode(firebaseEnv),
                        StandardCharsets.UTF_8
                );
            }

            if (!FirebaseApp.getApps().isEmpty()) {
                return;
            }

            ByteArrayInputStream serviceAccount =
                    new ByteArrayInputStream(firebaseJson.getBytes(StandardCharsets.UTF_8));

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            FirebaseApp.initializeApp(options);
            System.out.println("✅ Firebase initialized successfully");

        } catch (Exception e) {
            System.err.println("❌ Firebase initialization failed (safe fallback)");
            e.printStackTrace();
        }
    }
}
