# Build from the repo root:  docker build -f apps/server/Dockerfile -t ntc-server .
FROM node:22-slim AS build
RUN corepack enable
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile --filter @ntc/server... && pnpm --filter @ntc/server build

FROM node:22-slim
RUN corepack enable
WORKDIR /repo
ENV NODE_ENV=production
COPY --from=build /repo/package.json /repo/pnpm-lock.yaml /repo/pnpm-workspace.yaml /repo/.npmrc ./
COPY --from=build /repo/apps/server/package.json apps/server/package.json
COPY --from=build /repo/packages packages
RUN pnpm install --prod --frozen-lockfile --filter @ntc/server...
COPY --from=build /repo/apps/server/dist apps/server/dist
COPY --from=build /repo/apps/server/assets apps/server/assets
COPY --from=build /repo/supabase supabase
WORKDIR /repo/apps/server
EXPOSE 2567
CMD ["node", "dist/index.js"]
