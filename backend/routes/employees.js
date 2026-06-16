const express = require('express');
const router = express.Router();
const Employee = require('../models/Employee');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

// GET all employees
router.get('/', authMiddleware, async (req, res, next) => {
  try {
    const records = await Employee.find().sort({ name: 1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create employee
router.post('/', authMiddleware, async (req, res, next) => {
  const data = { ...req.body };
  if (!data.username || (typeof data.username === 'string' && data.username.trim() === '')) {
    delete data.username;
  }
  
  const record = new Employee(data);
  try {
    const newRecord = await record.save();
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update employee
router.put('/:id', authMiddleware, authorizeRoles('Admin', 'Manager'), async (req, res, next) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: 'Employee not found' });

    const data = { ...req.body };
    if (data.hasOwnProperty('username') && (!data.username || (typeof data.username === 'string' && data.username.trim() === ''))) {
      employee.set('username', undefined);
    } else if (data.username) {
      employee.username = data.username.trim();
    }

    const fields = ['name', 'nic', 'role', 'contact', 'joinedDate', 'status', 'basicSalary', 'hourlyRate'];
    fields.forEach(field => {
      if (data.hasOwnProperty(field)) {
        employee[field] = data[field];
      }
    });

    if (data.password && (typeof data.password === 'string' && data.password.trim() !== '')) {
      employee.password = data.password;
    }

    const updated = await employee.save();
    res.json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE employee
router.delete('/:id', authMiddleware, authorizeRoles('Admin'), async (req, res, next) => {
  try {
    await Employee.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
