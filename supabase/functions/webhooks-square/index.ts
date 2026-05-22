// Square Webhook Handler
// Handles payment notifications from Square
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
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-square-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }
}

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
// WACTC data lives in the 'wactc' schema on the TNT Apparel project
const supabase = createClient(supabaseUrl, supabaseServiceKey, { db: { schema: 'wactc' } })

interface SquareWebhookEvent {
  merchant_id?: string
  type?: string
  event_id?: string
  created_at?: string
  data?: {
    type?: string
    id?: string
    object?: {
      payment?: {
        id?: string
        order_id?: string
        status?: string
        total_money?: {
          amount?: number
          currency?: string
        }
        receipt_url?: string
      }
      order?: {
        id?: string
        reference_id?: string
        state?: string
      }
    }
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('origin'))
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    console.log('=== SQUARE WEBHOOK RECEIVED ===')
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    // Parse webhook payload
    const webhookData: SquareWebhookEvent = await req.json()
    console.log('Webhook type:', webhookData.type)
    console.log('Event ID:', webhookData.event_id)
    
    // Verify this is from Square by checking webhook signature
    const signature = req.headers.get('x-square-hmacsha256-signature')
    if (!signature) {
      console.log('Warning: No Square signature found in webhook')
      // Allow webhooks without signature in sandbox mode for now
    }
    // TODO: Implement full signature verification for production
    
    // Handle payment.updated events
    if (webhookData.type === 'payment.updated' || webhookData.type === 'payment.created') {
      const payment = webhookData.data?.object?.payment
      
      if (!payment) {
        console.error('No payment data in webhook')
        return new Response(
          JSON.stringify({ error: 'No payment data' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('Payment ID:', payment.id)
      console.log('Payment Status:', payment.status)
      
      // Find order - Quick Pay doesn't create Square orders, so we search by:
      // 1. Payment amount and pending status
      // 2. Recent orders (last 30 minutes)
      // 3. Match by payment amount
      const paymentAmount = payment.total_money?.amount ? payment.total_money.amount / 100 : 0
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
      
      console.log('Looking for order with amount:', paymentAmount)
      
      const { data: orders, error: findError } = await supabase
        .from('orders')
        .select('*')
        .eq('payment_status', 'pending')
        .eq('payment_method', 'square')
        .eq('total', paymentAmount)
        .gte('created_at', thirtyMinutesAgo)
        .order('created_at', { ascending: false })
        .limit(1)
      
      if (findError) {
        console.error('Error finding order:', findError)
        return new Response(
          JSON.stringify({ error: 'Database error' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      if (!orders || orders.length === 0) {
        console.log('No pending order found matching payment amount:', paymentAmount)
        return new Response(
          JSON.stringify({ message: 'Order not found, will retry' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      const order = orders[0]
      console.log('Found order:', order.order_number)
      console.log('Customer Info from DB:', {
        customer_name: order.customer_name,
        customer_email: order.customer_email,
        customer_type: order.customer_type
      })
      
      // Determine payment status
      let paymentStatus = 'pending'
      if (payment.status === 'COMPLETED') {
        paymentStatus = 'completed'
      } else if (payment.status === 'FAILED' || payment.status === 'CANCELED') {
        paymentStatus = 'failed'
      }
      
      // Update order with payment information
      const updateData: any = {
        square_payment_id: payment.id,
        payment_status: paymentStatus,
        updated_at: new Date().toISOString()
      }
      
      if (payment.status === 'COMPLETED') {
        updateData.payment_completed_at = new Date().toISOString()
      }
      
      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)
      
      if (updateError) {
        console.error('Error updating order:', updateError)
        return new Response(
          JSON.stringify({ error: 'Failed to update order' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      console.log('Order updated successfully:', order.order_number, 'Status:', paymentStatus)
      
      // Send confirmation email if payment completed
      if (payment.status === 'COMPLETED') {
        try {
          console.log('Sending order confirmation email...')
          
          // Get order items
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('*')
            .eq('order_id', order.id)
          
          console.log('Raw order items from database:', JSON.stringify(orderItems))
          
          // Map order items to expected format (product_name -> name, unit_price -> price)
          const mappedItems = (orderItems || []).map(item => ({
            id: item.id,
            product_id: item.product_id,
            name: item.product_name || 'Product',
            quantity: item.quantity || 1,
            price: item.unit_price || 0,
            selections: item.selections || {},
            subtotal: item.subtotal || (item.unit_price * item.quantity) || 0
          }))
          
          console.log('Mapped items for email:', JSON.stringify(mappedItems))
          
          // Prepare email data
          const emailData = {
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_email: order.customer_email,
            customer_type: order.customer_type,
            items: mappedItems,
            subtotal: order.subtotal,
            tax: order.tax || 0,
            total: order.total,
            created_at: order.created_at,
            notes: order.notes,
            square_payment_id: payment.id,
            payment_method: order.payment_method || 'square',
            payment_status: paymentStatus
          }
          
          console.log('Email data being sent:', JSON.stringify({
            order_number: emailData.order_number,
            customer_name: emailData.customer_name,
            customer_email: emailData.customer_email,
            customer_type: emailData.customer_type
          }))
          
          // Call email function
          const { error: emailError } = await supabase.functions.invoke('send-order-email', {
            body: {
              orderData: emailData
            }
          })
          
          if (emailError) {
            console.error('Error sending email:', emailError)
          } else {
            console.log('Confirmation email sent successfully')
          }
        } catch (emailError) {
          console.error('Email error (non-blocking):', emailError)
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Webhook processed successfully',
          order_number: order.order_number,
          payment_status: paymentStatus
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Handle order.updated events
    if (webhookData.type === 'order.updated') {
      const order = webhookData.data?.object?.order
      console.log('Order updated event:', order?.id, 'State:', order?.state)
      
      return new Response(
        JSON.stringify({ message: 'Order event logged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Unknown event type - just acknowledge it
    console.log('Unknown webhook type:', webhookData.type)
    return new Response(
      JSON.stringify({ message: 'Event acknowledged' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('=== WEBHOOK ERROR ===')
    console.error('Error:', error)
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error')
    
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
