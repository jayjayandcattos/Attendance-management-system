package com.attendease.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

@Data @Builder @AllArgsConstructor
public class AuthResponse {
    private String accessToken;
    private String tokenType;
    private UserDto user;
    private boolean mfaRequired;
    private String mfaToken;
    private boolean emailVerificationRequired;
    private String email;
}
