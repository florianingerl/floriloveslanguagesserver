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
# Python und ein JDK fuer die lokale Ausfuehrung von Programmieraufgaben.
# Der Runner setzt fuer die Kindprozesse harte Grenzen fuer Zeit, Speicher und
# Ausgabe. Racket-Aufgaben laufen ueber die OnlineCompiler.io-API.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 default-jdk-headless \
    && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/dist ./dist
# seed.js sucht die Fragen unter <eigener Ordner>/seed/exercises.json
COPY seed ./dist/seed
USER node
EXPOSE 8080
CMD ["node", "dist/server.js"]
