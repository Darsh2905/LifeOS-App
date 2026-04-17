FROM node:22-slim

WORKDIR /app

# Install frontend dependencies
COPY package.json package-lock.json ./
RUN npm install

# Copy frontend source and build
COPY public ./public
COPY src ./src
COPY tailwind.config.js postcss.config.js ./
RUN npx react-scripts build

# Copy and install server
COPY server ./server
RUN cd server && npm install

# Start the server
CMD ["node", "server/index.js"]
