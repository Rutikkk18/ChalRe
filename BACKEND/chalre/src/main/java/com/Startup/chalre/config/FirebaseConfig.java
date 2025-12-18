package com.Startup.chalre.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import jakarta.annotation.PostConstruct;
import org.springframework.context.annotation.Configuration;

import java.io.FileInputStream;
import java.io.InputStream;

@Configuration
public class FirebaseConfig {

    @PostConstruct
    public void initialize() {
        try {
            // Read the path from environment variable
            String firebasePath = System.getenv("FIREBASE_CREDENTIALS");
            if (firebasePath == null) {
                throw new RuntimeException("Environment variable FIREBASE_CREDENTIALS not set!");
            }

            InputStream serviceAccount = new FileInputStream(firebasePath);

            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                    .build();

            if (FirebaseApp.getApps().isEmpty()) {
                FirebaseApp.initializeApp(options);
                System.out.println("🔥 Firebase initialized!");
            }

        } catch (Exception e) {
            e.printStackTrace();
            System.out.println("❌ Firebase failed to initialize");
        }
    }
}
