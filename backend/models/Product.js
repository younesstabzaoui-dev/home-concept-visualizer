const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  reference: { type: String, required: true },
  category: {
    type: String,
    required: true,
    enum: ['canape', 'table_basse', 'table_repas', 'chaise', 'lit'],
  },
  image: { type: String, default: '' },
  lengthCm: { type: Number, required: true },
  depthCm: { type: Number, required: true },
  heightCm: { type: Number, required: true },
  description: { type: String, default: '' },
  glbUrl: { type: String, default: '' },
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
