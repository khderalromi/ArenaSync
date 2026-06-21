const Venues = require("../models/venues");
const catchAsync = require("../utils/catchAsync");


const multer = require('multer');
const sharp = require('sharp');
const AppError = require('../utils/appError'); 

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new Error('الملف المرفوع ليس صورة! يرجى رفع صور فقط.'), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

exports.uploadVenuesPhoto = upload.single('photo');



exports.resizeVenuesPhoto = async (req, res, next) => {
  try {
    if (!req.file) return next();

    req.file.filename = `venues-${req.user ? req.user.id : 'admin'}-${Date.now()}.jpeg`;

    await sharp(req.file.buffer)
      .resize(500, 500) 
      .toFormat('jpeg') 
      .jpeg({ quality: 90 }) 
      .toFile(`public/img/venueses/${req.file.filename}`); 

    next();
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
exports.addNew = catchAsync(async (req, res, next) => {
  

  const newStadium = await Venues.create({
    name: req.body.name,
    sportType: req.body.sportType,
    attachments: req.body.attachments,
    ground: req.body.ground,
    capacity: req.body.capacity,
    space: req.body.space,
    price_hour: req.body.price_hour,
    photo: req.file ? req.file.filename : undefined,
    location:req.body.location,
    coverageArea:req.body.coverageArea
  });
  
  res.status(201).json({
    status: 'success',
   // token,  
    data: {
      stadium: newStadium
    }
  });
});


exports.getOneVenueses = async (req, res) => {
    // جلب المشروع و "ملء" بيانات المهندس تلقائياً
    // "doctors" هو اسم الحقل الذي يشير إلى الـ ObjectId في الـ Schema
    //const clinic = await Clinic.findById(req.params.id).populate({path: 'team',select: 'name specialist budget '});
    const venues = await Venues.findById(req.params.id).populate('availability');
    console.log(venues);
    res.status(200).json({ status: 'success', data: { venues } });
};


exports.getStadiumByType = async (req, res) => {
    try {
        const stats = await Venues.aggregate([
            {
                // المرحلة الأولى: تصفية المشاريع (مثلاً التي ميزانيتها أكبر من 0)
                $match: { sportType:  req.query.sportType }
            },
            {
                // المرحلة الثانية: التجميع والحساب
                $group: {
                    _id: '$sportType', // سنجمع النتائج بناءً على اسم 
                    numClinics: { $sum: 1 }, // حساب عدد المشاريع (يضيف 1 لكل وثيقة)
                    avgConsultationFee: { $avg: '$budget' }, // حساب متوسط الميزانية
                    minBudget: { $min: '$budget' }, // أقل ميزانية لهذا المهندس
                    maxBudget: { $max: '$budget' }  // أعلى ميزانية لهذا المهندس
                }
            },
            {
                // المرحلة الثالثة: الترتيب حسب المتوسط (1 تصاعدي، -1 تنازلي)
                $sort: { avgConsultationFee: -1 }
            }
        ]);

        res.status(200).json({
            status: 'success',
            data: { stats }
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};




exports.findfilteredVenues = async (req, res) => {
    try {
        // 1. عزل شروط البحث عن أوامر التحكم (sort, limit...)
        let queryObj = { ...req.query };
        const excludeFields = ['sort', 'page', 'limit', 'fields'];
        excludeFields.forEach(el => delete queryObj[el]);

        // 2. معالجة العمليات الحسابية (gt, gte...) وتحويلها لصيغة MongoDB
        let queryStr = JSON.stringify(queryObj);
        queryStr = queryStr.replace(/\b(gt|gte|lt|lte)\b/g, (match) => `$${match}`);
        let finalQuery = JSON.parse(queryStr);

        // 3. معالجة الأقواس المربعة (مهمة جداً لضمان نظافة البحث)
        Object.keys(finalQuery).forEach(key => {
            if (key.includes('[') && key.includes(']')) {
                const [field, operatorRaw] = key.split('[');
                const operator = `$${operatorRaw.replace(']', '')}`;
                if (!finalQuery[field]) finalQuery[field] = {};
                finalQuery[field][operator] = Number(finalQuery[key]);
                delete finalQuery[key];
            }
        });

        // 4. بناء الاستعلام (هنا تبدأ عملية الـ Chaining)
        let query = Venues.find(finalQuery);

        // 5. الترتيب (Sorting)
        if (req.query.sort) {
            const sortBy = req.query.sort.split(',').join(' ');
            query = query.sort(sortBy);
        }

        // 6. تحديد الحقول (Field Limiting)
        if (req.query.fields) {
            const fields = req.query.fields.split(',').join(' ');
            query = query.select(fields);
        } else {
            query = query.select('-__v');
        }

        // 7. التقسيم والـ Limit (هذا هو السطر الذي يفشل عندك حالياً)
        // تأكدنا هنا من تحويل النص إلى رقم (مثلاً '5' تصبح 5)
        const page = req.query.page * 1 || 1;
        const limit = req.query.limit * 1 || 100; 
        const skip = (page - 1) * limit;

        query = query.skip(skip).limit(limit);

        // 8. تنفيذ الاستعلام (يجب أن يكون الـ await في آخر خطوة)
        const venueses = await query;

        // إرسال الاستجابة
        res.status(200).json({
            status: 'success',
            results: venueses.length, // يجب أن يطبع 5 الآن
            data: venueses
        });

    } catch (err) {
        res.status(500).json({ status: 'error', message: err.message });
    }
};


exports.getVenuesByLocation = async (req, res) => {
    try {
       // const { lat, lng } = req.params;

        const stats = await Venues.aggregate([
            {
                // 1. حساب المسافة (يجب أن تكون أول مرحلة)
                $geoNear: {
                    near: {
                        type: 'Point',
                        coordinates: [req.params.lng * 1, req.params.lat * 1]
                    },
                    distanceField: 'distance',
                    distanceMultiplier: 0.001, // تحويل لكم
                    key: 'location',
                    //query: { Active: true }, // شروط الفلترة الذكية
                    spherical: true
                }
            },
            /*{
                // 2. الفلترة: إظهار العيادات النشطة فقط
                $match: { Active: { $ne: false } }
            },*/
            {
                // 3. الربط (البديل لـ populate): جلب الأطباء من جدول الـ Doctors
                $lookup: {
                    from: 'Available',       // اسم الكولكشن في الداتابيز (غالباً جمع وصغير)
                    localField: '_id',     // الـ ID الخاص بالعيادة
                    foreignField: 'venues', // الحقل الذي يربط الدكتور بالعيادة
                    as: 'venuesAvailability'       // الاسم الجديد للمصفوفة التي ستظهر
                }
            },
            {
                // 4. اختيار الحقول التي تظهر فقط (Project)
                $project: {
                    name: 1,
                    sportType: 1,
                    attachments: 1,
                    ground: 1,
                    capacity: 1,
                    space: 1,
                    price_hour: 1,
                    location: 1,
                    coverageArea: 1,
                    distance: 1,
                    venuesAvailability: 1, // إظهار أسماء الأطباء فقط
                    //"venuesAvailability.minTime": 1
                }
            }
        ]);

        res.status(200).json({
            status: 'success',
            results: stats.length,
            data: { stats }
        });
    } catch (err) {
        res.status(404).json({ message: err.message });
    }
};


const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  // المرور على جميع المفاتيح الموجودة فيreq.body
  Object.keys(obj).forEach(el => {
    // إذا كان الحقل موجوداً ضمن الحقول المسموح بها، قم بنسخه
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};


exports.updateInfo = catchAsync(async (req, res, next) => {
 

  // 2) فلترة الـ body لمنع تغيير الحقول الحساسة مثل الـ role
  // سنسمح فقط بتغيير الاسم (name) والإيميل (email)
  const filteredBody = filterObj(req.body, 'name', 'sportType', 'attachments', 'ground', 'capacity', 'space' ,'price');

  // 3) تحديث وثيقة المستخدم في قاعدة البيانات ببيانات الفلترة
  // الـ options: runValidators لضمان التحقق من صحة الإيميل الجديد، و new لإعادة البيانات الجديدة
  const updatedVenues = await Venues.findByIdAndUpdate(req.body.venuesId, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      venues: updatedVenues
    }
  });
});




exports.deleteMe = catchAsync(async (req, res, next) => {
  // تحويل حقل النشاط إلى false بناءً على الـ ID المستخرج من ميدلوير الـ protect
  const deletedVenues = await Venues.findByIdAndUpdate(req.body.venuesId, { active: false });

  // طبقاً لبروتوكول HTTP، عند الحذف الناجح نرسل كود الحالة 204 (No Content) وبدون data
  res.status(204).json({
    status: 'success',
    data: deletedVenues
  });
});