# Install the app dependencies in a full Node docker image
FROM registry.access.redhat.com/ubi9/nodejs-20:latest

# Set the working directory
WORKDIR /opt/app-root/src

# Copy package.json, and optionally package-lock.json if it exists
COPY package.json package-lock.json* ./

# Install app dependencies
RUN npm ci 
# RUN npm ci --only=production

# Copy the application code
COPY . ./

# Start the application
CMD ["npm", "start"]