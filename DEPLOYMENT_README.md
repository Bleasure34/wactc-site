# WACTC Website - Deployment Guide

## Quick Deployment

This folder contains all production-ready files for the WACTC apparel store website with Square payment integration.

## What's Included

### Frontend Files
- `index.html` - Homepage
- `cart/index.html` - Shopping cart
- `staff/` - Staff apparel pages
- `students/` - Student apparel pages
- `assets/` - CSS, JavaScript, and images
- `thank-you.html` - Post-purchase confirmation

### Backend (Supabase Edge Functions)
- `supabase/functions/checkout/` - Payment processing
- `supabase/functions/webhooks-square/` - Square webhook handler
- `supabase/functions/send-order-email/` - Email notifications
- `supabase/migrations/` - Database schema

## Deployment Steps

### 1. Deploy Frontend to Hostinger

Upload all files from this `deploy` folder to your Hostinger public_html directory:
- Use FTP/SFTP or Hostinger File Manager
- Upload all HTML files and the `assets/` folder
- Ensure file permissions are set correctly (644 for files, 755 for directories)

### 2. Deploy Edge Functions to Supabase

From the project root (not this deploy folder), run:

```bash
switch-and-deploy-production.bat
```

This will:
- Switch to production environment (live Square credentials)
- Deploy all edge functions with the latest code
- Wait for deployment to complete

### 3. Configure Environment Variables

Environment variables are automatically set by the deployment script. They include:
- `SQUARE_ENV=production`
- `SQUARE_ACCESS_TOKEN` - Production Square token
- `SQUARE_LOCATION_ID` - Square location
- `SQUARE_APPLICATION_ID` - Square app ID
- `BASE_URL=https://wactc.tntmanufacturing.shop`
- Email configuration

### 4. Test the Deployment

1. Visit https://wactc.tntmanufacturing.shop
2. Add items to cart
3. Proceed to checkout
4. Complete a test purchase with your own credit card
5. Verify:
   - Payment processes successfully
   - Order appears in Supabase database
   - Confirmation emails are sent
   - Square dashboard shows the transaction

### 5. Monitor

- Check Supabase logs: https://supabase.com/dashboard/project/lbjsoxvhfizjuavsszmp/logs
- Check Square dashboard for payments
- Check email delivery

## Switching Back to Sandbox

If you need to test without charging real cards:

```bash
switch-and-deploy-sandbox.bat
```

This switches to sandbox mode with test Square credentials.

## File Structure

```
deploy/
├── index.html              # Homepage
├── cart/index.html         # Shopping cart
├── staff/                  # Staff pages
├── students/               # Student pages
├── assets/                 # Static assets
├── supabase/              # Backend
│   ├── functions/         # Edge functions
│   │   ├── checkout/
│   │   ├── webhooks-square/
│   │   └── send-order-email/
│   └── migrations/        # Database migrations
└── DEPLOYMENT_README.md   # This file
```

## Important Notes

- **CORS**: Edge functions support both localhost (testing) and production domain
- **Payments**: Production mode processes real credit cards
- **Emails**: Sent after payment completion via webhook
- **Database**: Orders stored in Supabase PostgreSQL
- **Security**: All secrets managed via Supabase environment variables

## Troubleshooting

### Checkout Not Working
1. Check Square credentials are correct for production
2. Verify BASE_URL is set to production domain
3. Check Supabase edge function logs
4. Ensure webhook is configured in Square Dashboard

### Emails Not Sending
1. Check `send-order-email` function logs
2. Verify SMTP configuration in edge function
3. Check spam folder for test emails

### CORS Errors
- Edge functions automatically handle CORS for both localhost and production
- If errors persist, check that BASE_URL matches your domain

## Support

For issues or questions, contact:
- Email: tntmfg@comcast.net
- Square Support: https://squareup.com/help
- Supabase Docs: https://supabase.com/docs
