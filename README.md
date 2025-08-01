# RF-Online Backend System

# **Scalable Node.js API for Gym Management Platform**  
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-brightgreen)](https://www.mongodb.com/)

> Powering fitness management for coaches and clients with robust API services

## Core Functionality
A[Client Frontend] --> B[Express API]
B --> C[Authentication]
B --> D[Payments]
B --> E[Scheduling]
B --> F[Chat System]
C --> G[JWT Tokens]
D --> H[MercadoPago/PayPal]
E --> I[Calendar Integration]
F --> J[Socket.io]

## Tech Stack
Runtime: Node.js 18
Framework: Express.js
Database: MongoDB + Mongoose ODM
Authentication: JWT with refresh tokens
Payments: MercadoPago & PayPal SDKs
Real-time: Socket.io for chat
Testing: Jest + Supertest
Deployment: Render + MongoDB Atlas

# Key Features
Role-based access control (Client/Coach/Admin)
Secure payment processing with webhooks
Calendar-based scheduling system
Real-time messaging between coaches/clients
Automated email notifications
Performance-optimized MongoDB queries

# **Installation**
# Clone repository
git clone https://github.com/nahuelmieres/rf-online-backend.git
# Install dependencies
npm install
# Set environment variables
cp .env.example .env
# Start development server
npm run dev

# **Environment Variables**
PORT=port_number
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
MERCADOPAGO_ACCESS_TOKEN=mp_test_token
PAYPAL_CLIENT_ID=paypal_client_id
PAYPAL_CLIENT_SECRET=paypal_client_secret
PAYPAL_WEBHOOK_ID=paypal_client_webhook_id

# Contact: nahuelmieres.dev@gmail.com