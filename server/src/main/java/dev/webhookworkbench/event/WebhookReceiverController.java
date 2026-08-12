package dev.webhookworkbench.event;

import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import tools.jackson.databind.ObjectMapper;

import org.springframework.aot.hint.annotation.RegisterReflectionForBinding;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/// Public capture endpoint. Accepts any method, content type, and headers as sent.
///
/// The receipt is written to the response rather than returned. A return value would run content
/// negotiation, so `Accept: text/plain` would get a 406 after the event was already stored. The
/// sender would treat that as a failed delivery and retry the same webhook.
///
/// Writing the body by hand also keeps the type out of AOT return-type inference. Without the
/// binding hint, a native build can drop the receipt type.
@RegisterReflectionForBinding(CaptureReceipt.class)
@RestController
@RequestMapping("/hooks")
final class WebhookReceiverController {

    private final WebhookCaptureService captureService;
    private final WebhookBodyReader bodyReader;
    private final ObjectMapper objectMapper;

    WebhookReceiverController(
            WebhookCaptureService captureService,
            WebhookBodyReader bodyReader,
            ObjectMapper objectMapper) {
        this.captureService = captureService;
        this.bodyReader = bodyReader;
        this.objectMapper = objectMapper;
    }

    @RequestMapping("/{slug}")
    void capture(@PathVariable String slug, HttpServletRequest request, HttpServletResponse response)
            throws IOException {
        var receipt = captureService.capture(
                slug,
                request.getMethod(),
                nullToEmpty(request.getContentType()),
                headers(request),
                bodyReader.read(request));

        response.setStatus(HttpStatus.CREATED.value());
        response.setHeader(HttpHeaders.LOCATION, EventController.pathFor(receipt.id()));
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(response.getOutputStream(), receipt);
    }

    private static Map<String, List<String>> headers(HttpServletRequest request) {
        var headers = new LinkedHashMap<String, List<String>>();
        var names = request.getHeaderNames();
        while (names != null && names.hasMoreElements()) {
            var name = names.nextElement();
            headers.put(name, List.copyOf(java.util.Collections.list(request.getHeaders(name))));
        }
        return headers;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
