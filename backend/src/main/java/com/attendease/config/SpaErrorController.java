package com.attendease.config;

import org.springframework.boot.web.servlet.error.ErrorController;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
public class SpaErrorController implements ErrorController {

    @RequestMapping("/error")
    public String handleError() {
        // Forward all 404s (like /login, /dashboard) to the frontend index.html
        return "forward:/index.html";
    }
}
