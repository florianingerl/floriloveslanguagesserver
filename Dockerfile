# Stufe 1: TypeScript übersetzen
FROM node:22-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json server.ts routes.ts seed.ts ./
COPY src ./src
RUN npx tsc

# Stufe 2: nur das Übersetzte plus Laufzeit-Abhängigkeiten.
# Läuft mit "node" statt "ts-node" und braucht damit einen Bruchteil des Speichers.
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# seed.js sucht die Fragen unter <eigener Ordner>/seed/exercises.json
COPY seed ./dist/seed
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
