export type TourStep = { target: string; route?: string; title: { en: string; ar: string }; body: { en: string; ar: string } };
export type Tour = { id: "dashboard-welcome"; steps: TourStep[] };

export const dashboardWelcomeTour: Tour = { id: "dashboard-welcome", steps: [
  { target: "sidebar-nav", title: { en: "Your workspace", ar: "مساحة عملك" }, body: { en: "Everything lives here: Dashboard, Reviews, AI Reports, Review Link, and Settings.", ar: "كل ما تحتاجه هنا: لوحة التحكم والتقييمات وتقارير الذكاء الاصطناعي ورابط التقييم والإعدادات." } },
  { target: "business-selector", title: { en: "Switch businesses", ar: "التبديل بين الأنشطة" }, body: { en: "Switch between connected business profiles; every page follows your selection.", ar: "بدّل بين ملفات الأنشطة المرتبطة؛ جميع الصفحات تتبع اختيارك." } },
  { target: "reviews-list", route: "/dashboard/reviews", title: { en: "Your reviews", ar: "تقييماتك" }, body: { en: "New Google reviews appear here after each sync, with an AI reply draft.", ar: "تظهر تقييمات Google الجديدة هنا بعد كل مزامنة مع مسودة رد ذكية." } },
  { target: "review-actions", route: "/dashboard/reviews", title: { en: "Review actions", ar: "إجراءات التقييم" }, body: { en: "Approve, edit, regenerate, or dismiss the AI reply before posting.", ar: "اعتمد الرد الذكي أو عدّله أو أعد إنشاءه أو تجاهله قبل النشر." } },
  { target: "new-report-button", route: "/dashboard/reports", title: { en: "AI reports", ar: "تقارير الذكاء الاصطناعي" }, body: { en: "Analyze one business or compare several businesses side by side.", ar: "حلّل نشاطًا واحدًا أو قارن عدة أنشطة جنبًا إلى جنب." } },
  { target: "review-link-card", route: "/dashboard/review-link", title: { en: "Collect more reviews", ar: "اجمع تقييمات أكثر" }, body: { en: "Share this link or QR code so customers can review you quickly.", ar: "شارك هذا الرابط أو رمز QR ليتمكن العملاء من تقييمك بسرعة." } },
  { target: "ai-settings", route: "/dashboard/settings", title: { en: "Make AI sound like you", ar: "اضبط أسلوب الذكاء الاصطناعي" }, body: { en: "Tune the tone and choose manual approval or automatic posting.", ar: "اضبط النبرة واختر الموافقة اليدوية أو النشر التلقائي." } },
] };
