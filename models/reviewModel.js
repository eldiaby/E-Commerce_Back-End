// ==========================
// 🧩 DEPENDENCIES
// ==========================
const mongoose = require('mongoose');

// ==========================
// 🧾 REVIEW SCHEMA DEFINITION
// ==========================
const reviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, 'Please provide a rating'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating must not exceed 5'],
    },
    title: {
      type: String,
      trim: true,
      required: [true, 'Please provide a review title'],
      minlength: [3, 'Title must be at least 3 characters'],
      maxlength: [30, 'Title must not exceed 30 characters'],
    },
    comment: {
      type: String,
      trim: true,
      required: [true, 'Please provide a review comment'],
      minlength: [3, 'Comment must be at least 3 characters'],
      maxlength: [400, 'Comment must not exceed 400 characters'],
    },
    user: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: [true, 'Review must be associated with a user'],
    },
    product: {
      type: mongoose.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Review must be associated with a product'],
    },
  },
  { timestamps: true }
);

// ==========================
// 📌 UNIQUE INDEX
// ==========================
// Ensure a user can only leave one review per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// ==========================
// 🧠 STATIC METHODS
// ==========================

/**
 * @method updateProductStats
 * @desc Calculates and updates average rating and number of reviews for a product.
 * @param {mongoose.Types.ObjectId} productId - The ID of the product to update.
 */
reviewSchema.statics.updateProductStats = async function (productId) {
  const Product = mongoose.model('Product');

  const result = await this.aggregate([
    { $match: { product: productId } },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$rating' },
        numberOfReviews: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: result[0].averageRating.toFixed(1),
      numberOfReviews: result[0].numberOfReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      averageRating: 0,
      numberOfReviews: 0,
    });
  }
};

// ==========================
// 🪝 MONGOOSE HOOKS
// ==========================

/* -----------------------------------------
 🔁 post('save') Hook
 - Runs after saving a new review.
 - Recalculates product's average rating.
------------------------------------------ */
reviewSchema.post('save', async function () {
  if (this.product) {
    await mongoose.model('Review').updateProductStats(this.product);
  }
});

/* -----------------------------------------
 🗑️ post('findOneAndDelete') Hook
 - Runs after a review is deleted.
 - Recalculates product's average rating.
------------------------------------------ */
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc && doc.product) {
    await mongoose.model('Review').updateProductStats(doc.product);
  }
});

/* -----------------------------------------
 ✏️ post('findOneAndUpdate') Hook
 - Runs after a review is updated.
 - Recalculates product's average rating.
------------------------------------------ */
reviewSchema.post('findOneAndUpdate', async function (doc) {
  if (doc && doc.product) {
    await mongoose.model('Review').updateProductStats(doc.product);
  }
});

// ==========================
// 📤 EXPORT REVIEW MODEL
// ==========================
module.exports = mongoose.model('Review', reviewSchema);
