import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Phone, MapPin, Globe } from "lucide-react";

interface CardData {
  fullName: string;
  program: string | null;
  studentId: string | null;
  avatarUrl: string | null;
  issueDate: string;
  status: string;
  verificationToken: string;
}

interface Props {
  data: CardData;
  flipped: boolean;
}

export const DigitalIDCard = ({ data, flipped }: Props) => {
  const qrRef = useRef<HTMLCanvasElement | null>(null);
  const [qrUrl, setQrUrl] = useState<string>("");

  useEffect(() => {
    const payload = JSON.stringify({
      sid: data.studentId,
      n: data.fullName,
      a: data.status === "active",
      t: data.verificationToken,
      v: 1,
    });
    QRCode.toDataURL(payload, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
      color: { dark: "#0f3a3a", light: "#ffffff" },
    }).then(setQrUrl);
  }, [data.studentId, data.fullName, data.status, data.verificationToken]);

  const initials = (data.fullName || "S").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const isActive = data.status === "active";

  return (
    <div className="card-flip-wrapper" style={{ perspective: "1500px" }}>
      <div
        className="relative w-full transition-transform duration-700"
        style={{
          transformStyle: "preserve-3d",
          transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
          aspectRatio: "1.586 / 1",
        }}
      >
        {/* FRONT */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl"
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="relative h-full w-full bg-white">
            {/* Teal header strip */}
            <div className="relative flex h-[22%] items-center justify-between bg-[hsl(180,55%,22%)] px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white/95">
                  <GraduationCap className="h-5 w-5 text-[hsl(180,55%,22%)]" />
                </div>
                <div className="leading-tight text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-wider opacity-90">Western Balkans</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider">University</p>
                </div>
              </div>
              <p className="font-display text-xs font-bold uppercase tracking-widest text-white">WBU</p>
            </div>

            {/* Diagonal accent */}
            <div
              className="absolute left-0 right-0 top-[22%] h-2"
              style={{
                background: "linear-gradient(90deg, hsl(180,55%,22%) 0%, hsl(180,55%,35%) 50%, hsl(45,90%,55%) 100%)",
              }}
            />

            {/* Body */}
            <div className="flex h-[78%] gap-3 p-4">
              {/* Left: photo + status */}
              <div className="flex w-[32%] flex-col items-center justify-start gap-2">
                <Avatar className="h-[88px] w-[88px] rounded-lg border-2 border-[hsl(180,55%,22%)]/20 shadow-md">
                  {data.avatarUrl && <AvatarImage src={data.avatarUrl} alt={data.fullName} className="object-cover" />}
                  <AvatarFallback className="rounded-lg bg-[hsl(180,55%,22%)] text-2xl font-bold text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {!isActive && (
                  <Badge variant="destructive" className="text-[9px] uppercase">
                    {data.status}
                  </Badge>
                )}
              </div>

              {/* Center: info */}
              <div className="flex flex-1 flex-col justify-between min-w-0">
                <div className="min-w-0">
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Full Name</p>
                  <p className="truncate font-display text-sm font-bold text-[hsl(180,55%,15%)] sm:text-base">
                    {data.fullName}
                  </p>
                  <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Program</p>
                  <p className="line-clamp-2 text-xs font-medium text-foreground">
                    {data.program || "—"}
                  </p>
                </div>

                <div className="flex items-end justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Student ID</p>
                    <p className="truncate font-mono text-[11px] font-bold text-[hsl(180,55%,22%)]">
                      {data.studentId || "—"}
                    </p>
                    <p className="mt-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Date of Issue
                    </p>
                    <p className="text-[10px] font-medium text-foreground">
                      {new Date(data.issueDate).toLocaleDateString("en-GB")}
                    </p>
                  </div>

                  {/* QR */}
                  <div className="flex flex-col items-center">
                    <div className="rounded-md border border-border bg-white p-1 shadow-sm">
                      {qrUrl && (
                        <img src={qrUrl} alt="Student verification QR" className="h-[68px] w-[68px]" />
                      )}
                    </div>
                    <p className="mt-1 text-[8px] font-bold uppercase tracking-wider text-[hsl(180,55%,22%)]">
                      Student Card
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <canvas ref={qrRef} className="hidden" />
          </div>
        </div>

        {/* BACK */}
        <div
          className="absolute inset-0 overflow-hidden rounded-2xl shadow-2xl"
          style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
        >
          <div className="relative h-full w-full bg-gradient-to-br from-[hsl(180,55%,22%)] to-[hsl(180,55%,15%)] text-white">
            {/* Top strip */}
            <div className="flex h-[18%] items-center justify-between border-b border-white/15 px-4">
              <p className="font-display text-xs font-bold uppercase tracking-widest">Card Information</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white/95">
                <GraduationCap className="h-4 w-4 text-[hsl(180,55%,22%)]" />
              </div>
            </div>

            <div className="flex h-[82%] flex-col gap-2 p-4 text-[10px] leading-relaxed">
              <div>
                <p className="mb-1 text-[9px] font-bold uppercase tracking-wider text-[hsl(45,90%,65%)]">Usage</p>
                <ul className="space-y-0.5 text-[10px] text-white/85">
                  <li>• Valid for university entry, attendance & library access</li>
                  <li>• Non-transferable — present on request</li>
                  <li>• Report loss/theft to admin office immediately</li>
                </ul>
              </div>

              <div className="mt-auto space-y-1 border-t border-white/15 pt-2">
                <div className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-[hsl(45,90%,65%)]" />
                  <p className="text-[10px]">Rr. Universiteti, Tetovo, North Macedonia</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 shrink-0 text-[hsl(45,90%,65%)]" />
                  <p className="text-[10px]">+389 44 123 456</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <Globe className="h-3 w-3 shrink-0 text-[hsl(45,90%,65%)]" />
                  <p className="text-[10px]">wbu.lovable.app</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
