import Link from "next/link";

const FEATURES = [
  "إضافة النشاط التجاري باحترافية",
  "توثيق العنوان",
  "تحسين الظهور المحلي",
  "وصف وصور معتمدة",
  "تفعيل التقييمات",
];

export default function GoogleMapsListingPage() {
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

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Hero image */}
        <div className="rounded-3xl overflow-hidden h-72 md:h-96 bg-[#E8E4FF]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/service/google-maps-listing.jpg"
            alt="اضافة وتوثيق موقع نشاطك التجاري في خرائط جوجل"
            className="w-full h-full object-cover"
          />
        </div>

        {/* Title + price */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="flex-1">
            <span className="inline-block text-xs font-semibold tracking-widest uppercase text-[#5F30EB] bg-[#5F30EB15] border border-[#5F30EB30] rounded-full px-4 py-1.5 mb-4">
              خدمة خرائط جوجل
            </span>
            <h1 className="text-3xl md:text-4xl font-bold leading-snug">
              اضافة وتوثيق موقع نشاطك التجاري في خرائط جوجل
            </h1>
          </div>
          <div className="shrink-0 text-center bg-white border border-[#5F30EB]/20 rounded-2xl px-8 py-6 shadow-sm">
            <p className="text-xs text-[#6A6A82] mb-1">السعر</p>
            <p className="text-3xl font-bold text-[#5F30EB]">499</p>
            <p className="text-sm text-[#6A6A82]">ريال سعودي</p>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl border border-[#5F30EB]/10 p-6 md:p-8 space-y-4">
          <p className="text-[#4F4F63] leading-relaxed text-lg">
            ارفع حضور نشاطك الرقمي وامنح عملاءك وصولاً أسهل لموقعك عبر خدمة الإضافة والتوثيق الرسمي على Google Maps.
          </p>

          {/* What's included */}
          <div className="pt-4">
            <h2 className="text-xl font-bold mb-4">تشمل الخدمة:</h2>
            <ul className="space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-[#4F4F63]">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[#5F30EB15] flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24"
                      fill="none" stroke="#5F30EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="bg-[#5F30EB] rounded-3xl p-8 md:p-12 text-white text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">
            اضمن ظهورك في المكان الصحيح
          </h2>
          <p className="text-white/80 leading-relaxed">
            تواصل معنا لبدء التوثيق الآن.
          </p>
          <a
            href="https://t.me/wakkelniai"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#5F30EB] font-bold px-8 py-3 rounded-full hover:bg-[#F0EEFF] transition-colors mt-2"
          >
            تواصل معنا الآن
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
