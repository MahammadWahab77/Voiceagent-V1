# Use official Node.js image
FROM node:20-slim

# Create app directory
WORKDIR /app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Define environment variable for PORT (Cloud Run sets this automatically, but good callback)
ENV PORT=3001

# Start the application
CMD [ "npm", "start" ]
