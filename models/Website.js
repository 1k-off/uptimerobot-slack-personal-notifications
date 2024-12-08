import mongoose from 'mongoose';

const WebsiteSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true,
  },
  alertContacts: {
    slack: {
      users: [String],    // Array of Slack user IDs
      channels: [String], // Array of Slack channel IDs
    },
  },
  friendlyName: {
    type: String,
  },
  url: {
    type: String,
  },
}, { timestamps: true });

export default mongoose.models.Website || mongoose.model('Website', WebsiteSchema);
