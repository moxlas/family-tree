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
    status: {
      type: String,
      enum: ['current', 'former'],
      default: 'current',
    },
    relationshipStatus: {
      type: String,
      enum: [
        '',
        'married',
        'partner',
        'engaged',
        'divorced',
        'widowed',
        'separated',
      ],
      default: '',
    },
    marriageDate: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    marriagePlace: {
      type: String,
      trim: true,
      maxlength: 160,
      default: '',
    },
    divorceDate: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    separationDate: {
      type: String,
      trim: true,
      maxlength: 40,
      default: '',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
  },
  { timestamps: true }
);

familySchema.index({ owner: 1, tree: 1 });
familySchema.index({ owner: 1, tree: 1, husband: 1 });
familySchema.index({ owner: 1, tree: 1, wife: 1 });

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
