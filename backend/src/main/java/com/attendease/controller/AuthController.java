package com.attendease.controller;

import com.attendease.dto.*;
import com.attendease.entity.User;
import com.attendease.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody LoginRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        AuthResponse authResponse = authService.login(request, httpRequest);

        if (!authResponse.isMfaRequired() && !authResponse.isEmailVerificationRequired()) {
            setTokenCookie(httpResponse, authResponse.getAccessToken());
        }

        return ResponseEntity.ok(ApiResponse.success("Login successful", authResponse));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @Valid @RequestBody RegisterRequest request,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {

        AuthResponse authResponse = authService.register(request, httpRequest);
        if (!authResponse.isEmailVerificationRequired()) {
            setTokenCookie(httpResponse, authResponse.getAccessToken());
        }

        return ResponseEntity.ok(ApiResponse.success("Registration successful", authResponse));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponse>> refresh(
            @CookieValue(name = "refresh_token", required = false) String refreshToken,
            HttpServletResponse httpResponse) {

        if (refreshToken == null) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Refresh token required"));
        }

        AuthResponse authResponse = authService.refreshToken(refreshToken);
        setTokenCookie(httpResponse, authResponse.getAccessToken());

        return ResponseEntity.ok(ApiResponse.success(authResponse));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(
            @AuthenticationPrincipal User user,
            HttpServletRequest request,
            HttpServletResponse httpResponse) {

        if (user != null) {
            authService.logout(user.getId());
            authService.getAuditService().log(user, "logout", "user", user.getId(), request);
        }

        // Clear cookies
        Cookie accessCookie = new Cookie("access_token", "");
        accessCookie.setMaxAge(0);
        accessCookie.setPath("/");
        accessCookie.setHttpOnly(true);
        httpResponse.addCookie(accessCookie);

        Cookie refreshCookie = new Cookie("refresh_token", "");
        refreshCookie.setMaxAge(0);
        refreshCookie.setPath("/");
        refreshCookie.setHttpOnly(true);
        httpResponse.addCookie(refreshCookie);

        return ResponseEntity.ok(ApiResponse.success("Logged out successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> getCurrentUser(@AuthenticationPrincipal User user) {
        if (user == null) {
            return ResponseEntity.status(401).body(ApiResponse.error("Not authenticated"));
        }
        return ResponseEntity.ok(ApiResponse.success(UserDto.fromEntity(user)));
    }

    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmail(
            @RequestBody java.util.Map<String, String> body,
            HttpServletRequest httpRequest,
            HttpServletResponse httpResponse) {
        
        String email = body.get("email");
        String code = body.get("code");
        
        if (email == null || email.isBlank() || code == null || code.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email and verification code are required"));
        }
        
        AuthResponse authResponse = authService.verifyEmail(email, code, httpRequest);
        if (authResponse.getAccessToken() != null) {
            setTokenCookie(httpResponse, authResponse.getAccessToken());
        }
        
        return ResponseEntity.ok(ApiResponse.success("Email verified successfully", authResponse));
    }

    @PostMapping("/resend-code")
    public ResponseEntity<ApiResponse<Void>> resendCode(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is required"));
        }
        authService.resendVerificationCode(email);
        return ResponseEntity.ok(ApiResponse.success("Verification code resent", null));
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<Void>> forgotPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is required"));
        }
        authService.forgotPassword(email);
        return ResponseEntity.ok(ApiResponse.success("Password reset code sent to your email", null));
    }

    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@RequestBody java.util.Map<String, String> body) {
        String email = body.get("email");
        String code = body.get("code");
        String newPassword = body.get("newPassword");
        authService.resetPassword(email, code, newPassword);
        return ResponseEntity.ok(ApiResponse.success("Password has been reset successfully", null));
    }

    private void setTokenCookie(HttpServletResponse response, String token) {
        if (token == null || token.isBlank()) {
            return;
        }
        Cookie cookie = new Cookie("access_token", token);
        cookie.setHttpOnly(true);
        cookie.setSecure(true);
        cookie.setPath("/");
        cookie.setMaxAge(900); // 15 minutes
        response.addCookie(cookie);
    }
}
