const Listing = require('../models/Listing');
const User = require('../models/User');
const CoSellerInvitation = require('../models/CoSellerInvitation');
const { sendEmail } = require('../utils/emailService');
const { AppError, catchAsync } = require('../middleware/errorMiddleware');

// Show co-seller management page
exports.showCoSellerManagement = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  
  // Find the listing and populate sellers
  const listing = await Listing.findById(listingId)
    .populate({
      path: 'sellers.user',
      select: 'name email profileImage'
    });
  
  if (!listing) {
    req.flash('error', 'Listing not found');
    return res.redirect('/listings/manage');
  }
  
  // Check if user is the primary seller
  const isPrimarySeller = listing.sellers && listing.sellers.some(seller => 
    seller.user._id.toString() === req.user._id.toString() && seller.role === 'primary'
  );
  
  // For backward compatibility
  const isLegacySeller = listing.seller && listing.seller.toString() === req.user._id.toString();
  
  if (!isPrimarySeller && !isLegacySeller) {
    req.flash('error', 'Only the primary seller can manage co-sellers');
    return res.redirect('/listings/manage');
  }
  
  // Get pending invitations
  const pendingInvitations = await CoSellerInvitation.find({
    listing: listingId,
    status: 'pending'
  }).sort({ createdAt: -1 });
  
  res.render('listings/coSellers', {
    listing,
    pendingInvitations,
    user: req.user
  });
});

// Send invitation to co-seller
exports.inviteCoSeller = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  const { email, relationship } = req.body;
  
  // Find the listing
  const listing = await Listing.findById(listingId);
  
  if (!listing) {
    req.flash('error', 'Listing not found');
    return res.redirect('/listings/manage');
  }
  
  // Check if user is the primary seller
  const isPrimarySeller = listing.sellers && listing.sellers.some(seller => 
    seller.user.toString() === req.user._id.toString() && seller.role === 'primary'
  );
  
  // For backward compatibility
  const isLegacySeller = listing.seller && listing.seller.toString() === req.user._id.toString();
  
  if (!isPrimarySeller && !isLegacySeller) {
    req.flash('error', 'Only the primary seller can invite co-sellers');
    return res.redirect('/listings/manage');
  }
  
  // Check if the email is already a seller on this listing
  const isAlreadySeller = listing.sellers && listing.sellers.some(seller => {
    // We need to populate the user to check the email
    return seller.user.email === email;
  });
  
  if (isAlreadySeller) {
    req.flash('error', 'This user is already a seller on this listing');
    return res.redirect(`/listings/${listingId}/co-sellers`);
  }
  
  // Check if the invited user exists
  const invitedUser = await User.findOne({ email });
  
  // Create the invitation
  const invitation = await CoSellerInvitation.createInvitation(
    listingId,
    req.user._id,
    email,
    relationship
  );
  
  // Send invitation email
  const invitationUrl = `${req.protocol}://${req.get('host')}/listings/invitations/${invitation.token}`;
  
  const emailContent = `
    <h2>You've been invited to be a co-seller</h2>
    <p>Hello${invitedUser ? ` ${invitedUser.name}` : ''},</p>
    <p>${req.user.name} has invited you to be a co-seller for the property at ${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}.</p>
    <p>You have been invited as a ${relationship}.</p>
    <p>To accept this invitation, please click the link below:</p>
    <p><a href="${invitationUrl}">Accept Invitation</a></p>
    <p>This invitation will expire in 7 days.</p>
    <p>If you don't have an account yet, you'll need to create one before accepting the invitation.</p>
    <p>Thank you,<br>The Real Estate Platform Team</p>
  `;
  
  try {
    await sendEmail(
      email,
      'Invitation to be a Co-Seller',
      emailContent
    );
    
    req.flash('success', `Invitation sent to ${email}`);
  } catch (error) {
    console.error('Error sending invitation email:', error);
    req.flash('error', 'Invitation created but email could not be sent');
  }
  
  res.redirect(`/listings/${listingId}/co-sellers`);
});

// Resend invitation
exports.resendInvitation = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  const invitationId = req.params.invitationId;
  
  // Find the invitation
  const invitation = await CoSellerInvitation.findById(invitationId);
  
  if (!invitation || invitation.listing.toString() !== listingId) {
    return res.status(404).json({ success: false, message: 'Invitation not found' });
  }
  
  // Check if user is the inviter
  if (invitation.inviter.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Unauthorized' });
  }
  
  // Find the listing
  const listing = await Listing.findById(listingId);
  
  if (!listing) {
    return res.status(404).json({ success: false, message: 'Listing not found' });
  }
  
  // Refresh the token
  await invitation.refreshToken();
  
  // Send invitation email
  const invitationUrl = `${req.protocol}://${req.get('host')}/listings/invitations/${invitation.token}`;
  
  const emailContent = `
    <h2>You've been invited to be a co-seller (Reminder)</h2>
    <p>Hello,</p>
    <p>${req.user.name} has invited you to be a co-seller for the property at ${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}.</p>
    <p>You have been invited as a ${invitation.relationship}.</p>
    <p>To accept this invitation, please click the link below:</p>
    <p><a href="${invitationUrl}">Accept Invitation</a></p>
    <p>This invitation will expire in 7 days.</p>
    <p>If you don't have an account yet, you'll need to create one before accepting the invitation.</p>
    <p>Thank you,<br>The Real Estate Platform Team</p>
  `;
  
  try {
    await sendEmail(
      invitation.email,
      'Invitation to be a Co-Seller (Reminder)',
      emailContent
    );
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error sending invitation email:', error);
    return res.status(500).json({ success: false, message: 'Error sending email' });
  }
});

// Cancel invitation
exports.cancelInvitation = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  const invitationId = req.params.invitationId;
  
  // Find the invitation
  const invitation = await CoSellerInvitation.findById(invitationId);
  
  if (!invitation || invitation.listing.toString() !== listingId) {
    req.flash('error', 'Invitation not found');
    return res.redirect(`/listings/${listingId}/co-sellers`);
  }
  
  // Check if user is the inviter
  if (invitation.inviter.toString() !== req.user._id.toString()) {
    req.flash('error', 'Unauthorized');
    return res.redirect(`/listings/${listingId}/co-sellers`);
  }
  
  // Delete the invitation
  await invitation.deleteOne();
  
  req.flash('success', 'Invitation cancelled');
  res.redirect(`/listings/${listingId}/co-sellers`);
});

// Accept invitation page
exports.showAcceptInvitation = catchAsync(async (req, res, next) => {
  const token = req.params.token;
  
  // Find the invitation
  const invitation = await CoSellerInvitation.findOne({ token })
    .populate('listing')
    .populate('inviter', 'name email');
  
  if (!invitation || invitation.status !== 'pending') {
    req.flash('error', 'Invalid or expired invitation');
    return res.redirect('/listings');
  }
  
  // Check if invitation is expired
  if (invitation.isExpired()) {
    invitation.status = 'expired';
    await invitation.save();
    
    req.flash('error', 'This invitation has expired');
    return res.redirect('/listings');
  }
  
  res.render('listings/acceptInvitation', {
    invitation,
    user: req.user
  });
});

// Accept invitation
exports.acceptInvitation = catchAsync(async (req, res, next) => {
  const token = req.params.token;
  
  // Find the invitation
  const invitation = await CoSellerInvitation.findOne({ token })
    .populate('listing');
  
  if (!invitation || invitation.status !== 'pending') {
    req.flash('error', 'Invalid or expired invitation');
    return res.redirect('/listings');
  }
  
  // Check if invitation is expired
  if (invitation.isExpired()) {
    invitation.status = 'expired';
    await invitation.save();
    
    req.flash('error', 'This invitation has expired');
    return res.redirect('/listings');
  }
  
  // Check if user is logged in
  if (!req.user) {
    // Store the token in session and redirect to login
    req.session.invitationToken = token;
    req.flash('info', 'Please log in or create an account to accept this invitation');
    return res.redirect('/users/login');
  }
  
  // Check if user's email matches the invitation email
  if (req.user.email !== invitation.email) {
    req.flash('error', `This invitation was sent to ${invitation.email}. Please log in with that email address.`);
    return res.redirect('/users/login');
  }
  
  // Find the listing
  const listing = await Listing.findById(invitation.listing._id);
  
  if (!listing) {
    req.flash('error', 'Listing not found');
    return res.redirect('/listings');
  }
  
  // Check if user is already a seller on this listing
  const isAlreadySeller = listing.sellers && listing.sellers.some(seller => 
    seller.user.toString() === req.user._id.toString()
  );
  
  if (isAlreadySeller) {
    req.flash('error', 'You are already a seller on this listing');
    return res.redirect(`/listings/${listing._id}`);
  }
  
  // Add user as a co-seller
  if (!listing.sellers) {
    listing.sellers = [];
  }
  
  // If this is the first seller being added, make the original seller the primary
  if (listing.sellers.length === 0 && listing.seller) {
    listing.sellers.push({
      user: listing.seller,
      role: 'primary',
      relationship: 'Primary Seller'
    });
  }
  
  // Add the new co-seller
  listing.sellers.push({
    user: req.user._id,
    role: 'co-seller',
    relationship: invitation.relationship
  });
  
  // Update the invitation status
  invitation.status = 'accepted';
  
  // Save changes
  await Promise.all([
    listing.save(),
    invitation.save()
  ]);
  
  // Add seller role to user if they don't have it
  if (!req.user.hasActiveRole('seller')) {
    await req.user.addRole('seller');
  }
  
  // Add listing to user's seller.listings array
  if (!req.user.seller) {
    req.user.seller = { listings: [] };
  }
  
  if (!req.user.seller.listings.includes(listing._id)) {
    req.user.seller.listings.push(listing._id);
    await req.user.save();
  }
  
  // Send notification to the primary seller
  const notificationController = require('./notificationController');
  await notificationController.createNotification(
    invitation.inviter,
    `${req.user.name} has accepted your invitation to be a co-seller for ${listing.address}`,
    'Co-Seller',
    `/listings/${listing._id}/co-sellers`,
    'SUCCESS'
  );
  
  req.flash('success', `You are now a co-seller for ${listing.address}`);
  res.redirect(`/listings/${listing._id}`);
});

// Reject invitation
exports.rejectInvitation = catchAsync(async (req, res, next) => {
  const token = req.params.token;
  
  // Find the invitation
  const invitation = await CoSellerInvitation.findOne({ token });
  
  if (!invitation || invitation.status !== 'pending') {
    req.flash('error', 'Invalid or expired invitation');
    return res.redirect('/listings');
  }
  
  // Update the invitation status
  invitation.status = 'rejected';
  await invitation.save();
  
  // Send notification to the primary seller
  const notificationController = require('./notificationController');
  await notificationController.createNotification(
    invitation.inviter,
    `${invitation.email} has declined your invitation to be a co-seller`,
    'Co-Seller',
    `/listings/${invitation.listing}/co-sellers`,
    'WARNING'
  );
  
  req.flash('info', 'Invitation declined');
  res.redirect('/listings');
});

// Remove co-seller
exports.removeCoSeller = catchAsync(async (req, res, next) => {
  const listingId = req.params.id;
  const coSellerId = req.params.coSellerId;
  
  // Find the listing
  const listing = await Listing.findById(listingId);
  
  if (!listing) {
    req.flash('error', 'Listing not found');
    return res.redirect('/listings/manage');
  }
  
  // Check if user is the primary seller
  const isPrimarySeller = listing.sellers && listing.sellers.some(seller => 
    seller.user.toString() === req.user._id.toString() && seller.role === 'primary'
  );
  
  // For backward compatibility
  const isLegacySeller = listing.seller && listing.seller.toString() === req.user._id.toString();
  
  if (!isPrimarySeller && !isLegacySeller) {
    req.flash('error', 'Only the primary seller can remove co-sellers');
    return res.redirect('/listings/manage');
  }
  
  // Check if the co-seller exists
  const coSellerIndex = listing.sellers.findIndex(seller => 
    seller.user.toString() === coSellerId && seller.role === 'co-seller'
  );
  
  if (coSellerIndex === -1) {
    req.flash('error', 'Co-seller not found');
    return res.redirect(`/listings/${listingId}/co-sellers`);
  }
  
  // Remove the co-seller
  listing.sellers.splice(coSellerIndex, 1);
  
  // Save changes
  await listing.save();
  
  // Send notification to the removed co-seller
  const notificationController = require('./notificationController');
  await notificationController.createNotification(
    coSellerId,
    `You have been removed as a co-seller for ${listing.address}`,
    'Co-Seller',
    `/listings/${listingId}`,
    'WARNING'
  );
  
  req.flash('success', 'Co-seller removed successfully');
  res.redirect(`/listings/${listingId}/co-sellers`);
});
