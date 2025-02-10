FROM ghcr.io/puppeteer/puppeteer:23.4.1

# Switch to root so we can install dependencies without permission issues
USER root

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable \
    NODE_ENV=production

# Set working directory (using a directory we control)
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies as root (using --unsafe-perm and --allow-root)
RUN npm ci --unsafe-perm=true --allow-root

# Copy the rest of the application code
COPY . .

# Fix permissions: give the non-root user (pptruser) ownership of the /app folder
RUN chown -R pptruser:pptruser /app

# Generate Prisma client using local installation only (do not auto-install a missing version)
# RUN npx prisma generate
# Switch back to the non-root user (the default for this image)
USER pptruser

# (Optional) Expose the port your app listens on (change 3000 as needed)
EXPOSE 3000

# Start the application
CMD ["node", "index.js"]
