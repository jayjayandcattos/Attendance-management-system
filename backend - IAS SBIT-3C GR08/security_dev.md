# AttendEase Security Features

## Authentication

- **JWT Access Tokens**: Signed tokens with configurable expiration (default: 15 min)
- **JWT Refresh Tokens**: Separate tokens for session renewal (default: 7 days)
- **HttpOnly Cookies**: Tokens can be stored in secure HTTP-only cookies
- **Bearer Token Support**: Standard Authorization header support
- **BCrypt Password Hashing**: passwords are hashed with BCrypt (cost factor 10)

## Authorization

- **Role-Based Access Control (RBAC)**:
  - ADMIN: Full system access
  - TEACHER/PROFESSOR: Course and student management
  - STUDENT: Limited to enrolled courses
- **Endpoint-Based Permissions**: Spring Security intercepts all /api/* endpoints

## Account Security

- **MFA Support**: Optional TOTP-based two-factor authentication
- **Login Rate Limiting**: Account locks for 15 minutes after 5 failed attempts
- **Login Attempt Tracking**: All login attempts recorded with IP address
- **Account Status**: Users must have "active" status to login

## Session & Token Management

- **Stateless Sessions**: No server-side session storage
- **Token Rotation**: Refresh tokens are revoked and regenerated on use
- **Token Expiration**: Access tokens expire; refresh tokens have fixed lifespan

## Audit & Logging

- **Login Audit**: All login attempts logged with timestamp, IP, success/failure
- **Action Logging**: Registration, login events logged to audit_log table
- **User Tracking**: Last login timestamp stored

## Network Security

- **CORS Configuration**: Configured allowed origins
- **CSRF Disabled**: Stateless API doesn't require CSRF tokens

## API Security

- **Method-Level Security**: @PreAuthorize annotations supported
- **Request Validation**: DTO validation with Jakarta annotations
- **Exception Handling**: Global exception handler returns safe error messages