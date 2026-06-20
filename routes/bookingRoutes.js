const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const authController = require('../controllers/authController'); // استدعاء متحكم الأمان

router.use(authController.protect);

router
  .route('/create')
  .post(authController.restrictTo('Admin', 'owner','user'), bookingController.createAppointment);

module.exports = router;