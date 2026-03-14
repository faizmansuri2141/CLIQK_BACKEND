# CLIQK Backend

CLIQK application ka Node.js backend server.

## Features

- User authentication aur authorization
- Community management
- Post creation aur management
- Real-time notifications
- File upload (AWS S3)
- Payment integration (Stripe)
- Firebase push notifications

## Installation

1. Repository clone karo:
```bash
git clone https://github.com/CLIQKWRLD/CLIQK_BACKEND.git
cd CLIQK_BACKEND
```

2. Dependencies install karo:
```bash
npm install
```

3. Environment variables setup karo:
```bash
cp .env.example .env
# .env file mein apni credentials add karo
```

4. Database connection ensure karo (MongoDB)

5. Server start karo:
```bash
npm start
# ya development ke liye
npm run dev
```

## Environment Variables

`.env.example` file dekho for all required environment variables:

- Database connection
- JWT secret
- Stripe keys
- AWS S3 credentials
- Firebase credentials
- FCM server key

## API Documentation

API endpoints:
- `/api/v1/` - Version 1 endpoints
- `/mobile/api/` - Mobile specific endpoints

## Project Structure

```
├── controllers/     # Route controllers
├── models/         # Database models
├── routes/         # API routes
├── middleware/     # Custom middleware
├── utils/          # Utility functions
├── views/          # Handlebars templates
├── public/         # Static files
└── DB/            # Database connection
```

## Contributing

1. Fork karo
2. Feature branch banaye (`git checkout -b feature/amazing-feature`)
3. Commit karo (`git commit -m 'Add amazing feature'`)
4. Push karo (`git push origin feature/amazing-feature`)
5. Pull request create karo

## Security

- Sensitive data environment variables mein hai
- API endpoints properly secured hain
- Input validation aur sanitization implemented hai

## License

Private repository - CLIQKWRLD organization
