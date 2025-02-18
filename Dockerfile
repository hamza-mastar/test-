FROM ghcr.io/puppeteer/puppeteer:latest 

# Using Root to enable SYS_ADMIN capabilities (for running the browser in sandbox mode )
USER root 

# Install Puppeteer under /node_modules so it's available system-wide
COPY package.json /app/
COPY . /app/

RUN cd /app/ && npm install

WORKDIR /app  

EXPOSE 4000

# set env variable ( due to issue talked about here https://github.com/puppeteer/puppeteer/issues/11023#issuecomment-1776247197)

ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

# Install browsers ( post-install scripts)
RUN npx puppeteer browsers install

RUN npx prisma generate

CMD ["node", "scheduler.js"]




FROM ghcr.io/puppeteer/puppeteer:latest 

# Using Root to enable SYS_ADMIN capabilities
USER root 

# Install Puppeteer and dependencies
COPY package.json /app/
COPY . /app/
WORKDIR /app  

RUN npm install 

# Expose the dynamic port for Heroku
EXPOSE 4000

# Set environment variables for Puppeteer
ENV XDG_CONFIG_HOME=/tmp/.chromium
ENV XDG_CACHE_HOME=/tmp/.chromium

# Install browsers (post-install scripts)
RUN npx puppeteer browsers install

# Generate Prisma client
RUN npx prisma generate

# Ensure Prisma migrations are applied before running
CMD npx prisma migrate deploy && node scheduler.js
