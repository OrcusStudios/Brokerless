const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, refPath: 'senderModel', required: true },
  senderModel: { type: String, required: true, enum: ['User', 'Professional'] },
  receiver: { type: mongoose.Schema.Types.ObjectId, refPath: 'receiverModel', required: true },
  receiverModel: { type: String, required: true, enum: ['User', 'Professional'] },
  content: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  readAt: { type: Date },
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: "Listing" },
  offerId: { type: mongoose.Schema.Types.ObjectId, ref: "Offer" },
  attachments: [
    {
      name: String,
      url: String,
      type: String,
      size: Number,
      uploadedAt: { type: Date, default: Date.now }
    }
  ],
  createdAt: { type: Date, default: Date.now },
});
// Add virtual for conversation ID (for grouping)
MessageSchema.virtual('conversationId').get(function() {
  // Create a consistent ID regardless of who is sender/receiver
  const ids = [this.sender.toString(), this.receiver.toString()].sort();
  return ids.join('-');
});

// Index for faster queries
MessageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
MessageSchema.index({ receiver: 1, isRead: 1 });

// Static method to get conversations for a user
MessageSchema.statics.getConversationsForUser = async function(userId) {
  // Get unique conversations where the user is either sender or receiver
  const conversations = await this.aggregate([
    {
      $match: {
        $or: [
          { sender: mongoose.Types.ObjectId(userId) },
          { receiver: mongoose.Types.ObjectId(userId) }
        ]
      }
    },
    {
      $sort: { createdAt: -1 }
    },
    {
      $group: {
        _id: {
          $cond: [
            { $lt: ["$sender", "$receiver"] },
            { sender: "$sender", receiver: "$receiver" },
            { sender: "$receiver", receiver: "$sender" }
          ]
        },
        participants: { $addToSet: { $cond: [{ $eq: ["$sender", mongoose.Types.ObjectId(userId)] }, "$receiver", "$sender"] } },
        lastMessage: { $first: "$$ROOT" },
        unreadCount: {
          $sum: {
            $cond: [
              { $and: [
                { $eq: ["$receiver", mongoose.Types.ObjectId(userId)] },
                { $eq: ["$isRead", false] }
              ]},
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: { "lastMessage.createdAt": -1 }
    }
  ]);

  // Populate the participants
  const populatedConversations = await Promise.all(
    conversations.map(async (conv) => {
      const otherParticipantId = conv.participants[0];
      const otherParticipant = await mongoose.model('User').findById(otherParticipantId)
        .select('name email profileImage roles professionalType');
      
      return {
        ...conv,
        otherParticipant
      };
    })
  );

  return populatedConversations;
};

module.exports = mongoose.model("Message", MessageSchema);