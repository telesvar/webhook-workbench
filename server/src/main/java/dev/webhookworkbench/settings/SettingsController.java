package dev.webhookworkbench.settings;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/settings")
final class SettingsController {

    private final SettingsService store;

    SettingsController(SettingsService store) {
        this.store = store;
    }

    @GetMapping
    Settings get() {
        return store.get();
    }

    @PutMapping
    Settings replace(@RequestBody Settings settings) {
        return store.replace(settings);
    }
}
