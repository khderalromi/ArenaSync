const express = require('express');
const router = express.Router();
const venuesController = require('../controllers/venuesController');
const authController = require('../controllers/authController'); // استدعاء متحكم الأمان

router.use(authController.protect);
/* /venuesAvailable/create
/venuesAvailable/getOneVenues
/venuesAvailable/filter
/venuesAvailable/updateInfo
/venuesAvailable/delete
*/
router
  .route('/create')
  .post(authController.restrictTo('Admin', 'owner'),
  venuesController.uploadVenuesPhoto,
   venuesController.resizeVenuesPhoto,
  venuesController.addNew);


router
  .route('/getOneVenues/:id')
  .get(authController.restrictTo('Admin', 'owner'), venuesController.getOneVenueses)


router
  .route('/filter')
  .get(authController.restrictTo('Admin', 'owner'), venuesController.findfilteredVenues)


router
  .route('/venueslocation/nearby/:lat/:lng')
  .get(venuesController.getVenuesByLocation)

router
  .route('/updateInfo')
  .patch(authController.restrictTo('Admin', 'owner'), venuesController.updateInfo)


router
  .route('/delete')
  .get(authController.restrictTo('Admin', 'owner'), venuesController.deleteMe)

module.exports = router;