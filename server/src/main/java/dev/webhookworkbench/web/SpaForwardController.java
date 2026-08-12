package dev.webhookworkbench.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
final class SpaForwardController {

    /**
     * Only the SPA deep links, so a bad API or asset path stays a real error.
     *
     * <p>These must match the routes in {@code web/src/app/router.tsx}. Nothing checks that for
     * us, so a new client route needs a matching entry here or its deep links will 404.
     */
    @GetMapping({ "/inboxes/{inboxId}", "/inboxes/{inboxId}/events/{eventId}" })
    String forwardToApplication() {
        return "forward:/index.html";
    }
}

