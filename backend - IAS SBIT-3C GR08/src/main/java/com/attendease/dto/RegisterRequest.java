package com.attendease.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank
    private String firstName;
    @NotBlank
    private String lastName;
    @NotBlank @Email
    private String email;
    @NotBlank @Size(min = 6, message = "Password must be at least 6 characters")
    private String password;
    private String role = "student";
    private String studentId;
    private String department;
    private String phoneNumber;
    private String bio;
    private String gender;
    private String birthday;
}
