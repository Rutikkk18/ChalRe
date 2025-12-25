package com.Startup.chalre.DTO;

import lombok.Data;

@Data
public class FirebaseLoginRequest {
    private String idToken;
    private String phone;
    private String name;
}

