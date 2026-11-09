const mongoose = require('mongoose');

const personSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
      maxlength: 80,
    },
    lastName: {
      type: String,
      trim: true,
      maxlength: 80,
      default: '',
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'unknown'],
      default: 'unknown',
    },
    birthDate: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    deathDate: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    spouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      default: null,
      index: true,
    },
    // Kept for display in the bloodline-only view and for older records.
    spouseName: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    parentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      default: null,
      index: true,
    },
  },
  { timestamps: true }
);

personSchema.index({ owner: 1, parentId: 1 });

personSchema.set('toJSON', {
  transform: (_document, result) => {
    result.id = result._id.toString();
    delete result._id;
    delete result.__v;
    return result;
  },
});

module.exports = mongoose.models.Person || mongoose.model('Person', personSchema);
