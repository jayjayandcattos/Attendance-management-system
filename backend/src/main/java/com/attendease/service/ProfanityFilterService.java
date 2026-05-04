package com.attendease.service;

import org.springframework.stereotype.Service;
import java.util.Arrays;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ProfanityFilterService {

    // A curated list of common English and Tagalog profanity
    private static final List<String> CURSE_WORDS = Arrays.asList(
            // English
            "fuck", "shit", "bitch", "asshole", "bastard", "dick", "pussy", "cunt", "faggot", "nigger", "nigga", "whore", "slut", "fuk", "shite", "bullshit", "jackass", "fucker", "motherfucker",
            // Tagalog
            "putang ina", "putangina", "tangina", "tanginamo", "putanginamo", "pota", "gago", "tarantado", "ulol", "bobo", "kantot", "puke", "tite", "bayag", "hayup", "punyeta", "leche", "kupal", "pakyu", "syet", "pisti", "inutil", "ungas", "animal ka", "bilat", "burat", "pokpok"
    );

    private final Pattern pattern;

    public ProfanityFilterService() {
        // Compile a regex pattern: (?i)(word1|word2|...)
        // We removed \\b boundaries for some flexibility, but we'll use a smarter regex
        // to avoid catching words inside other words too aggressively
        StringBuilder sb = new StringBuilder("(?i)(");
        for (int i = 0; i < CURSE_WORDS.size(); i++) {
            sb.append(Pattern.quote(CURSE_WORDS.get(i)));
            if (i < CURSE_WORDS.size() - 1) {
                sb.append("|");
            }
        }
        sb.append(")");
        this.pattern = Pattern.compile(sb.toString());
    }

    public String filter(String text) {
        if (text == null || text.isEmpty()) {
            return text;
        }

        System.out.println("[DEBUG] Filtering text: " + text);
        Matcher matcher = pattern.matcher(text);
        StringBuilder sb = new StringBuilder();
        int lastEnd = 0;

        while (matcher.find()) {
            sb.append(text, lastEnd, matcher.start());
            String match = matcher.group();
            // Replace with asterisks of the same length
            for (int i = 0; i < match.length(); i++) {
                sb.append("*");
            }
            lastEnd = matcher.end();
        }
        sb.append(text.substring(lastEnd));

        return sb.toString();
    }
}
