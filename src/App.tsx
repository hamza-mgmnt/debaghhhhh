import React, { useState, useEffect, useMemo } from 'react';
import { 
  Store, 
  Settings, 
  Plus, 
  Trash2, 
  RefreshCw, 
  Check, 
  AlertTriangle, 
  X, 
  Package, 
  Lock, 
  Unlock, 
  Eye, 
  ChevronRight, 
  ArrowLeft,
  SlidersHorizontal,
  Edit2,
  ListPlus,
  Palette,
  Sparkles,
  Info
} from 'lucide-react';
import { INITIAL_PRODUCTS, COLOR_SWATCHES } from './data';
import { Product, ProductVariant } from './types';
import { supabase, isSupabaseConfigured } from './supabaseClient';

export default function App() {
  // SPA Routing State
  // We check both the hash (e.g. #/admin) and window pathname (/admin)
  const [currentPath, setCurrentPath] = useState<string>(() => {
    const hash = window.location.hash;
    if (hash === '#/admin') return '/admin';
    return window.location.pathname === '/admin' ? '/admin' : '/';
  });

  // Listen to hash/popstate routing events
  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash;
      if (hash === '#/admin') {
        setCurrentPath('/admin');
      } else {
        setCurrentPath(window.location.pathname === '/admin' ? '/admin' : '/');
      }
    };
    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Programmatic navigation utility
  const navigateTo = (path: string) => {
    if (path === '/admin') {
      window.location.hash = '#/admin';
      setCurrentPath('/admin');
    } else {
      window.location.hash = '';
      // Try pushState if possible to clean address bar
      try {
        window.history.pushState({}, '', '/');
      } catch (e) {}
      setCurrentPath('/');
    }
  };

  // Shared Products Database State (persisted in localStorage)
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem('de_bag_linen_products');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved products", e);
      }
    }
    return INITIAL_PRODUCTS;
  });

  // Persist products to localStorage when changed
  useEffect(() => {
    localStorage.setItem('de_bag_linen_products', JSON.stringify(products));
  }, [products]);

  // Dynamic Swatches State (registered and persisted in localStorage)
  const [swatches, setSwatches] = useState<Record<string, { name: string; hex: string }>>(() => {
    const saved = localStorage.getItem('de_bag_linen_swatches');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse saved swatches", e);
      }
    }
    return COLOR_SWATCHES;
  });

  // Persist swatches to localStorage
  useEffect(() => {
    localStorage.setItem('de_bag_linen_swatches', JSON.stringify(swatches));
  }, [swatches]);

  // Dynamic color swatch state creator variables
  const [showColorCreator, setShowColorCreator] = useState(false);
  const [customColorName, setCustomColorName] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#10b981');

  // Real-Time Cross-Tab / Cross-Window Database Synchronization
  // Allows updates in the Admin tab to instantly populate to the User catalog tab in real-time!
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'de_bag_linen_products' && e.newValue) {
        try {
          setProducts(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Real-time sync error", err);
        }
      }
      if (e.key === 'de_bag_linen_swatches' && e.newValue) {
        try {
          setSwatches(JSON.parse(e.newValue));
        } catch (err) {
          console.error("Real-time sync error for swatches", err);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Supabase Database Connection Status State
  const [supabaseLoading, setSupabaseLoading] = useState<boolean>(isSupabaseConfigured);
  const [supabaseError, setSupabaseError] = useState<string | null>(null);
  const [isTableMissing, setIsTableMissing] = useState<boolean>(false);

  // Load and subscribe from Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    const fetchSupabaseProducts = async () => {
      try {
        setSupabaseLoading(true);
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .order('id');

        if (error) {
          if (error.code === 'PGRST125' || (error.message && error.message.includes('Invalid path'))) {
            setIsTableMissing(true);
            setSupabaseError("The 'products' table does not exist in your Supabase schema yet. Please run the SQL setup script.");
            showNotification("Database setup required. Operating safely in LocalStorage mode.", "info");
          } else {
            setSupabaseError(error.message || String(error));
            showNotification("Supabase connection failed.", "error");
          }
          return;
        }

        if (data && data.length > 0) {
          setProducts(data);
          showNotification("Connected to Live Supabase Inventory!", "success");
        } else {
          // Auto seed with presets if table is empty
          const { error: seedError } = await supabase
            .from('products')
            .upsert(INITIAL_PRODUCTS);

          if (seedError) {
            if (seedError.code === 'PGRST125' || (seedError.message && seedError.message.includes('Invalid path'))) {
              setIsTableMissing(true);
              setSupabaseError("The 'products' table does not exist in your Supabase schema yet.");
            }
          } else {
            setProducts(INITIAL_PRODUCTS);
            showNotification("Supabase seeded with bedding presets!", "success");
          }
        }
      } catch (err: any) {
        // Standard recovery info log rather than console.error
        console.info("Supabase sync temporarily bypassed: operating in LocalStorage mode.");
      } finally {
        setSupabaseLoading(false);
      }
    };

    fetchSupabaseProducts();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        async () => {
          // Safely fetch latest database snapshot
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id');
          if (!error && data && data.length > 0) {
            setProducts(data);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Synchronise state changes to Supabase when updated by admin
  useEffect(() => {
    if (!isSupabaseConfigured || supabaseLoading || isTableMissing) return;

    const syncToSupabase = async () => {
      try {
        const { error } = await supabase
          .from('products')
          .upsert(products);
        if (error) {
          if (error.code === 'PGRST125' || (error.message && error.message.includes('Invalid path'))) {
            setIsTableMissing(true);
            setSupabaseError("The 'products' table does not exist in your Supabase schema yet.");
          } else {
            console.info("Supabase sync issue:", error.message);
          }
        }
      } catch (err) {
        console.info("Supabase sync bypassed.");
      }
    };

    const timeout = setTimeout(syncToSupabase, 500);
    return () => clearTimeout(timeout);
  }, [products, supabaseLoading, isTableMissing]);

  // Admin lock states
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [savedPassword, setSavedPassword] = useState<string>(() => {
    return localStorage.getItem('de_bag_admin_password') || 'admin';
  });
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('de_bag_admin_unlocked') === 'true';
  });
  const [authError, setAuthError] = useState<string>('');
  
  // Changing Password modal state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');

  // Selected Product for interactive Customer Detail Popup modal
  const [selectedDetailProduct, setSelectedDetailProduct] = useState<Product | null>(null);

  // Notifications
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Handle Admin Authorization
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = adminPassword.trim();
    // Allow either the dynamically configured custom password, OR the factory default 'debag123'
    if (cleanInput === savedPassword || cleanInput === 'debag123' || (savedPassword === 'admin' && cleanInput.toLowerCase() === 'admin')) {
      setIsUnlocked(true);
      localStorage.setItem('de_bag_admin_unlocked', 'true');
      setAuthError('');
      setAdminPassword('');
      showNotification("Authorized successfully. Welcome to De Bagh Admin Portal.");
    } else {
      setAuthError(`Invalid Access Key. Hint: Use your custom password or "debag123"`);
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedNew = newPasswordInput.trim();
    if (!trimmedNew) {
      showNotification("Password cannot be blank.", "error");
      return;
    }
    if (trimmedNew !== confirmPasswordInput.trim()) {
      showNotification("Passwords do not match.", "error");
      return;
    }
    setSavedPassword(trimmedNew);
    localStorage.setItem('de_bag_admin_password', trimmedNew);
    setShowChangePasswordModal(false);
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    showNotification("Admin password changed successfully.");
  };

  const handleLogout = () => {
    setIsUnlocked(false);
    localStorage.removeItem('de_bag_admin_unlocked');
    showNotification("Logged out from corporate portal.", 'info');
  };

  // --- CRUD Admin Controllers ---

  // Selected Product for modifying details in Admin Panel
  const [activeProductId, setActiveProductId] = useState<string>(products[0]?.id || '');
  const activeProduct = useMemo(() => {
    return products.find(p => p.id === activeProductId) || products[0];
  }, [products, activeProductId]);

  // Form State for creating a brand new Product Bedding Line
  const [newProductForm, setNewProductForm] = useState({
    name: '',
    category: 'Sheets',
    description: '',
    imageUrl: '',
    colors: ['White', 'Charcoal'],
    sizes: [
      { size: 'Single', price: 10.00, stock: 100 },
      { size: 'Double', price: 15.00, stock: 100 },
      { size: 'King', price: 20.00, stock: 100 },
    ]
  });

  // State to manage adding a single size variant to an existing product
  const [newSizeName, setNewSizeName] = useState('');
  const [newSizePrice, setNewSizePrice] = useState<number>(10.00);
  const [newSizeStock, setNewSizeStock] = useState<number>(50);

  // Toggle color on existing product
  const handleToggleColor = (productId: string, colorName: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const exists = p.colors.some(c => c.name === colorName);
      let updatedColors = [...p.colors];
      
      if (exists) {
        // Prevent removing all colors
        if (p.colors.length <= 1) {
          showNotification("A product must support at least one color swatch.", 'error');
          return p;
        }
        updatedColors = p.colors.filter(c => c.name !== colorName);
      } else {
        const swatch = swatches[colorName];
        if (swatch) {
          updatedColors.push(swatch);
        }
      }
      return { ...p, colors: updatedColors };
    }));
    showNotification("Colors updated successfully.");
  };

  // Create a brand new custom color swatch
  const handleCreateCustomColor = (name: string, hex: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showNotification("Please specify a name for the custom color.", 'error');
      return;
    }
    
    // Check if color name already exists (case-insensitive)
    const exists = Object.keys(swatches).some(key => key.toLowerCase() === trimmedName.toLowerCase());
    if (exists) {
      showNotification(`A color swatch named "${trimmedName}" already exists.`, 'error');
      return;
    }

    const updatedSwatches = {
      ...swatches,
      [trimmedName]: { name: trimmedName, hex }
    };

    setSwatches(updatedSwatches);
    // Explicitly update localStorage so it can sync immediately across tabs
    localStorage.setItem('de_bag_linen_swatches', JSON.stringify(updatedSwatches));

    // Reset inputs
    setCustomColorName('');
    setShowColorCreator(false);
    showNotification(`Added custom color "${trimmedName}" to available swatches!`);
  };

  // Add a size variant to existing product
  const handleAddSizeVariant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSizeName.trim()) {
      showNotification("Please specify a sizing label (e.g., King, Single).", 'error');
      return;
    }

    if (!activeProduct) return;

    // Check duplicate size
    const duplicate = activeProduct.variants.some(v => v.size.toLowerCase() === newSizeName.toLowerCase());
    if (duplicate) {
      showNotification(`Sizing variant "${newSizeName}" already exists for this bedding line.`, 'error');
      return;
    }

    const newVariant: ProductVariant = {
      id: `${activeProduct.id}-${Date.now()}`,
      size: newSizeName.trim(),
      price: Math.max(0.1, newSizePrice),
      stock: Math.max(0, newSizeStock)
    };

    setProducts(prev => prev.map(p => {
      if (p.id !== activeProduct.id) return p;
      return {
        ...p,
        variants: [...p.variants, newVariant]
      };
    }));

    setNewSizeName('');
    setNewSizePrice(10.00);
    setNewSizeStock(50);
    showNotification(`Added "${newVariant.size}" size to ${activeProduct.name}.`);
  };

  // Remove a size variant from existing product
  const handleRemoveSizeVariant = (productId: string, variantId: string) => {
    const targetProd = products.find(p => p.id === productId);
    if (!targetProd) return;
    
    if (targetProd.variants.length <= 1) {
      showNotification("Bedding line must contain at least one size variant.", 'error');
      return;
    }

    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      return {
        ...p,
        variants: p.variants.filter(v => v.id !== variantId)
      };
    }));
    showNotification("Size variant removed.");
  };

  // Update a single variant's price or stock instantly
  const handleEditVariantValue = (productId: string, variantId: string, field: 'price' | 'stock', value: number) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      const updatedVariants = p.variants.map(v => {
        if (v.id !== variantId) return v;
        return { ...v, [field]: value };
      });
      return { ...p, variants: updatedVariants };
    }));
  };

  // Update high-level product fields (Name, Description, Category, Image)
  const handleUpdateProductInfo = (productId: string, field: keyof Product, value: string) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== productId) return p;
      return { ...p, [field]: value };
    }));
  };

  // Create a brand new Product
  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductForm.name.trim() || !newProductForm.description.trim() || !newProductForm.imageUrl.trim()) {
      showNotification("Please fill in all product core fields.", 'error');
      return;
    }

    const newId = `prod-${Date.now()}`;
    const mappedColors = newProductForm.colors.map(c => swatches[c]).filter(Boolean);

    const newProduct: Product = {
      id: newId,
      name: newProductForm.name.trim(),
      description: newProductForm.description.trim(),
      category: newProductForm.category,
      imageUrl: newProductForm.imageUrl.trim(),
      colors: mappedColors,
      variants: newProductForm.sizes.map((s, idx) => ({
        id: `${newId}-${idx}`,
        size: s.size,
        price: s.price,
        stock: s.stock
      }))
    };

    setProducts(prev => [...prev, newProduct]);
    setActiveProductId(newId);

    // Reset Form
    setNewProductForm({
      name: '',
      category: 'Sheets',
      description: '',
      imageUrl: '',
      colors: ['White', 'Charcoal'],
      sizes: [
        { size: 'Single', price: 10.00, stock: 100 },
        { size: 'Double', price: 15.00, stock: 100 },
        { size: 'King', price: 20.00, stock: 100 },
      ]
    });

    showNotification(`"${newProduct.name}" created successfully in persistent database!`);
  };

  // Delete an entire Product
  const handleDeleteProduct = async (productId: string) => {
    const item = products.find(p => p.id === productId);
    if (!item) return;

    if (window.confirm("Are you sure you want to delete this product line?")) {
      const remaining = products.filter(p => p.id !== productId);
      setProducts(remaining);
      
      // Auto switch the active view to the first remaining product line so editor panel doesn't crash or display empty data
      if (activeProductId === productId) {
        if (remaining.length > 0) {
          setActiveProductId(remaining[0].id);
        } else {
          setActiveProductId('');
        }
      }
      
      showNotification(`"${item.name}" deleted from catalogue.`, 'info');

      // Sync deletion to Supabase backend if configured
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('products')
            .delete()
            .eq('id', productId);
          
          if (error) {
            console.error("Supabase delete error:", error);
          }
        } catch (err) {
          console.error("Failed to delete from Supabase:", err);
        }
      }
    }
  };

  // Restore Default Catalog presets
  const handleResetCatalog = async () => {
    if (window.confirm("Restore factory bedding catalogue defaults? This will overwrite all custom added items, prices, and stock.")) {
      setProducts(INITIAL_PRODUCTS);
      setSwatches(COLOR_SWATCHES);
      localStorage.setItem('de_bag_linen_swatches', JSON.stringify(COLOR_SWATCHES));
      setActiveProductId(INITIAL_PRODUCTS[0].id);
      showNotification("Wholesale presets restored successfully.", 'info');

      // Clear table and re-seed Supabase database if configured
      if (isSupabaseConfigured) {
        try {
          // Attempt to delete all rows from products table
          const { error: deleteError } = await supabase
            .from('products')
            .delete()
            .neq('id', 'placeholder_nonexistent_id');

          if (!deleteError) {
            await supabase.from('products').upsert(INITIAL_PRODUCTS);
          } else {
            console.error("Supabase reset delete error:", deleteError);
          }
        } catch (err) {
          console.error("Failed to reset Supabase catalog:", err);
        }
      }
    }
  };

  // Compute Catalog Dashboard Statistics
  const adminStats = useMemo(() => {
    let skus = 0;
    let units = 0;
    let stockValuation = 0;

    products.forEach(p => {
      p.variants.forEach(v => {
        skus++;
        units += v.stock;
        stockValuation += (v.price * v.stock);
      });
    });

    return {
      skus,
      units,
      valuation: stockValuation.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      uniqueProducts: products.length
    };
  }, [products]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col antialiased">
      
      {/* Dynamic Toast Notifications */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 max-w-md bg-white border border-slate-200 text-slate-900 px-5 py-4 rounded-xl shadow-xl flex items-start gap-3 animate-fade-in">
          <div className={`p-1.5 rounded-full ${
            notification.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'
          }`}>
            <Check className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">System Notification</p>
            <p className="text-xs text-slate-600 mt-0.5 font-medium">{notification.message}</p>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600 ml-auto transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Corporate Access Navbar Header */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all duration-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Brand Logo & Title */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigateTo('/')}>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shadow-sm">
              <span className="font-serif-brand text-xl font-bold tracking-widest">D</span>
            </div>
            <div>
              <h1 className="font-serif-brand text-2xl font-bold tracking-tight text-slate-900">
                De Bagh <span className="text-emerald-700 font-sans-brand font-light tracking-normal text-lg">Linen</span>
              </h1>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-sans-brand font-medium">
                Wholesale Corporate Catalogue
              </p>
            </div>
          </div>

          {/* Subtle Routing Switch in clean Light aesthetic */}
          <div className="flex items-center gap-4">
            {currentPath === '/admin' ? (
              <button
                onClick={() => navigateTo('/')}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-sm"
              >
                <Store className="w-3.5 h-3.5 text-emerald-600" />
                <span>Exit Admin Control</span>
              </button>
            ) : (
              <button
                onClick={() => navigateTo('/admin')}
                className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-emerald-300 text-slate-600 hover:text-emerald-700 rounded-lg text-xs font-medium flex items-center gap-2 transition-all shadow-sm"
                title="Staff Portal Login"
              >
                <Settings className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-semibold tracking-wider uppercase">Portal Access</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* VIEW 1: CLIENT VIEW (/) - Ultra Minimal Digital Catalog Landing Page */}
      {currentPath === '/' && (
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
          
          {/* Centered Premium Header */}
          <div className="text-center max-w-2xl mx-auto space-y-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-semibold rounded-full uppercase tracking-wider">
              <Sparkles className="w-3 h-3 text-emerald-600" />
              <span>Autumn 2026 Wholesale Collection</span>
            </span>
            <h2 className="font-serif-brand text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-slate-900">
              High-Density Linen &amp; Bedding
            </h2>
            <p className="text-sm text-slate-500 leading-relaxed font-sans-brand">
              Welcome to De Bagh Linen. Explore our premium contract-grade wholesale catalogue featuring deep flat sheets, satin stripe duvet sets, microfiber toppers, and heavy towel lines. Click on any item below to inspect detailed pricing lists and available inventory stock status.
            </p>
            <div className="w-16 h-0.5 bg-emerald-600/40 mx-auto rounded mt-2" />
          </div>

          {/* Read-Only Grid of Product Cards (Simplified Minimalist cards) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pt-4">
            {products.map((product) => (
              <div 
                key={product.id}
                onClick={() => setSelectedDetailProduct(product)}
                className="bg-white border border-slate-200/80 hover:border-emerald-600/30 rounded-xl overflow-hidden flex flex-col justify-between group transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
              >
                {/* Product Image Panel */}
                <div className="relative h-64 w-full bg-slate-100 overflow-hidden">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-102"
                  />
                  
                  {/* Category Tag */}
                  <span className="absolute top-4 left-4 text-xs font-bold text-emerald-800 bg-white/95 border border-emerald-100 px-3 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                    {product.category}
                  </span>
                </div>

                {/* Card Info (Simplified outer layout) */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-serif-brand text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {product.name}
                    </h3>
                    <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed font-semibold">
                      {product.description}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-100">
                    <div className="w-full py-2.5 bg-slate-50 group-hover:bg-emerald-50 text-slate-700 group-hover:text-emerald-800 text-sm font-bold rounded-lg text-center flex items-center justify-center gap-1 transition-all border border-slate-200/50 group-hover:border-emerald-200/50">
                      <span>View Details &amp; Pricing</span>
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* Quick Wholesale Corporate Assistance notice */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center max-w-xl mx-auto space-y-3 shadow-sm">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Inquire and Purchase Sizing</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              If you require customizable bedding configurations, custom thread-counts, or seek private labelling, please email our executive sales desks at <span className="text-emerald-700 underline font-medium">sales@debaglinen.co.uk</span>.
            </p>
          </div>

        </div>
      )}

      {/* PRODUCT DETAIL POPUP MODAL */}
      {selectedDetailProduct && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white border border-slate-200 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[85vh] relative animate-scale-up">
            
            {/* Close Button Top Corner */}
            <button 
              onClick={() => setSelectedDetailProduct(null)} 
              className="absolute top-4 right-4 z-10 p-1.5 bg-white/90 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-full border border-slate-200/60 shadow-sm transition-all"
              title="Close Details"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Left Column: Enlarged Product Image */}
            <div className="w-full md:w-1/2 bg-slate-50 h-64 md:h-auto relative overflow-hidden flex-shrink-0">
              <img 
                src={selectedDetailProduct.imageUrl} 
                alt={selectedDetailProduct.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-4 left-4 text-xs font-bold text-emerald-800 bg-white/95 border border-emerald-100 px-3.5 py-1.5 rounded-full uppercase tracking-widest shadow-sm">
                {selectedDetailProduct.category}
              </span>
            </div>

            {/* Right Column: Complete Specifications & Sizing Table */}
            <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto flex flex-col justify-between space-y-6">
              
              <div className="space-y-4">
                {/* Title and Category */}
                <div>
                  <span className="text-xs uppercase tracking-widest text-emerald-700 font-bold">Bedding Catalog Line</span>
                  <h3 className="font-serif-brand text-2xl sm:text-3xl font-bold text-slate-900 mt-0.5">
                    {selectedDetailProduct.name}
                  </h3>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <span className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Contract Specifications</span>
                  <p className="text-sm text-slate-500 leading-relaxed font-semibold">
                    {selectedDetailProduct.description}
                  </p>
                </div>

                {/* Colors Displayed Cleanly as Swatches */}
                <div className="space-y-2">
                  <span className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Available Colors &amp; Swatches</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedDetailProduct.colors.length === 0 ? (
                      <span className="text-sm text-slate-400 italic">No color swatches enabled.</span>
                    ) : (
                      selectedDetailProduct.colors.map((color) => (
                        <div 
                          key={color.name}
                          className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-full text-sm text-slate-700 font-bold"
                        >
                          <span 
                            className="w-3 h-3 rounded-full border border-slate-300"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Sizing Matrix & Pricing Table */}
                <div className="space-y-2">
                  <span className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Wholesale Sizing Matrix</span>
                  
                  <div className="border border-slate-100 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 px-3 py-2.5 grid grid-cols-12 text-xs font-bold uppercase text-slate-500 tracking-wider">
                      <span className="col-span-6">Size</span>
                      <span className="col-span-3 text-center">Status</span>
                      <span className="col-span-3 text-right">Wholesale Rate</span>
                    </div>

                    <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                      {selectedDetailProduct.variants.length === 0 ? (
                        <div className="p-3 text-sm text-slate-400 italic text-center">No active sizes configured.</div>
                      ) : (
                        selectedDetailProduct.variants.map((v) => {
                          const isOutOfStock = v.stock === 0;
                          return (
                            <div 
                              key={v.id}
                              className="px-3 py-3 grid grid-cols-12 items-center text-sm font-bold"
                            >
                              <span className={`col-span-6 font-bold ${isOutOfStock ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                {v.size}
                              </span>
                              
                              <div className="col-span-3 text-center">
                                {isOutOfStock ? (
                                  <span className="inline-block text-[10px] text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded uppercase font-bold">
                                    Out of Stock
                                  </span>
                                ) : v.stock < 10 ? (
                                  <span className="inline-block text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded uppercase font-bold">
                                    Low Stock
                                  </span>
                                ) : (
                                  <span className="inline-block text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded uppercase font-bold">
                                    In Stock
                                  </span>
                                )}
                              </div>

                              <span className="col-span-3 text-right font-mono font-bold text-emerald-800 text-base sm:text-lg">
                                £{v.price.toFixed(2)}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

              </div>

              {/* Close Button Bottom Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">Min Order Requirement Applies</span>
                <button 
                  onClick={() => setSelectedDetailProduct(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  Close Catalog View
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* VIEW 2: ADMIN PANEL (/admin) - Isolated and protected dashboard */}
      {currentPath === '/admin' && (
        <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
          
          {/* 2A. Password Lockscreen Wrapper */}
          {!isUnlocked ? (
            <div className="max-w-md mx-auto bg-white border border-slate-200 rounded-2xl p-8 space-y-6 shadow-md mt-12 animate-fade-in">
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-700 mx-auto mb-4 shadow-sm">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-serif-brand text-xl font-bold text-slate-900">Staff Portal Security</h3>
                <p className="text-xs text-slate-500">
                  Please authenticate with your security key to modify wholesale prices, stocks, or sizing matrices.
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Access Key</label>
                  <input
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="Enter admin password..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500/40 focus:outline-none"
                  />
                  {authError && (
                    <p className="text-[11px] text-red-600 mt-1 flex items-center gap-1 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{authError}</span>
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Authenticate Portal</span>
                </button>
              </form>

              <div className="text-center pt-2 border-t border-slate-100">
                <button
                  onClick={() => navigateTo('/')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors font-medium"
                >
                  Return to Read-Only Catalog
                </button>
              </div>

            </div>
          ) : (
            
            /* 2B. Authenticated Admin Dashboard */
            <div className="space-y-10 animate-fade-in text-slate-900">
              
              {/* Dashboard Banner */}
              <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700">Persistent Admin Mode Enabled</span>
                  </div>
                  <h3 className="font-serif-brand text-2xl font-bold text-slate-900 mt-1">Wholesale Inventory Manager</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Manage sizing, update prices, alter stock counts, or create new bedding lines. Tab synchronisation is active in real-time.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => setShowChangePasswordModal(true)}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Settings className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Change Password</span>
                  </button>

                  <button
                    onClick={handleResetCatalog}
                    className="px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs text-slate-700 hover:text-slate-900 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Presets</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="px-3.5 py-2 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-xs text-red-700 flex items-center gap-1.5 transition-colors shadow-sm"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Portal</span>
                  </button>
                </div>
              </div>

              {/* Supabase Missing Table Setup Instructions */}
              {isTableMissing && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl space-y-3.5 animate-fade-in text-slate-800 shadow-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 animate-bounce" />
                    <span className="font-semibold text-sm text-amber-800">Supabase Table Missing ('products')</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Your Supabase client is successfully initialized, but the database table <code className="bg-amber-100/80 px-1.5 py-0.5 rounded font-mono text-amber-800 font-semibold">products</code> was not found in your Supabase schema (Error <code className="font-mono bg-amber-100/80 px-1 py-0.5 rounded text-amber-800 font-semibold text-[10px]">PGRST125</code>).
                    The app is currently falling back to LocalStorage to keep your session working. Please execute the following SQL script in your <strong>Supabase SQL Editor</strong> to create the table and enable real-time replication:
                  </p>
                  
                  <div className="relative group">
                    <pre className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[10px] sm:text-xs overflow-x-auto max-h-56 leading-normal shadow-inner select-all">
{`-- 1. Create the master bedding catalogue table
create table products (
  id text primary key,
  name text not null,
  category text not null,
  description text,
  "imageUrl" text,
  colors jsonb,
  variants jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Realtime database replication for live client updates
alter publish supabase_realtime add table products;

-- 3. Disable RLS or configure active public policies for anonymous access
alter table products disable row level security;`}
                    </pre>
                  </div>
                  
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <Info className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>Steps:</strong> Click on "SQL Editor" in your Supabase sidebar, paste this script, click "Run", and then simply reload this tab!</span>
                  </div>
                </div>
              )}

              {/* Corporate Database Statistics Overview */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Active Product Lines", value: adminStats.uniqueProducts, desc: "Catalog groupings" },
                  { label: "Total Unique SKUs", value: adminStats.skus, desc: "Sizing variants" },
                  { label: "Total Units in Stock", value: adminStats.units.toLocaleString(), desc: "Global warehousing" },
                  { label: "Cumulative Inventory Value", value: `£${adminStats.valuation}`, desc: "Evaluation of inventory" },
                ].map((stat, idx) => (
                  <div key={idx} className="bg-white border border-slate-200 p-5 rounded-xl space-y-1 shadow-sm">
                    <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">{stat.label}</span>
                    <span className="block text-2xl font-bold text-emerald-800">{stat.value}</span>
                    <span className="block text-[9px] text-slate-400">{stat.desc}</span>
                  </div>
                ))}
              </div>

              {/* Core CRUD Dual Split-Pane Section */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Panel L: Select / Delete Product Group */}
                <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800">Bedding Lines</h4>
                    <span className="text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-100 px-2.5 py-0.5 rounded-full font-semibold">
                      {products.length} Products
                    </span>
                  </div>

                  <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
                    {products.map((p) => (
                      <div 
                        key={p.id}
                        onClick={() => setActiveProductId(p.id)}
                        className={`w-full group/item text-left px-3 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-between cursor-pointer transition-all border ${
                          activeProductId === p.id 
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                            : 'bg-slate-50/50 hover:bg-slate-50 border-transparent text-slate-700 hover:text-slate-900'
                        }`}
                      >
                        <span className="truncate pr-2">{p.name}</span>
                        
                        <div className="flex items-center gap-1.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteProduct(p.id);
                            }}
                            className="p-1 rounded bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 border border-slate-200/65 transition-colors"
                            title="Delete Bedding Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tiny Hint */}
                  <div className="p-3.5 bg-slate-50 rounded-lg text-[10px] text-slate-500 leading-relaxed border border-slate-200/60">
                    <p className="font-semibold text-slate-800 mb-0.5">CRUD Note:</p>
                    Select any bedding line above to modify its prices, sizes, swatches, and description. Use the creation form on the right to append new inventory lines.
                  </div>

                </div>

                {/* Panel R: Core CRUD editor and Sizing additions */}
                <div className="lg:col-span-8 space-y-8">
                  
                  {activeProduct ? (
                    <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-6 shadow-sm">
                      
                      {/* Active Product Header Editable fields */}
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4 pb-5 border-b border-slate-100">
                        <img 
                          src={activeProduct.imageUrl} 
                          alt={activeProduct.name}
                          referrerPolicy="no-referrer"
                          className="w-16 h-16 object-cover rounded-lg border border-slate-200 self-start"
                        />
                        
                        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Line Title</label>
                            <input
                              type="text"
                              value={activeProduct.name}
                              onChange={(e) => handleUpdateProductInfo(activeProduct.id, 'name', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none font-semibold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Category Group</label>
                            <select
                              value={activeProduct.category}
                              onChange={(e) => handleUpdateProductInfo(activeProduct.id, 'category', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none font-semibold"
                            >
                              {['Duvet Sets', 'Sheets', 'Toppers & Protection', 'Pillows', 'Blankets & Throws', 'Towels'].map(c => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                          </div>

                          <div className="sm:col-span-2 space-y-1">
                            <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Catalogue Description</label>
                            <textarea
                              value={activeProduct.description}
                              rows={2}
                              onChange={(e) => handleUpdateProductInfo(activeProduct.id, 'description', e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none font-semibold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* CRUD SECTION 1: Color swatches association */}
                      <div className="space-y-2.5">
                        <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                          <Palette className="w-4 h-4" /> Catalogue Swatches Toggle
                        </h5>
                        
                        <div className="flex flex-wrap gap-2 items-center">
                          {Object.keys(swatches).map((colName) => {
                            const isSelected = activeProduct.colors.some(c => c.name === colName);
                            const hexVal = swatches[colName].hex;
                            return (
                              <button
                                key={colName}
                                onClick={() => handleToggleColor(activeProduct.id, colName)}
                                className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm flex items-center gap-2 border transition-all ${
                                  isSelected 
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-800 font-bold' 
                                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-700 font-semibold'
                                }`}
                              >
                                <span className="w-3.5 h-3.5 rounded-full border border-slate-200" style={{ backgroundColor: hexVal }} />
                                <span>{colName}</span>
                              </button>
                            );
                          })}

                          {/* Elegant Add Color Swatch Button */}
                          <button
                            onClick={() => setShowColorCreator(!showColorCreator)}
                            className="px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 rounded-lg text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Color</span>
                          </button>
                        </div>

                        {/* Inline Custom Color Creator Form */}
                        {showColorCreator && (
                          <div className="bg-white border border-slate-200 p-4 rounded-xl space-y-3 animate-fade-in max-w-sm shadow-sm">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-800">Create Custom Colour Swatch</p>
                            <div className="flex items-center gap-2">
                              {/* Native Color Picker (styled compactly) */}
                              <div className="relative w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0">
                                <input 
                                  type="color"
                                  value={customColorHex}
                                  onChange={(e) => setCustomColorHex(e.target.value)}
                                  className="absolute inset-0 w-full h-full p-0 border-0 cursor-pointer opacity-100 scale-150"
                                />
                              </div>
                              
                              {/* Text Input for color name */}
                              <input 
                                  type="text"
                                  value={customColorName}
                                  onChange={(e) => setCustomColorName(e.target.value)}
                                  placeholder="e.g. Sage, Emerald, Rose Gold"
                                  className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2.5 text-xs text-slate-900 placeholder-slate-400 focus:border-emerald-500/30 focus:outline-none"
                              />

                              <button
                                onClick={() => handleCreateCustomColor(customColorName, customColorHex)}
                                className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase rounded-lg transition-colors flex items-center gap-1 flex-shrink-0"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Save</span>
                              </button>
                              
                              <button
                                onClick={() => setShowColorCreator(false)}
                                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg border border-slate-200 flex-shrink-0"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                              <span>Selected Hex:</span>
                              <span className="font-mono text-slate-500 font-bold">{customColorHex.toUpperCase()}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* CRUD SECTION 2: Active Sizing Pricing Editor */}
                      <div className="space-y-3.5">
                        <h5 className="text-xs sm:text-sm font-bold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                          <Package className="w-4 h-4" /> Pricing &amp; Stock Count Controls
                        </h5>

                        <div className="space-y-2">
                          {activeProduct.variants.map((v) => {
                            const isOutOfStock = v.stock === 0;
                            return (
                              <div 
                                key={v.id}
                                className="bg-slate-50/50 border border-slate-200 rounded-xl px-4 py-3.5 grid grid-cols-1 sm:grid-cols-12 gap-3 items-center hover:border-emerald-600/20 transition-colors"
                              >
                                {/* Size Label */}
                                <div className="sm:col-span-3 text-sm sm:text-base font-bold text-slate-800">
                                  {v.size}
                                </div>

                                {/* Price Field */}
                                <div className="sm:col-span-4 flex items-center gap-2">
                                  <span className="text-slate-400 text-sm font-mono">£</span>
                                  <input 
                                    type="number"
                                    step="0.01"
                                    value={v.price}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      handleEditVariantValue(activeProduct.id, v.id, 'price', val);
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none font-mono font-bold"
                                  />
                                </div>

                                {/* Stock Field */}
                                <div className="sm:col-span-4 flex items-center gap-1.5">
                                  <input 
                                    type="number"
                                    value={v.stock}
                                    onChange={(e) => {
                                      const val = parseInt(e.target.value, 10);
                                      handleEditVariantValue(activeProduct.id, v.id, 'stock', isNaN(val) ? 0 : val);
                                    }}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none text-center font-mono font-semibold"
                                  />
                                  
                                  {isOutOfStock ? (
                                    <span className="text-[10px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0">Empty</span>
                                  ) : v.stock < 10 ? (
                                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider flex-shrink-0">Low</span>
                                  ) : null}
                                </div>

                                {/* Remove size button */}
                                <div className="sm:col-span-1 text-right">
                                  <button
                                    onClick={() => handleRemoveSizeVariant(activeProduct.id, v.id)}
                                    className="p-1.5 rounded bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-400 hover:text-red-600 transition-colors"
                                    title="Delete Size Variant"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* CRUD SECTION 3: Create sizing options for this product */}
                      <form onSubmit={handleAddSizeVariant} className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
                        <h6 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                          <ListPlus className="w-4 h-4 text-emerald-700" /> Create Sizing Variant Option
                        </h6>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Size Identifier</label>
                            <input 
                              type="text"
                              value={newSizeName}
                              onChange={(e) => setNewSizeName(e.target.value)}
                              placeholder="e.g. King, Single, Super King"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none font-semibold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Unit Wholesale Price (£)</label>
                            <input 
                              type="number"
                              step="0.10"
                              value={newSizePrice}
                              onChange={(e) => setNewSizePrice(parseFloat(e.target.value) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold">Starting Stock Level</label>
                            <input 
                              type="number"
                              value={newSizeStock}
                              onChange={(e) => setNewSizeStock(parseInt(e.target.value, 10) || 0)}
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 focus:border-emerald-500/30 focus:outline-none font-mono font-semibold"
                            />
                          </div>
                        </div>

                        <button 
                          type="submit"
                          className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Append Sizing Variant</span>
                        </button>
                      </form>

                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-3 shadow-sm">
                      <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
                        <Info className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif-brand text-base font-bold text-slate-800">No Bedding Line Selected</h4>
                      <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                        Please select an active bedding product line from the sidebar to inspect or modify details, or create a brand new line using the creation form below.
                      </p>
                    </div>
                  )}

                  {/* CRUD CREATION: Add Brand New Bedding Line */}
                  <div className="bg-white border border-slate-200 rounded-xl p-6 space-y-4 shadow-sm">
                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-800 pb-2 border-b border-slate-100 flex items-center gap-2">
                      <ListPlus className="w-4 h-4 text-emerald-700" /> Create Brand New Bedding Line
                    </h4>

                    <form onSubmit={handleCreateProduct} className="space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Product Title</label>
                          <input 
                            type="text"
                            required
                            value={newProductForm.name}
                            onChange={(e) => setNewProductForm(p => ({ ...p, name: e.target.value }))}
                            placeholder="e.g. Premium Goose Down Pillow Pair"
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:border-emerald-500/30 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Category Group</label>
                          <select 
                            value={newProductForm.category}
                            onChange={(e) => setNewProductForm(p => ({ ...p, category: e.target.value }))}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:border-emerald-500/30 focus:outline-none"
                          >
                            {['Duvet Sets', 'Sheets', 'Toppers & Protection', 'Pillows', 'Blankets & Throws', 'Towels'].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Catalog Image URL (Unsplash or Static Address)</label>
                        <input 
                          type="url"
                          required
                          value={newProductForm.imageUrl}
                          onChange={(e) => setNewProductForm(p => ({ ...p, imageUrl: e.target.value }))}
                          placeholder="e.g. https://images.unsplash.com/photo-..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:border-emerald-500/30 focus:outline-none"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Brief Description</label>
                        <textarea 
                          required
                          value={newProductForm.description}
                          onChange={(e) => setNewProductForm(p => ({ ...p, description: e.target.value }))}
                          rows={2}
                          placeholder="Provide contract-laundry rating details, fabric weave details, etc..."
                          className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:border-emerald-500/30 focus:outline-none"
                        />
                      </div>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                        <label className="block text-[9px] uppercase tracking-wider text-slate-400 font-bold">Available Sizing Preset Matrix</label>
                        <div className="text-slate-600 text-xs space-y-1">
                          <p>• Single sizing: £10.00 | 100 in stock</p>
                          <p>• Double sizing: £15.00 | 100 in stock</p>
                          <p>• King sizing: £20.00 | 100 in stock</p>
                        </div>
                        <p className="text-[10px] text-slate-400 pt-1">
                          (You can append, delete, or refine prices/stocks of individual sizing metrics in the matrix editor immediately after creation)
                        </p>
                      </div>

                      <button 
                        type="submit"
                        className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create and Append Product Line</span>
                      </button>

                    </form>
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* CHANGE SECURITY PASSWORD MODAL */}
      {showChangePasswordModal && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-6 relative animate-scale-up">
            <button 
              onClick={() => setShowChangePasswordModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded-full border border-slate-200 transition-colors"
              title="Close Panel"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1.5">
              <h3 className="font-serif-brand text-lg font-bold text-slate-900">Change Staff Access Key</h3>
              <p className="text-xs text-slate-500">Modify the active protection credential required to manage inventory.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">New Staff Security Key</label>
                <input 
                  type="password"
                  value={newPasswordInput}
                  onChange={(e) => setNewPasswordInput(e.target.value)}
                  placeholder="Minimum 4 characters..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:border-emerald-500/40 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Confirm New Security Key</label>
                <input 
                  type="password"
                  value={confirmPasswordInput}
                  onChange={(e) => setConfirmPasswordInput(e.target.value)}
                  placeholder="Confirm new staff key..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 px-3 text-xs text-slate-900 focus:border-emerald-500/40 focus:outline-none"
                />
              </div>
            </div>

            <button 
              onClick={handleChangePasswordSubmit}
              className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <Check className="w-4 h-4" />
              <span>Update Access Credentials</span>
            </button>
          </div>
        </div>
      )}

      {/* Corporate Luxury Footer */}
      <footer className="border-t border-slate-200 bg-white text-slate-500 text-xs py-12 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-3">
          <p className="font-serif-brand text-slate-800 text-sm tracking-wide font-bold">
            De Bagh Linen Wholesale Portal
          </p>
          <p className="max-w-md mx-auto text-[11px] text-slate-500 leading-relaxed">
            Registered wholesale distributor of hotel-grade linens, satin stripe sheets, pillows, mattress protectors, and pure ring-spun heavy towel collections. Real-time persistent state sync active.
          </p>
          <div className="flex justify-center gap-4 text-[10px] text-slate-500">
            <span>Minimum Order: £200.00</span>
            <span>•</span>
            <span>Est. Delivery: Next-day (UK Mainland)</span>
            <span>•</span>
            <button 
              onClick={() => navigateTo(currentPath === '/admin' ? '/' : '/admin')}
              className="hover:underline text-emerald-700 font-semibold"
            >
              {currentPath === '/admin' ? 'Customer View' : 'Corporate Portal Login'}
            </button>
          </div>
          <p className="text-[10px] text-slate-400 pt-3">
            &copy; 2026 De Bagh Linen Ltd. All rights reserved. Registered Business No: DB-9844100.
          </p>
        </div>
      </footer>

    </div>
  );
}
