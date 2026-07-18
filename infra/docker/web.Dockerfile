FROM node:22.14.0-alpine AS deps
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
WORKDIR /workspace
RUN corepack enable && corepack prepare pnpm@11.12.0 --activate
COPY .npmrc pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/web/package.json apps/web/package.json
RUN pnpm --dir apps/web install --frozen-lockfile --ignore-scripts

FROM deps AS dev
COPY apps/web apps/web
EXPOSE 3000
CMD ["pnpm", "--dir", "apps/web", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]

FROM deps AS builder
COPY apps/web apps/web
RUN pnpm --dir apps/web run build

FROM node:22.14.0-alpine AS runner
WORKDIR /workspace/apps/web
ENV NODE_ENV=production
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY --from=builder /workspace/apps/web/.next/standalone ./
COPY --from=builder /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /workspace/apps/web/public ./apps/web/public
RUN sharp_dir="$(find node_modules/.pnpm -path '*/node_modules/sharp' -type d | head -n 1)" \
    && test -n "$sharp_dir" \
    && rm -rf apps/web/node_modules/sharp \
    && ln -s "../../../${sharp_dir}" apps/web/node_modules/sharp
RUN chown -R appuser:appgroup /workspace/apps/web
USER appuser
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
