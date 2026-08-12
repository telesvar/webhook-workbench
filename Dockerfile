# syntax=docker/dockerfile:1

ARG NODE_IMAGE=node:26-slim
ARG JDK_IMAGE=eclipse-temurin:25-jdk
ARG JRE_IMAGE=eclipse-temurin:25-jre
ARG GRAALVM_IMAGE=ghcr.io/graalvm/native-image-community:25
ARG NATIVE_RUNTIME_IMAGE=registry.access.redhat.com/ubi9/ubi-minimal

# -----------------------------------------------------------------------------
# Web assets
# -----------------------------------------------------------------------------
FROM ${NODE_IMAGE} AS web-build
WORKDIR /workspace/web

RUN npm install --global pnpm@11 --no-audit --no-fund

# Manifests first so source edits do not re-resolve dependencies. Cache mount keeps the store warm.
COPY web/package.json web/pnpm-lock.yaml ./
RUN --mount=type=cache,target=/pnpm-store,sharing=locked \
    pnpm config set store-dir /pnpm-store && pnpm install --frozen-lockfile

COPY web/ ./
RUN pnpm run build

# -----------------------------------------------------------------------------
# Server jar
# -----------------------------------------------------------------------------
FROM ${JDK_IMAGE} AS server-build
WORKDIR /workspace
ENV MAVEN_OPTS="-XX:+UseSerialGC -Xshare:auto"

# Resolve from the POM alone so Java edits do not re-download dependencies.
COPY server/pom.xml server/pom.xml
COPY server/.mvn server/.mvn
COPY server/mvnw server/mvnw
RUN --mount=type=cache,target=/root/.m2,sharing=locked \
    sh server/mvnw -f server/pom.xml --batch-mode --no-transfer-progress \
        -Dmaven.test.skip=true dependency:go-offline

COPY server/src server/src
COPY --from=web-build /workspace/web/dist web/dist/
RUN --mount=type=cache,target=/root/.m2,sharing=locked \
    sh server/mvnw -f server/pom.xml --batch-mode --no-transfer-progress \
        -Dmaven.test.skip=true package \
    && find server/target -maxdepth 1 -name '*.jar' ! -name '*-plain.jar' -exec cp {} application.jar \;

# Spring layer extract: dependency jars land in earlier image layers so app rebuilds stay small.
RUN java -Djarmode=tools -jar application.jar extract --layers --launcher --destination extracted

# -----------------------------------------------------------------------------
# JVM runtime (default)
# -----------------------------------------------------------------------------
FROM ${JRE_IMAGE} AS jvm-runtime
WORKDIR /app

# Stable layers first so a code change only rebuilds the last layer.
COPY --from=server-build --chown=10001:10001 /workspace/extracted/dependencies/ ./
COPY --from=server-build --chown=10001:10001 /workspace/extracted/spring-boot-loader/ ./
COPY --from=server-build --chown=10001:10001 /workspace/extracted/snapshot-dependencies/ ./
COPY --from=server-build --chown=10001:10001 /workspace/extracted/application/ ./

USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75.0", "org.springframework.boot.loader.launch.JarLauncher"]

# -----------------------------------------------------------------------------
# Native image
# -----------------------------------------------------------------------------
FROM ${GRAALVM_IMAGE} AS native-build
WORKDIR /workspace

COPY server/pom.xml server/pom.xml
COPY server/.mvn server/.mvn
COPY server/mvnw server/mvnw
RUN --mount=type=cache,target=/root/.m2,sharing=locked \
    sh server/mvnw -f server/pom.xml --batch-mode --no-transfer-progress \
        -Pnative -Dmaven.test.skip=true dependency:go-offline

COPY server/src server/src
COPY --from=web-build /workspace/web/dist web/dist/
RUN --mount=type=cache,target=/root/.m2,sharing=locked \
    sh server/mvnw -f server/pom.xml --batch-mode --no-transfer-progress \
        -Pnative -Dmaven.test.skip=true native:compile \
    && cp server/target/webhook-workbench application

# Runtime image has no JDK. Base OS matches the builder glibc so the native binary links.
FROM ${NATIVE_RUNTIME_IMAGE} AS native-runtime
WORKDIR /app
COPY --from=native-build --chown=10001:10001 /workspace/application /app/application
USER 10001:10001
EXPOSE 8080
ENTRYPOINT ["/app/application"]
