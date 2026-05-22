// WACTC Site - Main JavaScript
// Minimal functionality for enhanced user experience

(function() {
    'use strict';
    
    // DOM Ready Guard
    function domReady(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }
    
    // Reduced Motion Check
    function prefersReducedMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    
    // Event Utility (stub for future cart functionality)
    function addEvent(element, event, handler) {
        if (element && element.addEventListener) {
            element.addEventListener(event, handler, false);
        }
    }
    
    // Initialize the application
    function init() {
        // Skip animations if user prefers reduced motion
        if (prefersReducedMotion()) {
            document.documentElement.classList.add('no-motion');
        }
        
        // Initialize smooth scrolling for anchor links
        initSmoothScrolling();
        
        // Initialize card interactions
        initCardInteractions();
        
        // Initialize keyboard navigation
        initKeyboardNavigation();
        
        // Initialize focus management
        initFocusManagement();
        
        // Initialize cart functionality
        initCart();
        
        // Console log for debugging (remove in production)
        console.log('WACTC Site loaded successfully');
    }
    
    function initSmoothScrolling() {
        const links = document.querySelectorAll('a[href^="#"]');
        links.forEach(link => {
            addEvent(link, 'click', function(e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
                    target.scrollIntoView({
                        behavior: behavior,
                        block: 'start'
                    });
                }
            });
        });
    }
    
    function initCardInteractions() {
        const cards = document.querySelectorAll('.split-card, .grid-item, .hero-panel');
        cards.forEach(card => {
            addEvent(card, 'click', function() {
                if (!prefersReducedMotion()) {
                    // Add a subtle loading effect
                    this.style.opacity = '0.7';
                    this.style.transform = 'scale(0.98)';
                    
                    // Reset after a short delay
                    setTimeout(() => {
                        this.style.opacity = '1';
                        this.style.transform = 'scale(1)';
                    }, 150);
                }
            });
        });
    }
    
    function initKeyboardNavigation() {
        addEvent(document, 'keydown', function(e) {
            // Allow Enter key to activate cards and panels
            if (e.key === 'Enter' && (e.target.classList.contains('split-card') || e.target.classList.contains('hero-panel'))) {
                e.target.click();
            }
            
            // Allow Space key to activate buttons and links
            if (e.key === ' ' && (e.target.classList.contains('btn') || e.target.tagName === 'A')) {
                e.preventDefault();
                e.target.click();
            }
        });
    }
    
    function initFocusManagement() {
        // Add focus ring to interactive elements
        const interactiveElements = document.querySelectorAll('a, button, input, select, textarea, [tabindex]');
        interactiveElements.forEach(element => {
            addEvent(element, 'focus', function() {
                this.classList.add('focus-ring');
            });
            
            addEvent(element, 'blur', function() {
                this.classList.remove('focus-ring');
            });
        });
    }
    
    // Initialize when DOM is ready
    domReady(init);
    
    // Site context detection - determines if we're on student or staff section
    function getSiteContext() {
        // Check sessionStorage first (set by individual pages)
        const storedContext = sessionStorage.getItem('wactc_site_context');
        if (storedContext === 'student' || storedContext === 'staff') {
            return storedContext;
        }
        
        // Fallback: detect from URL path
        const path = window.location.pathname.toLowerCase();
        if (path.includes('/student')) {
            return 'student';
        } else if (path.includes('/staff')) {
            return 'staff';
        }
        
        // Default to student if can't determine
        return 'student';
    }
    
    // Get the appropriate cart key based on context
    function getCartKey() {
        const context = getSiteContext();
        return context === 'staff' ? 'wactc_cart_staff' : 'wactc_cart_student';
    }
    
    // Cart functionality - Enhanced to work with cart system
    function addToCart(product) {
        console.log('Main.js: Adding product to cart:', product);
        
        // Handle both object and individual parameter formats
        let productObj;
        if (typeof product === 'object' && product !== null) {
            productObj = product;
        } else if (typeof product === 'string' && arguments.length >= 3) {
            // Handle legacy format: addToCart(id, name, price)
            productObj = {
                id: product,
                name: arguments[1],
                price: parseFloat(arguments[2]),
                description: arguments[3] || '',
                image: arguments[4] || '../assets/img/Orange.png',
                quantity: 1
            };
        } else {
            console.error('Invalid product data for addToCart:', product);
            return false;
        }
        
        // Validate required fields
        if (!productObj.id || !productObj.name || typeof productObj.price !== 'number') {
            console.error('Product missing required fields:', productObj);
            return false;
        }
        
        // Get existing cart from localStorage (context-specific)
        const cartKey = getCartKey();
        let cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        
        // Generate unique ID for products with selections
        let uniqueId = productObj.id;
        if (productObj.selections) {
            const selectionString = Object.entries(productObj.selections)
                .filter(([key, value]) => value !== undefined)
                .map(([key, value]) => `${key}-${value.replace(/\s+/g, '-').toLowerCase()}`)
                .join('-');
            uniqueId = `${productObj.id}-${selectionString}`;
        }
        
        // Check if item already exists in cart
        const existingItem = cart.find(item => item.id === uniqueId);
        
        if (existingItem) {
            // Increase quantity
            existingItem.quantity += 1;
            console.log('Main.js: Increased quantity for existing item:', existingItem.name, 'to', existingItem.quantity);
        } else {
            // Add new item with full product details
            const newItem = {
                id: uniqueId,
                product_id: productObj.id, // Store the base product ID for database
                name: productObj.name,
                description: productObj.description || '',
                price: productObj.price,
                image: productObj.image || '../assets/img/Orange.png',
                quantity: productObj.quantity || 1,
                selections: productObj.selections || {}
            };
            cart.push(newItem);
            console.log('Main.js: Added new item to cart:', newItem.name, 'with ID:', uniqueId);
        }
        
        // Save to localStorage (context-specific)
        localStorage.setItem(cartKey, JSON.stringify(cart));
        
        // Show feedback to user
        showCartFeedback(productObj.name);
        
        // Update cart count
        updateCartCount();
        
        // Update product quantity indicators
        updateProductQuantityIndicators();
        
        // Trigger cart update event for other pages
        window.dispatchEvent(new CustomEvent('cartUpdated', { 
            detail: { count: cart.reduce((sum, item) => sum + item.quantity, 0), items: cart.length } 
        }));
        
        return true;
    }
    
    function showCartFeedback(productName) {
        // Create feedback element
        const feedback = document.createElement('div');
        feedback.className = 'cart-feedback';
        feedback.textContent = `${productName} added to cart!`;
        feedback.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--wactc-secondary);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            font-weight: 600;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Add animation keyframes
        if (!document.querySelector('#cart-feedback-styles')) {
            const style = document.createElement('style');
            style.id = 'cart-feedback-styles';
            style.textContent = `
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(feedback);
        
        // Remove after 3 seconds
        setTimeout(() => {
            feedback.style.animation = 'slideOut 0.3s ease-in';
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 300);
        }, 3000);
    }
    
    function updateCartCount() {
        const cartLink = document.querySelector('.cart-link');
        if (!cartLink) return;
        
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        const totalItems = cart.reduce((sum, item) => {
            const quantity = parseInt(item.quantity) || 0;
            return sum + quantity;
        }, 0);
        
        console.log('Main.js: Updating cart count to', totalItems);
        
        // Remove existing count if present
        const existingCount = cartLink.querySelector('.cart-count');
        if (existingCount) {
            existingCount.remove();
        }
        
        if (totalItems > 0) {
            const countElement = document.createElement('span');
            countElement.className = 'cart-count';
            countElement.textContent = totalItems;
            countElement.style.cssText = `
                background: white;
                color: var(--wactc-secondary);
                border-radius: 50%;
                padding: 2px 6px;
                font-size: 12px;
                font-weight: bold;
                margin-left: 8px;
                min-width: 18px;
                text-align: center;
            `;
            cartLink.appendChild(countElement);
            console.log('Main.js: Cart count element added:', totalItems);
        } else {
            console.log('Main.js: No items in cart, count element removed');
        }
    }
    
    // Update product quantity indicators on buttons
    function updateProductQuantityIndicators() {
        console.log('Main.js: Updating product quantity indicators');
        
        // Get current cart (context-specific)
        const cartKey = getCartKey();
        const cart = JSON.parse(localStorage.getItem(cartKey)) || [];
        
        // Find all Add to Cart buttons
        const addToCartButtons = document.querySelectorAll('.btn-cart');
        
        addToCartButtons.forEach(button => {
            // Get product ID from onclick attribute
            const onclick = button.getAttribute('onclick');
            if (!onclick) return;
            
            let productId = null;
            
            // Parse onclick to extract product ID
            if (onclick.includes('addToCart(')) {
                // Extract from addToCart({id: 'product-id', ...})
                const match = onclick.match(/id:\s*['"`]([^'"`]+)['"`]/);
                if (match) {
                    productId = match[1];
                }
            } else if (onclick.includes('showProductSelection(')) {
                // Extract from showProductSelection('product-id')
                const match = onclick.match(/showProductSelection\(['"`]([^'"`]+)['"`]\)/);
                if (match) {
                    productId = match[1];
                }
            }
            
            if (!productId) return;
            
            // Find items in cart that match this product (including variants)
            const matchingItems = cart.filter(item => {
                // Check if item ID starts with the product ID
                return item.id === productId || item.id.startsWith(productId + '-');
            });
            
            // Calculate total quantity for this product
            const totalQuantity = matchingItems.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
            
            console.log(`Product ${productId}: ${totalQuantity} in cart`);
            
            // Remove existing indicator
            const existingIndicator = button.querySelector('.product-quantity-indicator');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            // Add new indicator if quantity > 0
            if (totalQuantity > 0) {
                const indicator = document.createElement('div');
                indicator.className = 'product-quantity-indicator';
                indicator.textContent = totalQuantity;
                button.appendChild(indicator);
                
                // Show with animation
                requestAnimationFrame(() => {
                    indicator.classList.add('show');
                    if (totalQuantity === 1) {
                        // Only animate on first addition
                        indicator.classList.add('animate');
                        setTimeout(() => indicator.classList.remove('animate'), 600);
                    }
                });
                
                console.log(`Added quantity indicator: ${totalQuantity} for ${productId}`);
            }
        });
    }
    
    // Initialize cart count on page load
    function initCart() {
        updateCartCount();
        updateProductQuantityIndicators();
    }

    // Simple product selection handler for products with variants
    function showProductSelection(productId) {
        console.log('Main.js: showProductSelection called for:', productId);
        
        // Define products that have variants
        const variantProducts = {
            'polo-shirts': {
                name: 'Polo Shirts',
                description: 'Professional polo shirts for staff members',
                price: 24.99,
                image: '../assets/img/Orange.png'
            },
            'dress-shirts': {
                name: 'Dress Shirts', 
                description: 'Professional dress shirts for formal occasions',
                price: 34.99,
                image: '../assets/img/Orange.png'
            },
            'hvac-work-shirts': {
                name: 'HVAC Work Shirts',
                description: 'Professional work shirts for HVAC students', 
                price: 29.99,
                image: '../../assets/img/Sport-Grey.png'
            }
        };
        
        // Check if this product has variants
        if (variantProducts[productId]) {
            // For now, add the product directly with default selections
            // In a full implementation, this would show a modal
            const product = variantProducts[productId];
            const productWithDefaults = {
                id: productId,
                name: product.name,
                description: product.description,
                price: product.price,
                image: product.image,
                selections: {
                    size: productId === 'dress-shirts' ? '15' : 'L',
                    color: productId === 'polo-shirts' ? 'White' : 
                           productId === 'dress-shirts' ? 'White' : 'Grey',
                    style: productId === 'hvac-work-shirts' ? 'Short Sleeve' : undefined
                },
                quantity: 1
            };
            
            console.log('Adding product with default selections:', productWithDefaults);
            addToCart(productWithDefaults);
        } else {
            console.error('Product not found in variant list:', productId);
        }
    }
    
    // Expose utilities for future use
    window.WACTC = {
        addEvent: addEvent,
        prefersReducedMotion: prefersReducedMotion,
        addToCart: addToCart,
        showProductSelection: showProductSelection,
        updateProductQuantityIndicators: updateProductQuantityIndicators,
        getSiteContext: getSiteContext,
        getCartKey: getCartKey
    };
    
    // Expose functions globally for onclick handlers (only if not already defined)
    if (!window.addToCart) {
        window.addToCart = addToCart;
    }
    if (!window.showProductSelection) {
        window.showProductSelection = showProductSelection;
    }
    if (!window.updateProductQuantityIndicators) {
        window.updateProductQuantityIndicators = updateProductQuantityIndicators;
    }
})();
