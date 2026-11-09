const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 80,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 160,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true }
);

userSchema.set('toJSON', {
  transform: (_document, result) => {
    result.id = result._id.toString();
    delete result._id;
    delete result.__v;
    delete result.passwordHash;
    return result;
  },
});

module.exports = mongoose.models.User || mongoose.model('User', userSchema);
