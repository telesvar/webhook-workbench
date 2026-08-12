package dev.webhookworkbench.access;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/// Requires the shared token on `/api` when one is configured.
///
/// A cookie or bearer header both count. `EventSource` cannot set headers, and the live stream
/// is an `/api` endpoint like the rest.
@Component
public final class AccessTokenFilter extends OncePerRequestFilter {

    public static final String COOKIE_NAME = "workbench_token";

    private static final String BEARER = "Bearer ";

    // Static JSON body, because this filter sits outside the usual problem-handler path.
    private static final String PROBLEM = """
            {"type":"urn:webhook-workbench:problem:unauthorized",\
            "title":"Unauthorized",\
            "status":401,\
            "detail":"A valid access token is required."}""";

    private final AccessToken accessToken;

    AccessTokenFilter(AccessToken accessToken) {
        this.accessToken = accessToken;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        return !accessToken.required()
                || !request.getRequestURI().startsWith("/api/")
                || request.getRequestURI().equals(SessionController.PATH);
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (accessToken.matches(presented(request))) {
            chain.doFilter(request, response);
            return;
        }
        response.setStatus(HttpStatus.UNAUTHORIZED.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        // Write with getOutputStream so the container does not append ;charset= to application/problem+json.
        response.getOutputStream().write(PROBLEM.getBytes(StandardCharsets.UTF_8));
    }

    private static String presented(HttpServletRequest request) {
        var header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith(BEARER)) {
            return header.substring(BEARER.length());
        }
        var cookies = request.getCookies();
        return cookies == null
                ? null
                : Arrays.stream(cookies)
                        .filter(cookie -> COOKIE_NAME.equals(cookie.getName()))
                        .map(Cookie::getValue)
                        .findFirst()
                        .orElse(null);
    }
}
