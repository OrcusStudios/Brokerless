// Add this to models/ClosingDocument.js
const mongoose = require('mongoose');

const ClosingDocumentSchema = new mongoose.Schema({
  offer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Offer',
    required: true
  },
  name: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['contract', 'disclosure', 'inspection', 'title', 'mortgage', 'identity', 'other'],
    required: true
  },
  url: {
    type: String,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requiredSignatures: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    signed: {
      type: Boolean,
      default: false
    },
    signatureDate: Date,
    signatureUrl: String
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ClosingDocument', ClosingDocumentSchema);