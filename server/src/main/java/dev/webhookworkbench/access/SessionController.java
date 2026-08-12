package dev.webhookworkbench.access;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(SessionController.PATH)
final class SessionController {

    /** Referenced by {@link AccessTokenFilter}, which has to leave exactly this path open. */
    static final String PATH = "/api/session";

    private final AccessToken accessToken;

    SessionController(AccessToken accessToken) {
        this.accessToken = accessToken;
    }

    @GetMapping
    Session session() {
        return new Session(accessToken.required());
    }
}
