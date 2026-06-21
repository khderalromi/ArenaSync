const mongoose = require('mongoose');
const validator = require('validator');

const venuesSchema = new mongoose.Schema({
   name: {
      type: String,
      minlength: [3, 'Name must be at least 3 characters long'],
      required: true
   },
   sportType: {
      type: String,
      required: true
   },
   attachments: {
      type: [String],
      required: true
   },
   ground: {
      type: String,
      required: true
   },
   capacity: {
      type: Number,
      min: [0, 'سعة الملعب لا يمكن أن تكون سالبة'],
      required: true
   },
   space: {
      type: String,
      required: true
   },
   price_hour: {
      type: Number,
      min: [0, ' الأسعار لا يمكن أن تكون سالبة'],
      required: true
   },
   active: {
      type: Boolean,
      default: true,
      select: false
   },
   photo: {
    type: String,
  },
  // موقع الملعب كـ "نقطة" (مثلاً المدخل الرئيسي)
    location: {
        type: {
            type: String,
            default: 'Point',
            enum: ['Point']
        },
        coordinates: [Number], // [Longitude, Latitude]
    },
    // حدود أرض الملعب كـ "مضلع"
    coverageArea: {
        type: {
            type: String,
            default: 'Polygon',
            enum: ['Polygon']
        },
        coordinates: [[[Number]]] //   مصفوفة ثلاثية لأن المضلع عبارة عن مصفوفة من النقاط
    }
}, {
   toJSON: { virtuals: true },
   toObject: { virtuals: true }
}, {
   timestamps: true 
});


// تفعيل الفهرس الجغرافي (ضروري جداً!)
venuesSchema.index({ location: '2dsphere' });
venuesSchema.index({ coverageArea  : '2dsphere' });


// تعريف الربط العكسي الوهمي
venuesSchema.virtual('availability', {
   ref: 'Available',          // الجدول الذي سنبحث فيه
   foreignField: 'venues',
   localField: '_id',
   //match: { status: 'active' },     // قيد: جلب الأطباء النشطين فقط
   select: 'venues availabletime minTime -_id' // جلب الاسم والرقم فقط واستثناء الـ ID
});

venuesSchema.pre(/^find/, function () {
   this.find({ active: { $ne: false } });

});

const Venues = mongoose.model('Venues', venuesSchema);
module.exports = Venues; 