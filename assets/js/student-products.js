// WACTC Student Products - Local Catalog Integration
// Loads product data from assets/data/products.json (no Supabase)

class StudentProducts {
    constructor() {
        this.products = new Map(); // Cache for all products
        this.productsByProgram = new Map(); // Cache by program (URL-friendly ID)
        this.catalogUrl = this.getCatalogUrl();
        
    // Map class names from CSV to URL-friendly program IDs
    this.classToProgram = {
        'HVAC': 'hvac',
        'Auto': 'auto',
        'Carpentry': 'carpentry',
        'Collision Repair': 'collision-repair',
        'Computer Science': 'computer-science',
        'Culinary': 'culinary',
        'Electrical Occupations': 'electrical-occupations',
        'EMT': 'emt',
        'EPS': 'eps',
        'Health Occupations': 'health-occupations',
        'Machine Shop': 'machine-shop',
        'Masonry': 'masonry',
        'Networking': 'networking',
        'Sports Medicine': 'sports-med',
        'WACTC': 'wactc-gear',
        'Welding': 'welding',
        'ARET': 'aret'
    };
    
    // List of colors with known missing swatches (now all swatches available!)
    this.missingSwatches = new Set([]);
    
    // Map combination colors to their primary swatch
    this.colorSwatchMap = {
        'Steel Grey/Light Stone': 'Steel Grey',
        'Royal/Classic Navy': 'Classic Navy',
        'Royal/ Classic Navy': 'Classic Navy', // Handle spacing variant
        'Sport Grey': 'Sport Gray' // Handle spelling variant (Grey vs Gray)
    };
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

    // Initialize and load all student products from local catalog
    async init() {
        try {
            console.log('Loading student products from local catalog...');

            const products = await this.loadCatalog();
            if (!products || products.length === 0) {
                console.warn('No products found in local catalog.');
                return;
            }

            // Filter for student products (client-side filtering)
            // Student products have class != 'Staff' (e.g., 'HVAC', 'Auto', 'Carpentry', etc.)
            // Staff products have class = 'Staff'
            const studentProducts = products.filter(product => {
                return product && product.is_active !== false && product.class && product.class !== 'Staff';
            });

            // Cache products by ID and by program
            studentProducts.forEach(product => {
                // Use product_id + class as unique key (same product can be in multiple classes)
                const uniqueKey = `${product.product_id}-${product.class}`;
                this.products.set(uniqueKey, product);
                
                // Map class name to URL-friendly program ID
                const programId = this.classToProgram[product.class];
                if (programId) {
                    if (!this.productsByProgram.has(programId)) {
                        this.productsByProgram.set(programId, []);
                    }
                    this.productsByProgram.get(programId).push(product);
                } else {
                    console.warn(`Unknown class: ${product.class} for product ${product.product_id}`);
                }
            });

            console.log(`Loaded ${studentProducts.length} student products (${products.length} total products in catalog)`);
            console.log(`Programs with products: ${Array.from(this.productsByProgram.keys()).join(', ')}`);
            
            if (studentProducts.length === 0) {
                console.warn('No student products found in local catalog.');
            }
        } catch (error) {
            console.error('Failed to initialize student products:', error);
        }
    }

    // Get all products for a specific program
    getProductsByProgram(programId) {
        return this.productsByProgram.get(programId) || [];
    }

    // Get a specific product by ID (checks all products, returns first match)
    getProduct(productId, className = null) {
        // If className provided, look for exact match first
        if (className) {
            const exactKey = `${productId}-${className}`;
            if (this.products.has(exactKey)) {
                return this.products.get(exactKey);
            }
        }
        
        // Fallback: find first match by product ID only
        for (const [key, product] of this.products) {
            if (key.startsWith(productId)) {
                return product;
            }
        }
        return null;
    }

    // Get the program ID from a product's class
    getProgramId(productId, className = null) {
        const product = this.getProduct(productId, className);
        if (!product || !product.class) return null;
        return this.classToProgram[product.class] || null;
    }

    // Normalize color name for file paths (spaces and slashes to hyphens)
    normalizeColorForFilename(color) {
        return color.replace(/[\s\/]+/g, '-');
    }
    
    // Infer model photo type from product ID and name (M = Male model, F = Female model)
    getGender(productId, className = null) {
        // Check product ID prefix first (L = Ladies, W = Women's)
        if (productId.startsWith('L') || productId.startsWith('W')) {
            return 'F';
        }
        
        // Check product name as fallback
        const product = this.getProduct(productId, className);
        if (!product || !product.name) return 'M'; // Default to M (male model)
        
        const name = product.name.toLowerCase();
        if (name.includes('ladies') || name.includes('women')) {
            return 'F';
        }
        return 'M'; // Default to male model
    }

    // Get image path for a product and color (used by product detail page)
    getImagePath(productId, color, programId = null, className = null) {
        // If programId not provided, look it up
        if (!programId) {
            programId = this.getProgramId(productId, className);
        }
        
        if (!programId) {
            console.warn(`Could not determine program for product: ${productId}`);
            return '../../assets/img/Sport-Grey.png';
        }
        
        const normalizedColor = this.normalizeColorForFilename(color);
        return `../../assets/img/products/students/${programId}/${productId}_${normalizedColor}_F.png`;
    }

    // Get preview image path - uses preview images with model photo indicator (M/F) for gallery listings
    getPreviewImagePath(productId, color, className = null) {
        const modelType = this.getGender(productId, className);
        const normalizedColor = this.normalizeColorForFilename(color);
        return `../../assets/img/previews/${productId}_${modelType}_${normalizedColor}_F.png`;
    }

    // Get listing preview image - uses preview images for product listings (same as getPreviewImagePath)
    getListingPreviewImage(productId, color, className = null) {
        return this.getPreviewImagePath(productId, color, className);
    }

    // Get color swatch texture (shared with staff products)
    getColorSwatchTexture(color) {
        // Check if this is a combination color that maps to a single swatch
        const swatchColor = this.colorSwatchMap[color] || color;
        return `../../assets/img/color swatches/${swatchColor}.PNG`;
    }
    
    // Check if color swatch exists
    colorSwatchExists(color) {
        return !this.missingSwatches.has(color);
    }

    // Get color name for display (with warning symbol if swatch missing)
    getColorDisplayName(color) {
        if (!this.colorSwatchExists(color)) {
            return `⚠️ ${color}`;
        }
        return color;
    }

    // Get available colors as array
    getColors(productId, className = null) {
        const product = this.getProduct(productId, className);
        if (!product || !product.colors) return [];
        
        return product.colors.split(',').map(c => c.trim());
    }

    // Check if an image exists for a specific product and color
    async checkImageExists(productId, color, className = null) {
        return new Promise((resolve) => {
            const img = new Image();
            const programId = this.getProgramId(productId, className);
            const imagePath = this.getImagePath(productId, color, programId, className);
            
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            
            img.src = imagePath;
        });
    }

    // Get only colors that have available image files
    async getAvailableColorsWithImages(productId, className = null) {
        const allColors = this.getColors(productId, className);
        if (!allColors.length) return [];

        // Check all images in parallel for speed
        const checks = allColors.map(color =>
            this.checkImageExists(productId, color, className).then(exists => ({ color, exists }))
        );

        const results = await Promise.all(checks);
        return results.filter(r => r.exists).map(r => r.color);
    }

    // Get price for a specific size
    getPriceForSize(productId, size, className = null) {
        const product = this.getProduct(productId, className);
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

    // Get available sizes
    getAvailableSizes() {
        return ['S', 'M', 'L', 'XL', '2XL', '3XL'];
    }

    // Validate product exists
    isValidProduct(productId) {
        return !!this.getProduct(productId);
    }

    // Format price for display
    formatPrice(price) {
        return `$${price.toFixed(2)}`;
    }

    // Get program display name (reverse lookup from programId to class name)
    getProgramDisplayName(programId) {
        // Reverse lookup: find class name from program ID
        for (const [className, progId] of Object.entries(this.classToProgram)) {
            if (progId === programId) {
                return className;
            }
        }
        return programId;
    }
    
    // Get class name from program ID
    getClassFromProgramId(programId) {
        for (const [className, progId] of Object.entries(this.classToProgram)) {
            if (progId === programId) {
                return className;
            }
        }
        return null;
    }
}

// Initialize global instance
window.studentProducts = new StudentProducts();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.studentProducts) {
        window.studentProducts.init();
    } else {
        console.error('Student products not available');
    }
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StudentProducts;
}

