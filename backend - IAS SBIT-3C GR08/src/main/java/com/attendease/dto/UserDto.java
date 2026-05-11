package com.attendease.dto;

import com.attendease.entity.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data @Builder @AllArgsConstructor
public class UserDto {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String fullName;
    private String role;
    private String avatar;
    private String studentId;
    private String department;
    private String phoneNumber;
    private String bio;
    private String gender;
    private String birthday;
    private String status;
    private boolean mfaEnabled;
    private LocalDateTime createdAt;
    private LocalDateTime lastLogin;

    public static UserDto fromEntity(User user) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .fullName(user.getFullName())
                .role(user.getRole())
                .avatar(user.getAvatar())
                .studentId(user.getStudentId())
                .department(user.getDepartment())
                .phoneNumber(user.getPhoneNumber())
                .bio(user.getBio())
                .gender(user.getGender())
                .birthday(user.getBirthday())
                .status(user.getStatus())
                .mfaEnabled(user.getMfaEnabled() != null && user.getMfaEnabled())
                .createdAt(user.getCreatedAt())
                .lastLogin(user.getLastLogin())
                .build();
    }
}
