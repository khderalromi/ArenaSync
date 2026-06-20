const express = require('express');
const router = express.Router();
const availableController = require('../controllers/availableController');
const authController = require('../controllers/authController'); // استدعاء متحكم الأمان

router.use(authController.protect);

router
  .route('/create')
  .post(authController.restrictTo('Admin', 'owner'), availableController.addAvailability);

module.exports = router;