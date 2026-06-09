# ============================================
# Stage 1: Build the Application
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files and install dependencies
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Pass build args for frontend branding
ARG VITE_BRAND_NAME="Hibi Matcha"
ARG VITE_PRIMARY_COLOR="#16a34a"

ENV VITE_BRAND_NAME=$VITE_BRAND_NAME
ENV VITE_PRIMARY_COLOR=$VITE_PRIMARY_COLOR

# Build both frontend and backend
RUN pnpm build

# ============================================
# Stage 2: Production Runtime
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Only copy necessary files for production
COPY package.json pnpm-lock.yaml ./
# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy the built artifacts from the builder stage
COPY --from=builder /app/dist ./dist
# Drizzle schema (needed for runtime db connections if not bundled)
COPY --from=builder /app/drizzle ./drizzle

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "run", "start"]
