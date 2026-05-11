import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Link } from "wouter";

export default function NotFound() {
  return (
    <div
      className="min-h-screen w-full flex items-center justify-center bg-muted/30 px-4"
      dir="rtl"
    >
      <Card className="w-full max-w-md">
        <CardContent className="pt-6 text-start">
          <div className="flex items-center justify-end gap-2 mb-4">
            <h1 className="text-2xl font-bold text-foreground">
              ٤٠٤ — الصفحة غير موجودة
            </h1>
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            عذرًا، الصفحة التي تبحث عنها غير متوفرة أو تم نقلها.
          </p>

          <Link
            href="/"
            className="inline-block bg-primary text-primary-foreground font-bold px-5 py-2.5 rounded-xl hover:opacity-90 transition"
            data-testid="link-home"
          >
            العودة للرئيسية
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
