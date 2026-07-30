FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY prisma ./prisma
COPY prisma.config.ts ./

ENV NODE_ENV=production
EXPOSE 3002

# prisma migrate deploy corre las migraciones pendientes (idempotente, no
# hace nada si ya están aplicadas) antes de arrancar — es lo que bootstrapea
# el schema en una base nueva/vacía. Ver prisma/migrations/0_init/ (Fase G).
CMD ["npm", "run", "start:migrate"]
