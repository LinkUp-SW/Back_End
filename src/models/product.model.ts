import mongoose from 'mongoose';

const product_testschema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  price: {
    type: Number,
    required: [true, "Price is required"],
    default: 0,
  },
  description: {
    type: String,
    required: [false, "Description is required"],
  },
  quantity: {
    type: Number,
    required: [true, "Quantity is required"],
    default: 0,
  },
  imageUrl: {
    type: String,
    required: [false, "Image URL is required"],
  },
  Timestamp: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Product', product_testschema);
