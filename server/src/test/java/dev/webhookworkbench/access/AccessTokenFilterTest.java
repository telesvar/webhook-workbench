package dev.webhookworkbench.access;

import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;

import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class AccessTokenFilterTest {

    private final AccessTokenFilter filter = new AccessTokenFilter(new AccessToken("s3cret"));

    @Test
    void rejectsTheApiWithoutATokenAndDescribesWhy() throws Exception {
        var response = new MockHttpServletResponse();

        filter.doFilter(get("/api/inboxes"), response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(response.getContentType()).isEqualTo("application/problem+json");
        assertThat(response.getContentAsString()).contains("urn:webhook-workbench:problem:unauthorized");
        assertThat(response.getContentAsString()).doesNotContain("%s");
    }

    @Test
    void acceptsTheTokenAsABearerHeaderOrAsACookie() throws Exception {
        var withHeader = get("/api/inboxes");
        withHeader.addHeader("Authorization", "Bearer s3cret");
        var withCookie = get("/api/inboxes/1/stream");
        withCookie.setCookies(new Cookie(AccessTokenFilter.COOKIE_NAME, "s3cret"));

        assertThat(statusOf(withHeader)).isEqualTo(200);
        assertThat(statusOf(withCookie)).isEqualTo(200);
    }

    @Test
    void leavesPublicPathsOpen() throws Exception {
        // Senders cannot present a token. The UI and session lookup need to be reachable before
        // a user can enter one.
        assertThat(statusOf(get("/"))).isEqualTo(200);
        assertThat(statusOf(get("/hooks/payments"))).isEqualTo(200);
        assertThat(statusOf(get("/api/session"))).isEqualTo(200);
    }

    @Test
    void guardsNothingWhenNoTokenIsConfigured() throws Exception {
        var response = new MockHttpServletResponse();

        new AccessTokenFilter(new AccessToken("  ")).doFilter(
                get("/api/inboxes"), response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
    }

    private int statusOf(MockHttpServletRequest request) throws Exception {
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response.getStatus();
    }

    private static MockHttpServletRequest get(String uri) {
        var request = new MockHttpServletRequest("GET", uri);
        request.setRequestURI(uri);
        return request;
    }
}
