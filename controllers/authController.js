const User = require('./../models/user');
const catchAsync = require('./../utils/catchAsync');
const jwt = require('jsonwebtoken');
const AppError = require('./../utils/appError');
const { promisify } = require('util');
const crypto = require('crypto'); 
const sendEmail = require('./../utils/email');




// دالة مساعدة لإنشاء التوكن
const signToken = id => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};



exports.signup = catchAsync(async (req, res, next) => {
    
  const newUser = await User.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: req.body.role 
  });
  const token = signToken(newUser._id);

  res.status(201).json({
    status: 'success',
    token,  
    data: {
      user: newUser
    }
  });
});



///********login */
exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError('يرجى إدخال البريد الإلكتروني وكلمة المرور', 400));
  }


  const user = await User.findOne({ email:email }).select('+password');
  console.log(user)
  if (!user || !(await user.correctPassword(password, user.password))) {
    console.log(await user.correctPassword(password, user.password))
    console.log(password)
    return next(new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401));
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token
  });
});


exports.protect = catchAsync(async (req, res, next) => {
  let token;


  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(
      new AppError('أنت غير مسجل في النظام، يرجى تسجيل الدخول للوصول.', 401)
    );
  }


  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError('المستخدم صاحب هذا التوكن لم يعد موجوداً في النظام.', 401)
    );
  }


  if (currentUser.changedPasswordAfter(decoded.iat)) {
    return next(
      new AppError('قام المستخدم بتغيير كلمة المرور مؤخراً! يرجى إعادة تسجيل الدخول.', 401)
    );
  }

  req.user = currentUser;
  next();
});



exports.forgotPassword = catchAsync(async (req, res, next) => {
  // 1) البحث عن المستخدم بناءً على الإيميل المرسل
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return next(new AppError('لا يوجد مستخدم مسجل بهذا البريد الإلكتروني.', 404));
  }

  // 2) توليد التوكن العشوائي (باستخدام الدالة التي أنشأناها في الموديل)
  const resetToken = user.createPasswordResetToken();
  
  // حفظ التغييرات في قاعدة البيانات (مع إلغاء تفعيل الـ validators لحقول الباسورد الأخرى لأننا لا نعدلها الآن)
  await user.save({ validateBeforeSave: false });

  // 3) بناء الرابط الذي سيرسل للمستخدم
  // في بيئة التطوير يكون الرابط يشير للـ localhost
  const resetURL = `${req.protocol}://${req.get('host')}/api/v1/users/resetPassword/${resetToken}`;
const message = `هل نسيت كلمة المرور الخاصة بك؟ يرجى إرسال طلب PATCH مع كلمة المرور الجديدة وتأكيدها إلى الرابط التالي:\n\n${resetURL}\n\nإذا لم تكن أنت من طلب هذا، يرجى تجاهل هذا الإيميل وسيظل حسابك آمناً ونشطاً لـ 10 دقائق فقط.`;

  // 4) محاولة إرسال الإيميل عبر تكتيك try-catch خاص لحماية التوكن
  try {
    await sendEmail({
      email: user.email,
      subject: 'رابط استعادة كلمة المرور (صالح لـ 10 دقائق)',
      message
    });

    // إذا نجح الإرسال، نرسل استجابة نجاح نظيفة للمستخدم دون كشف الرابط في الـ JSON
    res.status(200).json({
      status: 'success',
      message: 'تم إرسال رابط استعادة كلمة المرور إلى بريدك الإلكتروني بنجاح!'
    });

  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('حدث خطأ أثناء إرسال البريد الإلكتروني. يرجى المحاولة لاحقاً.', 500)
    );
  }
});



exports.resetPassword = catchAsync(async (req, res, next) => {
  // 1) تشفير التوكن القادم من الرابط لمطابقته مع التوكن المخزن في الداتابيز
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  // 2) البحث عن المستخدم الذي يملك هذا التوكن وبشرط أن وقت الصلاحية لم ينتهِ بعد
  // $gt تعني (Greater Than) أي أن وقت انتهاء الصلاحية يجب أن يكون أكبر من الوقت الحالي
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // 3) إذا لم يجد المستخدم أو انتهت الصلاحية، نرسل خطأ
  if (!user) {
    return next(new AppError('التوكن غير صحيح أو انتهت صلاحيته (10 دقائق).', 400));
  }

  // 4) إذا كان التوكن صحيحاً، نقوم بتحديث كلمة المرور الجديدة
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  
  // تنظيف حقول التوكن بعد استخدامها لمرة واحدة بنجاح (الأمان أولاً!)
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;

  // حفظ التغييرات (هنا ستعمل الـ Validators لتشفير الباسورد الجديد والتأكد من مطابقتها)
  await user.save();

  // 5) تحديث تاريخ تغيير كلمة المرور (سندير هذا عبر Middleware في الموديل بعد قليل ليكون تلقائياً)

  // 6) تسجيل دخول المستخدم تلقائياً عن طريق إرسال توكن JWT جديد له
  const token = signToken(user._id);

  res.status(200).json({
    status: 'success',
    token,
    message: 'تم تغيير كلمة المرور بنجاح وتم تسجيل دخولك!'
  });
});




//ملاحظة الدالة لا تعمل مع اي راوت بدون دالة بروتكت التي قبلها لأنها تأخذ اليوزر منها
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // 1) مصفوفة roles تحتوي على الأدوار المسموح لها (مثلاً: ['admin', 'doctor'])
    // 2) نقوم بفحص دور المستخدم الحالي المحفوظ في الطلب (req.user.role)
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('ليس لديك الصلاحية للقيام بهذا الإجراء.', 403)
      );
    }

    // إذا كان دور المستخدم موجوداً ضمن الأدوار المسموح لها، ننتقل للميدلوير التالي
    next();
  };
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


exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) إطلاق خطأ إذا حاول المستخدم إرسال بيانات كلمة المرور في هذا المسار
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError('هذا المسار ليس لتحديث كلمة المرور. يرجى استخدام مسار /updateMyPassword.', 400)
    );
  }

  // 2) فلترة الـ body لمنع تغيير الحقول الحساسة مثل الـ role
  // سنسمح فقط بتغيير الاسم (name) والإيميل (email)
  const filteredBody = filterObj(req.body, 'name', 'email');

  // 3) تحديث وثيقة المستخدم في قاعدة البيانات ببيانات الفلترة
  // الـ options: runValidators لضمان التحقق من صحة الإيميل الجديد، و new لإعادة البيانات الجديدة
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});



exports.deleteMe = catchAsync(async (req, res, next) => {
  // تحويل حقل النشاط إلى false بناءً على الـ ID المستخرج من ميدلوير الـ protect
  await User.findByIdAndUpdate(req.user.id, { active: false });

  // طبقاً لبروتوكول HTTP، عند الحذف الناجح نرسل كود الحالة 204 (No Content) وبدون data
  res.status(204).json({
    status: 'success',
    data: null
  });
});