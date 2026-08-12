package dev.webhookworkbench.problem;

import java.net.URI;

import jakarta.servlet.http.HttpServletRequest;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.context.request.async.AsyncRequestNotUsableException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

@RestControllerAdvice
@Order(Ordered.HIGHEST_PRECEDENCE)
final class ApiExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(ApiExceptionHandler.class);
    private static final String TYPE_PREFIX = "urn:webhook-workbench:problem:";

    @ExceptionHandler(WorkbenchException.class)
    ResponseEntity<ProblemDetail> handleExpected(WorkbenchException exception, HttpServletRequest request) {
        return response(
                exception.problemType(),
                exception.title(),
                exception.status(),
                exception.getMessage(),
                request);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> handleUnreadable(HttpServletRequest request) {
        return response(
                "malformed-json",
                "Malformed JSON",
                HttpStatus.BAD_REQUEST,
                "The request body must be valid JSON.",
                request);
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HandlerMethodValidationException.class})
    ResponseEntity<ProblemDetail> handleValidation(HttpServletRequest request) {
        return response(
                "validation",
                "Validation failed",
                HttpStatus.BAD_REQUEST,
                "The request contains an invalid value.",
                request);
    }

    @ExceptionHandler({MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
    ResponseEntity<ProblemDetail> handleArgument(Exception exception, HttpServletRequest request) {
        var type = exception instanceof MethodArgumentTypeMismatchException mismatch
                        && ("page".equals(mismatch.getName()) || "size".equals(mismatch.getName()))
                ? "pagination"
                : "validation";
        var title = "pagination".equals(type) ? "Invalid pagination" : "Validation failed";
        var detail = "pagination".equals(type)
                ? "Page and size must be decimal integers within the supported bounds."
                : "The request contains an invalid value.";
        return response(type, title, HttpStatus.BAD_REQUEST, detail, request);
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ProblemDetail> handleMediaType(HttpServletRequest request) {
        return response(
                "unsupported-media-type",
                "Unsupported media type",
                HttpStatus.UNSUPPORTED_MEDIA_TYPE,
                "This endpoint reads JSON. Send Content-Type: application/json.",
                request);
    }

    @ExceptionHandler(NoResourceFoundException.class)
    ResponseEntity<ProblemDetail> handleMissingResource(HttpServletRequest request) {
        return response(
                "resource-not-found",
                "Resource not found",
                HttpStatus.NOT_FOUND,
                "No resource exists at this path.",
                request);
    }

    @ExceptionHandler(AsyncRequestNotUsableException.class)
    void handleDisconnectedStream() {
        // The client has gone away. The stream registry has already dropped the emitter.
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> handleUnexpected(Exception exception, HttpServletRequest request) {
        LOGGER.error("Unexpected request failure for {}", request.getRequestURI(), exception);
        return response(
                "internal-error",
                "Internal server error",
                HttpStatus.INTERNAL_SERVER_ERROR,
                "The request could not be completed.",
                request);
    }

    private static ResponseEntity<ProblemDetail> response(
            String type,
            String title,
            HttpStatus status,
            String detail,
            HttpServletRequest request) {
        var problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create(TYPE_PREFIX + type));
        problem.setTitle(title);
        problem.setInstance(URI.create(request.getRequestURI()));
        return ResponseEntity.status(status).body(problem);
    }
}
