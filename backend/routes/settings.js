const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// Get settings (Public or Auth)
router.get('/', async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = await Setting.create({
        companyName: 'RAXWO TOOL RENTALS',
        phones: ['+94 775 085 815', '+94 723 627 888', '+94 766 779 603']
      });
    }
    res.json(settings);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update settings (Admin only)
router.put('/', authMiddleware, authorizeRoles('Admin'), async (req, res) => {
  try {
    let settings = await Setting.findOne();
    if (!settings) {
      settings = new Setting(req.body);
    } else {
      Object.assign(settings, req.body);
    }
    const updated = await settings.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
