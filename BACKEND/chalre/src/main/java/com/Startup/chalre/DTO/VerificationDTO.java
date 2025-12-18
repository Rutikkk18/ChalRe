package com.Startup.chalre.DTO;

import lombok.Data;

import java.util.List;

@Data
public class VerificationDTO {

    private List<String> urls;   // Cloud URLs of uploaded files
    private List<String> types;  // Doc types in same order
}
