FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY src ./src
ENV NODE_ENV=production
USER node
EXPOSE 8090
CMD ["npm", "start"]
