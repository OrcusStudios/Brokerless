const OfferTask = require("../models/OfferTask");
const Offer = require("../models/Offer");
const User = require("../models/User");

/**
 * Middleware to check if the user is authorized to access the offer
 */
exports.checkOfferAccess = async (req, res, next) => {
  try {
    const { offerId } = req.params;
    const offer = await Offer.findById(offerId);
    
    if (!offer) {
      return res.status(404).json({ success: false, error: "Offer not found" });
    }
    
    // Check if user is either buyer or seller
    // Handle both old format (direct references) and new format (arrays of buyers/sellers)
    let isBuyer = false;
    let isSeller = false;
    
    // Check direct buyer/seller references (old format)
    if (offer.buyer && offer.buyer._id) {
      isBuyer = req.user._id.equals(offer.buyer._id);
    } else if (offer.buyer) {
      isBuyer = req.user._id.equals(offer.buyer);
    }
    
    if (offer.seller && offer.seller._id) {
      isSeller = req.user._id.equals(offer.seller._id);
    } else if (offer.seller) {
      isSeller = req.user._id.equals(offer.seller);
    }
    
    // Check buyers/sellers arrays (new format)
    if (offer.buyers && offer.buyers.length > 0) {
      isBuyer = isBuyer || offer.buyers.some(buyer => 
        buyer.user && buyer.user._id && req.user._id.equals(buyer.user._id)
      );
    }
    
    if (offer.sellers && offer.sellers.length > 0) {
      isSeller = isSeller || offer.sellers.some(seller => 
        seller.user && seller.user._id && req.user._id.equals(seller.user._id)
      );
    }
    
    if (!isBuyer && !isSeller) {
      return res.status(403).json({ success: false, error: "Not authorized to access this offer" });
    }
    
    // Store the offer in the request for later use
    req.offer = offer;
    next();
  } catch (error) {
    console.error("Error checking offer access:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
};

/**
 * Create default tasks for an accepted offer
 * @param {String} offerId - ID of the accepted offer
 */
exports.createDefaultTasks = async (offerId) => {
  try {
    const offer = await Offer.findById(offerId);
    if (!offer) {
      throw new Error("Offer not found");
    }

    // Check if tasks already exist for this offer
    const existingTasks = await OfferTask.find({ offer: offerId });
    if (existingTasks.length > 0) {
      console.log(`Tasks already exist for offer ${offerId}`);
      return;
    }

    // Define default tasks for buyers
    const buyerTasks = [
      {
        title: "Schedule Home Inspection",
        description: "Find and schedule a professional home inspector to evaluate the property.",
        category: "inspection",
        assignedTo: "buyer",
        displayOrder: 1,
        isRequired: true
      },
      {
        title: "Secure Financing",
        description: "Finalize your mortgage application and provide all required documentation to your lender.",
        category: "financing",
        assignedTo: "buyer",
        displayOrder: 2,
        isRequired: offer.financingType !== "cash"
      },
      {
        title: "Submit Earnest Money",
        description: `Submit earnest money deposit of $${offer.earnestMoney.toLocaleString()} to the title company by ${new Date(offer.earnestDueDate).toLocaleDateString()}.`,
        category: "closing",
        assignedTo: "buyer",
        displayOrder: 3,
        isRequired: true,
        dueDate: offer.earnestDueDate
      },
      {
        title: "Review Inspection Results",
        description: "Review the inspection report and decide if any repairs need to be requested.",
        category: "inspection",
        assignedTo: "buyer",
        displayOrder: 4,
        isRequired: true
      },
      {
        title: "Schedule Appraisal",
        description: "Coordinate with your lender to schedule a property appraisal.",
        category: "financing",
        assignedTo: "buyer",
        displayOrder: 5,
        isRequired: offer.financingType !== "cash"
      },
      {
        title: "Purchase Homeowner's Insurance",
        description: "Secure homeowner's insurance policy to be effective on the closing date.",
        category: "closing",
        assignedTo: "buyer",
        displayOrder: 6,
        isRequired: true
      },
      {
        title: "Conduct Final Walk-Through",
        description: "Schedule and complete a final walk-through of the property before closing.",
        category: "closing",
        assignedTo: "buyer",
        displayOrder: 7,
        isRequired: true
      },
      {
        title: "Prepare for Closing",
        description: "Gather all required documents and prepare certified funds for closing.",
        category: "closing",
        assignedTo: "buyer",
        displayOrder: 8,
        isRequired: true
      }
    ];

    // Define default tasks for sellers
    const sellerTasks = [
      {
        title: "Provide Property Disclosures",
        description: "Complete and submit all required property disclosure forms.",
        category: "other",
        assignedTo: "seller",
        displayOrder: 1,
        isRequired: true
      },
      {
        title: "Prepare for Home Inspection",
        description: "Ensure all areas of the home are accessible for the inspector.",
        category: "inspection",
        assignedTo: "seller",
        displayOrder: 2,
        isRequired: true
      },
      {
        title: "Review Inspection Requests",
        description: "Review and respond to any repair requests from the buyer.",
        category: "inspection",
        assignedTo: "seller",
        displayOrder: 3,
        isRequired: true
      },
      {
        title: "Complete Agreed Repairs",
        description: "Complete any agreed-upon repairs before closing.",
        category: "other",
        assignedTo: "seller",
        displayOrder: 4,
        isRequired: false
      },
      {
        title: "Prepare for Closing",
        description: "Gather all required documents for closing.",
        category: "closing",
        assignedTo: "seller",
        displayOrder: 5,
        isRequired: true
      },
      {
        title: "Schedule Moving Out",
        description: "Plan and schedule your move-out before the closing date.",
        category: "closing",
        assignedTo: "seller",
        displayOrder: 6,
        isRequired: true
      }
    ];

    // Create tasks in the database
    const allTasks = [...buyerTasks, ...sellerTasks];
    const taskDocuments = allTasks.map(task => ({
      ...task,
      offer: offerId
    }));

    await OfferTask.insertMany(taskDocuments);
    console.log(`Created ${taskDocuments.length} tasks for offer ${offerId}`);
  } catch (error) {
    console.error("Error creating default tasks:", error);
    throw error;
  }
};

/**
 * Get tasks for an offer
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.getOfferTasks = async (req, res) => {
  try {
    const { offerId } = req.params;
    // Determine if the user is a buyer or seller
    let userRole = "buyer"; // Default
    
    // Check if user is a buyer
    let isBuyer = false;
    
    // Check direct buyer reference (old format)
    if (req.offer.buyer && req.offer.buyer._id) {
      isBuyer = req.user._id.equals(req.offer.buyer._id);
    } else if (req.offer.buyer) {
      isBuyer = req.user._id.equals(req.offer.buyer);
    }
    
    // Check buyers array (new format)
    if (req.offer.buyers && req.offer.buyers.length > 0) {
      isBuyer = isBuyer || req.offer.buyers.some(buyer => 
        buyer.user && buyer.user._id && req.user._id.equals(buyer.user._id)
      );
    }
    
    // Set role based on buyer check
    userRole = isBuyer ? "buyer" : "seller";

    // Get tasks assigned to this user or both
    const tasks = await OfferTask.find({
      offer: offerId,
      $or: [{ assignedTo: userRole }, { assignedTo: "both" }]
    }).sort({ displayOrder: 1 });

    res.json({ success: true, tasks });
  } catch (error) {
    console.error("Error getting offer tasks:", error);
    res.status(500).json({ success: false, error: "Failed to get tasks" });
  }
};

/**
 * Update task status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status, notes } = req.body;

    const task = await OfferTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    // Determine if the user is a buyer or seller
    let userRole = "buyer"; // Default
    
    // Check if user is a buyer
    let isBuyer = false;
    
    // Check direct buyer reference (old format)
    if (req.offer.buyer && req.offer.buyer._id) {
      isBuyer = req.user._id.equals(req.offer.buyer._id);
    } else if (req.offer.buyer) {
      isBuyer = req.user._id.equals(req.offer.buyer);
    }
    
    // Check buyers array (new format)
    if (req.offer.buyers && req.offer.buyers.length > 0) {
      isBuyer = isBuyer || req.offer.buyers.some(buyer => 
        buyer.user && buyer.user._id && req.user._id.equals(buyer.user._id)
      );
    }
    
    // Set role based on buyer check
    userRole = isBuyer ? "buyer" : "seller";
    if (task.assignedTo !== userRole && task.assignedTo !== "both") {
      return res.status(403).json({ success: false, error: "Not authorized to update this task" });
    }

    // Update the task
    task.status = status;
    if (notes) task.notes = notes;

    if (status === "completed") {
      task.completedAt = new Date();
      task.completedBy = req.user._id;
    } else {
      task.completedAt = null;
      task.completedBy = null;
    }

    await task.save();

    res.json({ success: true, task });
  } catch (error) {
    console.error("Error updating task status:", error);
    res.status(500).json({ success: false, error: "Failed to update task" });
  }
};

/**
 * Add a custom task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.addCustomTask = async (req, res) => {
  try {
    const { offerId } = req.params;
    const { title, description, category, dueDate, assignedTo } = req.body;

    // Determine if the user is a buyer or seller
    let userRole = "buyer"; // Default
    
    // Check if user is a buyer
    let isBuyer = false;
    
    // Check direct buyer reference (old format)
    if (req.offer.buyer && req.offer.buyer._id) {
      isBuyer = req.user._id.equals(req.offer.buyer._id);
    } else if (req.offer.buyer) {
      isBuyer = req.user._id.equals(req.offer.buyer);
    }
    
    // Check buyers array (new format)
    if (req.offer.buyers && req.offer.buyers.length > 0) {
      isBuyer = isBuyer || req.offer.buyers.some(buyer => 
        buyer.user && buyer.user._id && req.user._id.equals(buyer.user._id)
      );
    }
    
    // Set role based on buyer check
    userRole = isBuyer ? "buyer" : "seller";
    
    // Users can only add tasks for themselves or both parties
    if (assignedTo !== userRole && assignedTo !== "both") {
      return res.status(403).json({ success: false, error: "Not authorized to add tasks for the other party" });
    }

    // Get the highest display order
    const highestOrderTask = await OfferTask.findOne({ offer: offerId })
      .sort({ displayOrder: -1 })
      .limit(1);
    
    const displayOrder = highestOrderTask ? highestOrderTask.displayOrder + 1 : 1;

    // Create the new task
    const newTask = new OfferTask({
      offer: offerId,
      title,
      description,
      category: category || "other",
      dueDate: dueDate || null,
      assignedTo: assignedTo || userRole,
      displayOrder,
      isRequired: false
    });

    await newTask.save();

    res.json({ success: true, task: newTask });
  } catch (error) {
    console.error("Error adding custom task:", error);
    res.status(500).json({ success: false, error: "Failed to add task" });
  }
};

/**
 * Delete a custom task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
exports.deleteTask = async (req, res) => {
  try {
    const { taskId } = req.params;

    const task = await OfferTask.findById(taskId);
    if (!task) {
      return res.status(404).json({ success: false, error: "Task not found" });
    }

    // Only allow deletion of non-required tasks
    if (task.isRequired) {
      return res.status(403).json({ success: false, error: "Cannot delete required tasks" });
    }

    // Determine if the user is a buyer or seller
    let userRole = "buyer"; // Default
    
    // Check if user is a buyer
    let isBuyer = false;
    
    // Check direct buyer reference (old format)
    if (req.offer.buyer && req.offer.buyer._id) {
      isBuyer = req.user._id.equals(req.offer.buyer._id);
    } else if (req.offer.buyer) {
      isBuyer = req.user._id.equals(req.offer.buyer);
    }
    
    // Check buyers array (new format)
    if (req.offer.buyers && req.offer.buyers.length > 0) {
      isBuyer = isBuyer || req.offer.buyers.some(buyer => 
        buyer.user && buyer.user._id && req.user._id.equals(buyer.user._id)
      );
    }
    
    // Set role based on buyer check
    userRole = isBuyer ? "buyer" : "seller";
    if (task.assignedTo !== userRole && task.assignedTo !== "both") {
      return res.status(403).json({ success: false, error: "Not authorized to delete this task" });
    }

    await OfferTask.deleteOne({ _id: taskId });

    res.json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({ success: false, error: "Failed to delete task" });
  }
};
