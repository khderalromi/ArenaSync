const mongoose = require('mongoose');
const validator = require('validator');

const availableSchema = new mongoose.Schema({
    venues: {
        type: mongoose.Schema.ObjectId, // نوع البيانات هو المعرف الفريد الخاص بـ MongoDB
        ref: 'Venues', // "السلك" موصل بموديل اسمه Clinic
        required: [true, 'كل ملعب يجب أن يكون له جدول عمل'] // هذا الحقل إجباري مع رسالة خطأ مخصصة
    },
    availabletime: {
        startTime: {
            type: String,
            validate: {
                validator: function (el) {
                    return el.match(/^([01]\d|2[0-3]):?([0-5]\d)$/); // تحقق من تنسيق الوقت HH:mm
                },
                message: 'تنسيق الوقت غير صحيح، يجب أن يكون بصيغة HH:mm'
            },

            required: true
        },
        endTime: {
            type: String,
            validate: {
                validator: function (el) {
                    return el.match(/^([01]\d|2[0-3]):?([0-5]\d)$/); // تحقق من تنسيق الوقت HH:mm
                },
                message:  "تنسيق الوقت غير صحيح، يجب أن يكون بصيغة HH:mm"
            },
            required: true
        },
    },
    minTime: {
        type: String,
        required: true
    },
});

/*
venuesSchema.pre(/^find/, function () {
    this.find({ active: { $ne: false } });

});*/

const Available = mongoose.model('Available', availableSchema);
module.exports = Available; 