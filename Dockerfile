FROM node:24-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts && mkdir /app/data && chown node:node /app/data
COPY --chown=node:node src ./src
COPY --chown=node:node web ./web
USER node
ENV ROUTER_HOST=0.0.0.0
EXPOSE 8787
CMD ["node","src/server.mjs"]
