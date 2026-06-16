const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get attendance for a specific date
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const query = {};
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }
    const records = await Attendance.find(query);
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Mark attendance
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { employee, date, status, note } = req.body;
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);

    // Update if exists, else create
    const record = await Attendance.findOneAndUpdate(
      { employee, date: { $gte: start, $lte: end } },
      { employee, date: new Date(date), status, note },
      { upsert: true, new: true }
    );
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
