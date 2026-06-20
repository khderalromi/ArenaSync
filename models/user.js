const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please provide a name'],
        minlength: [3, 'Name must be at least 3 characters long'],
        maxlength: [40, 'Name must be less than 40 characters long']
    },
    email: {
        type: String,
        required: [true, 'Please provide an email'],
        unique: true,
        lowercase: true,
        validate: [validator.isEmail, 'Please provide a valid email']
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        minlength: [8, 'Password must be at least 8 characters long'],
        select: false
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password'],
        validate: {
            validator: function (el) {
                return el === this.password;
            },
            message: 'Passwords do not match'
        }
    },
    role: {
        type: String,
        required: true,
        enum: ["Admin", "owner", "user"]
    },
    active: {
        type: Boolean,
        default: true,
        select: false // نخفيه لكي لا يظهر في استعلامات البحث العادية دون داعٍ
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
});



userSchema.methods.correctPassword = async function (candidatePassword, userPassword) {
    // candidatePassword: الكلمة التي كتبها المستخدم الآن
    // userPassword: الكلمة المشفرة في قاعدة البيانات
    return await bcrypt.compare(candidatePassword, userPassword);
};

// تشفير كلمة المرور قبل الحفظ
userSchema.pre('save', async function () {
    // 1) إذا لم يتم تعديل كلمة المرور (مثلاً تم تعديل الاسم فقط)، انتقل للخطوة التالية
    if (!this.isModified('password')) return;

    // 2) تشفير الكلمة بقوة (Cost Factor) تساوي 12
    // كلما زاد الرقم زادت قوة التشفير ولكن زاد وقت المعالجة
    this.password = await bcrypt.hash(this.password, 12);


    // 3) حذف حقل تأكيد كلمة المرور لأنه لا يلزمنا في الداتابيز بعد التحقق
    this.passwordConfirm = undefined;


    ;
});




userSchema.pre('save', function() {
  // إذا لم يتم تعديل حقل الباسورد، أو كانت الوثيقة جديدة تماماً (تنشأ لأول مرة)، انتقل للميدلوير التالي
  if (!this.isModified('password') || this.isNew) return ;

  // نضع تاريخ التغيير الحالي، ونطرح ثانية واحدة (1000ms) للأمان، لأن حفظ البيانات في الداتابيز
  // قد يأخذ أجزاء من الثانية مما يجعل تاريخ التوكن أقدم بقليل ويسبب مشكلة في دالة protect
  this.passwordChangedAt = Date.now() - 1000;
 ;
});


userSchema.pre(/^find/, function() {
  // الكلمة المفتاحية this تشير هنا إلى الـ Query الحالي
  // سنضيف شرطاً خفياً يبحث فقط عن الحسابات التي ليست false
  this.find({ active: { $ne: false } });
  ;
});




userSchema.methods.createPasswordResetToken = function () {
    // 1) توليد نص عشوائي غير مفهوم مكون من 32 بايت وتحويله لـ Hex
    const resetToken = crypto.randomBytes(32).toString('hex');

    // 2) تشفير التوكن لحفظه في قاعدة البيانات لحمايته في حال اختراق الداتابيز
    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // 3) تحديد وقت انتهاء صلاحية التوكن (مثلاً: 10 دقائق فقط)
    this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 دقائق بالملي ثانية

    // 4) إرسال التوكن الأصلي (غير المشفر) بالإيميل للمستخدم
    return resetToken;
};



userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
        // تحويل التاريخ إلى ثوانٍ لمقارنته مع الطابع الزمني للـ JWT (iat)
        const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);

        // إذا كان تاريخ تغيير الباسورد أحدث من تاريخ إصدار التوكن، يعيد true (يعني التوكن ملغي)
        return JWTTimestamp < changedTimestamp;
    }

    // false تعني لم يتم تغيير كلمة المرور بعد إصدار التوكن
    return false;
};


const User = mongoose.model('User', userSchema);
module.exports = User; 