const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fetch = require('node-fetch'); // For Google Maps API
const OrderCounter = require('./models/OrderCounter'); // Add at the top with other requires

const app = express();
const PORT = process.env.PORT || 5001;
const JWT_SECRET = 'your_super_secret_jwt_key_please_change_this';
const GOOGLE_MAPS_API_KEY = 'https://maps.googleapis.com/maps/api/js?sensor=false&callback=myMap'; // <-- Set your key here
const MAD_PIZZA_ADDRESS = 'Mad Pizza, Karachi, Pakistan'; // <-- Set your shop address

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

const MONGODB_URI = 'mongodb://localhost:27017/madpizzapos';
mongoose.connect(MONGODB_URI)
    .then(() => console.log('MongoDB Connected to madpizzapos database successfully!'))
    .catch(err => console.error('MongoDB Connection Error: Make sure MongoDB is running.', err));


// --- Rider Model ---
const riderSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, unique: true, trim: true },
  bikeNumber: { type: String, required: true, trim: true },
  status: { type: String, enum: ['Available', 'On Order', 'Day Off'], default: 'Available' },
  isAvailable: { type: Boolean, default: true },
  currentOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  location: { type: String },
  username: { type: String, unique: true, sparse: true, trim: true },
  password: { type: String }, // hashed
}, { timestamps: true });

riderSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});
riderSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};
const Rider = mongoose.model('Rider', riderSchema);

// --- Ingredient Model ---
const ingredientSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, trim: true },
    unit: { type: String, required: true, trim: true },
    stockQuantity: { type: Number, required: true, default: 0, min: 0 },
    lowStockThreshold: { type: Number, default: 0, min: 0 }
}, { timestamps: true });
const Ingredient = mongoose.model('Ingredient', ingredientSchema);

const recipeItemSchema = new mongoose.Schema({
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    quantityRequired: { type: Number, required: true, min: 0 }
});

const productSizeVariantSchema = new mongoose.Schema({
    sizeName: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    recipe: [recipeItemSchema]
});

const crustOptionSchema = new mongoose.Schema({
    name: { type: String, required: true },
    additionalPrice: { type: Number, default: 0 }
});

const productSchema = new mongoose.Schema({
    name: { type: String, required: [true, "Product name is required"] },
    category: { type: String, required: [true, "Product category is required"] },
    image: { type: String },
    sizeVariants: [productSizeVariantSchema],
    crustOptions: [crustOptionSchema],
    isVisible: { type: Boolean, default: true, required: true }
}, { timestamps: true });
const Product = mongoose.model('Product', productSchema);

const orderItemSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sizeName: { type: String },
    selectedCrust: {
        name: { type: String },
        additionalPrice: { type: Number, default: 0 }
    },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, default: 1, min: [1, "Quantity must be at least 1"] }
});

const orderSchema = new mongoose.Schema({
    items: [orderItemSchema],
    totalAmount: { type: Number, required: true, min: [0, "Total amount cannot be negative"] },
    customerName: { type: String, default: 'Walk-in Customer' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', sparse: true },
    status: { type: String, enum: ['Pending', 'Processing', 'Completed', 'Cancelled', 'Failed - Out of Stock'], default: 'Pending' },
    paymentMethod: { type: String, default: 'Cash' },
    deliveryAddress: { type: String },
    customerPhone: { type: String },
    // --- Rider/Tracking fields ---
    rider: { type: mongoose.Schema.Types.ObjectId, ref: 'Rider' },
    trackingStatus: { type: String, enum: ['Preparing', 'Out for Delivery', 'Delivered'], default: 'Preparing' },
    estimatedDeliveryTime: { type: Date },
    deliveryDistanceKm: { type: Number },
    deliveryDurationMin: { type: Number },
    deliveryDistanceText: { type: String },
    deliveryDurationText: { type: String },
    riderAssignedAt: { type: Date }
}, { timestamps: true });
const Order = mongoose.model('Order', orderSchema);

// --- User Model ---
const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: function() { return this.role === 'admin'; },
        unique: true,
        sparse: true,
        trim: true
    },
    email: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        trim: true,
        lowercase: true,
        match: [/\S+@\S+\.\S+/, 'is invalid'],
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [6, "Password must be at least 6 characters long"]
    },
    role: {
        type: String,
        enum: ['admin', 'customer'],
        default: 'customer',
        required: true
    },
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phone: { type: String, trim: true, unique: false, sparse: false },
    addresses: [{ type: String, trim: true }]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};
const User = mongoose.model('User', userSchema);

// --- Middleware ---
const authMiddleware = async (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authentication invalid - No token provided' });
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId).select('-password');
        if (!user) {
            return res.status(401).json({ message: 'Authentication invalid - User not found' });
        }
        req.user = user;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Authentication invalid', error: error.message });
    }
};

const adminMiddleware = (req, res, next) => {
    if (req.user && req.user.role === 'admin') next();
    else res.status(403).json({ message: 'Access denied. Admin privileges required.' });
};

// --- Rider Auth Middleware ---
const riderAuthMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'rider') return res.status(403).json({ message: 'Not a rider' });
    const rider = await Rider.findById(decoded.riderId).select('-password');
    if (!rider) return res.status(401).json({ message: 'Rider not found' });
    req.rider = rider;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token', error: err.message });
  }
};

// --- Optional Auth Middleware (for GET /api/products) ---
function authMiddlewareOptional(req, res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      req.user = null;
    }
  }
  next();
}

// --- Google Maps Distance/Time ---
async function getDistanceAndTime(origin, destination) {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&key=${GOOGLE_MAPS_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.routes && data.routes.length > 0) {
    const leg = data.routes[0].legs[0];
    return {
      distanceKm: leg.distance.value / 1000,
      durationMin: leg.duration.value / 60,
      distanceText: leg.distance.text,
      durationText: leg.duration.text,
    };
  }
  return { distanceKm: 0, durationMin: 0, distanceText: '', durationText: '' };
}
// --- Add new product (admin only) ---
app.post('/api/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, category, image, sizeVariants, crustOptions, isVisible } = req.body;
    if (!name || !category) return res.status(400).json({ message: 'Name and category are required.' });

    const product = new Product({
      name,
      category,
      image,
      sizeVariants: Array.isArray(sizeVariants) ? sizeVariants : [],
      crustOptions: Array.isArray(crustOptions) ? crustOptions : [],
      isVisible: typeof isVisible === 'boolean' ? isVisible : true
    });

    await product.save();
    res.status(201).json(product);
  } catch (err) {
    res.status(400).json({ message: 'Error adding product', error: err.message });
  }
});
// Update product (admin only)
app.put('/api/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, category, image, sizeVariants, crustOptions, isVisible } = req.body;
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found.' });

    if (name) product.name = name;
    if (category) product.category = category;
    if (image !== undefined) product.image = image;
    if (Array.isArray(sizeVariants)) product.sizeVariants = sizeVariants;
    if (Array.isArray(crustOptions)) product.crustOptions = crustOptions;
    if (typeof isVisible === 'boolean') product.isVisible = isVisible;

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: 'Error updating product', error: err.message });
  }
});

// --- GET Products: Only show visible products to non-admins ---
app.get('/api/products', authMiddlewareOptional, async (req, res) => {
  try {
    // If adminView query param is present and user is admin, return all products
    if (req.query.adminView === 'true' && req.user && req.user.role === 'admin') {
      // Populate ingredient details for admin view
      const products = await Product.find().lean();
      const ingredientIds = [];
      products.forEach(product => {
        if (product.sizeVariants) {
          product.sizeVariants.forEach(variant => {
            if (variant.recipe) {
              variant.recipe.forEach(recipeItem => {
                if (recipeItem.ingredient) ingredientIds.push(recipeItem.ingredient.toString());
              });
            }
          });
        }
      });
      const ingredients = await Ingredient.find({ _id: { $in: ingredientIds } }).lean();
      const ingredientMap = {};
      ingredients.forEach(ing => { ingredientMap[ing._id.toString()] = ing; });
      products.forEach(product => {
        if (product.sizeVariants) {
          product.sizeVariants.forEach(variant => {
            if (variant.recipe) {
              variant.recipe.forEach(recipeItem => {
                if (recipeItem.ingredient && ingredientMap[recipeItem.ingredient.toString()]) {
                  recipeItem.ingredient = ingredientMap[recipeItem.ingredient.toString()];
                }
              });
            }
          });
        }
      });
      return res.json(products);
    }
    // Otherwise, only return visible products
    const products = await Product.find({ isVisible: true });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching products', error: err.message });
  }
});
app.post('/api/users/add-address', async (req, res) => {
  try {
    const { customerId, address } = req.body;
    if (!customerId || !address) {
      return res.status(400).json({ message: 'Customer ID and address are required.' });
    }
    const user = await User.findById(customerId);
    if (!user) return res.status(404).json({ message: 'Customer not found.' });
    // Prevent duplicate addresses
    if (!user.addresses.includes(address)) {
      user.addresses.push(address);
      await user.save();
    }
    res.json({ addresses: user.addresses });
  } catch (err) {
    res.status(500).json({ message: 'Error adding address', error: err.message });
  }
});
// --- Find customer by phone ---
app.get('/api/users/by-phone/:phone', async (req, res) => {
  try {
    const phone = req.params.phone;
    // Try to find by exact phone match
    const user = await User.findOne({ phone: phone });
    if (!user) return res.status(404).json({ message: 'Customer not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Error searching customer', error: err.message });
  }
});
// Get all ingredients
app.get('/api/ingredients', async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ name: 1 });
    res.json(ingredients);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching ingredients', error: err.message });
  }
});

// Add new ingredient (admin only)
app.post('/api/ingredients', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, unit, stockQuantity, lowStockThreshold } = req.body;
    if (!name || !unit) return res.status(400).json({ message: 'Name and unit are required.' });
    const existing = await Ingredient.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Ingredient already exists.' });
    const ingredient = new Ingredient({
      name,
      unit,
      stockQuantity: stockQuantity !== undefined ? Number(stockQuantity) : 0,
      lowStockThreshold: lowStockThreshold !== undefined ? Number(lowStockThreshold) : 0
    });
    await ingredient.save();
    res.status(201).json(ingredient);
  } catch (err) {
    res.status(400).json({ message: 'Error adding ingredient', error: err.message });
  }
});

// Update ingredient details (admin only)
app.put('/api/ingredients/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, unit, lowStockThreshold } = req.body;
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
    if (name) ingredient.name = name;
    if (unit) ingredient.unit = unit;
    if (lowStockThreshold !== undefined) ingredient.lowStockThreshold = Number(lowStockThreshold);
    await ingredient.save();
    res.json(ingredient);
  } catch (err) {
    res.status(400).json({ message: 'Error updating ingredient', error: err.message });
  }
});

// Update ingredient stock (admin only)
app.put('/api/ingredients/:id/stock', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { stockQuantity } = req.body;
    const ingredient = await Ingredient.findById(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
    ingredient.stockQuantity = Number(stockQuantity);
    await ingredient.save();
    res.json(ingredient);
  } catch (err) {
    res.status(400).json({ message: 'Error updating stock', error: err.message });
  }
});

// Delete ingredient (admin only)
app.delete('/api/ingredients/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) return res.status(404).json({ message: 'Ingredient not found.' });
    res.json({ message: 'Ingredient deleted.' });
  } catch (err) {
    res.status(400).json({ message: 'Error deleting ingredient', error: err.message });
  }
});
// --- Rider CRUD (Admin only) ---
app.get('/api/riders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const riders = await Rider.find();
    res.json(riders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching riders', error: err.message });
  }
});

app.post('/api/riders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, phone, bikeNumber, username, password } = req.body;
    if (!name || !phone || !bikeNumber || !username || !password) {
      return res.status(400).json({ message: 'Name, phone, bike number, username, and password are required.' });
    }
    const existing = await Rider.findOne({ $or: [{ phone }, { username }] });
    if (existing) return res.status(400).json({ message: 'Phone or username already exists.' });
    const rider = new Rider({ name, phone, bikeNumber, username, password, status: 'Available' });
    await rider.save();
    res.status(201).json(rider);
  } catch (err) {
    res.status(400).json({ message: 'Error creating rider', error: err.message });
  }
});

// --- Rider Login ---
app.post('/api/rider/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const rider = await Rider.findOne({ username });
    if (!rider) return res.status(401).json({ message: 'Invalid credentials' });
    const isMatch = await rider.comparePassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });
    const token = jwt.sign({ riderId: rider._id, role: 'rider' }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, rider: { ...rider.toObject(), password: undefined } });
  } catch (err) {
    res.status(500).json({ message: 'Login error', error: err.message });
  }
});

// --- Rider Dashboard Orders ---
app.get('/api/rider/orders', riderAuthMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ rider: req.rider._id }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching rider orders', error: err.message });
  }
});

// --- Assign Rider to Order (Admin only) ---
app.post('/api/orders/:id/assign-rider', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { riderId } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const rider = await Rider.findById(riderId);
    if (!rider || rider.status !== 'Available') return res.status(409).json({ message: 'Selected rider not available' });

    // Calculate distance/time from Mad Pizza to customer and back
    const customerAddress = order.deliveryAddress;
    const toCustomer = await getDistanceAndTime(MAD_PIZZA_ADDRESS, customerAddress);
    const backToShop = await getDistanceAndTime(customerAddress, MAD_PIZZA_ADDRESS);

    order.rider = rider._id;
    order.trackingStatus = 'Out for Delivery';
    order.estimatedDeliveryTime = new Date(Date.now() + (toCustomer.durationMin + backToShop.durationMin) * 60000);
    order.deliveryDistanceKm = toCustomer.distanceKm + backToShop.distanceKm;
    order.deliveryDurationMin = toCustomer.durationMin + backToShop.durationMin;
    order.deliveryDistanceText = `${toCustomer.distanceText} + ${backToShop.distanceText}`;
    order.deliveryDurationText = `${toCustomer.durationText} + ${backToShop.durationText}`;
    order.riderAssignedAt = new Date(); // <-- Add this line
    await order.save();

    rider.status = 'On Order';
    rider.isAvailable = false;
    rider.currentOrder = order._id;
    await rider.save();

    res.json({ message: 'Rider assigned', order });
  } catch (err) {
    res.status(500).json({ message: 'Error assigning rider', error: err.message });
  }
});
// Rider marks order as delivered
app.put('/api/rider/orders/:id/delivered', riderAuthMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!order.rider || order.rider.toString() !== req.rider._id.toString()) {
      return res.status(403).json({ message: 'Not authorized for this order' });
    }
    order.status = 'Completed';
    order.trackingStatus = 'Delivered';
    await order.save();

    // Free up the rider
    req.rider.status = 'Available';
    req.rider.isAvailable = true;
    req.rider.currentOrder = null;
    await req.rider.save();

    res.json({ message: 'Order marked as delivered', order });
  } catch (err) {
    res.status(500).json({ message: 'Error marking as delivered', error: err.message });
  }
});

// Get all available riders (Admin only)
// --- Get only available riders (for order assignment) ---
app.get('/api/riders/available', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Only riders with status "Available" and isAvailable true
    const riders = await Rider.find({ status: 'Available', isAvailable: true });
    res.json(riders);
  } catch (err) {
    res.status(500).json({ message: 'Error fetching available riders', error: err.message });
  }
});

// Rider sets status (Day Off or Available)
app.put('/api/rider/status', riderAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Available', 'Day Off'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    req.rider.status = status;
    req.rider.isAvailable = status === 'Available';
    await req.rider.save();
    res.json({ message: 'Status updated', status: req.rider.status });
  } catch (err) {
    res.status(500).json({ message: 'Error updating status', error: err.message });
  }
});
// Update order status and free up rider if needed
// Update order status and free up rider if needed
app.put('/api/orders/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    // If status is being set to Completed or Cancelled, free up the rider
    if ((status === 'Completed' || status === 'Cancelled') && order.rider) {
      const rider = await Rider.findById(order.rider);
      if (rider) {
        rider.status = 'Available';
        rider.isAvailable = true;
        rider.currentOrder = null;
        await rider.save();
      }
      // DO NOT REMOVE order.rider HERE!
      // order.rider = null;
    }

    order.status = status;
    await order.save();
    res.json(order);
  } catch (err) {
    res.status(400).json({ message: 'Error updating order status', error: err.message });
  }
});

// --- Get live tracking info for an order ---
app.get('/api/orders/:id/tracking', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('rider');
    if (!order) return res.status(404).json({ message: 'Order not found' });
    res.json({
      trackingStatus: order.trackingStatus,
      estimatedDeliveryTime: order.estimatedDeliveryTime,
      rider: order.rider ? {
        name: order.rider.name,
        phone: order.rider.phone,
        bikeNumber: order.rider.bikeNumber,
        status: order.rider.status,
        location: order.rider.location,
      } : null,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching tracking', error: err.message });
  }
});

// --- Orders ---
app.get('/api/orders', authMiddleware, async (req, res) => {
    try {
        let orders;
        if (req.user.role === 'admin') {
            orders = await Order.find().sort({ createdAt: -1 });
        } else {
            orders = await Order.find({ userId: req.user._id }).sort({ createdAt: -1 });
        }
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching orders', error: err.message });
    }
});
app.post('/api/orders', async (req, res) => {
    // ...existing order creation logic...
    const { items, totalAmount, customerName, paymentMethod, userId, deliveryAddress, customerPhone } = req.body;
    if (!items || items.length === 0 || totalAmount === undefined || totalAmount < 0) {
        return res.status(400).json({ message: 'Order items and valid total amount required.' });
    }
    try {
        // ...stock checks and other logic...

        // --- Generate order number ---
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const dateStr = `${dd}${mm}${yyyy}`;

        // Atomically increment the counter for today
        const counter = await OrderCounter.findOneAndUpdate(
            { date: dateStr },
            { $inc: { seq: 1 } },
            { new: true, upsert: true }
        );

        const orderNumber = `${dateStr}${String(counter.seq).padStart(6, '0')}`;

        // --- Add orderNumber to orderData ---
        const orderData = {
            items,
            totalAmount,
            customerName,
            paymentMethod,
            status: 'Pending',
            orderNumber, // <-- add this
        };
        if (userId && mongoose.Types.ObjectId.isValid(userId)) orderData.userId = userId;
        if (deliveryAddress) orderData.deliveryAddress = deliveryAddress;
        if (customerPhone) orderData.customerPhone = customerPhone;

        const newOrder = new Order(orderData);
        const savedOrder = await newOrder.save();
        res.status(201).json(savedOrder);
    } catch (error) {
        res.status(500).json({ message: 'Error creating order or updating stock.', error: error.message });
    }
});

// --- Products ---
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find().lean();
        const ingredientIds = [];
        products.forEach(product => {
            if (product.sizeVariants) {
                product.sizeVariants.forEach(variant => {
                    if (variant.recipe) {
                        variant.recipe.forEach(recipeItem => {
                            if (recipeItem.ingredient) ingredientIds.push(recipeItem.ingredient.toString());
                        });
                    }
                });
            }
        });
        const ingredients = await Ingredient.find({ _id: { $in: ingredientIds } }).lean();
        const ingredientMap = {};
        ingredients.forEach(ing => { ingredientMap[ing._id.toString()] = ing; });
        products.forEach(product => {
            if (product.sizeVariants) {
                product.sizeVariants.forEach(variant => {
                    if (variant.recipe) {
                        variant.recipe.forEach(recipeItem => {
                            if (recipeItem.ingredient && ingredientMap[recipeItem.ingredient.toString()]) {
                                recipeItem.ingredient = ingredientMap[recipeItem.ingredient.toString()];
                            }
                        });
                    }
                });
            }
        });
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching products', error: err.message });
    }
});

// --- Auth ---
app.post('/api/auth/signup', async (req, res) => {
    const { username, email, password, role, firstName, lastName, phone, address } = req.body;
    const actualRole = role || 'customer';
    const dataForUserCreation = { role: actualRole, firstName, lastName, phone };
    if (actualRole === 'admin') {
        if (!username) return res.status(400).json({ message: 'Username is required for admin role.' });
        dataForUserCreation.username = username;
        if (email) dataForUserCreation.email = email;
    } else {
        if (email) dataForUserCreation.email = email;
        if (address) dataForUserCreation.addresses = [address];
    }
    if (!password) return res.status(400).json({ message: 'Password is required.' });
    dataForUserCreation.password = password;
    try {
        let queryForExisting, fieldForErrorMessage;
        if (actualRole === 'admin') {
            queryForExisting = { username: dataForUserCreation.username };
            fieldForErrorMessage = 'Username';
        } else if (dataForUserCreation.email) {
            queryForExisting = { email: dataForUserCreation.email };
            fieldForErrorMessage = 'Email';
        }
        if (queryForExisting) {
            const existingUser = await User.findOne(queryForExisting);
            if (existingUser) return res.status(400).json({ message: `${fieldForErrorMessage} already exists.` });
        }
        const newUser = new User(dataForUserCreation);
        await newUser.save();
        const token = jwt.sign({ userId: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '1h' });
        const userToReturn = newUser.toObject();
        delete userToReturn.password;
        res.status(201).json({ message: 'User created successfully', user: userToReturn, token });
    } catch (error) {
        res.status(500).json({ message: 'Error creating user', error: error.message });
    }
});
// --- Auth ---
app.post('/api/auth/login', async (req, res) => {
    try {
        let { username, email, password } = req.body;
        let user = null;
        let rider = null;

        // Lowercase both username and email if they look like emails
        if (username && username.includes('@')) username = username.toLowerCase();
        if (email) email = email.toLowerCase();

        // Try to find by username or email (either can be provided)
        if (username || email) {
            user = await User.findOne({
                $or: [
                    { username: username },
                    { email: username }, // allow login with email in username field
                    { email: email }
                ]
            });
        }

        if (user) {
            const isMatch = await user.comparePassword(password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
            const token = jwt.sign({ userId: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
            const userToReturn = user.toObject();
            delete userToReturn.password;
            return res.json({
                message: 'Login successful',
                user: userToReturn,
                token,
                type: user.role
            });
        }
        // If not found in User, try Rider
        if (username) rider = await Rider.findOne({ username });
        if (rider) {
            const isMatch = await rider.comparePassword(password);
            if (!isMatch) return res.status(401).json({ message: 'Invalid credentials.' });
            const token = jwt.sign({ riderId: rider._id, role: 'rider' }, JWT_SECRET, { expiresIn: '8h' });
            const riderToReturn = rider.toObject();
            delete riderToReturn.password;
            return res.json({ message: 'Login successful', rider: riderToReturn, token, type: 'rider' });
        }
        return res.status(401).json({ message: 'Invalid credentials.' });
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error: error.message });
    }
});
// --- Initial Admin User ---
async function createInitialAdminIfNeeded() {
    try {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD || 'adminpassword';
        const existingAdmin = await User.findOne({ role: 'admin', username: adminUsername });
        if (!existingAdmin) {
            const adminUser = new User({
                username: adminUsername,
                password: adminPassword,
                role: 'admin',
            });
            await adminUser.save();
            console.log(`Initial admin user '${adminUsername}' created.`);
        } else {
            console.log(`Admin user '${adminUsername}' already exists.`);
        }
    } catch (error) {
        console.error('Error creating initial admin user:', error);
    }
}

// --- Server Start ---
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    createInitialAdminIfNeeded();
});

// 404 handler for API
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
        res.status(404).json({ message: "API route not found" });
    } else {
        res.status(404).send("Sorry, can't find that!");
    }
});
app.use((err, req, res, next) => {
    console.error("Global error handler:", err.stack);
    res.status(500).json({ message: 'Something broke!' });
});