const mongoose = require('mongoose');

const glbFileSchema = new mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  data: { type: Buffer, required: true },
  size: { type: Number },
}, { timestamps: true });

module.exports = mongoose.model('GlbFile', glbFileSchema);
