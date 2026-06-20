const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User', // يفترض وجود موديل المستخدمين لديك بهذا الاسم
    required: [true, 'يجب أن ينتمي الحجز إلى مريض محدد.']
  },
  venues: {
    type: mongoose.Schema.ObjectId,
    ref: 'Venues',
    required: [true, 'يجب تحديد الملعب التي سيتم الحجز فيه.']
  },
  available: {
    type: mongoose.Schema.ObjectId,
    ref: 'Available',
    required: [true, 'يجب تحديد وقت الحجز لإتمام عملية الحجز.']
  },
  appointmentDate: {
    type: Date,
    required: [true, 'يرجى تحديد تاريخ ووقت الموعد بدقة.']
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  total_price: {
    type: Number,
    required: [true, 'يجب تحديد تكلفة الكشفية أو الحجز.']
  },
  paid: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 💡 تسريع عمليات البحث: المطور سيبحث دائماً عن مواعيد طبيب معين أو مريض معين
//appointmentSchema.index({ doctor: 1, appointmentDate: 1 });
//appointmentSchema.index({ user: 1 });


appointmentSchema.pre('save', async function() {
  
  const existingAppointment = await this.constructor.findOne({
    venues: this.venues,
    appointmentDate: this.appointmentDate,
    status: 'confirmed' // المواعيد المؤكدة فقط هي التي تسبب تضارباً
  });
  
  if (existingAppointment) {
    // كـ Senior: نطلق خطأ صريحاً يمنع استمرار عملية الحفظ نهائياً ويذهب للـ Global Error Handler
throw new Error('هذا الموعد محجوز مسبقاً مع هذا الطبيب، يرجى اختيار وقت آخر.');  }

});

appointmentSchema.methods.correctTime = async function (candidateTime, allowedTime) {
    // candidatePassword: الكلمة التي كتبها المستخدم الآن
    // userPassword: الكلمة المشفرة في قاعدة البيانات
    return await appointmentSchema >= this.available.availabletime.startTime && appointmentSchema <= this.available.availabletime.endTime ;
};

appointmentSchema.pre(/^find/, function() {
  this.populate({
    path: 'venues',
    select: 'name sportType'
  }).populate({
    path: 'user',
    select: 'name email'
  }).populate({
    path: 'avaiable',
    select: 'availabletime minTime'
  });
  

});
const Appointment = mongoose.model('Appointment', appointmentSchema);
module.exports = Appointment;
