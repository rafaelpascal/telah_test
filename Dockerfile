# Use Node Alpine image
FROM node:18-alpine

# Set app directory
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy all source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port
EXPOSE 6001

# Run app (ESM support)
CMD ["node", "--es-module-specifier-resolution=node", "dist/index.js"]
