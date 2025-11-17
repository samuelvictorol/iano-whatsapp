FROM node:20-bookworm
RUN apt-get update && apt-get install -y chromium ffmpeg fonts-liberation libatk-bridge2.0-0 libnss3 libxss1 libasound2 libx11-xcb1 ca-certificates && rm -rf /var/lib/apt/lists/*
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
WORKDIR /app
COPY package.json package-lock.json* /app/
RUN npm install --production
COPY . /app
RUN mkdir -p /app/data/wwebjs /app/data/media
EXPOSE 10000
CMD ["npm","start"]
