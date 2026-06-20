const Appointment = require('../models/bookings');
const Venues = require('../models/venues');

// 1. إنشاء حجز جديد
exports.createAppointment = async (req, res) => {
    try {
        // سحب معرف المريض برمجياً من التوكن لحمايته من التلاعب
        if (!req.body.user) req.body.user = req.user.id;

        // جلب العيادة للتأكد من وجودها وسحب سعر الكشفية تلقائياً من حقل الـ budget
        const venues = await Venues.findById(req.body.venues);
        if (!venues) {
            return res.status(404).json({ message:'الملعب المحدد غير موجود!' });
        }
        
        // تعيين السعر تلقائياً من بيانات العيادة في قاعدة البيانات
        if (!req.body.price) req.body.price = venues.price;

        const newAppointment = await Appointment.create(req.body);

        res.status(201).json({
            status: 'success',
            data: { appointment: newAppointment }
        });
    } catch (err) {
        // إذا أطلق الموديل خطأ التضارب (pre save)، سيمسك به الـ catch هنا فوراً
        res.status(400).json({ message: err.message });
    }
};

// 2. جلب مواعيد المريض الحالي
exports.getMyAppointments = async (req, res) => {
    try {
        // البحث فقط عن المواعيد التي تنتمي للمستخدم الحالي
        const appointments = await Appointment.find({ user: req.user.id });

        res.status(200).json({
            status: 'success',
            results: appointments.length,
            data: { appointments }
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// 3. إلغاء الحجز (تغيير الحالة وليس الحذف)
exports.cancelAppointment = async (req, res) => {
    try {
        // نبحث عن الحجز ونتأكد أنه يخص المريض الحالي لضمان الأمان
        const appointment = await Appointment.findOne({
            _id: req.params.id,
            user: req.user.id
        });

        if (!appointment) {
            return res.status(404).json({ message: 'الحجز غير موجود أو لا تملك صلاحية إلغائه.' });
        }

        // تغيير الحالة إلى cancelled
        appointment.status = 'cancelled';
        await appointment.save();

        res.status(200).json({
            status: 'success',
            message: 'تم إلغاء الموعد بنجاح.',
            data: { appointment }
        });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};