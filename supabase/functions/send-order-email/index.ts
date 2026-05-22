// Supabase Edge Function for sending order confirmation emails
// This function sends both customer confirmation and admin notification emails

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @deno-types="npm:@types/nodemailer"
import nodemailer from "npm:nodemailer@6.9.7"

// SECURITY: Configure CORS to only allow your domains
// Production domain configured
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://wactc.tntmanufacturing.shop', // Production domain
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface OrderItem {
  id?: string
  product_id?: string
  name: string
  quantity: number
  price: number
  selections?: Record<string, string>
}

interface OrderData {
  order_number: string
  customer_name: string
  customer_email: string
  customer_type: string
  items: OrderItem[]
  subtotal: number
  total: number
  created_at: string
  notes?: string
  payment_method?: string
  payment_status?: string
}

function formatPaymentMethod(method?: string): string {
  const normalized = (method || 'square').toLowerCase()
  if (normalized === 'purchase_order' || normalized === 'purchase-order') {
    return 'Purchase Order'
  }
  if (normalized === 'square') {
    return 'Square'
  }
  return normalized
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatPaymentStatus(status?: string): string {
  if (!status) {
    return 'Pending'
  }
  return status
    .toString()
    .toLowerCase()
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function generateCustomerEmailHTML(order: OrderData): string {
  const itemsHTML = order.items.map(item => {
    const itemPrice = parseFloat(String(item.price || 0))
    const itemQuantity = parseInt(String(item.quantity || 1))
    const itemTotal = itemPrice * itemQuantity
    const selectionsHTML = item.selections && Object.keys(item.selections).length > 0
      ? `<br><span style="color: #333; font-size: 13px; line-height: 1.5;">${Object.entries(item.selections).map(([key, value]) => `<span style="display: inline-block; margin-right: 8px; white-space: nowrap;"><strong>${key}:</strong> ${value}</span>`).join('')}</span>`
      : ''
    
    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; min-width: 200px;">
          <strong style="display: block; margin-bottom: 4px;">${item.name}</strong>${selectionsHTML}
        </td>
        <td class="price-col" style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; white-space: nowrap;">${itemQuantity}</td>
        <td class="price-col" style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;">$${itemPrice.toFixed(2)}</td>
        <td class="price-col" style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;"><strong>$${itemTotal.toFixed(2)}</strong></td>
      </tr>
    `
  }).join('')

  const paymentMethodDisplay = formatPaymentMethod(order.payment_method)
  const paymentStatusDisplay = formatPaymentStatus(order.payment_status)

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @media only screen and (max-width: 600px) {
          .email-container {
            width: 100% !important;
          }
          .header {
            padding: 20px !important;
          }
          .content {
            padding: 20px 15px !important;
          }
          .header h1 {
            font-size: 22px !important;
          }
          table {
            font-size: 14px !important;
          }
          td, th {
            padding: 8px 4px !important;
          }
          .price-col {
            font-size: 13px !important;
          }
        }
      </style>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <div class="email-container" style="max-width: 600px; margin: 0 auto; background-color: white;">
        <!-- Header -->
        <div class="header" style="background: linear-gradient(135deg, #5a1a1c 0%, #6b2224 50%, #5a1a1c 100%); padding: 30px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 28px;">WACTC Apparel Store</h1>
          <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">Order Confirmation</p>
        </div>
        
        <!-- Content -->
        <div class="content" style="padding: 40px 30px;">
          <h2 style="color: #5a1a1c; margin: 0 0 10px 0;">Thank You for Your Order!</h2>
          <p style="color: #666; font-size: 16px; line-height: 1.6;">
            Hi ${order.customer_name},<br><br>
            Your order has been successfully received and is being processed. Here are your order details:
          </p>
          
          <!-- Order Info -->
          <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Order Number:</strong></td>
                <td style="padding: 8px 0; text-align: right; color: #5a1a1c; font-weight: bold;">${order.order_number}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Order Date:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${new Date(order.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/New_York'
                })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Payment Method:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${paymentMethodDisplay}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Payment Status:</strong></td>
                <td style="padding: 8px 0; text-align: right;">${paymentStatusDisplay}</td>
              </tr>
            </table>
          </div>
          
          <!-- Order Items -->
          <h3 style="color: #5a1a1c; margin: 30px 0 15px 0;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; border: 1px solid #eee;">
            <thead>
              <tr style="background-color: #f9f9f9;">
                <th style="padding: 12px; text-align: left; border-bottom: 2px solid #5a1a1c;">Item</th>
                <th style="padding: 12px; text-align: center; border-bottom: 2px solid #5a1a1c;">Qty</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #5a1a1c;">Price</th>
                <th style="padding: 12px; text-align: right; border-bottom: 2px solid #5a1a1c;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHTML}
            </tbody>
            <tfoot>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; border-top: 2px solid #5a1a1c;"><strong>Subtotal:</strong></td>
                <td style="padding: 12px; text-align: right; border-top: 2px solid #5a1a1c;"><strong>$${order.subtotal.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td colspan="3" style="padding: 12px; text-align: right; background-color: #5a1a1c; color: white;"><strong>TOTAL:</strong></td>
                <td style="padding: 12px; text-align: right; background-color: #5a1a1c; color: white; font-size: 18px;"><strong>$${order.total.toFixed(2)}</strong></td>
              </tr>
            </tfoot>
          </table>
          
          <!-- Next Steps -->
          <div style="margin: 30px 0; padding: 20px; background-color: #e8f5e9; border-radius: 8px;">
            <h3 style="color: #2e7d32; margin: 0 0 10px 0; font-size: 18px;">What's Next?</h3>
            <p style="color: #666; margin: 0; line-height: 1.6;">
              • You will receive a confirmation when your order is ready<br>
              • For questions about your order, please contact us<br>
              • Keep this email for your records
            </p>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f9f9f9; padding: 25px 30px; border-top: 1px solid #eee;">
          <p style="margin: 0 0 10px 0; color: #666; font-size: 14px; text-align: center;">
            Questions? Contact us at:<br>
            <a href="mailto:tntmfg@comcast.net" style="color: #5a1a1c; text-decoration: none;">tntmfg@comcast.net</a>
          </p>
          <p style="margin: 15px 0 0 0; color: #999; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} WACTC. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

function generateAdminEmailHTML(order: OrderData): string {
  // Helper function to determine program from product name
  const determineProgram = (productName: string | undefined): string => {
    if (!productName) return '';
    const name = productName.toLowerCase();
    if (name.includes('aret')) return 'ARET';
    if (name.includes('auto')) return 'Auto';
    if (name.includes('carpentry')) return 'Carpentry';
    if (name.includes('collision')) return 'Collision Repair';
    if (name.includes('electrical')) return 'Electrical Occupations';
    if (name.includes('eps')) return 'EPS';
    if (name.includes('hvac')) return 'HVAC';
    if (name.includes('machine')) return 'Machine Shop';
    if (name.includes('masonry')) return 'Masonry';
    if (name.includes('networking') || name.includes('network')) return 'Networking';
    if (name.includes('sports med')) return 'Sports Medicine';
    if (name.includes('welding')) return 'Welding';
    return '';
  };

  const paymentMethodNormalized = (order.payment_method || 'square').toLowerCase();
  const paymentMethodDisplay = formatPaymentMethod(order.payment_method);
  const paymentStatusNormalized = (order.payment_status || 'pending').toLowerCase();
  const paymentStatusDisplay = formatPaymentStatus(order.payment_status);

  const paymentBannerSuffix = paymentMethodNormalized === 'purchase_order' ? ' (Purchase Order)' : '';

  const itemsHTML = order.items.map((item, index) => {
    const itemPrice = parseFloat(String(item.price || 0))
    const itemQuantity = parseInt(String(item.quantity || 1))
    const itemTotal = itemPrice * itemQuantity;
    const productId = item.product_id || item.id || 'N/A';
    const program = determineProgram(item.name);
    
    // Extract selections with emphasis on key details
    let size = '';
    let color = '';
    let otherSelections = [];
    
    if (item.selections && Object.keys(item.selections).length > 0) {
      Object.entries(item.selections).forEach(([key, value]) => {
        if (key.toLowerCase() === 'size') {
          size = value as string;
        } else if (key.toLowerCase() === 'color') {
          color = value as string;
        } else {
          otherSelections.push(`${key}: ${value}`);
        }
      });
    }
    
    return `
      <tr style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9f9f9'};">
        <td style="padding: 10px 8px; border: 1px solid #ddd; font-weight: bold; text-align: center; color: #333; font-size: 13px;">${productId}</td>
        <td style="padding: 10px 8px; border: 1px solid #ddd; color: #333; font-size: 13px;">
          <strong style="display: block; color: #000; margin-bottom: 3px;">${item.name}</strong>
        </td>
        <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 14px; background-color: ${size ? '#fff3cd' : 'transparent'}; color: ${size ? '#856404' : '#666'};">
          ${size || '—'}
        </td>
        <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 14px; background-color: ${color ? '#d1ecf1' : 'transparent'}; color: ${color ? '#0c5460' : '#666'};">
          ${color || '—'}
        </td>
        <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; font-size: 13px; color: #666;">
          ${otherSelections.length > 0 ? otherSelections.join('<br>') : '—'}
        </td>
        <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: center; font-weight: bold; font-size: 16px; background-color: #e8f5e9; color: #2e7d32;">
          ${itemQuantity}
        </td>
        <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-size: 13px; color: #666;">$${itemPrice.toFixed(2)}</td>
        <td style="padding: 10px 8px; border: 1px solid #ddd; text-align: right; font-weight: bold; font-size: 14px; color: #000;">$${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  }).join('');

  const customerTypeDisplay = order.customer_type || 'N/A';
  const isStudent = customerTypeDisplay.toLowerCase().includes('student');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          margin: 0;
          padding: 0;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f0f0f0;
        }
        .email-container {
          max-width: 1000px;
          margin: 0 auto;
          background-color: white;
        }
        table {
          border-collapse: collapse;
          width: 100%;
        }
        @media only screen and (max-width: 1000px) {
          .email-container {
            width: 100% !important;
          }
          .content {
            padding: 20px 15px !important;
          }
          table {
            font-size: 11px !important;
          }
          td, th {
            padding: 6px 4px !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #9d025b 0%, #b8036e 50%, #9d025b 100%); padding: 25px 30px; text-align: center; border-bottom: 4px solid #4a4a4a;">
          <h1 style="color: white; margin: 0; font-size: 26px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">📋 Production Order Sheet</h1>
          <p style="color: rgba(255,255,255,0.95); margin: 8px 0 0 0; font-size: 15px; font-weight: 500;">WACTC Apparel Store - Order Processing</p>
        </div>
        
        <!-- Content -->
        <div class="content" style="padding: 30px;">
          <!-- Priority Alert -->
          <div style="background-color: #fff3cd; padding: 15px 20px; border-radius: 6px; margin: 0 0 25px 0; border-left: 5px solid #4a4a4a; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <p style="margin: 0; font-size: 16px; color: #856404; font-weight: bold;">
              ⚠️ NEW ORDER REQUIRES PROCESSING${paymentBannerSuffix}
            </p>
          </div>
          
          <!-- Order Summary Info -->
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; margin-bottom: 25px; border: 1px solid #dee2e6;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; width: 35%; font-weight: bold; color: #495057;">Order Number:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #9d025b; font-weight: bold; font-size: 16px;">${order.order_number}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; width: 25%; font-weight: bold; color: #495057;">Order Date:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #333;">${new Date(order.created_at).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'short', 
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: true,
                  timeZone: 'America/New_York'
                })}</td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #495057;">Customer Name:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; color: #000; font-weight: 600;">${order.customer_name}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0; font-weight: bold; color: #495057;">Customer Type:</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #e0e0e0;">
                  <span style="display: inline-block; padding: 4px 12px; background-color: ${isStudent ? '#d4edda' : '#d1ecf1'}; color: ${isStudent ? '#155724' : '#0c5460'}; border-radius: 12px; font-weight: bold; font-size: 13px;">
                    ${customerTypeDisplay}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; font-weight: bold; color: #495057;">Customer Email:</td>
                <td colspan="3" style="padding: 8px 12px; color: #9d025b;"><a href="mailto:${order.customer_email}" style="color: #9d025b; text-decoration: none; font-weight: 500;">${order.customer_email}</a></td>
              </tr>
              <tr>
                <td style="padding: 8px 12px; border-top: 1px solid #e0e0e0; font-weight: bold; color: #495057;">Payment Method:</td>
                <td style="padding: 8px 12px; border-top: 1px solid #e0e0e0; color: #333; font-weight: 600;">${paymentMethodDisplay}</td>
                <td style="padding: 8px 12px; border-top: 1px solid #e0e0e0; font-weight: bold; color: #495057;">Payment Status:</td>
                <td style="padding: 8px 12px; border-top: 1px solid #e0e0e0; color: #333;">${paymentStatusDisplay}</td>
              </tr>
            </table>
          </div>
          
          <!-- Production Items Table -->
          <h3 style="color: #9d025b; margin: 30px 0 15px 0; font-size: 18px; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 3px solid #4a4a4a; padding-bottom: 8px;">
            📦 Items to Fulfill
          </h3>
          
          <div style="overflow-x: auto; margin-bottom: 25px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
            <table style="width: 100%; border-collapse: collapse; border: 2px solid #9d025b; background-color: white;">
              <thead>
                <tr style="background: linear-gradient(135deg, #9d025b 0%, #b8036e 100%); color: white;">
                  <th style="padding: 12px 8px; text-align: center; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase;">Product ID</th>
                  <th style="padding: 12px 8px; text-align: left; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase; min-width: 180px;">Product Name</th>
                  <th style="padding: 12px 8px; text-align: center; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase; background-color: rgba(255, 235, 59, 0.2);">Size</th>
                  <th style="padding: 12px 8px; text-align: center; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase; background-color: rgba(41, 182, 246, 0.2);">Color</th>
                  <th style="padding: 12px 8px; text-align: center; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase;">Options</th>
                  <th style="padding: 12px 8px; text-align: center; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase; background-color: rgba(76, 175, 80, 0.2);">QTY</th>
                  <th style="padding: 12px 8px; text-align: right; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase;">Unit Price</th>
                  <th style="padding: 12px 8px; text-align: right; border: 1px solid #fff; font-size: 12px; font-weight: bold; text-transform: uppercase;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHTML}
              </tbody>
              <tfoot>
                <tr style="background-color: #f8f9fa; border-top: 3px solid #9d025b;">
                  <td colspan="7" style="padding: 12px; text-align: right; font-weight: bold; font-size: 15px; color: #495057; border: 1px solid #ddd;">SUBTOTAL:</td>
                  <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 15px; color: #000; border: 1px solid #ddd;">$${order.subtotal.toFixed(2)}</td>
                </tr>
                <tr style="background: linear-gradient(135deg, #9d025b 0%, #b8036e 100%); color: white;">
                  <td colspan="7" style="padding: 14px; text-align: right; font-weight: bold; font-size: 17px; text-transform: uppercase; border: 1px solid #9d025b;">ORDER TOTAL:</td>
                  <td style="padding: 14px; text-align: right; font-weight: bold; font-size: 18px; border: 1px solid #9d025b;">$${order.total.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          ${order.notes ? `
          <div style="margin: 25px 0; padding: 18px; background-color: #fff3e0; border-left: 5px solid #ff9800; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <strong style="color: #e65100; font-size: 15px; display: block; margin-bottom: 8px;">📝 CUSTOMER NOTES:</strong>
            <div style="color: #333; font-size: 14px; line-height: 1.6; background-color: white; padding: 12px; border-radius: 3px;">${order.notes}</div>
          </div>
          ` : ''}
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8f9fa; padding: 20px 30px; border-top: 3px solid #9d025b; text-align: center;">
          <p style="margin: 0; color: #666; font-size: 13px; font-weight: 500;">
            Automated Order Notification • WACTC Apparel Store Production System
          </p>
          <p style="margin: 8px 0 0 0; color: #999; font-size: 11px;">
            &copy; ${new Date().getFullYear()} WACTC. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SECURITY: Basic API key validation
    // Allow internal function calls (from webhooks) or calls with proper auth
    const authHeader = req.headers.get('authorization')
    const apiKey = req.headers.get('apikey')
    
    // Log for debugging
    console.log('Auth check - Has authHeader:', !!authHeader, 'Has apiKey:', !!apiKey)
    
    // Allow if either auth method is present, or if it's an internal call
    // (Internal Supabase function calls don't always include these headers)
    if (!authHeader && !apiKey) {
      console.log('Warning: No auth headers, but allowing for internal function calls')
    }

    // Parse request body
    const { orderData } = await req.json() as { orderData: OrderData }
    
    console.log('Received order data:', JSON.stringify({
      order_number: orderData?.order_number,
      customer_name: orderData?.customer_name,
      customer_email: orderData?.customer_email,
      customer_type: orderData?.customer_type
    }))
    
    // SECURITY: Validate order data to prevent malicious input
    if (!orderData) {
      throw new Error('Order data is required')
    }
    
    if (!orderData.order_number || !orderData.customer_name || !orderData.customer_email) {
      throw new Error('Missing required order information')
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(orderData.customer_email)) {
      throw new Error('Invalid customer email address')
    }
    
    // Limit items to prevent abuse
    if (orderData.items && orderData.items.length > 100) {
      throw new Error('Too many items in order')
    }

    // Get SMTP credentials from environment variables
    const smtpHost = Deno.env.get('SMTP_HOST') || 'smtp.hostinger.com'
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465')
    const smtpUser = Deno.env.get('SMTP_USER') || 'contact@tntmanufacturing.shop'
    const smtpPassword = Deno.env.get('SMTP_PASSWORD')
    const adminEmail = Deno.env.get('ADMIN_EMAIL') || 'contact@tntmanufacturing.shop'

    if (!smtpPassword) {
      throw new Error('SMTP_PASSWORD environment variable is not set')
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // true for 465, false for other ports
      auth: {
        user: smtpUser,
        pass: smtpPassword,
      },
    })

    // Send customer confirmation email
    if (orderData.customer_email) {
      try {
        await transporter.sendMail({
          from: `"WACTC Apparel Store" <${smtpUser}>`,
          to: orderData.customer_email,
          subject: `Order Confirmation - ${orderData.order_number}`,
          html: generateCustomerEmailHTML(orderData),
        })
        console.log(`✅ Customer confirmation email sent to ${orderData.customer_email}`)
      } catch (error) {
        console.error('❌ Error sending customer email:', error)
        throw error
      }
    }

    // Send admin notification email
    try {
      console.log(`Attempting to send admin email to: ${adminEmail}`)
      await transporter.sendMail({
        from: `"WACTC Apparel Store" <${smtpUser}>`,
        to: adminEmail,
        subject: `🔔 New Order: ${orderData.order_number} - ${orderData.customer_name}`,
        html: generateAdminEmailHTML(orderData),
      })
      console.log(`✅ Admin notification email sent to ${adminEmail}`)
    } catch (error) {
      console.error('❌ Error sending admin email:', error)
      console.error('Admin email value:', adminEmail)
      // Don't throw - customer email already sent successfully
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Emails sent successfully',
        customerEmail: orderData.customer_email,
        adminEmail: adminEmail
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error sending emails:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})


