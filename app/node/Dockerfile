FROM node:20.0.0 AS builder
WORKDIR /node
COPY . .
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn/v6 \
yarn install --frozen-lockfile && yarn build

FROM node:20.0.0 AS runner
WORKDIR /node
RUN mkdir -p images/user-icon
COPY --from=builder /node/dist ./dist
COPY --from=builder /node/package* ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn/v6 \
yarn install --production --frozen-lockfile
EXPOSE 8000

ENV NEW_RELIC_NO_CONFIG_FILE=true \
NEW_RELIC_DISTRIBUTED_TRACING_ENABLED=true \
NR_NATIVE_METRICS_NO_DOWNLOAD=true

CMD ["yarn", "start"]
