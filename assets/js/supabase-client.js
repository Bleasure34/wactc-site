// WACTC Supabase Client - Database Operations
(function() {
    'use strict';
    
    // Get or create session ID for cart
    function getSessionId() {
        let sessionId = localStorage.getItem('wactc_session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('wactc_session_id', sessionId);
        }
        return sessionId;
    }
    
    const sessionId = getSessionId();
    
    // Database operations
    const SupabaseClient = {
        
        // Programs
        async getPrograms() {
            const { data, error } = await window.WACTC_SUPABASE
                .from('programs')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('Error fetching programs:', error);
                return [];
            }
            return data;
        },
        
        async getProgram(programId) {
            const { data, error } = await window.WACTC_SUPABASE
                .from('programs')
                .select('*')
                .eq('id', programId)
                .single();
            
            if (error) {
                console.error('Error fetching program:', error);
                return null;
            }
            return data;
        },
        
        // Products
        async getProducts(category = null, programId = null) {
            let query = window.WACTC_SUPABASE
                .from('products')
                .select('*')
                .eq('is_active', true);
            
            if (category) {
                query = query.eq('category', category);
            }
            
            if (programId) {
                query = query.eq('program_id', programId);
            }
            
            const { data, error } = await query.order('name');
            
            if (error) {
                console.error('Error fetching products:', error);
                return [];
            }
            return data;
        },
        
        async getProduct(productId) {
            const { data, error } = await window.WACTC_SUPABASE
                .from('products')
                .select('*')
                .eq('id', productId)
                .eq('is_active', true)
                .single();
            
            if (error) {
                console.error('Error fetching product:', error);
                return null;
            }
            return data;
        },
        
        // Cart operations
        async getCart() {
            const { data, error } = await window.WACTC_SUPABASE
                .from('cart_items')
                .select(`
                    *,
                    products (
                        id,
                        name,
                        description,
                        price,
                        image_url,
                        variants
                    )
                `)
                .eq('session_id', sessionId);
            
            if (error) {
                console.error('Error fetching cart:', error);
                return [];
            }
            
            // Transform data to match expected format
            return data.map(item => ({
                id: item.id,
                product_id: item.product_id,
                name: item.products.name,
                description: item.products.description,
                price: parseFloat(item.products.price),
                image: item.products.image_url,
                quantity: item.quantity,
                selections: item.selections || {}
            }));
        },
        
        async addToCart(product) {
            // Check if item already exists with same selections
            const { data: existing, error: searchError } = await window.WACTC_SUPABASE
                .from('cart_items')
                .select('*')
                .eq('session_id', sessionId)
                .eq('product_id', product.id);
            
            if (searchError) {
                console.error('Error checking cart:', searchError);
                return null;
            }
            
            // Find exact match with same selections
            const existingItem = existing?.find(item => 
                JSON.stringify(item.selections || {}) === JSON.stringify(product.selections || {})
            );
            
            if (existingItem) {
                // Update quantity
                const { data, error } = await window.WACTC_SUPABASE
                    .from('cart_items')
                    .update({ 
                        quantity: existingItem.quantity + 1,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existingItem.id)
                    .select()
                    .single();
                
                if (error) {
                    console.error('Error updating cart item:', error);
                    return null;
                }
                return data;
            } else {
                // Add new item
                const { data, error } = await window.WACTC_SUPABASE
                    .from('cart_items')
                    .insert({
                        session_id: sessionId,
                        product_id: product.id,
                        quantity: product.quantity || 1,
                        selections: product.selections || {}
                    })
                    .select()
                    .single();
                
                if (error) {
                    console.error('Error adding to cart:', error);
                    return null;
                }
                return data;
            }
        },
        
        async updateCartItem(itemId, quantity) {
            if (quantity <= 0) {
                return await this.removeFromCart(itemId);
            }
            
            const { data, error } = await window.WACTC_SUPABASE
                .from('cart_items')
                .update({ 
                    quantity: quantity,
                    updated_at: new Date().toISOString()
                })
                .eq('id', itemId)
                .eq('session_id', sessionId)
                .select()
                .single();
            
            if (error) {
                console.error('Error updating cart item:', error);
                return null;
            }
            return data;
        },
        
        async removeFromCart(itemId) {
            const { error } = await window.WACTC_SUPABASE
                .from('cart_items')
                .delete()
                .eq('id', itemId)
                .eq('session_id', sessionId);
            
            if (error) {
                console.error('Error removing from cart:', error);
                return false;
            }
            return true;
        },
        
        async clearCart() {
            const { error } = await window.WACTC_SUPABASE
                .from('cart_items')
                .delete()
                .eq('session_id', sessionId);
            
            if (error) {
                console.error('Error clearing cart:', error);
                return false;
            }
            return true;
        },
        
        async getCartCount() {
            const { data, error } = await window.WACTC_SUPABASE
                .from('cart_items')
                .select('quantity')
                .eq('session_id', sessionId);
            
            if (error) {
                console.error('Error getting cart count:', error);
                return 0;
            }
            
            return data.reduce((sum, item) => sum + item.quantity, 0);
        },
        
        // Orders
        async createOrder(orderData) {
            // Start a transaction by creating order first
            const { data: order, error: orderError } = await window.WACTC_SUPABASE
                .from('orders')
                .insert({
                    customer_name: orderData.customer_name,
                    customer_email: orderData.customer_email,
                    customer_type: orderData.customer_type,
                    subtotal: orderData.subtotal,
                    tax: orderData.tax,
                    total: orderData.total,
                    payment_method: orderData.payment_method,
                    payment_status: orderData.payment_status || 'pending',
                    notes: orderData.notes
                })
                .select()
                .single();
            
            if (orderError) {
                console.error('Error creating order:', orderError);
                return null;
            }
            
            // Add order items
            const orderItems = orderData.items.map(item => {
                // Extract product_id from composite id if product_id is not available (legacy cart items)
                let productId = item.product_id;
                if (!productId && item.id) {
                    // If no selections, the id is the product_id
                    if (!item.selections || Object.keys(item.selections).length === 0) {
                        productId = item.id;
                    } else {
                        // Reconstruct the selection string to remove it from the composite id
                        const selectionString = Object.entries(item.selections)
                            .filter(([key, value]) => value !== undefined)
                            .map(([key, value]) => `${key}-${value.replace(/\s+/g, '-').toLowerCase()}`)
                            .join('-');
                        // Remove the selection string from the composite id
                        if (item.id.endsWith(`-${selectionString}`)) {
                            productId = item.id.slice(0, -(selectionString.length + 1));
                        } else {
                            // Fallback: just use the id as-is
                            productId = item.id;
                        }
                    }
                }
                
                return {
                    order_id: order.id,
                    product_id: productId,
                    product_name: item.name,
                    quantity: item.quantity,
                    unit_price: item.price,
                    selections: item.selections,
                    subtotal: item.price * item.quantity
                };
            });
            
            const { error: itemsError } = await window.WACTC_SUPABASE
                .from('order_items')
                .insert(orderItems);
            
            if (itemsError) {
                console.error('Error creating order items:', itemsError);
                // Note: In a real app, you'd want to rollback the order here
                return null;
            }
            
            // Send order confirmation emails
            try {
                await this.sendOrderEmails({
                    order_number: order.order_number,
                    customer_name: orderData.customer_name,
                    customer_email: orderData.customer_email,
                    customer_type: orderData.customer_type,
                    items: orderData.items,
                    subtotal: orderData.subtotal,
                    total: orderData.total,
                    created_at: order.created_at,
                    notes: orderData.notes,
                    payment_method: orderData.payment_method || order.payment_method,
                    payment_status: orderData.payment_status || order.payment_status
                });
                console.log('Order confirmation emails sent successfully');
            } catch (emailError) {
                console.error('Error sending order emails (non-blocking):', emailError);
                // Don't fail the order if email fails - just log it
            }
            
            // Clear the cart after successful order
            await this.clearCart();
            
            return order;
        },
        
        async sendOrderEmails(orderData) {
            // Call Supabase Edge Function to send emails
            const { data, error } = await window.WACTC_SUPABASE.functions.invoke('send-order-email', {
                body: { orderData }
            });
            
            if (error) {
                console.error('Error invoking email function:', error);
                throw error;
            }
            
            return data;
        },
        
        async getOrder(orderId) {
            const { data, error } = await window.WACTC_SUPABASE
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        products (
                            name,
                            image_url
                        )
                    )
                `)
                .eq('id', orderId)
                .single();
            
            if (error) {
                console.error('Error fetching order:', error);
                return null;
            }
            return data;
        },
        
        async getOrderByNumber(orderNumber) {
            const { data, error } = await window.WACTC_SUPABASE
                .from('orders')
                .select(`
                    *,
                    order_items (
                        *,
                        products (
                            name,
                            image_url
                        )
                    )
                `)
                .eq('order_number', orderNumber)
                .single();
            
            if (error) {
                console.error('Error fetching order:', error);
                return null;
            }
            return data;
        }
    };
    
    // Expose client globally
    window.WACTC_DB = SupabaseClient;
    
    console.log('Supabase client initialized with session:', sessionId);
    
})();


