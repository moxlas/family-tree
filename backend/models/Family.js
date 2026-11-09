const mongoose = require('mongoose');

const familySchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    tree: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tree',
      required: true,
      index: true,
    },
    husband: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      default: null,
    },
    wife: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Person',
      default: null,
    },
    children: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Person',
      },
    ],
  },
  { timestamps: true }
);

familySchema.index({ owner: 1, tree: 1 });

familySchema.set('toJSON', {
  transform: (_document, result) => {
    result.id = result._id.toString();
    result.husband = result.husband ? result.husband.toString() : null;
    result.wife = result.wife ? result.wife.toString() : null;
    result.children = (result.children || []).map((entry) =>
      entry.toString ? entry.toString() : String(entry)
    );
    delete result._id;
    delete result.__v;
    return result;
  },
});

module.exports = mongoose.models.Family || mongoose.model('Family', familySchema);
