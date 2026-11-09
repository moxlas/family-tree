const mongoose = require('mongoose');

const treeSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tree name is required'],
      trim: true,
      maxlength: 120,
    },
  },
  { timestamps: true }
);

treeSchema.index({ owner: 1, createdAt: 1 });
treeSchema.index({ owner: 1, name: 1 }, { unique: true });

treeSchema.set('toJSON', {
  transform: (_document, result) => {
    result.id = result._id.toString();
    delete result._id;
    delete result.__v;
    return result;
  },
});

module.exports = mongoose.models.Tree || mongoose.model('Tree', treeSchema);
