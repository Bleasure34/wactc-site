// WACTC Staff Products - Local Catalog Integration
// Loads product data from assets/data/products.json (no Supabase)

class StaffProducts {
    constructor() {
        this.products = new Map(); // Cache for products
        this.catalogUrl = this.getCatalogUrl();
    }

    getCatalogUrl() {
        // Prefer resolving relative to this script URL so it works on nested pages.
        const script = document.currentScript;
        if (script && script.src) {
            return new URL('../data/products.json', script.src).toString();
        }
        // Fallback: site root
        return new URL('/assets/data/products.json', window.location.origin).toString();
    }

    async loadCatalog() {
        const res = await fetch(this.catalogUrl, { cache: 'no-cache' });
        if (!res.ok) {
            throw new Error(`Failed to load product catalog (${res.status} ${res.statusText})`);
        }
        const payload = await res.json();
        return Array.isArray(payload) ? payload : (payload.products || []);
    }

    // Initialize and load all products from local catalog
    async init() {
        try {
            console.log('Loading staff products from local catalog...');

            const allProducts = await this.loadCatalog();
            const products = (allProducts || []).filter(p => p && p.is_active !== false && p.class === 'Staff');

            // Cache products by ID
            products.forEach(product => {
                this.products.set(product.product_id, product);
            });

            console.log(`Loaded ${products.length} staff products`);
        } catch (error) {
            console.error('Failed to initialize staff products:', error);
        }
    }

    // Get all products for the listing page
    getAllProducts() {
        return Array.from(this.products.values());
    }

    // Get a specific product by ID
    getProduct(productId) {
        return this.products.get(productId);
    }

    // Get preview image path for products with dedicated preview images
    getPreviewImagePath(productId) {
        const previewImages = {
            'ST253': '../assets/img/previews/ST253_M_Maroon_F.png',
            'LST253': '../assets/img/previews/LST253_F_Athletic-Heather_F.png',
            'F217': '../assets/img/previews/F217_M_True-Navy_F.png',
            'L217': '../assets/img/previews/L217_F_True-Royal_F.png',
            'W808': '../assets/img/previews/W808_F_Regatta-Blue_F.png',
            'LW808': '../assets/img/previews/LW808_F_Rich-Red_F.png',
            'W809': '../assets/img/previews/W809_F_Ultramarine-Blue_F.png',
            'LW809': '../assets/img/previews/LW809_F_Storm-Grey_F.png',
            'CS418': '../assets/img/previews/CS418_M_Light-Grey_F.png',
            'CS419': '../assets/img/previews/CS419_M_Charcoal_F.png'
        };
        
        return previewImages[productId] || null;
    }

    // Get the preferred preview color for each product
    getPreferredColor(productId) {
        const preferredColors = {
            'ST253': 'Maroon',
            'LST253': 'Athletic Heather',
            'F217': 'True Navy',
            'L217': 'True Royal',
            'W808': 'Regatta Blue',
            'LW808': 'Rich Red',
            'W809': 'Ultramarine Blue',
            'LW809': 'Storm Grey',
            'CS418': 'Light Grey',
            'CS419': 'Charcoal'
        };
        
        return preferredColors[productId] || null;
    }

    // Get a random color for preview images (fallback method)
    getRandomColor(productId) {
        const product = this.getProduct(productId);
        if (!product || !product.colors) return null;
        
        const colors = product.colors.split(',').map(c => c.trim());
        const randomIndex = Math.floor(Math.random() * colors.length);
        return colors[randomIndex];
    }

    // Normalize color name for file paths (spaces to underscores)
    normalizeColorForFilename(color) {
        return color.replace(/\s+/g, '_');
    }

    // Get image path with fallback handling for missing files
    getImagePathWithFallback(productId, color) {
        const normalizedColor = this.normalizeColorForFilename(color);
        const primaryPath = `../assets/img/products/staff/${productId}-${normalizedColor}.png`;
        return primaryPath;
    }

    // Get color swatch background for color options
    getColorSwatchBackground(productId, color) {
        const imagePath = this.getImagePathWithFallback(productId, color);
        return `url('${imagePath}')`;
    }

    // Get texture image path for color swatches
    getColorSwatchTexture(color) {
        const texturePath = `../assets/img/color swatches/${color}.PNG`;
        return texturePath;
    }

    // Get color name for display
    getColorDisplayName(color) {
        return color;
    }

    // Get image path for a product and color (used by product detail page)
    getImagePath(productId, color) {
        return this.getImagePathWithFallback(productId, color);
    }

    // Get listing preview image - checks for dedicated preview first, then falls back to color image
    getListingPreviewImage(productId, color) {
        // Check if this product has a dedicated preview image
        const previewPath = this.getPreviewImagePath(productId);
        if (previewPath) {
            return previewPath;
        }
        
        // Fall back to color-specific image
        return this.getImagePathWithFallback(productId, color);
    }

    // Get price for a specific size
    getPriceForSize(productId, size) {
        const product = this.getProduct(productId);
        if (!product || !product.pricing) return 0;

        // Parse pricing from JSON string
        let pricing;
        try {
            pricing = typeof product.pricing === 'string' 
                ? JSON.parse(product.pricing) 
                : product.pricing;
        } catch (e) {
            console.error('Error parsing pricing for product:', productId);
            return 0;
        }

        // Determine size tier
        if (['S', 'M', 'L', 'XL'].includes(size)) {
            return pricing['S-XL'] || 0;
        } else if (size === '2XL') {
            return pricing['2X'] || 0;
        } else if (size === '3XL') {
            return pricing['3X'] || 0;
        }

        return pricing['S-XL'] || 0; // Default to S-XL pricing
    }

    // Get available colors as array
    getColors(productId) {
        const product = this.getProduct(productId);
        if (!product || !product.colors) return [];
        
        return product.colors.split(',').map(c => c.trim());
    }

    // Check if an image exists for a specific product and color
    async checkImageExists(productId, color) {
        return new Promise((resolve) => {
            const img = new Image();
            const imagePath = this.getImagePath(productId, color);
            
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            
            img.src = imagePath;
        });
    }

    // Get only colors that have available image files
    async getAvailableColorsWithImages(productId) {
        const allColors = this.getColors(productId);
        if (!allColors.length) return [];

        // Check all images in parallel for speed
        const checks = allColors.map(color =>
            this.checkImageExists(productId, color).then(exists => ({ color, exists }))
        );

        const results = await Promise.all(checks);
        return results.filter(r => r.exists).map(r => r.color);
    }

    // Get available sizes
    getAvailableSizes() {
        return ['S', 'M', 'L', 'XL', '2XL', '3XL'];
    }

    // Validate product exists
    isValidProduct(productId) {
        return this.products.has(productId);
    }

    // Format price for display
    formatPrice(price) {
        return `$${price.toFixed(2)}`;
    }
}

// Initialize global instance
window.staffProducts = new StaffProducts();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.staffProducts) {
        window.staffProducts.init();
    } else {
        console.error('Staff products not available');
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StaffProducts;
}
