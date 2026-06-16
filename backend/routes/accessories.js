const express = require('express');
const router = express.Router();
const Accessory = require('../models/Accessory');
const Tool = require('../models/Tool');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get all accessories
router.get('/', authMiddleware, async (req, res) => {
  try {
    const accessories = await Accessory.find().sort({ number: 1 });
    res.json(accessories);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add new accessory — ID must not clash with any Tool ID
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { number } = req.body;

    if (!number) {
      return res.status(400).json({ message: 'Accessory ID (number) is required.' });
    }

    // Check cross-collection: Tool IDs
    const toolExists = await Tool.findOne({ number: number.trim().toUpperCase() });
    if (toolExists) {
      return res.status(400).json({ message: `ID "${number}" is already used by a Tool. Accessory and Tool IDs must be unique across both collections.` });
    }

    // Check within accessories
    const accExists = await Accessory.findOne({ number: number.trim().toUpperCase() });
    if (accExists) {
      return res.status(400).json({ message: `Accessory ID "${number}" already exists. Please use a unique ID.` });
    }

    const accessory = new Accessory({ ...req.body, number: number.trim().toUpperCase() });
    const newAccessory = await accessory.save();
    res.status(201).json(newAccessory);
  } catch (err) {
    console.error('POST /api/accessories - Error:', err);
    res.status(400).json({ message: err.message });
  }
});

// Update accessory — validate ID uniqueness on change
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const { number } = req.body;

    if (number) {
      const normalised = number.trim().toUpperCase();

      // Check cross-collection: Tool IDs
      const toolExists = await Tool.findOne({ number: normalised });
      if (toolExists) {
        return res.status(400).json({ message: `ID "${normalised}" is already used by a Tool. Accessory and Tool IDs must be unique.` });
      }

      // Check within accessories (excluding self)
      const accExists = await Accessory.findOne({ number: normalised, _id: { $ne: req.params.id } });
      if (accExists) {
        return res.status(400).json({ message: `Accessory ID "${normalised}" already exists. Please use a unique ID.` });
      }

      req.body.number = normalised;
    }

    const updated = await Accessory.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Delete accessory
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    await Accessory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Accessory deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
