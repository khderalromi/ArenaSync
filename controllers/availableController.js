const Available = require("../models/availability");
const catchAsync = require("../utils/catchAsync");


exports.addAvailability = catchAsync(async (req, res, next) => {
    
  // لاحظ أننا نحدد الحقول التي نقبلها لزيادة الأمان
  const availableTime = await Available.create(req.body);
  
  res.status(201).json({
    status: 'success',
    data: {
      availableTime: availableTime
    }
  });
});

