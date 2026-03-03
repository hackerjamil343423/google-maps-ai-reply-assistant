import Link from "next/link";

const INCLUDED = [
  "تحليل سبب التعليق بدقة (Violation Audit)",
  "مراجعة بيانات النشاط ومطابقتها مع سياسات جوجل",
  "تصحيح المخالفات الفنية أو المحتوى المخالف",
  "تجهيز المستندات الداعمة المطلوبة",
  "تقديم طلب الاستئناف الرسمي إلى جوجل",
  "المتابعة حتى استعادة الملف أو صدور رد نهائي",
  "توصيات احترافية لحماية الحساب مستقبلاً",
];

const REASONS = [
  "تعارض أو تكرار في البيانات",
  "تغيير مفاجئ في الاسم أو النشاط",
  "استخدام عنوان غير مؤهل",
  "مخالفات في الصور أو المحتوى",
  "بلاغات أو مراجعات مشبوهة",
];

const BENEFITS = [
  "استرجاع الظهور في نتائج البحث المحلية",
  "حماية تقييماتك ومراجعات عملائك",
  "استعادة المكالمات والزيارات عبر خرائط جوجل",
  "حماية سمعة علامتك التجارية",
];

const SUITED_FOR = [
  "الشركات والمؤسسات",
  "العيادات والمراكز الطبية",
  "المتاجر والمطاعم",
  "مقدمي الخدمات المحلية",
];

export default function GoogleMapsUnsuspendPage() {
  return (
    <div className="min-h-screen bg-[#F6F4FF] text-[#040404]" dir="rtl">
      {/* Back */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Link
          href="/services"
          className="inline-flex items-center gap-2 text-sm text-[#6A6A82] hover:text-[#5F30EB] transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
            fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
          العودة إلى الخدمات
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-8">

        {/* Alert banner */}
        <div className="bg-[#FFF3F3] border border-red-200 rounded-2xl p-5 flex gap-4 items-start">
          <span className="text-2xl shrink-0">⚠️</span>
          <div>
            <p className="font-bold text-[#CC0000] mb-1">هل تم تعليق ملف نشاطك على خرائط جوجل فجأة؟</p>
            <p className="text-sm text-[#6A6A82]">
              هذا يعني خسارة ظهور، فقدان عملاء، وضرب الثقة الرقمية للعلامة التجارية.
            </p>
          </div>
        </div>

        {/* Title */}
        <div>
          <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#5F30EB] bg-[#5F30EB15] border border-[#5F30EB30] rounded-full px-4 py-1.5 mb-4">
            خدمة خرائط جوجل
          </span>
          <h1 className="text-3xl md:text-4xl font-bold leading-snug mb-4">
            خدمة رفع التعليق عن الملف التجاري المعلّق في خرائط جوجل
          </h1>
          <p className="text-lg text-[#4F4F63] leading-relaxed">
            نحن نتولى المهمة بالكامل. خدمة رفع التعليق عن الملف التجاري في خرائط جوجل تهدف إلى استعادة نشاطك التجاري بشكل رسمي ومتوافق مع سياسات جوجل، بأسرع وقت ممكن، وبطريقة احترافية تقلل احتمالية التعليق مرة أخرى.
          </p>
        </div>

        {/* What's included */}
        <div className="bg-white rounded-2xl border border-[#5F30EB]/10 p-6 md:p-8">
          <h2 className="text-xl font-bold mb-5">ماذا تشمل الخدمة؟</h2>
          <ul className="space-y-3">
            {INCLUDED.map((item) => (
              <li key={item} className="flex items-start gap-3 text-[#4F4F63]">
                <span className="flex-shrink-0 mt-0.5 w-6 h-6 rounded-full bg-[#5F30EB15] flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                    fill="none" stroke="#5F30EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Two-column: reasons + benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-[#5F30EB]/10 p-6">
            <h2 className="text-lg font-bold mb-4">لماذا يتم تعليق الملف التجاري؟</h2>
            <ul className="space-y-2">
              {REASONS.map((r) => (
                <li key={r} className="flex items-start gap-2 text-sm text-[#4F4F63]">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  {r}
                </li>
              ))}
            </ul>
            <p className="text-sm font-semibold text-[#5F30EB] mt-4">
              نحدد السبب الحقيقي، وليس التخمين.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-[#5F30EB]/10 p-6">
            <h2 className="text-lg font-bold mb-4">لماذا هذه الخدمة مهمة لك؟</h2>
            <ul className="space-y-2">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-[#4F4F63]">
                  <span className="text-[#5F30EB] mt-0.5 shrink-0">✓</span>
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Suited for */}
        <div className="bg-white rounded-2xl border border-[#5F30EB]/10 p-6 md:p-8">
          <h2 className="text-lg font-bold mb-4">مناسبة لـ:</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUITED_FOR.map((s) => (
              <div key={s} className="bg-[#F6F4FF] rounded-xl px-4 py-3 text-sm text-center text-[#4F4F63] font-medium">
                {s}
              </div>
            ))}
          </div>
        </div>

        {/* Note */}
        <div className="bg-[#F0EEFF] border border-[#5F30EB]/20 rounded-2xl p-5">
          <p className="font-bold text-[#5F30EB] mb-1">ملاحظة مهمة</p>
          <p className="text-sm text-[#4F4F63] leading-relaxed">
            نلتزم بسياسات جوجل 100% ولا نقدم حلولاً مخالفة أو التفافاً على الأنظمة. العمل يتم بطريقة نظامية واحترافية فقط.
          </p>
        </div>

        {/* CTA */}
        <div className="bg-[#5F30EB] rounded-3xl p-8 md:p-12 text-white text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">
            ملفك على خرائط جوجل ليس خياراً إضافياً…
          </h2>
          <p className="text-white/80">
            هو نقطة البيع الأولى لك أونلاين. إذا كان ملفك معلقاً الآن، كل ساعة تأخير تعني خسارة محتملة.
          </p>
          <a
            href="https://t.me/wakkelniai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#5F30EB] font-bold px-8 py-3 rounded-full hover:bg-[#F0EEFF] transition-colors mt-2"
          >
            ابدأ الاستعادة اليوم
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
              fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
