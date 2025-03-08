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

# Clone the production rules repository into rules/prod
RUN mkdir -p rules/prod && \
    git clone -b main https://github.com/bcgov/brms-rules.git ./tmp-brm-rules && \
    mv ./tmp-brm-rules/rules/* rules/prod && \
    rm -rf ./tmp-brm-rules

# Clone the dev rules repository into rules/dev
RUN mkdir -p rules/dev && \
    git clone -b dev https://github.com/bcgov/brms-rules.git ./tmp-brm-rules && \
    mv ./tmp-brm-rules/rules/* rules/dev && \
    rm -rf ./tmp-brm-rules

# Start the application
CMD ["npm", "start"]