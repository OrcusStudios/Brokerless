// finalNotifications.js

require('dotenv').config();
const mongoose = require('mongoose');

// User ID
const USER_ID = "67c31cc6dcebaf7c98f87dd9";

// Define a schema that matches your existing one
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  type: {
    type: String,
    enum: [
      "Showing", "Approved", "Declined", "Rejected", "Denied",
      "Completed", "Offer", "Countered", "General", 
      "info", "success", "warning", "error"
    ],
    default: "General"
  },
  link: { type: String },
  createdAt: { type: Date, default: Date.now }
});

// Create a model just for this script
const TempNotification = mongoose.model('Notification', notificationSchema);

// MongoDB Connection - using your exact connection syntax
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
    return createNotifications();
  })
  .then(() => {
    console.log('✅ All notifications created successfully!');
    mongoose.connection.close();
  })
  .catch(err => {
    console.error("❌ Error:", err);
    mongoose.connection.close();
  });

// Function to create notifications
function createNotifications() {
  // Create notification records
  const notifications = [
    {
      user: USER_ID,
      type: 'Offer',
      message: 'You have received a new offer on your property at 123 Main Street.',
      link: '/offers/seller',
      isRead: false
    },
    {
      user: USER_ID,
      type: 'Showing',
      message: 'Your showing request for tomorrow at 2:00 PM has been confirmed.',
      link: '/schedule/buyer',
      isRead: false
    },
    {
      user: USER_ID,
      type: 'Approved',
      message: 'Your pre-approval letter has been verified and approved.',
      link: '/users/dashboard',
      isRead: false
    },
    {
      user: USER_ID,
      type: 'info',
      message: 'Your lender has sent you important information about your application.',
      link: '/messages',
      isRead: false
    },
    {
      user: USER_ID,
      type: 'General',
      message: 'A property in your saved listings has reduced its price by $15,000.',
      link: '/listings',
      isRead: false
    }
  ];

  console.log(`Creating ${notifications.length} notifications for user ${USER_ID}...`);

  // Use Promise.all to save all notifications
  const promises = notifications.map(notification => {
    const newNotification = new TempNotification(notification);
    return newNotification.save()
      .then(() => {
        console.log(`✅ Created: ${notification.type} - ${notification.message.substring(0, 30)}...`);
      });
  });

  return Promise.all(promises);
}