// Square Checkout API Integration
// Creates Square payment links from cart data with server-side validation

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Dynamic CORS based on environment
const BASE_URL = Deno.env.get('BASE_URL') || 'https://wactc.tntmanufacturing.shop'
const allowedOrigins = ['https://wactc.tntmanufacturing.shop', 'http://localhost:8000']

// Function to get CORS headers with dynamic origin
function getCorsHeaders(origin: string | null): Record<string, string> {
  const allowedOrigin = origin && allowedOrigins.includes(origin) 
    ? origin 
    : BASE_URL
  
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Types
interface CartItem {
  id: string
  product_id?: string
  name: string
  price: number
  quantity: number
  selections?: Record<string, string>
  description?: string
  image?: string
}

interface CustomerInfo {
  firstName: string
  lastName: string
  email: string
  customerType?: string
}

interface OrderTotals {
  subtotal: number
  tax: number
  total: number
}

interface CheckoutRequest {
  cart: CartItem[]
  customerInfo: CustomerInfo
  totals: OrderTotals
}

interface CheckoutResponse {
  checkoutUrl: string
  orderId: string
  referenceId: string
  error?: string
}

// Square API configuration
const SQUARE_ENV = Deno.env.get('SQUARE_ENV') || 'sandbox'
const SQUARE_ACCESS_TOKEN = Deno.env.get('SQUARE_ACCESS_TOKEN')
const SQUARE_LOCATION_ID = Deno.env.get('SQUARE_LOCATION_ID')
const SQUARE_APPLICATION_ID = Deno.env.get('SQUARE_APPLICATION_ID')
const POPUP_SITE_ID = Deno.env.get('POPUP_SITE_ID') || 'WACTC-main'

// Square API base URL
const SQUARE_API_BASE = SQUARE_ENV === 'production' 
  ? 'https://connect.squareup.com/v2'
  : 'https://connect.squareupsandbox.com/v2'

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!
// WACTC data lives in the 'wactc' schema on the TNT Apparel project
const supabase = createClient(supabaseUrl, supabaseKey, { db: { schema: 'wactc' } })

// Generate unique reference ID
function generateReferenceId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  return `ref-${timestamp}-${random}`
}

// Generate order number
function generateOrderNumber(): string {
  const timestamp = Date.now()
  return `WACTC-${timestamp}`
}

// Validate cart items exist in database (security check)
async function validateCartItems(cart: CartItem[]): Promise<boolean> {
  try {
    const productIds = cart.map(item => {
      if (item.id.includes('-')) {
        return item.id.split('-')[0]
      }
      return item.id
    }).filter((id, index, self) => self.indexOf(id) === index)

    const { data: products, error } = await supabase
      .from('products')
      .select('product_id')
      .in('product_id', productIds)

    if (error) {
      console.error('Error validating products:', error)
      return false
    }

    const foundIds = products?.map(p => p.product_id) || []
    const missingIds = productIds.filter(id => !foundIds.includes(id))
    
    if (missingIds.length > 0) {
      console.error('Invalid products found in cart:', missingIds)
      return false
    }

    return true
  } catch (error) {
    console.error('Error validating cart items:', error)
    return false
  }
}

// Create Square payment link
async function createSquarePaymentLink(
  cart: CartItem[],
  customerInfo: CustomerInfo,
  totals: OrderTotals,
  orderId: string,
  referenceId: string
): Promise<string | null> {
  try {
    const paymentLinkData = {
      idempotency_key: `${orderId}-payment-link-${Date.now()}`,
      quick_pay: {
        name: cart.map(item => `${item.name} (${item.quantity})`).join(', ').substring(0, 255) || 'Order',
        price_money: {
          amount: Math.round(totals.total * 100),
          currency: 'USD'
        },
        location_id: SQUARE_LOCATION_ID
      },
      checkout_options: {
        allow_tipping: false,
        redirect_url: `${BASE_URL}/thank-you.html?order=${orderId}&ref=${referenceId}`
      },
      pre_populated_data: {
        buyer_email: customerInfo.email
      }
    }

    const paymentLinkResponse = await fetch(`${SQUARE_API_BASE}/online-checkout/payment-links`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SQUARE_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'Square-Version': '2023-10-18'
      },
      body: JSON.stringify(paymentLinkData)
    })

    if (!paymentLinkResponse.ok) {
      const errorText = await paymentLinkResponse.text()
      console.error('Square payment link creation failed:', errorText)
      return null
    }

    const paymentLinkResult = await paymentLinkResponse.json()
    return paymentLinkResult.payment_link?.url || null

  } catch (error) {
    console.error('Error creating Square payment link:', error)
    return null
  }
}

// Create pending order in Supabase
async function createPendingOrder(
  cart: CartItem[],
  customerInfo: CustomerInfo,
  totals: OrderTotals,
  orderId: string,
  referenceId: string,
  checkoutUrl: string
): Promise<boolean> {
  try {
    const fullCustomerName = `${customerInfo.firstName} ${customerInfo.lastName}`
    console.log('Creating order with customer info:', {
      customer_name: fullCustomerName,
      customer_email: customerInfo.email,
      customer_type: customerInfo.customerType || 'customer'
    })
    
    const { error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderId,
        customer_name: fullCustomerName,
        customer_email: customerInfo.email,
        customer_type: customerInfo.customerType || 'customer',
        subtotal: totals.subtotal,
        tax: totals.tax,
        total: totals.total,
        payment_method: 'square',
        notes: `Order from ${POPUP_SITE_ID}`,
        payment_status: 'pending',
        popup_site_id: POPUP_SITE_ID,
        reference_id: referenceId,
        square_checkout_url: checkoutUrl
      })

    if (orderError) {
      console.error('Error creating order:', orderError)
      return false
    }

    const { data: order, error: orderFetchError } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', orderId)
      .single()

    if (orderFetchError || !order) {
      console.error('Error fetching created order:', orderFetchError)
      return false
    }

    const orderItems = cart.map(item => ({
      order_id: order.id,
      product_id: item.id.includes('-') ? item.id.split('-')[0] : item.id,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.price,
      selections: item.selections || {},
      subtotal: item.price * item.quantity
    }))

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems)

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      return false
    }

    return true
  } catch (error) {
    console.error('Error creating pending order:', error)
    return false
  }
}

// Main handler
serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
      return new Response(
        JSON.stringify({ error: 'Square configuration missing' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestData: CheckoutRequest = await req.json()
    const { cart, customerInfo, totals } = requestData
    
    console.log('Checkout request - Customer Info:', JSON.stringify({
      firstName: customerInfo?.firstName,
      lastName: customerInfo?.lastName,
      email: customerInfo?.email,
      customerType: customerInfo?.customerType
    }))

    if (!cart || !Array.isArray(cart) || cart.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Cart is required and must not be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!customerInfo?.firstName || !customerInfo?.lastName || !customerInfo?.email) {
      return new Response(
        JSON.stringify({ error: 'Customer information is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!totals || typeof totals.total !== 'number' || totals.total <= 0) {
      return new Response(
        JSON.stringify({ error: 'Valid totals are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isValidCart = await validateCartItems(cart)
    if (!isValidCart) {
      return new Response(
        JSON.stringify({ error: 'Invalid products in cart' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderId = generateOrderNumber()
    const referenceId = generateReferenceId()

    const checkoutUrl = await createSquarePaymentLink(cart, customerInfo, totals, orderId, referenceId)
    if (!checkoutUrl) {
      return new Response(
        JSON.stringify({ error: 'Failed to create payment link' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const orderCreated = await createPendingOrder(cart, customerInfo, totals, orderId, referenceId, checkoutUrl)
    if (!orderCreated) {
      return new Response(
        JSON.stringify({ error: 'Failed to create order record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Emails will be sent by webhook after payment completes
    console.log('Order created, emails will be sent after payment completion')

    const response: CheckoutResponse = {
      checkoutUrl,
      orderId,
      referenceId
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Checkout error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
