import { useEffect } from "react";
import { ChevronRight, Shield } from "lucide-react";
import hhrLogo from "@assets/hhr_logo.png";

export default function PrivacyPage() {
  useEffect(() => {
    document.title = "سياسة الخصوصية | قطار الحرمين السريع";
  }, []);

  return (
    <div dir="rtl" className="min-h-screen bg-white text-[#0b1c2c]">
      <header className="bg-[#0b1c2c] text-white">
        <div className="max-w-2xl mx-auto px-5 h-14 flex items-center justify-between">
          <a
            href="/"
            className="inline-flex items-center gap-1 text-sm font-semibold hover:text-[#b08a3e]"
            data-testid="link-back"
          >
            <ChevronRight className="w-4 h-4" />
            الرئيسية
          </a>
          <img src={hhrLogo} alt="HHR" className="h-7 w-auto opacity-90" />
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-5 py-8">
        <div className="flex items-center gap-2 mb-6">
          <Shield className="w-6 h-6 text-[#b08a3e]" />
          <h1 className="text-2xl font-extrabold" data-testid="text-privacy-title">
            سياسة الخصوصية
          </h1>
        </div>

        <p className="text-sm text-[#0b1c2c]/60 mb-8">
          آخر تحديث: مايو 2026
        </p>

        <Section title="١. مقدمة">
          نحرص في قطار الحرمين السريع على حماية خصوصية زوارنا وعملائنا. توضح هذه
          السياسة أنواع البيانات التي نجمعها وكيفية استخدامها وحمايتها عند
          استخدامك لموقعنا أو خدماتنا.
        </Section>

        <Section title="٢. البيانات التي نجمعها">
          <ul className="list-disc pr-5 space-y-1.5">
            <li>
              <b>بيانات الحجز:</b> الاسم، رقم الهوية، البريد الإلكتروني، رقم
              الجوال، تفاصيل الرحلة (المحطة، التاريخ، عدد الركاب).
            </li>
            <li>
              <b>بيانات الدفع:</b> تتم معالجتها عبر بوابات دفع آمنة ولا يتم
              تخزين بيانات البطاقة بشكل دائم على خوادمنا.
            </li>
            <li>
              <b>بيانات تقنية:</b> عنوان IP، نوع الجهاز والمتصفح، وقت الزيارة،
              الصفحات التي تم تصفحها — لأغراض الأمان وتحسين الخدمة.
            </li>
          </ul>
        </Section>

        <Section title="٣. كيف نستخدم بياناتك">
          <ul className="list-disc pr-5 space-y-1.5">
            <li>إتمام عمليات الحجز وإصدار التذاكر.</li>
            <li>التواصل معك بخصوص الحجز أو تغييرات الرحلة.</li>
            <li>تحسين خدماتنا وتجربة المستخدم.</li>
            <li>الامتثال للأنظمة والتشريعات في المملكة العربية السعودية.</li>
          </ul>
        </Section>

        <Section title="٤. مشاركة البيانات">
          لا نبيع بياناتك ولا نشاركها مع أي طرف ثالث إلا في الحالات التالية:
          مزودي خدمات الدفع المعتمدين، الجهات التنظيمية والحكومية عند الطلب
          الرسمي، أو لحماية الموقع من الاحتيال.
        </Section>

        <Section title="٥. أمان البيانات">
          نستخدم تشفير TLS لجميع الاتصالات، ونخزّن البيانات في قواعد بيانات
          آمنة محمية بقواعد وصول صارمة. الوصول إلى لوحة الإدارة محصور بالموظفين
          المخوّلين فقط عبر مصادقة آمنة.
        </Section>

        <Section title="٦. ملفات الارتباط (الكوكيز)">
          نستخدم ملفات الارتباط الأساسية لتشغيل الموقع (مثل جلسة الحجز)، وملفات
          تحليلية لفهم استخدام الموقع. يمكنك تعطيلها من إعدادات متصفحك.
        </Section>

        <Section title="٧. حقوقك">
          يحق لك طلب الاطلاع على بياناتك أو تصحيحها أو حذفها بمراسلة:
          <br />
          <a
            href="mailto:privacy@hhr.sa"
            className="text-[#b08a3e] font-semibold"
            data-testid="link-privacy-email"
          >
            privacy@hhr.sa
          </a>
        </Section>

        <Section title="٨. التغييرات على هذه السياسة">
          قد نُحدّث هذه السياسة من حين لآخر. سيتم نشر أي تعديلات على هذه الصفحة
          مع تاريخ التحديث.
        </Section>

        <div className="mt-10 pt-6 border-t border-black/10 text-sm text-[#0b1c2c]/60">
          للاستفسارات: 920004433 · info@hhr.sa
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="text-base font-extrabold mb-2 text-[#0b1c2c]">{title}</h2>
      <div className="text-sm leading-7 text-[#0b1c2c]/85">{children}</div>
    </section>
  );
}
