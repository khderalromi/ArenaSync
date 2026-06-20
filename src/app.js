require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
//const mongoSanitize = require('mongo-sanitize');
const xss = require('xss-clean');


// 1) وضع طبقة حماية للـ HTTP Headers (Helmet)
// هذه المكتبة تقوم بإضافة وتعديل حقول الـ Header لجعل المتصفحات تتعامل مع السيرفر بأمان صارم
/*app.use(helmet());

// 2) تحديد حد أقصى للطلبات (Rate Limiting) لمنع DoS & Brute Force
// سنسمح بـ 100 طلب فقط من نفس عنوان الـ IP كل ساعة واحدة
/*const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // ساعة واحدة بالملي ثانية
  message: 'لقد تجاوزت الحد المسموح به من الطلبات من هذا الجهاز، يرجى المحاولة بعد ساعة.'
});*/
// تطبيق المحدد فقط على مسارات الـ API لحماية السيرفر
//app.use('/api', limiter);

// 3) الـ Body Parser (الميدلوير الافتراضي لقراءة الـ JSON)
// كـ Senior، نقوم بتحديد حجم الـ Body الأقصى لكي لا يقوم أحد بإرسال ملف JSON بحجم 50 ميجا يشل السيرفر
//app.use(express.json({ limit: '10kb' }));

// 4) تنظيف البيانات ضد هجمات حقن الـ NoSQL (Data Sanitization)
// هذه المكتبة تبحث في req.body و req.query و req.params وتمسح أي علامات مثل $ أو . 
//app.use(mongoSanitize());

// 5) تنظيف البيانات ضد هجمات الـ XSS (Data Sanitization)
// تقوم بتحويل أي كود HTML أو برمجيات خبيثة مكتوبة داخل النصوص إلى نصوص بريئة (HTML entities)
//app.use(xss());

// ... بعد ذلك تأتي مساراتك الـ Routes (مثل app.use('/api/v1/users', userRouter))

const cors = require('cors');
// Middlewares
app.use(cors());
app.use(express.json());

// الرابط المحلي من ملف .env

console.log("⏳ Connection attempt started...");
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {console.log("✅ SUCCESS: Connected to MongoDB Atlas!")
    // استدعاء الدالة للتجربة (يمكنك استدعاؤها بعد نجاح الاتصال بقاعدة البيانات)
    //createNewProject();
  }
  ).catch(err => {
    console.log("❌ CONNECTION FAILED");
    console.log("Reason:", err.message);
  });

const userRoutes = require('../routes/userRoutes');
app.use('/', userRoutes);
  
const venuesRoutes = require('../routes/venuesRoutes');
app.use('/venues', venuesRoutes);


const venuesAvailable = require('../routes/availableRoutes');
app.use('/venuesAvailable', venuesAvailable);


const bookingRotes = require('../routes/bookingRoutes');
app.use('/booking', bookingRotes);

 
/*
const doctorRoutes = require('./routes/doctorRoutes');
app.use('/doctors', doctorRoutes);
const clinicRoutes = require('./routes/clinicRoutes');
app.use('/', clinicRoutes);

const userRoutes = require('./routes/userRoutes');
app.use('/', userRoutes);


const appointmentRoutes = require('./routes/appointmentRoutes');
app.use('/appointments', appointmentRoutes);
// ... كل الـ Routes هنا (مثل app.use('/api/v1/clinics', clinicRouter))
*/
// هذا هو المحطة الأخيرة
app.use((err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  res.status(err.statusCode).json({
    status: err.status,
    message: err.message,
    stack: err.stack 
  });
});
app.listen(3000, () => console.log("Server Running..."));
