# Environment Variables Setup Guide

This project uses environment variables to store sensitive configuration data. Follow these steps to set up your environment.

## Quick Start

1. **Copy the example file:**
   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual values** in the `.env` file (or set them as system environment variables)

3. **For Windows (PowerShell):**
   ```powershell
   $env:DB_PASSWORD="your_password"
   $env:JWT_SECRET="your_jwt_secret"
   $env:RAZORPAY_KEY="your_key"
   $env:RAZORPAY_SECRET="your_secret"
   $env:CLOUDINARY_CLOUD_NAME="your_cloud_name"
   $env:CLOUDINARY_API_KEY="your_api_key"
   $env:CLOUDINARY_API_SECRET="your_api_secret"
   ```

4. **For Windows (Command Prompt):**
   ```cmd
   set DB_PASSWORD=your_password
   set JWT_SECRET=your_jwt_secret
   set RAZORPAY_KEY=your_key
   set RAZORPAY_SECRET=your_secret
   set CLOUDINARY_CLOUD_NAME=your_cloud_name
   set CLOUDINARY_API_KEY=your_api_key
   set CLOUDINARY_API_SECRET=your_api_secret
   ```

5. **For Linux/Mac:**
   ```bash
   export DB_PASSWORD="your_password"
   export JWT_SECRET="your_jwt_secret"
   export RAZORPAY_KEY="your_key"
   export RAZORPAY_SECRET="your_secret"
   export CLOUDINARY_CLOUD_NAME="your_cloud_name"
   export CLOUDINARY_API_KEY="your_api_key"
   export CLOUDINARY_API_SECRET="your_api_secret"
   ```

## Required Environment Variables

### Database
- `DB_URL` - MySQL database connection URL (default: `jdbc:mysql://localhost:3306/chalre`)
- `DB_USERNAME` - Database username (default: `root`)
- `DB_PASSWORD` - Database password (**REQUIRED**)

### JWT Authentication
- `JWT_SECRET` - Secret key for JWT token signing (**REQUIRED**, minimum 32 characters)

### Razorpay Payment Gateway
- `RAZORPAY_KEY` - Razorpay API key (**REQUIRED**)
- `RAZORPAY_SECRET` - Razorpay API secret (**REQUIRED**)

### Cloudinary Image Upload
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name (**REQUIRED**)
- `CLOUDINARY_API_KEY` - Cloudinary API key (**REQUIRED**)
- `CLOUDINARY_API_SECRET` - Cloudinary API secret (**REQUIRED**)

## Important Security Notes

⚠️ **NEVER commit your `.env` file to version control!**

- The `.env` file is already in `.gitignore`
- Use `.env.example` as a template
- For production, use secure secret management (AWS Secrets Manager, Azure Key Vault, etc.)
- Generate a strong, random JWT secret (at least 32 characters)

## Generating a Secure JWT Secret

You can generate a secure JWT secret using:

**Online:**
- Use a secure random string generator (minimum 32 characters)

**Command Line:**
```bash
# Linux/Mac
openssl rand -base64 32

# PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Minimum 0 -Maximum 256 }))
```

## IDE Setup (IntelliJ IDEA / Eclipse)

If you're running the application from your IDE, you can set environment variables in the run configuration:

1. **IntelliJ IDEA:**
   - Run → Edit Configurations
   - Environment variables → Add variables

2. **Eclipse:**
   - Run → Run Configurations
   - Environment tab → Add variables

## Production Deployment

For production environments, use:
- Environment variables set in your hosting platform
- Secret management services (AWS Secrets Manager, HashiCorp Vault, etc.)
- Never hardcode secrets in code or configuration files
