const userData = require('../models/user');

const requireAgeVerified = async (req, res, next) => {
  try {
    const user = await userData.findById(req.user._id);
    
    if (!user.dateOfBirth) {
      return res.status(403).json({
        status: 0,
        action: 'COMPLETE_PROFILE',
        message: 'Please complete your profile with date of birth'
      });
    }
    
    const age = calculateAge(user.dateOfBirth);
    if (age < 13) {
      return res.status(403).json({
        status: 0,
        action: 'UNDERAGE_BLOCKED',
        message: 'You must be at least 13 years old'
      });
    }
    
    next();
  } catch (error) {
    res.status(500).json({ status: 0, message: 'Server error' });
  }
};

function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

module.exports = requireAgeVerified;