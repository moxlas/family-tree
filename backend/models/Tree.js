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
    homePersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      default: null,
    },
    sharing: {
      enabled: {
        type: Boolean,
        default: false,
      },
      // Set only when sharing is enabled or the link is rotated. Keeping it
      // absent otherwise lets the sparse unique index ignore unshared trees.
      token: {
        type: String,
        trim: true,
      },
    },
  },
  { timestamps: true }
);

treeSchema.index({ owner: 1, createdAt: 1 });
treeSchema.index({ owner: 1, name: 1 }, { unique: true });
treeSchema.index({ 'sharing.token': 1 }, { unique: true, sparse: true });

treeSchema.set('toJSON', {
  transform: (_document, result) => {
    result.id = result._id.toString();
    delete result._id;
    delete result.__v;
    return result;
  },
});

module.exports = mongoose.models.Tree || mongoose.model('Tree', treeSchema);
