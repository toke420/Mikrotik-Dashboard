# Mikrotik Router Dashboard

A web-based dashboard for monitoring Mikrotik routers.

## Project Structure

- \`/frontend\` - React application
- \`/backend\` - Express API server

## Setup Instructions

### Backend Setup

1. Navigate to the backend directory:
   
   cd backend
   

2. Install dependencies:
   
   npm install
   

3. Create a \`.env\` file with your router configurations

   .env file should be structured like:
   
# Server configuration
PORT=3001

# Router 1 configuration
ROUTER1_NAME=DeviceName
ROUTER1_IP=deviceIPaddress
ROUTER1_USER=api
ROUTER1_PASSWORD=StrongPassword
ROUTER1_MODEL=hAP ac2
ROUTER1_CLIENT=CompanyorOwnerName

# Router 2 configuration (optional)
ROUTER2_NAME=DeviceName
ROUTER2_IP=deviceIPaddress
ROUTER2_USER=api
ROUTER2_PASSWORD=StrongPassword
ROUTER2_MODEL=CRS125-24G-1S
ROUTER2_CLIENT=CompanyorOwnerName


5. Start the API server:
   
   node server.js
   

### Frontend Setup

1. Navigate to the frontend directory:
   
   cd frontend
   

2. Install dependencies:
   
   npm install
   

3. Start the development server:
   
   npm start
   

## Production Deployment

See the documentation for detailed deployment instructions.
