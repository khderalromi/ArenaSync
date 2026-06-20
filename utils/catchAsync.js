module.exports = fn => {
  return (req, res, next) => {
    // تنفيذ الدالة (fn) واللحاق بالخطأ (catch) إذا حدث وإرساله لـ next
    fn(req, res, next).catch(next);
  };
};