# Build stage
FROM node:16-alpine AS build

# Set working directory
WORKDIR /app

# Install necessary build tools
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package.json and package-lock.json
COPY package.json ./

# Display Node and npm versions for debugging
RUN node --version && npm --version

# Install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# Build the app
RUN npm run build

# Serve stage
FROM nginx:alpine

# Copy built assets from build stage
COPY --from=build /app/build /usr/share/nginx/html

# Copy custom nginx config
#COPY nginx.conf.template .
COPY nginx.conf.template /etc/nginx/conf.d/default.conf.template
RUN apk add --no-cache gettext

# Expose port 3000
EXPOSE 3000

# Start Nginx server with substituting env variables referred in the template file
# CMD ["nginx", "-g", "daemon off;"]
#CMD ["/bin/sh" , "-c" , "envsubst < nginx.conf.template > /etc/nginx/conf.d/default.conf && exec nginx -g 'daemon off;'"]
CMD ["/bin/sh", "-c", "envsubst '${USERS_DOMAIN} ${PRODUCTS_DOMAIN} ${ORDERS_DOMAIN}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

