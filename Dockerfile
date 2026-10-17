# Pinned to a Node major on purpose. `node:lts` is a floating tag: when it
# rolls to the next LTS the toolchain underneath changes without any commit
# here, which is how a release build breaks with nothing to show in `git log`.
# Bump this deliberately.
FROM node:24-trixie-slim AS base

# Set default shell used for running commands
SHELL ["/bin/bash", "-o", "pipefail", "-o", "errexit", "-c"]

# Configure pnpm
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_ENV=production
ENV DEBIAN_FRONTEND="noninteractive"

RUN \
  # Remove automatic apt cache Docker cleanup scripts
  rm -f /etc/apt/apt.conf.d/docker-clean; \
  # Sets timezone
  echo "Etc/UTC" > /etc/localtime; \
  # Creates app user/group and sets home directory
  groupadd -g "1002" app; \
  useradd -l -u "1002" -g "1002" -m -d /app app;

RUN \
  # Mount Apt cache and lib directories from Docker buildx caches
  --mount=type=cache,id=apt-cache,target=/var/cache/apt,sharing=locked \
  --mount=type=cache,id=apt-lib,target=/var/lib/apt,sharing=locked \
  # Apt update & upgrade to check for security updates to the image
  apt-get update; \
  apt-get dist-upgrade -yq; \
  # Install tini:
  apt-get install -y --no-install-recommends tini tzdata curl wget ca-certificates openssl;

FROM base AS base-deps
WORKDIR /app
COPY package.json pnpm-*.yaml ./

# Install pnpm from its pinned release tarball, verified against the SHA-256
# GitHub reports for that asset. Not via Corepack: Corepack is deprecated and
# is already absent from Node 26, so `corepack enable` would become a hard
# failure the moment the base image moves on. Not via npm either, so the
# install is integrity-checked rather than trusted to version resolution.
#
# Keep PNPM_VERSION in step with package.json#packageManager, and update both
# digests when bumping:
#   gh api repos/pnpm/pnpm/releases/tags/v<version> \
#     --jq '.assets[] | select(.name|test("^pnpm-linux-(x64|arm64)\\.tar\\.gz$")) | "\(.name) \(.digest)"'
ARG PNPM_VERSION=12.14.0
ARG PNPM_SHA256_AMD64=3910c3852136bed5bc1511b9137a45fd4357ed6b3970d9d08893641e9005867e
ARG PNPM_SHA256_ARM64=cfc780b9e690549e6633e1045fb1fb6ef84e390711e2099e6ccbae91c32456ea
# Set by buildx; each arch is built natively on its own runner.
ARG TARGETARCH
RUN \
  case "$TARGETARCH" in \
    amd64) pnpm_arch=x64;   pnpm_sha="$PNPM_SHA256_AMD64" ;; \
    arm64) pnpm_arch=arm64; pnpm_sha="$PNPM_SHA256_ARM64" ;; \
    *) echo "unsupported TARGETARCH: $TARGETARCH" >&2; exit 1 ;; \
  esac; \
  curl -fsSL -o /tmp/pnpm.tar.gz \
    "https://github.com/pnpm/pnpm/releases/download/v${PNPM_VERSION}/pnpm-linux-${pnpm_arch}.tar.gz"; \
  echo "${pnpm_sha}  /tmp/pnpm.tar.gz" | sha256sum -c -; \
  mkdir -p /opt/pnpm; \
  tar -xzf /tmp/pnpm.tar.gz -C /opt/pnpm; \
  rm /tmp/pnpm.tar.gz;

# The launcher resolves its bundled `dist/` relative to itself, so put the
# directory on PATH rather than symlinking the binary out of it.
ENV PATH="/opt/pnpm:$PATH"
# The cache `id` must match the one used by the `pnpm install --offline` steps
# below: BuildKit identifies a cache mount by its `id`, which defaults to the
# `target` path when omitted. Without a matching id, `pnpm fetch` fills one
# cache and the installs read a different, empty one.
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm fetch

FROM base-deps AS production-deps
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod --offline

# ----------------------------
# Stage 2: Build the application
# ----------------------------
FROM base-deps AS build
WORKDIR /app
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --offline
COPY . .
RUN node ace build

# ----------------------------
# Stage 3: Production runtime
# ----------------------------
FROM base AS production
WORKDIR /app

ENV NODE_ENV=production

# Copy the build app:
COPY --from=build /app/build ./
COPY --from=production-deps /app/node_modules ./node_modules/

# Setup temporary directory:
RUN mkdir /app/tmp && chown -R app:app /app/tmp;

# Set the running user for resulting container
USER app

EXPOSE 5080
CMD ["tini", "--", "node", "bin/server.js"]
