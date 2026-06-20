const express = require('express');
const authController = require('./../controllers/authController');

const router = express.Router();
// مسار تسجيل مستخدم جديد

router
  .route('/signup')
  //.get(DoctorController.findDoctor) 
  .post( authController.signup);

router
  .route('/login')
  //.get(DoctorController.findDoctor) 
  .post( authController.login);


router.post('/forgotPassword', authController.forgotPassword);

router.patch('/resetPassword/:token', authController.resetPassword);
// جميع المسارات بالأسفل تتطلب تسجيل الدخول أولاً
router.use(authController.protect);

router.patch('/updateMe', authController.updateMe);
router.delete('/deleteMe', authController.deleteMe);




module.exports = router;