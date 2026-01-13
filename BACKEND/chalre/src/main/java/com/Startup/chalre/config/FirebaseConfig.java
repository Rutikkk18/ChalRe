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
            String firebaseJson = System.getenv("FIREBASE_SERVICE_ACCOUNT");

            if (firebaseJson == null || firebaseJson.isBlank()) {
                System.out.println("⚠️ Firebase not initialized (env missing)");
                return;
            }

            ByteArrayInputStream serviceAccount =
                    new ByteArrayInputStream(firebaseJson.getBytes());

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println("✅ Firebase initialized successfully");
            }

        } catch (Exception e) {
            System.err.println("❌ Firebase initialization failed");
            e.printStackTrace();
        }
    }
}


