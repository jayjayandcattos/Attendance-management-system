package com.attendease.service;

import com.attendease.dto.*;
import com.attendease.entity.*;
import com.attendease.exception.BadRequestException;
import com.attendease.exception.UnauthorizedException;
import com.attendease.repository.LoginAttemptRepository;
import com.attendease.repository.RefreshTokenRepository;
import com.attendease.repository.SecurityEventRepository;
import com.attendease.repository.UserRepository;
import com.attendease.security.JwtTokenProvider;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final LoginAttemptRepository loginAttemptRepository;
    private final SecurityEventRepository securityEventRepository;
    private final JwtTokenProvider jwtTokenProvider;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final LoginSecurityService loginSecurityService;
    private final EmailService emailService;
    private final java.util.Random random = new java.util.Random();

    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCKOUT_MINUTES = 15;

    public AuditService getAuditService() {
        return auditService;
    }

    @Transactional
    public AuthResponse login(LoginRequest request, HttpServletRequest httpRequest) {
        // Check rate limiting
        long recentFailures = loginAttemptRepository.countByEmailAndSuccessAndAttemptedAtAfter(
                request.getEmail(), false, LocalDateTime.now().minusMinutes(LOCKOUT_MINUTES));

        if (recentFailures >= MAX_ATTEMPTS) {
            throw new UnauthorizedException("Account temporarily locked. Try again in " + LOCKOUT_MINUTES + " minutes.");
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> {
                    loginSecurityService.recordAttempt(request.getEmail(), httpRequest, false);
                    return new UnauthorizedException("Invalid email or password");
                });

        if (!"active".equals(user.getStatus())) {
            throw new UnauthorizedException("Account is not active");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            loginSecurityService.recordAttempt(request.getEmail(), httpRequest, false);
            throw new UnauthorizedException("Invalid email or password");
        }

        // Successful login
        loginSecurityService.recordAttempt(request.getEmail(), httpRequest, true);
        
        // SECURITY POLICY: Single Session for Admins
        String sessionId = UUID.randomUUID().toString();
        if ("admin".equals(user.getRole())) {
            refreshTokenRepository.revokeAllByUserId(user.getId());
            user.setCurrentSessionId(sessionId);
            checkNewAdminIP(user, httpRequest);
        }

        user.setLastLogin(LocalDateTime.now());
        userRepository.save(user);

        auditService.log(user, "login", "user", user.getId(), httpRequest);

        // Check if MFA is enabled
        if (user.getMfaEnabled() != null && user.getMfaEnabled()) {
            String mfaToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), "mfa_pending", sessionId);
            return AuthResponse.builder()
                    .mfaRequired(true)
                    .mfaToken(mfaToken)
                    .tokenType("Bearer")
                    .build();
        }

        return generateAuthResponse(user, httpRequest, sessionId);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request, HttpServletRequest httpRequest) {
        java.util.Optional<User> existingUser = userRepository.findByEmail(request.getEmail());
        if (existingUser.isPresent()) {
            String status = existingUser.get().getStatus();
            if (!"pending".equals(status)) {
                throw new BadRequestException("An account with this email already exists and is " + status + ". Please sign in.");
            }
            // Allow re-registration if status is pending (incomplete verification)
            refreshTokenRepository.revokeAllByUserId(existingUser.get().getId());
            userRepository.delete(existingUser.get());
            userRepository.flush();
        }

        if (!("student".equals(request.getRole()) || "teacher".equals(request.getRole()))) {
            request.setRole("student");
        }

        validatePassword(request.getPassword());

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .firstName(request.getFirstName())
                .lastName(request.getLastName())
                .role(request.getRole())
                .studentId(request.getStudentId())
                .department(request.getDepartment())
                .phoneNumber(request.getPhoneNumber())
                .bio(request.getBio())
                .gender(request.getGender())
                .birthday(request.getBirthday())
                .status("pending")
                .mfaEnabled(false)
                .build();

        String code = String.format("%06d", random.nextInt(1000000));
        user.setVerificationCode(code);
        user.setEmailCodeExpiry(LocalDateTime.now().plusMinutes(5));

        user = userRepository.save(java.util.Objects.requireNonNull(user));
        emailService.sendVerificationCode(user.getEmail(), code);
        auditService.log(user, "register", "user", user.getId(), httpRequest);

        return AuthResponse.builder()
                .emailVerificationRequired(true)
                .email(user.getEmail())
                .build();
    }

    @Transactional
    public AuthResponse refreshToken(String refreshTokenStr) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenStr)
                .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        if (refreshToken.getRevoked() || refreshToken.isExpired()) {
            throw new UnauthorizedException("Refresh token expired or revoked");
        }

        User user = refreshToken.getUser();

        // Revoke old token
        refreshToken.setRevoked(true);
        refreshTokenRepository.save(refreshToken);

        return generateAuthResponse(user, null, user.getCurrentSessionId());
    }

    @Transactional
    public void logout(Long userId) {
        refreshTokenRepository.revokeAllByUserId(userId);
    }

    private void checkNewAdminIP(User user, HttpServletRequest request) {
        String currentIp = request != null ? request.getRemoteAddr() : "unknown";
        if ("unknown".equals(currentIp)) return;

        // Check if this IP has ever been used successfully by this admin before
        boolean isKnownIp = loginAttemptRepository.findAll().stream()
                .filter(a -> a.getEmail().equalsIgnoreCase(user.getEmail()))
                .filter(a -> a.getSuccess())
                .anyMatch(a -> currentIp.equals(a.getIpAddress()));

        if (!isKnownIp) {
            SecurityEvent event = new SecurityEvent();
            event.setType(SecurityEventType.SUSPICIOUS_ACTIVITY);
            event.setSeverity(SecurityEventSeverity.MEDIUM);
            event.setDescription("New IP detected for Admin: " + user.getEmail() + " from " + currentIp);
            event.setIpAddress(currentIp);
            event.setUserEmail(user.getEmail());
            event.setAcknowledged(false);
            securityEventRepository.save(event);
        }
    }

    private AuthResponse generateAuthResponse(User user, HttpServletRequest httpRequest, String sessionId) {
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole(), sessionId);
        String refreshTokenStr = UUID.randomUUID().toString();

        RefreshToken refreshToken = RefreshToken.builder()
                .user(user)
                .token(refreshTokenStr)
                .expiresAt(LocalDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(java.util.Objects.requireNonNull(refreshToken));

        if (httpRequest != null) {
            auditService.log(user, "login", "user", user.getId(), httpRequest);
        }

        return AuthResponse.builder()
                .accessToken(accessToken)
                .tokenType("Bearer")
                .user(UserDto.fromEntity(user))
                .mfaRequired(false)
                .build();
    }

    @Transactional
    public AuthResponse verifyEmail(String email, String code, HttpServletRequest httpRequest) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code)) {
            throw new UnauthorizedException("Invalid verification code");
        }

        if (user.getEmailCodeExpiry() != null && user.getEmailCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new UnauthorizedException("Verification code has expired");
        }

        // Code is valid
        user.setStatus("active");
        user.setVerificationCode(null);
        user.setEmailCodeExpiry(null);
        
        String sessionId = UUID.randomUUID().toString();
        user.setCurrentSessionId(sessionId);
        user = userRepository.save(user);

        return generateAuthResponse(user, httpRequest, sessionId);
    }

    @Transactional
    public void resendVerificationCode(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UnauthorizedException("User not found"));

        String code = String.format("%06d", random.nextInt(1000000));
        user.setVerificationCode(code);
        user.setEmailCodeExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        emailService.sendVerificationCode(user.getEmail(), code);
    }

    @Transactional
    public void sendPasswordChangeVerification(User user) {
        String code = String.format("%06d", random.nextInt(1000000));
        user.setVerificationCode(code);
        user.setEmailCodeExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        emailService.sendPasswordChangeCode(user.getEmail(), code);
    }

    @Transactional
    public void forgotPassword(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("No account found with this email"));

        String code = String.format("%06d", random.nextInt(1000000));
        user.setVerificationCode(code);
        user.setEmailCodeExpiry(LocalDateTime.now().plusMinutes(5));
        userRepository.save(user);

        emailService.sendPasswordChangeCode(user.getEmail(), code);
    }

    @Transactional
    public void resetPassword(String email, String code, String newPassword) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("User not found"));

        if (user.getVerificationCode() == null || !user.getVerificationCode().equals(code)) {
            throw new BadRequestException("Invalid verification code");
        }

        if (user.getEmailCodeExpiry() != null && user.getEmailCodeExpiry().isBefore(LocalDateTime.now())) {
            throw new BadRequestException("Verification code has expired");
        }

        validatePassword(newPassword);

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setVerificationCode(null);
        user.setEmailCodeExpiry(null);
        userRepository.save(user);

        // Alert Admin Dashboard
        SecurityEvent event = new SecurityEvent();
        event.setType(SecurityEventType.PASSWORD_CHANGE);
        event.setSeverity(SecurityEventSeverity.LOW);
        event.setDescription("Password reset successful for user: " + user.getEmail());
        event.setUserEmail(user.getEmail());
        event.setIpAddress("system");
        event.setAcknowledged(false);
        securityEventRepository.save(event);
    }

    private void validatePassword(String password) {
        if (password == null || password.length() < 8) {
            throw new BadRequestException("Password must be at least 8 characters long");
        }
        boolean hasDigit = false;
        boolean hasSpecial = false;
        String specialChars = "!@#$%^&*()-_=+[]{}|;:,.<>?";

        for (char c : password.toCharArray()) {
            if (Character.isDigit(c)) hasDigit = true;
            else if (specialChars.contains(String.valueOf(c))) hasSpecial = true;
        }

        if (!hasDigit) {
            throw new BadRequestException("Password must contain at least one number");
        }
        if (!hasSpecial) {
            throw new BadRequestException("Password must contain at least one special character");
        }
    }
}
