package com.attendease.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    @Async
    public void sendVerificationCode(String toEmail, String code) {
        String subject = "Verify Your AttendEase Account";
        String content = buildEmailHtml(
            "Welcome to AttendEase!",
            "Thank you for joining our platform. Please use the verification code below to complete your registration and activate your account.",
            code,
            "This code will expire in 5 minutes for your security."
        );

        sendEmail(toEmail, subject, content);
    }

    @Async
    public void sendPasswordChangeCode(String toEmail, String code) {
        String subject = "Security Verification Code";
        String content = buildEmailHtml(
            "Security Verification",
            "A sensitive change was requested for your profile. To ensure it's really you, please use the following code to authorize the update.",
            code,
            "If you did not request this, please secure your account immediately."
        );

        sendEmail(toEmail, subject, content);
    }

    private String buildEmailHtml(String title, String subtitle, String code, String footerNote) {
        return "<!DOCTYPE html><html><head><meta charset='UTF-8'>"
            + "<style>"
            + "  body { margin: 0; padding: 0; background-color: #f4f7fa; }"
            + "  .container { max-width: 600px; margin: 20px auto; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }"
            + "  .card { background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.05); border: 1px solid #e1e7ef; }"
            + "  .header { background: linear-gradient(135deg, #2563eb 0%, #3b82f6 50%, #60a5fa 100%); padding: 60px 40px; text-align: center; color: #ffffff; }"
            + "  .logo { font-size: 32px; font-weight: 900; letter-spacing: -1.5px; margin: 0; text-shadow: 0 2px 4px rgba(0,0,0,0.1); }"
            + "  .header-subtitle { font-size: 13px; opacity: 0.9; margin-top: 8px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; }"
            + "  .body { padding: 40px 30px; text-align: center; }"
            + "  .body h2 { color: #1e293b; font-size: 24px; margin-bottom: 16px; font-weight: 800; letter-spacing: -0.5px; }"
            + "  .body p { color: #475569; font-size: 15px; line-height: 1.6; margin-bottom: 30px; }"
            + "  .code-container { background: #f8fafc; border-radius: 20px; padding: 24px 12px; border: 2px solid #e2e8f0; display: block; margin: 0 auto; max-width: 280px; }"
            + "  .code-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 12px; }"
            + "  .code { font-size: 36px; font-weight: 900; color: #2563eb; letter-spacing: 5px; margin: 0; font-family: 'Monaco', 'Consolas', monospace; white-space: nowrap; }"
            + "  .footer { text-align: center; padding: 40px; color: #94a3b8; font-size: 13px; line-height: 1.6; }"
            + "  .footer a { color: #3b82f6; text-decoration: none; font-weight: 600; }"
            + "</style></head><body>"
            + "<div class='container'>"
            + "  <div class='card'>"
            + "    <div class='header'>"
            + "      <h1 class='logo'>AttendEase</h1>"
            + "      <div class='header-subtitle'>Secure Identity Portal</div>"
            + "    </div>"
            + "    <div class='body'>"
            + "      <h2>" + title + "</h2>"
            + "      <p>" + subtitle + "</p>"
            + "      <div class='code-container'>"
            + "        <div class='code-label'>Verification Code</div>"
            + "        <div class='code'>" + code + "</div>"
            + "      </div>"
            + "      <p style='font-size: 14px; color: #94a3b8; margin-top: 40px; font-style: italic;'>" + footerNote + "</p>"
            + "    </div>"
            + "  </div>"
            + "  <div class='footer'>"
            + "    <p>&copy; 2026 AttendEase. All rights reserved.</p>"
            + "    <p>This is an automated system message. Please do not reply to this email.<br>"
            + "    Need help? <a href='#'>Visit our Help Center</a></p>"
            + "  </div>"
            + "</div>"
            + "</body></html>";
    }

    @SuppressWarnings("null")
    private void sendEmail(String to, String subject, String content) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setFrom(fromEmail);
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(content, true);
            mailSender.send(message);
        } catch (MessagingException e) {
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }
}